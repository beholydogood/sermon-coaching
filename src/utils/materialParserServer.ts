import zlib from 'zlib';

export interface ParsedMaterialResult {
  extractedText: string;
  summaryPoint: string;
  keywords: string[];
}

/**
 * 순수 Node.js 기반 ZIP 엔트리 파서 (DOCX, PPTX, HWPX 내부 XML 추출용)
 * Central Directory를 읽어 Data Descriptor 유무와 무관하게 정확히 압축 해제합니다.
 */
function extractZipXmlFiles(buffer: Buffer, filterFn: (name: string) => boolean): { name: string; content: string }[] {
  const results: { name: string; content: string }[] = [];

  // End of Central Directory (EOCD) 시그니처 검색: 0x06054b50
  let eocdOffset = -1;
  const minPos = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= minPos; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) return results;

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < totalEntries; i++) {
    if (cdOffset + 46 > buffer.length) break;
    const sig = buffer.readUInt32LE(cdOffset);
    if (sig !== 0x02014b50) break;

    const compressionMethod = buffer.readUInt16LE(cdOffset + 10);
    const compressedSize = buffer.readUInt32LE(cdOffset + 20);
    const fileNameLen = buffer.readUInt16LE(cdOffset + 28);
    const extraLen = buffer.readUInt16LE(cdOffset + 30);
    const commentLen = buffer.readUInt16LE(cdOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(cdOffset + 42);

    const fileName = buffer.subarray(cdOffset + 46, cdOffset + 46 + fileNameLen).toString('utf8');
    cdOffset += 46 + fileNameLen + extraLen + commentLen;

    if (!filterFn(fileName)) continue;
    if (localHeaderOffset + 30 > buffer.length) continue;

    const localFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
    if (dataStart + compressedSize > buffer.length) continue;

    const rawSlice = buffer.subarray(dataStart, dataStart + compressedSize);
    try {
      let uncompressed: Buffer;
      if (compressionMethod === 0) {
        uncompressed = rawSlice;
      } else if (compressionMethod === 8) {
        uncompressed = zlib.inflateRawSync(rawSlice);
      } else {
        continue;
      }
      results.push({ name: fileName, content: uncompressed.toString('utf8') });
    } catch {
      // ignore corrupted entry
    }
  }

  return results;
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<\/a:p>/gi, '\n')
    .replace(/<\/hp:p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/**
 * 기본 PDF 텍스트 스트림 디코더 (외부 AI API가 없을 때도 PDF 본문 텍스트 추출 지원)
 */
function extractBasicPdfText(buffer: Buffer): string {
  const rawLatin1 = buffer.toString('latin1');
  const chunks: string[] = [];

  const decodePdfToken = (token: string): string => {
    // Hex string <FEFF...> (UTF-16BE 한글/유니코드)
    if (token.startsWith('<') && token.endsWith('>')) {
      const hex = token.slice(1, -1).replace(/\s+/g, '');
      if (hex.length >= 4 && (hex.toUpperCase().startsWith('FEFF') || hex.length % 4 === 0)) {
        const startIdx = hex.toUpperCase().startsWith('FEFF') ? 4 : 0;
        let out = '';
        for (let i = startIdx; i + 3 < hex.length; i += 4) {
          const code = parseInt(hex.slice(i, i + 4), 16);
          if (code >= 32 && code !== 0xffff) {
            out += String.fromCharCode(code);
          }
        }
        if (out.trim()) return out;
      }
      return '';
    }
    // Literal string (...)
    if (token.startsWith('(') && token.endsWith(')')) {
      return token
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
    }
    return '';
  };

  const scanContentStream = (streamStr: string) => {
    const btMatches = streamStr.match(/BT[\s\S]*?ET/g) || [];
    for (const block of btMatches) {
      const tokens = block.match(/<[0-9A-Fa-f\s]+>|\((?:\\.|[^\\)])*\)/g) || [];
      const line = tokens.map(decodePdfToken).join('');
      if (line.trim().length > 1) {
        chunks.push(line.trim());
      }
    }
  };

  // 압축 스트림(FlateDecode) 탐색 및 해제
  let searchPos = 0;
  while (searchPos < rawLatin1.length) {
    const streamIdx = rawLatin1.indexOf('stream', searchPos);
    if (streamIdx === -1) break;
    let startByte = streamIdx + 6;
    if (rawLatin1[startByte] === '\r' && rawLatin1[startByte + 1] === '\n') startByte += 2;
    else if (rawLatin1[startByte] === '\n' || rawLatin1[startByte] === '\r') startByte += 1;

    const endStreamIdx = rawLatin1.indexOf('endstream', startByte);
    if (endStreamIdx === -1) break;

    let endByte = endStreamIdx;
    while (endByte > startByte && (rawLatin1[endByte - 1] === '\n' || rawLatin1[endByte - 1] === '\r')) {
      endByte--;
    }

    const slice = buffer.subarray(startByte, endByte);
    try {
      const inflated = zlib.inflateSync(slice).toString('latin1');
      scanContentStream(inflated);
    } catch {
      scanContentStream(slice.toString('latin1'));
    }

    searchPos = endStreamIdx + 9;
  }

  return chunks
    .join('\n')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\uAC00-\uD7A3\u3131-\u318E\u4E00-\u9FFF]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export function extractSummaryAndKeywords(rawText: string, fileName: string): ParsedMaterialResult {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const normalized = rawText.replace(/\r\n/g, '\n').trim();

  if (!normalized || normalized.length < 10) {
    return {
      extractedText: `[문서 제목: ${cleanName}]\n업로드된 '${fileName}' 문서의 주제("${cleanName}")를 중심으로 신학적·목회적 보충 자료를 반영합니다.`,
      summaryPoint: `'${cleanName}' 자료의 핵심 주제 및 목회 적용 포인트`,
      keywords: cleanName.split(/\s+/).filter((w) => w.length >= 2).slice(0, 5),
    };
  }

  // 의미 있는 문장/단락 상위 추출 (최대 2,500자 보존)
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 4);

  const previewLines = lines.slice(0, 35).join('\n').slice(0, 2500);
  const topSummary = lines.slice(0, 3).join(' / ').slice(0, 180);

  // 빈도 높은 2글자 이상 한글/영문 핵심 키워드 추출
  const stopWords = new Set([
    '그리고', '그러나', '하지만', '그래서', '통하여', '있도록', '합니다', '입니다', '있는', '하는', '위한', '대한', '우리', '모든', '것입니다', '있습니다',
  ]);
  const wordFreq = new Map<string, number>();
  const words = normalized.match(/[가-힣]{2,8}|[A-Za-z]{3,15}/g) || [];
  for (const w of words) {
    if (stopWords.has(w)) continue;
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  }
  const keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);

  return {
    extractedText: previewLines,
    summaryPoint: topSummary || `'${cleanName}' 핵심 내용 요약 (${keywords.slice(0, 4).join(', ')})`,
    keywords,
  };
}

