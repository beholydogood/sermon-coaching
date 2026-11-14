export interface TranscriptLine {
  sec: number;
  dur: number;
  txt: string;
}

export interface YoutubeSermonDetails {
  videoId: string;
  videoTitle: string;
  channel: string;
  description: string;
  lengthSec: number;
  thumbnailUrl: string;
  detectedScripture: string;
  detectedStartSec: number;
  detectedStartTime: string;
  startSource:
    | 'url_param'
    | 'youtube_chapter'
    | 'description_timetable'
    | 'transcript_analysis'
    | 'title_fallback';
  startReasonLabel: string;
  sermonTranscriptExcerpt: string;
}

const BIBLE_BOOKS_PATTERN =
  '창세기|출애굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘상|사무엘하|열왕기상|열왕기하|역대상|역대하|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|예레미야애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훔|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도전서|고린도후서|갈라디아서|에베소서|빌립보서|골로새서|데살로니가전서|데살로니가후서|디모데전서|디모데후서|디도서|빌레몬서|히브리서|야고보서|베드로전서|베드로후서|요한일서|요한이서|요한삼서|유다서|요한계시록|창|출|레|민|신|수|삿|룻|삼상|삼하|왕상|왕하|대상|대하|스|느|에|욥|시|잠|전|아|사|렘|애|겔|단|호|욜|암|옵|욘|미|나|합|습|학|슥|말|마|막|눅|요|행|롬|고전|고후|갈|엡|빌|골|살전|살후|딤전|딤후|딛|몬|히|약|벧전|벧후|요일|요이|요삼|유|계';

export const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/|u\/\w\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
};

export const extractScriptureFromText = (text: string): string => {
  if (!text) return '';
  const regex = new RegExp(
    `((?:${BIBLE_BOOKS_PATTERN})\\s*\\d+\\s*(?:장|편|:)\\s*\\d+(?:\\s*[-~]\\s*\\d+)?\\s*절?)`,
    'i'
  );
  const match = text.match(regex);
  if (match && match[1]) return match[1].trim();

  const chapOnlyRegex = new RegExp(`((?:${BIBLE_BOOKS_PATTERN})\\s*\\d+\\s*(?:장|편))`, 'i');
  const chapMatch = text.match(chapOnlyRegex);
  return chapMatch && chapMatch[1] ? chapMatch[1].trim() : '';
};

export const parseTimeStringToSec = (timeStr: string | number | undefined | null): number | null => {
  if (typeof timeStr === 'number') return Number.isFinite(timeStr) && timeStr >= 0 ? Math.floor(timeStr) : null;
  if (timeStr === undefined || timeStr === null) return null;
  const trimmed = String(timeStr).trim().replace(/초/g, '');
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p.trim(), 10));
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (trimmed.includes('분')) {
    const parts = trimmed.split('분');
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  } else if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  return null;
};

