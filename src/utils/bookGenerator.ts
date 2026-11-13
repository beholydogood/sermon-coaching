import {
  SermonRecord,
  BookProject,
  UploadedMaterial,
  BookChapterDraft,
} from '../types/sermon';

export interface StrategicBookInput {
  bookType: BookProject['bookType'];
  writingStyle: BookProject['writingStyle'];
  authorName: string;
  churchName: string;
  sermons: SermonRecord[];
  materials: UploadedMaterial[];
}

// 문체별 문장 톤 변환 헬퍼
const formatByStyle = (
  style: BookProject['writingStyle'],
  paragraphs: string[]
): string => {
  if (style === '실천 중심 라이프코칭체') {
    return (
      paragraphs.join('\n\n') +
      '\n\n[실천 라이프 코칭 포인트]\n오늘 내가 서 있는 가정과 일터의 자리에서 먼저 믿음의 첫걸음을 내딛으십시오. 작은 순종 하나가 공동체 전체의 영적 기류를 바꿉니다.'
    );
  }
  if (style === '깊이 있는 강해·신학체') {
    return (
      paragraphs.join('\n\n') +
      '\n\n신학적으로 볼 때, 성경 본문이 증언하는 하나님의 언약(Covenant)은 인간의 조건적 성취에 좌우되지 않는 주권적 은총(Sovereign Grace)의 역사입니다.'
    );
  }
  return paragraphs.join('\n\n');
};

// 업로드 자료에서 핵심 문장 추출 헬퍼
const getMaterialKeyExcerpt = (mat: UploadedMaterial, maxLen = 280): string => {
  const raw = (mat.extractedText || mat.summaryPoint || '').trim();
  if (!raw) return mat.fileName;
  const cleanLines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !l.startsWith('[슬라이드'));
  const joined = (cleanLines.length > 0 ? cleanLines.slice(0, 4).join(' ') : raw).slice(0, maxLen);
  return joined;
};

/**
 * 선택된 1개 또는 다수의 설교 영상 + 업로드 자료(PDF/PPT/DOCX/TXT/직접메모)의 실제 본문을 모두 종합 분석하여
 * 전략적 도서 기획안(Proposal)과 챕터별 출판 원고 초안(Chapters)을 생성합니다.
 */