export function parseUploadedMaterialBuffer(
  fileName: string,
  base64Data: string
): ParsedMaterialResult {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const buffer = Buffer.from(cleanBase64, 'base64');

  let rawText = '';

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    rawText = buffer.toString('utf8');
  } else if (ext === 'docx') {
    const entries = extractZipXmlFiles(buffer, (name) => name === 'word/document.xml');
    rawText = entries.map((e) => stripXmlTags(e.content)).join('\n');
  } else if (ext === 'pptx') {
    const entries = extractZipXmlFiles(buffer, (name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
    entries.sort((a, b) => {
      const na = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const nb = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      return na - nb;
    });
    rawText = entries
      .map((e, idx) => `[슬라이드 ${idx + 1}] ${stripXmlTags(e.content)}`)
      .join('\n');
  } else if (ext === 'hwpx') {
    const entries = extractZipXmlFiles(buffer, (name) => /^Contents\/section\d+\.xml$/i.test(name));
    rawText = entries.map((e) => stripXmlTags(e.content)).join('\n');
  } else if (ext === 'pdf') {
    rawText = extractBasicPdfText(buffer);
  } else {
    // 기타 텍스트 시도
    rawText = buffer.toString('utf8').replace(/\0/g, '');
  }

  return extractSummaryAndKeywords(rawText, fileName);
}