export const formatSecToMmSs = (sec: number): string => {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const extractUrlStartSec = (url: string): number | null => {
  if (!url) return null;
  const match = url.match(/[?&](?:t|start)=([0-9hms]+)/i);
  if (!match || !match[1]) return null;
  const raw = match[1].toLowerCase();
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  let total = 0;
  const h = raw.match(/(\d+)h/);
  const m = raw.match(/(\d+)m/);
  const s = raw.match(/(\d+)s/);
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  if (s) total += parseInt(s[1], 10);
  return total > 0 ? total : 0;
};

const decodeXmlText = (str: string): string =>
  str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * 설명란(Description)에서 성경 장:절 표기(예: 고전 1:10-17, 요 3:16)를 제거한 뒤
 * 실제 예배 순서 타임테이블(예: "28:15 설교", "설교말씀 31:20")만 정밀 추출
 */
function detectSermonStartFromDescription(description: string, lengthSec: number): number | null {
  if (!description) return null;

  const bibleVerseRegex = new RegExp(
    `(?:${BIBLE_BOOKS_PATTERN})\\s*\\d+\\s*:\\s*\\d+(?:\\s*[-~,]\\s*\\d+)*`,
    'gi'
  );
  const cleanedDesc = description.replace(bibleVerseRegex, ' [BIBLE_REF] ');
  const lines = cleanedDesc.split('\n').map((l) => l.trim()).filter(Boolean);

  // 타임스탬프가 포함된 예배 순서 라인이 최소 1개 이상 있는지 확인 (단, 숫자:숫자 뒤에 -숫자나 '절'이 오면 성경구절이므로 제외)
  const validTimestampLineRegex = /(?:^|[\s[\]()|-])(\d{1,2}:\d{2}(?::\d{2})?)(?![-~\d]|절)/;

  for (const line of lines) {
    const isSermonLabel =
      /(설교\s*말씀|말씀\s*선포|말씀\s*증거|설교|강해|메시지|Sermon|Message)/i.test(line) &&
      !/(찬양|성가대|특송|봉헌|헌금|광고|축도|기도회|안내)/.test(line);

    if (!isSermonLabel) continue;

    const m = line.match(validTimestampLineRegex);
    if (m && m[1]) {
      const sec = parseTimeStringToSec(m[1]);
      if (sec !== null && sec >= 0 && (lengthSec === 0 || sec < lengthSec - 120)) {
        return sec;
      }
    }
  }

  return null;
}

/**
 * 유튜브 챕터 마커(Chapters)에서 실제 설교 구간 시작 시점 탐지
 */
function detectSermonStartFromChapters(html: string, lengthSec: number): number | null {
  if (!html) return null;
  const chapterRegex =
    /"title":\{"simpleText":"([^"]+)"\}[^}]{0,260}?"timeRangeStartMillis":"?(\d+)"?/g;

  const candidates: Array<{ title: string; sec: number; priority: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = chapterRegex.exec(html)) !== null) {
    const chTitle = (match[1] || '').trim();
    const startSec = Math.floor(parseInt(match[2] || '0', 10) / 1000);
    if (lengthSec > 0 && startSec >= lengthSec - 60) continue;
    if (/(찬양|성가대|특송|광고|소식|봉헌|헌금|축도|폐회|예고|봉독|기도)/.test(chTitle)) {
      continue;
    }
    if (/(설교|말씀\s*선포|말씀\s*증거|강해|메시지|Sermon|Message)/i.test(chTitle)) {
      candidates.push({ title: chTitle, sec: startSec, priority: 1 });
    } else if (/(말씀|목사)/.test(chTitle)) {
      candidates.push({ title: chTitle, sec: startSec, priority: 2 });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority || a.sec - b.sec);
  return candidates[0].sec;
}

/**
 * 실제 음성 자막(Caption Transcript)에서 찬양/기도/성가대/광고를 모두 구분하여
 * 목사님의 실제 설교가 시작되는 정확한 초(sec)를 탐지!
 * - 단편 설교 영상이면 00:00~00:30 내 실제 첫 발화 시점 반환
 * - 전체 예배 실황이면 찬양·대표기도·성가대 이후 본 설교 연속 발화 블록의 정확한 시작 초 반환
 */