export const buildStrategicBookPlan = (input: StrategicBookInput): {
  proposal: BookProject['proposal'];
  chapters: BookChapterDraft[];
} => {
  const {
    bookType,
    writingStyle,
    authorName,
    churchName,
    sermons,
    materials,
  } = input;

  const targetSermons = sermons && sermons.length > 0 ? sermons : [];
  const count = targetSermons.length;

  const titles = targetSermons.map((s) => s.meta.sermonTitle);
  const scriptures = targetSermons.map((s) => s.meta.scriptureRef);
  const materialNames = materials.map((m) => m.fileName);
  const materialSummaries = materials.map(
    (m) => `『${m.fileName.replace(/\.[^/.]+$/, '')}』(${(m.summaryPoint || getMaterialKeyExcerpt(m, 80)).slice(0, 80)})`
  );

  let mainTitle = '';
  let subTitle = '';
  let alternativeTitles: string[] = [];
  let publishingIntent = '';
  let targetReaders = '';
  let differentiationPoints: string[] = [];
  let editorialNote = '';

  const firstMaterialCleanTitle =
    materials.length > 0
      ? materials[0].fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
      : '';

  if (count <= 1) {
    const s = targetSermons[0];
    const sTitle = s?.meta.sermonTitle || firstMaterialCleanTitle || '은혜의 말씀';
    const sScripture = s?.meta.scriptureRef || '성경 본문 강해';
    const cleanTitle = sTitle
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    mainTitle =
      materials.length > 0
        ? `${cleanTitle}: ${firstMaterialCleanTitle}의 빛으로 읽다`
        : `${cleanTitle}`;
    subTitle =
      materials.length > 0
        ? `${sScripture} 강해 설교와 ${materials.length}종의 목회 연구 자료를 통합한 ${bookType}`
        : `${sScripture} 말씀으로 다시 세우는 ${bookType} 심화 단행본`;

    alternativeTitles = [
      `말씀이 삶이 되는 순간: ${cleanTitle}`,
      materials.length > 0
        ? `${cleanTitle} & ${firstMaterialCleanTitle} 통합 묵상집`
        : `${sScripture}에서 찾은 하나님의 해답`,
      `흔들리는 시대를 건너는 성도의 고백, ${cleanTitle}`,
    ];

    publishingIntent = `본 도서는 ${churchName} ${authorName}의 강단 설교 「${sTitle}」(${sScripture})을 중심축으로 삼고${
      materials.length > 0
        ? `, 함께 등록된 ${materials.length}건의 핵심 연구 자료 — ${materialSummaries.join(', ')} — 의 실제 본문 통찰을 정밀하게 결합하여`
        : ''
    } 단일 설교의 도입·주해·예화·적용·결단을 한 권의 완결된 '${bookType}' 단행본으로 입체화하였습니다.`;

    targetReaders = `1. ${s?.meta.targetAudience || '삶의 갈림길에서 하나님의 뜻을 구하는 성도'}\n2. ${sScripture} 본문${
      materials.length > 0 ? ` 및 '${firstMaterialCleanTitle}' 주제` : ''
    }를 깊이 있게 묵상하고 삶에 적용하고자 하는 그리스도인\n3. 소그룹(순모임·구역예배·제자훈련)에서 체계적인 나눔 교재를 찾는 목회자 및 리더`;

    differentiationPoints = [
      `[설교 심층 확장] 「${sTitle}」 설교의 5단계 타임라인을 각 챕터로 세분화하여 본문(${sScripture})의 깊이를 극대화`,
      materials.length > 0
        ? `[첨부 자료 ${materials.length}종 완전 융합] 업로드된 자료(${materialNames.join(', ')})에서 추출한 핵심 주해·예화·연구 데이터를 모든 장과 심화 챕터에 직접 반영`
        : `[원어 & 적용 통합] 성경 원어의 신학적 배경 해설과 현대 성도의 일상 밀착형 실천 가이드를 동시에 수록`,
      `[${writingStyle} 맞춤 윤문] 강단 구어체의 추임새를 걷어내고 독자의 내면을 두드리는 출판 전문 문체로 정밀 교정`,
    ];

    editorialNote = `[설교 1편 + 자료 ${materials.length}건 통합 전략] 선택하신 설교(「${sTitle}」)의 흐름에 ${
      materials.length > 0
        ? `업로드하신 자료(${materialNames.join(', ')})의 실제 추출 텍스트를 챕터 본문과 심화 장에 유기적으로 직조(Weaving)하여`
        : '깊이 있는 묵상 질문과 기도문을 더해'
    } 단행본 완성도를 높였습니다.`;
  } else {
    // 2편 이상 다중 설교 선택 + 업로드 자료 통합 전략 기획
    const firstTitle = titles[0] || '은혜의 말씀';
    const lastTitle = titles[titles.length - 1] || '승리의 삶';
    const firstKeyword = firstTitle.split(' ')[0].replace(/[^가-힣a-zA-Z0-9]/g, '') || '말씀';
    const lastKeyword = lastTitle.split(' ').slice(-1)[0].replace(/[^가-힣a-zA-Z0-9]/g, '') || '소망';

    mainTitle =
      materials.length > 0
        ? `${firstKeyword}에서 ${lastKeyword}까지: ${firstMaterialCleanTitle} 통합 강해`
        : `${firstKeyword}에서 ${lastKeyword}까지, 말씀이 이끄는 길`;

    subTitle =
      materials.length > 0
        ? `${count}편의 연속 설교(${scriptures.join(' · ')})와 ${materials.length}종의 목회 연구 자료로 완성한 ${bookType}`
        : `${scriptures.join(' · ')} 강해로 엮어낸 ${count}편의 영적 회복 오디세이`;

    alternativeTitles = [
      `광야 같은 세상에서 붙잡은 ${count}가지 하나님의 약속 (${scriptures[0]} 외)`,
      materials.length > 0
        ? `${firstMaterialCleanTitle}: ${titles[0]} 외 ${count - 1}편 통합 단행본`
        : `「${titles[0]}」에서 「${titles[1] || lastTitle}」로 이어지는 은혜의 여정`,
      `${authorName}의 ${bookType}: 흔들리지 않는 성도의 삶`,
    ];

    const sermonFlowSummary = targetSermons
      .map((s, idx) => `제${idx + 1}부 「${s.meta.sermonTitle}」(${s.meta.scriptureRef})`)
      .join(' → ');

    publishingIntent = `[다중 설교(${count}편) + 참고자료(${materials.length}건) 통합 전략 기획] 본 도서는 ${churchName} ${authorName}가 선포한 ${count}편의 설교(${sermonFlowSummary})를 하나의 일관된 구속사적 서사로 재설계하고${
      materials.length > 0
        ? `, 여기에 업로드된 ${materials.length}건의 실제 연구 문서 — ${materialSummaries.join(', ')} — 의 신학적·목회적 핵심 내용을 각 부(Part)와 심화 챕터에 직접 결합하여`
        : ''
    } 독자가 책을 읽는 동안 입체적인 말씀의 깊이와 삶의 변화를 경험하도록 기획되었습니다.`;

    const uniqueAudiences = Array.from(
      new Set(targetSermons.map((s) => s.meta.targetAudience).filter(Boolean))
    );
    targetReaders =
      uniqueAudiences.length > 0
        ? uniqueAudiences.slice(0, 3).map((aud, i) => `${i + 1}. ${aud}`).join('\n') +
          `\n${Math.min(uniqueAudiences.length, 3) + 1}. ${scriptures.join(', ')} 말씀${
            materials.length > 0 ? `과 첨부 연구자료(${materialNames.join(', ')})` : ''
          }를 통합 교재로 활용하려는 목회자 및 소그룹 리더`
        : `1. 삶의 고난과 변화의 기로에서 성경적 해답을 찾는 성도\n2. ${scriptures.join(', ')} 본문을 체계적으로 묵상하려는 성도`;

    differentiationPoints = [
      `[${count}편 설교 전편 반영] ${titles.map((t) => `「${t}」`).join(' + ')} 설교를 누락 없이 제1부~제${count}부의 기승전결 구조로 편성`,
      materials.length > 0
        ? `[업로드 자료 ${materials.length}종 실제 본문 통합] ${materialNames.join(', ')}에서 추출한 핵심 문장과 주해 포인트를 설교 원고 내부와 특별 심화 장에 직접 수록`
        : `[다중 성경 본문 교차 강해] ${scriptures.join(' / ')} 본문을 상호 연결하여 구속사적 통전성 확보`,
      `[출판 문체(${writingStyle}) 일관 윤문] 여러 주일에 걸쳐 선포된 설교들과 문서 자료의 문체를 한 권의 매끄러운 출판 원고 톤으로 통일`,
    ];

    editorialNote = `[통합 편성 가이드] 선택된 ${count}편의 설교 영상과 ${materials.length}건의 업로드 자료를 모두 교차 분석하여 총 ${
      count * 2 + materials.length
    }개 챕터로 구성했습니다. 각 설교의 현장감 있는 메시지에 업로드 자료의 깊이 있는 텍스트가 자연스럽게 녹아들도록 윤문했습니다.`;
  }

  // 챕터 구성 생성
  const generatedChapters: BookChapterDraft[] = [];

  if (count <= 1 && targetSermons[0]) {
    const s = targetSermons[0];
    const tl = s.timeline || [];
    const introItem = tl[0];
    const exegesisItem = tl[1] || tl[0];
    const illustItem = tl[2] || tl[1] || tl[0];
    const applyItem = tl[3] || tl[tl.length - 1];
    const prayerItem = tl[4] || tl[tl.length - 1];
    const mat0 = materials[0];

    // Chapter 1: 도입 & 문제제기 (+ 첫 자료 핵심 배경 반영)
    generatedChapters.push({
      chapterNum: 1,
      partTitle: `제1부 | 삶의 질문 앞에서 (${s.meta.sermonTitle})`,
      chapterTitle: introItem
        ? introItem.title.replace(/^도입.*?:\s*/, '')
        : `왜 우리 삶에는 「${s.meta.sermonTitle}」의 은혜가 필요한가`,
      subtitle: `${s.meta.targetAudience}의 현실 속에서 하나님의 음성을 듣다`,
      scriptureFocus: s.meta.scriptureRef,
      coreMessage:
        introItem?.summary ||
        s.summary ||
        '인생의 막막한 한계는 하나님께서 일하시기 시작하는 은혜의 출발점이다.',
      subSections: [
        `1. ${s.meta.targetAudience}이 마주한 솔직한 한숨`,
        `2. ${s.meta.scriptureRef} 말씀이 던지는 거룩한 질문`,
        mat0
          ? `3. 참고자료(${mat0.fileName})가 비추는 목회적 배경`
          : `3. 흔들리는 감정 너머에 있는 언약의 반석`,
      ],
      manuscriptDraft: formatByStyle(writingStyle, [
        `살다 보면 누구나 예상치 못한 인생의 밤을 마주하곤 합니다. ${s.meta.targetAudience}의 자리에서 우리는 종종 "주님, 지금 어디에 계십니까?"라고 조용히 되묻게 됩니다.`,
        `${introItem?.quote ? `"${introItem.quote}"\n` : ''}설교 「${s.meta.sermonTitle}」이 선포하는 첫 번째 메시지는 바로 그 아픔의 자리를 외면하지 않으시는 하나님의 시선입니다. ${s.summary}`,
        mat0
          ? `특별히 함께 연구된 자료 『${mat0.fileName}』에서는 이러한 시대적·영적 정황을 다음과 같이 짚어 줍니다.\n"${getMaterialKeyExcerpt(mat0, 260)}"`
          : `성경 ${s.meta.scriptureRef}은 우리의 연약함과 두려움을 정죄하지 않고, 오히려 그 지점에서 하나님의 신실하신 구원 섭리가 어떻게 시작되는지를 선명하게 보여줍니다.`,
      ]),
      reflectionQuestions: [
        s.smallGroupQuestions?.[0]?.question ||
          `오늘 「${s.meta.sermonTitle}」 말씀 앞에서 내가 주님께 가장 솔직하게 내려놓아야 할 마음의 짐은 무엇입니까?`,
        `내 감정과 상황보다 앞서 신뢰해야 할 ${s.meta.scriptureRef}의 약속은 무엇입니까?`,
      ],
      closingPrayer: `사랑의 주님, 우리의 연약한 한숨을 아시고 ${s.meta.scriptureRef} 말씀으로 찾아와 주시니 감사합니다. 세상의 소음 대신 주님의 세미한 음성에 귀 기울이게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
      wordCount: 780,
    });

    // Chapter 2: 본문 심층 강해
    const verseInfo = s.scriptureVerses?.[0];
    const matForExegesis = materials[1] || materials[0];
    generatedChapters.push({
      chapterNum: 2,
      partTitle: `제1부 | 삶의 질문 앞에서 (${s.meta.sermonTitle})`,
      chapterTitle: exegesisItem
        ? exegesisItem.title.replace(/^본문.*?:\s*/, '')
        : `${s.meta.scriptureRef} 본문 속에 담긴 하나님의 설계도`,
      subtitle: verseInfo?.greekOrHebrewKeyword
        ? `원어(${verseInfo.greekOrHebrewKeyword})와 주해 자료로 풀어보는 말씀의 본질`
        : `${s.meta.scriptureRef}의 신학적 문맥과 구속사적 은혜`,
      scriptureFocus: s.meta.scriptureRef,
      coreMessage:
        exegesisItem?.summary ||
        verseInfo?.pastoralPoint ||
        `${s.meta.scriptureRef}이 증언하는 하나님의 주권은 성도의 삶을 결코 실패로 끝나지 않게 한다.`,
      subSections: [
        `1. ${s.meta.scriptureRef}의 역사적·성경적 배경`,
        verseInfo?.greekOrHebrewKeyword
          ? `2. 원어 '${verseInfo.greekOrHebrewKeyword}'가 품은 깊은 의미`
          : `2. 본문 핵심 구절이 선포하는 복음의 능력`,
        matForExegesis
          ? `3. 『${matForExegesis.fileName}』 심화 주해 연결`
          : `3. 오늘 우리의 삶을 다시 해석하는 성경적 렌즈`,
      ],
      manuscriptDraft: formatByStyle(writingStyle, [
        `성경 본문 ${s.meta.scriptureRef}을 천천히 읽어 내려가다 보면, 그 행간에 흐르는 하나님의 뜨거운 마음을 만나게 됩니다.${
          verseInfo?.koreanText ? `\n\n"${verseInfo.koreanText}" (${s.meta.scriptureRef})` : ''
        }`,
        `${exegesisItem?.summary || ''} ${
          verseInfo?.originalMeaning
            ? `본문의 원어적 의미를 살펴보면 '${verseInfo.originalMeaning}'라는 뜻이 담겨 있습니다. ${verseInfo.pastoralPoint || ''}`
            : ''
        }`,
        matForExegesis
          ? `여기에 목회 연구 자료 『${matForExegesis.fileName}』의 분석을 더하면 본문의 입체감이 한층 또렷해집니다.\n"${getMaterialKeyExcerpt(matForExegesis, 260)}"\n이처럼 말씀의 주인이신 하나님께 시선을 고정할 때 비로소 참된 평안과 길이 열리기 시작합니다.`
          : `${exegesisItem?.quote ? `"${exegesisItem.quote}"\n` : ''}내 삶의 주도권을 말씀의 주인이신 하나님께 내어드릴 때 비로소 참된 평안과 길이 열리기 시작합니다.`,
      ]),
      reflectionQuestions: [
        `${s.meta.scriptureRef} 본문 중에서 오늘 내 마음에 가장 새롭게 다가온 단어는 무엇입니까?`,
        `내 삶을 바라보던 시선을 하나님의 관점으로 바꿀 때 무엇이 달라집니까?`,
      ],
      closingPrayer: `말씀의 주인이신 하나님, ${s.meta.scriptureRef}의 진리가 지식이 아니라 내 삶을 지탱하는 생명의 능력이 되게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
      wordCount: 830,
    });

    // Chapter 3: 예화 & 삶의 적용
    generatedChapters.push({
      chapterNum: 3,
      partTitle: `제2부 | 말씀으로 살아내는 일상`,
      chapterTitle: applyItem
        ? applyItem.title.replace(/^.*?적용\s*:\s*/, '')
        : `일상에서 증명되는 「${s.meta.sermonTitle}」의 능력`,
      subtitle: illustItem?.title || '깨어진 자리에서 피어나는 복음의 열매',
      scriptureFocus: s.meta.scriptureRef,
      coreMessage:
        applyItem?.summary ||
        '말씀은 예배당 안에 머물지 않고 성도의 월요일 일터와 가정에서 열매 맺어야 한다.',
      subSections: [
        `1. ${illustItem?.title || '삶의 현장에서 경험하는 은혜의 간증'}`,
        `2. ${applyItem?.title || '이번 주 우리가 실천할 구체적 믿음의 결단'}`,
        `3. 작은 순종이 가져오는 공동체의 회복`,
      ],
      manuscriptDraft: formatByStyle(writingStyle, [
        `${illustItem?.summary || '신앙의 진가는 예배당 문을 나서서 마주하는 평범한 일상 속에서 드러납니다.'}\n${
          illustItem?.quote ? `"${illustItem.quote}"` : ''
        }`,
        `우리는 어떻게 「${s.meta.sermonTitle}」의 은혜를 매일의 삶 속에서 구체적으로 살아낼 수 있을까요? ${
          applyItem?.summary || '그것은 거창한 구호가 아니라 오늘 내 입술의 고백과 작은 행동의 변화에서 시작됩니다.'
        }`,
        `${applyItem?.quote ? `"${applyItem.quote}"\n` : ''}${
          prayerItem?.summary || ''
        } 지금 내가 서 있는 가정과 일터가 바로 하나님께서 나를 파송하신 거룩한 성전임을 기억하십시오.`,
      ]),
      reflectionQuestions: [
        s.smallGroupQuestions?.[1]?.question ||
          `이번 주 내 삶의 현장에서 당장 실천할 수 있는 한 가지 믿음의 행동은 무엇입니까?`,
        `내 주변에 이 말씀의 위로가 필요한 이웃이나 지체는 누구입니까?`,
      ],
      closingPrayer: `주님, 듣는 자에 머물지 않고 말씀대로 행하는 복된 성도가 되게 하옵소서. 나의 일상이 하나님 나라의 통로가 되기를 소망하며 예수님의 이름으로 기도드립니다. 아멘.`,
      wordCount: 760,
    });

    // 업로드된 각 참고자료(PDF/PPT/DOCX/TXT)마다 전용 심화 챕터를 생성하여 빠짐없이 수록!
    materials.forEach((mat, mIdx) => {
      const cleanMatName = mat.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      generatedChapters.push({
        chapterNum: 4 + mIdx,
        partTitle: `제3부 | 첨부 연구자료 심화 강해 & 워크북`,
        chapterTitle: `${cleanMatName}`,
        subtitle: `[${mat.fileType.toUpperCase()} 자료 기반 집필] 「${s.meta.sermonTitle}」과 함께 읽는 심화 통찰`,
        scriptureFocus: s.meta.scriptureRef,
        coreMessage: mat.summaryPoint || `${cleanMatName} 자료의 핵심 신학 및 목회 실천 정리`,
        subSections: [
          `1. 『${cleanMatName}』 핵심 문제의식과 배경`,
          `2. 자료 본문에서 도출한 성경적·신학적 통찰`,
          `3. 설교 「${s.meta.sermonTitle}」과의 통합 적용점`,
        ],
        manuscriptDraft: formatByStyle(writingStyle, [
          `강단에서 선포된 「${s.meta.sermonTitle}」(${s.meta.scriptureRef})의 메시지를 더욱 깊이 있게 뿌리내리기 위해, 함께 준비된 연구 자료 『${mat.fileName}』의 핵심 내용을 출판 원고로 풀어냅니다.`,
          `${mat.extractedText}`,
          `위의 자료가 강조하는 핵심 요지("${mat.summaryPoint || cleanMatName}")는 결국 ${s.meta.scriptureRef} 말씀이 오늘 우리의 삶 한복판에서 어떻게 구체적인 열매로 이어져야 하는지를 선명하게 보여 줍니다.`,
        ]),
        reflectionQuestions: [
          `『${cleanMatName}』 자료의 내용 중 내 신앙을 가장 깊이 돌아보게 한 대목은 무엇입니까?`,
          `설교 말씀과 이 자료의 가르침을 이번 주 우리 가정과 일터에 어떻게 적용하시겠습니까?`,
        ],
        closingPrayer: `진리의 성령님, 강단의 말씀과 『${cleanMatName}』의 깊은 묵상을 통해 우리의 지성과 영성이 함께 자라나게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
        wordCount: Math.max(700, (mat.extractedText || '').length + 320),
      });
    });
  } else {
    // 2편 이상 다중 설교 선택 시: 모든 선택 설교(1~N편) + 업로드된 모든 자료를 빠짐없이 전략 편성!
    let chapCounter = 1;

    targetSermons.forEach((s, sIdx) => {
      const partLabel = `제${sIdx + 1}부 | ${s.meta.sermonTitle} (${s.meta.scriptureRef})`;
      const tl = s.timeline || [];
      const introTl = tl[0];
      const exegesisTl = tl[1] || tl[0];
      const illustTl = tl[2];
      const applyTl = tl[3] || tl[tl.length - 1];
      const prayerTl = tl[4] || tl[tl.length - 1];
      const verse0 = s.scriptureVerses?.[0];
      const pairedMaterial = materials.length > 0 ? materials[sIdx % materials.length] : undefined;

      // 각 설교별 [장 A: 도입 & 본문 심층 강해 + 매칭된 참고자료 통찰]
      generatedChapters.push({
        chapterNum: chapCounter++,
        partTitle: partLabel,
        chapterTitle: `${s.meta.sermonTitle}: 말씀의 깊은 샘으로`,
        subtitle:
          exegesisTl?.title ||
          `${s.meta.scriptureRef} 본문을 통해 바라본 하나님의 섭리`,
        scriptureFocus: s.meta.scriptureRef,
        coreMessage:
          s.summary ||
          `${s.meta.scriptureRef} 말씀은 ${s.meta.targetAudience}에게 참된 소망과 회복의 길을 열어 준다.`,
        subSections: [
          `1. ${introTl?.title || '현실의 자리에서 마주하는 영적 질문'}`,
          `2. ${exegesisTl?.title || `${s.meta.scriptureRef} 핵심 본문 주해`}`,
          pairedMaterial
            ? `3. 참고자료 『${pairedMaterial.fileName}』 연계 통찰`
            : `3. ${s.keyStrengths?.[0] || '본문이 선포하는 하나님의 약속'}`,
        ],
        manuscriptDraft: formatByStyle(writingStyle, [
          `[설교 ${sIdx + 1}: 「${s.meta.sermonTitle}」 (${s.meta.scriptureRef} / ${s.meta.date}) 기반 집필]\n\n${
            introTl?.summary || ''
          } ${s.meta.targetAudience}의 걸음 속에서 주님께서는 ${
            s.meta.scriptureRef
          } 말씀을 통해 우리에게 분명한 음성을 들려주십니다.`,
          `${verse0?.koreanText ? `"${verse0.koreanText}" (${s.meta.scriptureRef})\n\n` : ''}${s.summary}`,
          `${exegesisTl?.summary || ''} ${
            verse0?.originalMeaning
              ? `본문 원어(${verse0.greekOrHebrewKeyword || ''})가 보여주는 '${verse0.originalMeaning}'의 은혜가 오늘 우리의 삶을 붙들고 있습니다.`
              : ''
          }`,
          ...(pairedMaterial
            ? [
                `또한 함께 수록된 목회 자료 『${pairedMaterial.fileName}』에서는 이 주제를 더욱 깊이 조명합니다.\n"${getMaterialKeyExcerpt(
                  pairedMaterial,
                  240
                )}"`,
              ]
            : []),
        ]),
        reflectionQuestions: [
          s.smallGroupQuestions?.[0]?.question ||
            `「${s.meta.sermonTitle}」(${s.meta.scriptureRef}) 말씀 중 오늘 내게 주시는 하나님의 음성은 무엇입니까?`,
          `${s.meta.scriptureRef}의 약속을 내 삶의 문제에 적용할 때 어떤 소망이 생깁니까?`,
        ],
        closingPrayer: `주님, 제${sIdx + 1}부 「${s.meta.sermonTitle}」(${s.meta.scriptureRef}) 말씀을 통해 저의 닫힌 시선을 열어 주시니 감사합니다. 예수님의 이름으로 기도드립니다. 아멘.`,
        wordCount: 840,
      });

      // 각 설교별 [장 B: 삶의 적용 & 다음 설교로의 유기적 브릿지]
      generatedChapters.push({
        chapterNum: chapCounter++,
        partTitle: partLabel,
        chapterTitle: `${
          applyTl?.title.replace(/^.*?적용\s*:\s*/, '') ||
          `「${s.meta.sermonTitle}」을 삶으로 살아내다`
        }`,
        subtitle:
          illustTl?.title ||
          `${s.meta.scriptureRef} 말씀이 일터와 가정에서 열매 맺는 영적 원리`,
        scriptureFocus: s.meta.scriptureRef,
        coreMessage:
          applyTl?.summary ||
          `선포된 ${s.meta.scriptureRef} 말씀은 성도의 구체적인 일상 순종을 통해 완성된다.`,
        subSections: [
          `1. ${illustTl?.title || '삶의 현장에서 피어난 은혜의 이야기'}`,
          `2. ${applyTl?.title || '이번 주간 실천할 구체적 결단'}`,
          `3. ${prayerTl?.title || '그리스도의 은혜로 세상에 파송되는 삶'}`,
        ],
        manuscriptDraft: formatByStyle(writingStyle, [
          `${
            illustTl?.summary ||
            `「${s.meta.sermonTitle}」의 진리는 머리로만 아는 지식이 아니라 우리의 손과 발을 통해 살아 움직이는 능력입니다.`
          }\n${illustTl?.quote ? `"${illustTl.quote}"` : ''}`,
          `${
            applyTl?.summary ||
            `${s.meta.scriptureRef} 말씀을 붙잡은 성도는 어제와 같은 방식으로 절망하지 않습니다.`
          } ${
            sIdx < count - 1
              ? `이 은혜의 결단은 다음 부에서 이어질 「${targetSermons[sIdx + 1].meta.sermonTitle}」(${targetSermons[sIdx + 1].meta.scriptureRef})의 비전으로 더욱 넓게 확장됩니다.`
              : `이로써 앞서 나눈 ${count}편의 말씀(${titles.map((t) => `「${t}」`).join(', ')})이 하나의 온전한 순종으로 완성됩니다.`
          }`,
          `${applyTl?.quote ? `"${applyTl.quote}"\n` : ''}${prayerTl?.summary || ''}`,
        ]),
        reflectionQuestions: [
          s.smallGroupQuestions?.[1]?.question ||
            `「${s.meta.sermonTitle}」의 가르침 중 이번 주 내가 가정과 일터에서 바로 실천할 한 가지는 무엇입니까?`,
          `이 말씀을 통해 위로하고 섬겨야 할 내 주변의 이웃은 누구입니까?`,
        ],
        closingPrayer: `은혜의 아버지 하나님, 「${s.meta.sermonTitle}」 말씀이 나의 입술의 고백과 삶의 열매가 되게 하옵소서. 예수 그리스도의 이름으로 기도드립니다. 아멘.`,
        wordCount: 790,
      });
    });

    // 업로드된 각 참고자료(PDF/PPT/DOCX/TXT)를 개별 심화 챕터로도 완결성 있게 편성!
    materials.forEach((mat, mIdx) => {
      const cleanMatName = mat.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      generatedChapters.push({
        chapterNum: chapCounter++,
        partTitle: `특별부록 & 연구통합 | 목회 참고자료 심화편 (${mIdx + 1}/${materials.length})`,
        chapterTitle: `${cleanMatName} 심화 강해`,
        subtitle: `[업로드 자료 통합] ${count}편의 설교(${scriptures.join(' · ')})와 함께 읽는 『${mat.fileName}』`,
        scriptureFocus: scriptures.join(' / '),
        coreMessage:
          mat.summaryPoint ||
          `선포된 ${count}편의 강단 말씀과 『${cleanMatName}』 연구 자료를 통합하여 성도의 전인적 성숙을 돕는다.`,
        subSections: [
          `1. 『${cleanMatName}』 핵심 내용 요약 및 신학적 뼈대`,
          `2. ${count}편의 설교(${titles.slice(0, 2).join(', ')}${count > 2 ? ' 외' : ''})와의 교차 적용`,
          `3. 성도와 소그룹을 위한 실천 가이드`,
        ],
        manuscriptDraft: formatByStyle(writingStyle, [
          `[업로드 참고자료 『${mat.fileName}』 통합 원고]\n지금까지 살펴본 ${count}편의 설교 — ${targetSermons
            .map((s) => `「${s.meta.sermonTitle}」(${s.meta.scriptureRef})`)
            .join(', ')} — 를 더욱 풍성하게 이해하기 위해, 저자가 함께 준비한 『${cleanMatName}』의 핵심 내용을 정리합니다.`,
          `${mat.extractedText}`,
          `이처럼 강단에서 선포된 생생한 음성 설교와 『${cleanMatName}』의 탄탄한 연구 자료가 만날 때, 독자는 말씀의 감동과 신학적 깊이를 동시에 누리게 됩니다.`,
        ]),
        reflectionQuestions: [
          `『${cleanMatName}』의 내용과 앞서 읽은 ${count}편의 설교가 만나는 핵심 공통 메시지는 무엇입니까?`,
          `이 책을 덮으며 앞으로 한 달 동안 주님 앞에 드릴 나의 신앙 결단문을 작성해 보십시오.`,
        ],
        closingPrayer: `알파와 오메가 되시는 주님, ${count}편의 말씀과 『${cleanMatName}』의 귀한 연구를 통해 우리의 영혼을 새롭게 빚어 주시니 감사합니다. 평생 말씀의 사람으로 살아가게 하옵소서. 아멘.`,
        wordCount: Math.max(780, (mat.extractedText || '').length + 340),
      });
    });
  }

  return {
    proposal: {
      mainTitle,
      subTitle,
      alternativeTitles,
      publishingIntent,
      targetReaders,
      differentiationPoints,
      editorialNote,
    },
    chapters: generatedChapters,
  };
};