export function detectSermonStartFromTranscript(
  lines: TranscriptLine[],
  lengthSec: number
): { startSec: number; isFullWorshipPattern: boolean } | null {
  if (!lines || lines.length < 10) return null;

  const totalSec = Math.max(lengthSec, Math.ceil(lines[lines.length - 1].sec + 10));
  const WIN = 15; // 15초 단위 음성/음악 밀도 윈도우
  const numWins = Math.max(1, Math.ceil(totalSec / WIN));

  const wins = Array.from({ length: numWins }, (_, idx) => ({
    idx,
    startSec: idx * WIN,
    speechChars: 0,
    musicTags: 0,
  }));

  for (const l of lines) {
    if (l.sec < 0) continue;
    const idx = Math.min(numWins - 1, Math.floor(l.sec / WIN));
    const musicMatches = l.txt.match(/\[(음악|노래|박수|Music|Applause)\]/gi);
    if (musicMatches) {
      wins[idx].musicTags += musicMatches.length;
    }
    const cleanSpeech = l.txt
      .replace(/\[[^\]]+\]/g, '')
      .replace(/>>\s*/g, '')
      .trim();
    wins[idx].speechChars += cleanSpeech.length;
  }

  // 각 15초 구간이 '연속 설교 발화'인지 판별 (배경 반주가 살짝 깔려도 발화 글자수가 높으면 발화로 인정, 찬양/성가대는 제외)
  const isSpoken = wins.map((w) => {
    if (w.musicTags >= 2 && w.speechChars < 65) return false;
    if (w.musicTags >= 1 && w.speechChars < 28) return false;
    return w.speechChars >= 18;
  });

  // 설교 중 잠깐의 침묵(성경 넘김, 거룩한 침묵, 짧은 박수 등 최대 30초)은 동일 발화 블록으로 연결
  const bridged = [...isSpoken];
  for (let i = 1; i < numWins - 2; i++) {
    if (!bridged[i] && bridged[i - 1] && (bridged[i + 1] || bridged[i + 2])) {
      const isMusicInterlude =
        wins[i].musicTags >= 2 ||
        (wins[i].musicTags >= 1 && (wins[i + 1]?.musicTags || 0) >= 1);
      if (!isMusicInterlude) {
        bridged[i] = true;
      }
    }
  }

  // 연속 발화 세그먼트 추출
  interface SpokenSegment {
    startWin: number;
    endWin: number;
    startSec: number;
    endSec: number;
    durationSec: number;
  }
  const segments: SpokenSegment[] = [];
  let curStart = -1;
  for (let i = 0; i < numWins; i++) {
    if (bridged[i]) {
      if (curStart === -1) curStart = i;
    } else if (curStart !== -1) {
      segments.push({
        startWin: curStart,
        endWin: i - 1,
        startSec: curStart * WIN,
        endSec: i * WIN,
        durationSec: (i - curStart) * WIN,
      });
      curStart = -1;
    }
  }
  if (curStart !== -1) {
    segments.push({
      startWin: curStart,
      endWin: numWins - 1,
      startSec: curStart * WIN,
      endSec: numWins * WIN,
      durationSec: (numWins - curStart) * WIN,
    });
  }

  if (segments.length === 0) return null;

  // 가장 긴 연속 발화 블록(= 본 설교 구간, 보통 15분~55분)을 선택
  const longSegments = segments.filter((s) => s.durationSec >= 480);
  const mainBlock = [...(longSegments.length > 0 ? longSegments : segments)].sort(
    (a, b) => b.durationSec - a.durationSec
  )[0];

  const prevWinHadMusic =
    mainBlock.startWin > 0 && wins[mainBlock.startWin - 1].musicTags > 0;
  const searchFloorSec = prevWinHadMusic
    ? mainBlock.startSec
    : Math.max(0, mainBlock.startSec - 5);

  // 경계 부근([searchFloorSec, mainBlock.startSec + 25])에 남아있는 순수 [음악]/[노래]/[박수] 태그 직후의 첫 실제 발화 문장 찾기
  const boundaryLines = lines.filter(
    (l) => l.sec >= searchFloorSec && l.sec <= mainBlock.startSec + 45
  );
  let lastPureMusicSec = -1;
  for (const bl of boundaryLines) {
    if (bl.sec > mainBlock.startSec + 20) break;
    const stripped = bl.txt
      .replace(/\[(음악|노래|박수|Music|Applause)\]/gi, '')
      .replace(/>>\s*/g, '')
      .trim();
    const hadMusicTag = /\[(음악|노래|박수|Music|Applause)\]/i.test(bl.txt);
    if (hadMusicTag && stripped.length <= 2) {
      lastPureMusicSec = bl.sec;
    }
  }

  const effectiveFloorSec =
    lastPureMusicSec >= 0 ? lastPureMusicSec + 0.5 : searchFloorSec;

  const firstSpoken = lines.find((l) => {
    if (l.sec < effectiveFloorSec) return false;
    const clean = l.txt
      .replace(/\[(음악|노래|박수|Music|Applause)\]/gi, '')
      .replace(/>>\s*/g, '')
      .trim();
    return clean.length >= 3;
  });

  let refinedSec = firstSpoken ? Math.floor(firstSpoken.sec) : mainBlock.startSec;

  // 만약 본 설교 블록 앞부분(처음 7분 이내)에 사회자의 '목사님 등단/말씀 선포 소개' 멘트가 포함되어 있다면 그 직후 설교자 첫 마디로 정밀 이동!
  const introCheckLines = lines.filter(
    (l) => l.sec >= refinedSec && l.sec <= refinedSec + 420
  );
  let foundHandoff = false;
  for (let i = 0; i < introCheckLines.length; i++) {
    const joined = introCheckLines
      .slice(i, i + 3)
      .map((x) => x.txt)
      .join(' ');
    if (
      /(목사님(?:께서)?\s*나오셔서|목사님\s*등단하셔서|(?:말씀을?|설교를?)\s*(?:증거해|선포해|전해|전달해)\s*주시겠습니다|말씀\s*전하실\s*때\s*큰\s*은혜)/.test(
        joined
      )
    ) {
      const handoffEndSec =
        introCheckLines[Math.min(introCheckLines.length - 1, i + 2)].sec + 3;
      const nextPreacherLine = lines.find((l) => {
        if (l.sec < handoffEndSec) return false;
        const clean = l.txt
          .replace(/\[(음악|노래|박수|Music|Applause)\]/gi, '')
          .replace(/>>\s*/g, '')
          .trim();
        return clean.length >= 4;
      });
      if (nextPreacherLine && nextPreacherLine.sec <= refinedSec + 460) {
        refinedSec = Math.floor(nextPreacherLine.sec);
        foundHandoff = true;
      }
      break;
    }
  }

  // 사회자 소개 멘트 없이 '교회 소식/광고'가 본 블록 첫 90초에 붙어 있고 그 뒤에 성경봉독/설교가 시작되는 경우 보정
  if (!foundHandoff) {
    const earlyText = introCheckLines
      .filter((l) => l.sec <= refinedSec + 90)
      .map((l) => l.txt)
      .join(' ');
    if (/(교회\s*소식|광고\s*말씀|주보를\s*참고|헌금은\s*주보)/.test(earlyText)) {
      const afterAnnouncement = introCheckLines.find(
        (l) =>
          l.sec > refinedSec + 30 &&
          /(하나님의\s*말씀은|말씀을\s*봉독|성경\s*봉독|오늘\s*본문|제목으로\s*말씀)/.test(l.txt)
      );
      if (afterAnnouncement) {
        refinedSec = Math.floor(afterAnnouncement.sec);
      }
    }
  }

  // 단편 설교 영상에서 0~5초 사이에 바로 시작하는 경우 깔끔하게 0초(또는 첫 발화 초) 유지
  if (refinedSec <= 5) {
    refinedSec = refinedSec <= 2 ? 0 : refinedSec;
  }

  return {
    startSec: refinedSec,
    isFullWorshipPattern: refinedSec >= 180,
  };
}

/**
 * InnerTube IOS Player API를 통해 영상 상세정보 + 실제 타임스탬프 자막(XML)을 안정적으로 추출
 */
async function fetchInnerTubePlayerAndTranscript(
  videoId: string,
  apiKey: string,
  cookieHeader: string
): Promise<{
  title: string;
  author: string;
  lengthSec: number;
  shortDescription: string;
  lines: TranscriptLine[];
} | null> {
  if (!apiKey) return null;

  try {
    const playerRes = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'IOS',
              clientVersion: '20.03.02',
              deviceMake: 'Apple',
              deviceModel: 'iPhone16,2',
              osName: 'iPhone',
              osVersion: '18.2.1.22C161',
              hl: 'ko',
              gl: 'KR',
            },
          },
        }),
        signal: AbortSignal.timeout(8500),
      }
    );

    if (!playerRes.ok) return null;
    const pData: any = await playerRes.json();

    const title = pData?.videoDetails?.title || '';
    const author = pData?.videoDetails?.author || '';
    const lengthSec = Number(pData?.videoDetails?.lengthSeconds || 0);
    const shortDescription = pData?.videoDetails?.shortDescription || '';

    const tracks: any[] =
      pData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    let lines: TranscriptLine[] = [];

    if (tracks.length > 0) {
      const preferredTrack =
        tracks.find((t) => t.languageCode === 'ko' && t.kind !== 'asr') ||
        tracks.find((t) => t.languageCode === 'ko') ||
        tracks[0];

      if (preferredTrack?.baseUrl) {
        const capRes = await fetch(preferredTrack.baseUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8500),
        });
        if (capRes.ok) {
          const xml = await capRes.text();
          lines = [...xml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)].map(
            (m) => ({
              sec: parseFloat(m[1] || '0'),
              dur: parseFloat(m[2] || '0'),
              txt: decodeXmlText(m[3] || ''),
            })
          );
        }
      }
    }

    return { title, author, lengthSec, shortDescription, lines };
  } catch {
    return null;
  }
}

/**
 * 유튜브 설교 메타데이터 및 실제 설교 시작 시점(초) 통합 탐지 엔진
 */
export async function fetchYoutubeSermonDetails(
  videoId: string,
  rawUrl: string
): Promise<YoutubeSermonDetails> {
  let videoTitle = '';
  let channel = '';
  let description = '';
  let lengthSec = 0;
  let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let watchHtml = '';
  let apiKey = '';
  let cookieHeader = '';

  // 1. oEmbed 및 Watch HTML 병렬 조회
  const [oembedOutcome, watchOutcome] = await Promise.allSettled([
    fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    ),
    fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    }),
  ]);

  if (oembedOutcome.status === 'fulfilled' && oembedOutcome.value.ok) {
    try {
      const oData: any = await oembedOutcome.value.json();
      videoTitle = oData.title || '';
      channel = oData.author_name || '';
      thumbnailUrl = oData.thumbnail_url || thumbnailUrl;
    } catch {
      // ignore
    }
  }

  if (watchOutcome.status === 'fulfilled' && watchOutcome.value.ok) {
    try {
      const wRes = watchOutcome.value;
      const rawCookies =
        typeof (wRes.headers as any).getSetCookie === 'function'
          ? ((wRes.headers as any).getSetCookie() as string[])
          : [];
      cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');
      watchHtml = await wRes.text();

      const keyMatch = watchHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (keyMatch && keyMatch[1]) apiKey = keyMatch[1];

      if (!videoTitle) {
        const titleMatch = watchHtml.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          videoTitle = titleMatch[1].replace(/\s*-\s*YouTube$/i, '').trim();
        }
      }

      const descMatch = watchHtml.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }

      const lenMatch = watchHtml.match(/"lengthSeconds":"(\d+)"/);
      if (lenMatch && lenMatch[1]) {
        lengthSec = parseInt(lenMatch[1], 10) || 0;
      }
    } catch {
      // ignore
    }
  }

  // 2. InnerTube IOS API로 정확한 영상 길이·설명·전체 자막 트랙 확보
  const innerTubeData = await fetchInnerTubePlayerAndTranscript(
    videoId,
    apiKey,
    cookieHeader
  );
  if (innerTubeData) {
    if (!videoTitle && innerTubeData.title) videoTitle = innerTubeData.title;
    if (!channel && innerTubeData.author) channel = innerTubeData.author;
    if (innerTubeData.lengthSec > 0) lengthSec = innerTubeData.lengthSec;
    if (!description && innerTubeData.shortDescription) {
      description = innerTubeData.shortDescription;
    }
  }

  const transcriptLines = innerTubeData?.lines || [];

  // 3. 실제 설교 시작 시점 다중 레이어 정밀 판별 (절대 무조건 25:00으로 고정하지 않음!)
  let detectedStartSec: number | null = null;
  let startSource: YoutubeSermonDetails['startSource'] = 'title_fallback';
  let startReasonLabel = '';

  // [우선순위 1] URL 자체에 ?t= 또는 &start= 가 명시된 경우
  const urlSec = extractUrlStartSec(rawUrl);
  if (urlSec !== null && urlSec > 0) {
    detectedStartSec = urlSec;
    startSource = 'url_param';
    startReasonLabel = `유튜브 링크에 지정된 시작 시간(${formatSecToMmSs(urlSec)})을 적용했습니다.`;
  }

  // [우선순위 2] 유튜브 공식 챕터 마커(설교/말씀선포) 확인
  if (detectedStartSec === null) {
    const chSec = detectSermonStartFromChapters(watchHtml, lengthSec);
    if (chSec !== null) {
      detectedStartSec = chSec;
      startSource = 'youtube_chapter';
      startReasonLabel = `영상 챕터에서 실제 설교 시작 구간(${formatSecToMmSs(chSec)})을 찾았습니다.`;
    }
  }

  // [우선순위 3] 설명란의 예배 순서 타임테이블 확인 (성경 장:절 오인 방지 적용)
  if (detectedStartSec === null) {
    const descSec = detectSermonStartFromDescription(description, lengthSec);
    if (descSec !== null) {
      detectedStartSec = descSec;
      startSource = 'description_timetable';
      startReasonLabel = `영상 설명란 예배 순서에서 설교 시작 시간(${formatSecToMmSs(descSec)})을 찾았습니다.`;
    }
  }

  // [우선순위 4] 실제 음성 자막(Transcript) 발화 밀도 & 예배 순서 전환 분석
  if (detectedStartSec === null && transcriptLines.length > 0) {
    const trResult = detectSermonStartFromTranscript(transcriptLines, lengthSec);
    if (trResult !== null) {
      detectedStartSec = trResult.startSec;
      startSource = 'transcript_analysis';
      startReasonLabel = trResult.isFullWorshipPattern
        ? `전체 예배 음성·자막을 분석하여 찬양·기도 이후 실제 설교 시작 시점(${formatSecToMmSs(trResult.startSec)})을 찾았습니다.`
        : `영상 음성·자막을 분석한 결과 도입부(${formatSecToMmSs(trResult.startSec)})부터 바로 설교가 시작됩니다.`;
    }
  }

  // [우선순위 5] 자막·챕터·타임스탬프가 모두 없는 영상(예: 방금 시작된 생방송 등)에 한한 최소 폴백
  if (detectedStartSec === null) {
    const isExplicitFullLiveTitle = /(전체\s*예배|예배\s*실황|풀\s*영상|생방송)/.test(videoTitle);
    if (isExplicitFullLiveTitle && (lengthSec >= 3300 || lengthSec === 0)) {
      detectedStartSec = 1200;
      startSource = 'title_fallback';
      startReasonLabel =
        '자막 생성 전인 전체 예배 실황 영상으로 확인되어 예상 설교 시점(20:00)으로 설정했습니다. 필요시 조정해 주세요.';
    } else {
      detectedStartSec = 0;
      startSource = 'title_fallback';
      startReasonLabel = '단편 설교 영상으로 확인되어 처음(00:00)부터 재생합니다.';
    }
  }

  // 4. 성경 본문 구절 자동 추출 (제목 -> 설명란 -> 설교 자막 내 성경봉독 멘트 순)
  let detectedScripture =
    extractScriptureFromText(videoTitle) ||
    extractScriptureFromText(description);

  if (!detectedScripture && transcriptLines.length > 0) {
    const sermonWindowText = transcriptLines
      .filter(
        (l) =>
          l.sec >= Math.max(0, detectedStartSec! - 420) &&
          l.sec <= detectedStartSec! + 480
      )
      .map((l) => l.txt)
      .join(' ');
    detectedScripture = extractScriptureFromText(sermonWindowText);
  }

  // 5. 실제 설교 시작점 이후 자막 발췌본 생성 (AI 정밀 설교 분석 품질 향상용)
  let sermonTranscriptExcerpt = '';
  if (transcriptLines.length > 0) {
    sermonTranscriptExcerpt = transcriptLines
      .filter((l) => l.sec >= detectedStartSec!)
      .map((l) => l.txt.replace(/\[[^\]]+\]/g, '').trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 2800);
  }

  return {
    videoId,
    videoTitle,
    channel,
    description,
    lengthSec,
    thumbnailUrl,
    detectedScripture,
    detectedStartSec,
    detectedStartTime: formatSecToMmSs(detectedStartSec),
    startSource,
    startReasonLabel,
    sermonTranscriptExcerpt,
  };
}
