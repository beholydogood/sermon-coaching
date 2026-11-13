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
  if (style === '짧고 강렬한 묵상집(QT)체') {
    return paragraphs
      .map((p) =>
        p
          .replace(/습니다\./g, '습니다.\n')
          .replace(/입니다\./g, '입니다.\n')
      )
      .join('\n\n');
  }
  if (style === '실천적 리더십/코칭체') {
    return (
      paragraphs.join('\n\n') +
      '\n\n[리더십 코칭 포인트]\n오늘 내가 서 있는 가정과 일터의 자리에서 먼저 믿음의 첫걸음을 내딛으십시오. 작은 순종 하나가 공동체 전체의 영적 기류를 바꿉니다.'
    );
  }
  if (style === '깊이 있는 강해/신학체') {
    return (
      paragraphs.join('\n\n') +
      '\n\n신학적으로 볼 때, 성경 본문이 증언하는 하나님의 언약(Covenant)은 인간의 조건적 성취에 좌우되지 않는 주권적 은총(Sovereign Grace)의 역사입니다.'
    );
  }
  return paragraphs.join('\n\n');
};

/**
 * 선택된 1개 또는 다수의 설교 영상 + 업로드 자료(PDF/PPT 등)를 모두 종합 분석하여
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

  // 1. 단일 설교 선택 vs 다중 설교(2편 이상) 선택에 따른 전략적 도서 제목 & 기획 의도 도출
  let mainTitle = '';
  let subTitle = '';
  let alternativeTitles: string[] = [];
  let publishingIntent = '';
  let targetReaders = '';
  let differentiationPoints: string[] = [];
  let editorialNote = '';

  if (count === 1) {
    const s = targetSermons[0];
    const cleanTitle = s.meta.sermonTitle
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    mainTitle = `${cleanTitle}`;
    subTitle = `${s.meta.scriptureRef} 말씀으로 다시 세우는 ${bookType} 심화 단행본`;
    alternativeTitles = [
      `말씀이 삶이 되는 순간: ${cleanTitle}`,
      `${s.meta.scriptureRef}에서 찾은 하나님의 해답`,
      `흔들리는 시대를 건너는 성도의 고백, ${cleanTitle}`,
    ];
    publishingIntent = `본 도서는 ${churchName} ${authorName}의 핵심 강해 설교인 「${s.meta.sermonTitle}」(${s.meta.scriptureRef}) 1편을 심층 해부하고${
      materialNames.length > 0
        ? ` 함께 업로드된 참고 자료(${materialNames.join(', ')})의 신학적·목회적 연구 내용을 결합하여`
        : ''
    }, 단일 본문이 품고 있는 도입-원어주해-예화-삶의적용-결단기도의 5단 구속사적 흐름을 한 권의 완결된 '${bookType}' 단행본으로 깊이 있게 확장 기획하였습니다.`;

    targetReaders = `1. ${s.meta.targetAudience || '삶의 갈림길에서 하나님의 뜻을 구하는 성도'}\n2. ${s.meta.scriptureRef} 본문을 깊이 있게 묵상하고 삶에 적용하고자 하는 그리스도인\n3. 소그룹(순모임·구역예배)에서 한 가지 성경 주제를 집중적으로 나누고자 하는 리더`;

    differentiationPoints = [
      `[단일 설교 심층 확장] 「${s.meta.sermonTitle}」 설교의 5단계 타임라인을 각 챕터로 세분화하여 성경 본문(${s.meta.scriptureRef})의 깊이를 극대화`,
      materialNames.length > 0
        ? `[문서 자료 융합] 업로드된 ${materialNames.length}종의 부교재(${materialNames[0]} 등) 핵심 주해와 목회 데이터를 본문 원고에 유기적으로 통합`
        : `[원어 & 적용 통합] 성경 원어의 신학적 배경 해설과 현대 성도의 일상 밀착형 실천 가이드를 동시에 수록`,
      `[${writingStyle} 맞춤 윤문] 강단 구어체의 추임새를 제거하고 독자의 내면을 두드리는 출판 전문 문체로 정밀 교정`,
    ];

    editorialNote = `[단일 설교 집중 기획 전략] 선택하신 1편의 설교(「${s.meta.sermonTitle}」)가 가진 5개 구간(도입 후크 → 본문 주해 → 감동 예화 → 3대 실천 적용 → 결단 기도)을 각각 독립된 장(Chapter 1~4)으로 확장하고, ${
      materialNames.length > 0 ? `첨부 자료(${materialNames.join(', ')})를 부록/심화 챕터로 엮어` : '묵상 질문과 기도문을 더해'
    } 밀도 높은 단행본으로 구성했습니다.`;
  } else {
    // 2편 이상 다중 설교 선택 시: 전체 설교를 관통하는 전략적 통합 시리즈 기획!
    const firstTitle = titles[0] || '은혜의 말씀';
    const lastTitle = titles[titles.length - 1] || '승리의 삶';
    const firstKeyword = firstTitle.split(' ')[0].replace(/[^가-힣a-zA-Z0-9]/g, '');
    const lastKeyword = lastTitle.split(' ').slice(-1)[0].replace(/[^가-힣a-zA-Z0-9]/g, '');

    mainTitle = `${firstKeyword}에서 ${lastKeyword}까지, 말씀이 이끄는 길`;
    subTitle = `${scriptures.join(' · ')} 강해로 엮어낸 ${count}편의 영적 회복 오디세이`;
    alternativeTitles = [
      `광야 같은 세상에서 붙잡은 ${count}가지 하나님의 약속 (${scriptures[0]} 외)`,
      `「${titles[0]}」에서 「${titles[1] || lastTitle}」로 이어지는 은혜의 여정`,
      `${authorName}의 ${bookType} 특강: 흔들리지 않는 성도의 삶`,
    ];

    const sermonFlowSummary = targetSermons
      .map(
        (s, idx) =>
          `[제${idx + 1}부: 「${s.meta.sermonTitle}」(${s.meta.scriptureRef})]`
      )
      .join(' → ');

    publishingIntent = `[다중 설교(${count}편) 통합 전략 기획] 본 도서는 단편 설교의 단순 모음집이 아닙니다. ${churchName} ${authorName}가 선포한 ${count}편의 설교(${sermonFlowSummary})를 하나의 거대한 신앙 성장 서사(Narrative Arc)로 재설계하였습니다. 첫 설교 「${titles[0]}」에서 성도의 실존적 질문을 열고, 이어지는 설교(${titles.slice(1).join(', ')})를 통해 성경적 해답과 삶의 변혁으로 나아가며${
      materialNames.length > 0
        ? `, 업로드된 ${materialNames.length}건의 심화 자료(${materialNames.join(', ')})를 각 부의 신학적 뼈대로 결합하여`
        : ''
    } 독자가 책을 읽는 동안 단계적인 영적 성숙을 경험하도록 전략적으로 기획되었습니다.`;

    const uniqueAudiences = Array.from(
      new Set(targetSermons.map((s) => s.meta.targetAudience).filter(Boolean))
    );
    targetReaders =
      uniqueAudiences.length > 0
        ? uniqueAudiences.map((aud, i) => `${i + 1}. ${aud}`).join('\n') +
          `\n${uniqueAudiences.length + 1}. ${scriptures.join(', ')} 말씀을 종합적으로 묵상하며 양육 교재로 활용하려는 목회자 및 소그룹 리더`
        : `1. 삶의 고난과 변화의 기로에서 성경적 해답을 찾는 성도\n2. ${scriptures.join(', ')} 본문을 통해 신앙의 기초부터 성숙까지 체계적으로 세우려는 성도`;

    differentiationPoints = [
      `[${count}편 설교의 입체적 스토리텔링] ${titles.map((t) => `「${t}」`).join(' + ')} 설교를 '질문 → 주해 → 회복 → 파송'의 기승전결 구조로 통합 편성`,
      `[다중 성경 본문 교차 강해] ${scriptures.join(' / ')} 본문을 상호 연결하여 구속사적 통전성 확보`,
      materialNames.length > 0
        ? `[설교 영상 + ${materialNames.length}종 문서 자료 결합] 설교의 현장감과 문서 자료(${materialNames.join(', ')})의 체계적 지식을 결합한 하이브리드 ${bookType}`
        : `[소그룹 & 개인 묵상 완벽 대응] 각 설교에서 도출된 핵심 적용점과 나눔 질문을 챕터별 워크북 형태로 수록`,
    ];

    editorialNote = `[다중 설교(${count}편) 전략 편성 가이드] 선택하신 ${count}편의 설교가 서로 중복되지 않고 시너지를 내도록, 각 설교의 핵심 명제(Big Idea)와 타임라인을 분석하여 총 ${count}부(Part) 체제로 배치했습니다. 구어체 설교를 '${writingStyle}'로 통일감 있게 윤문하여 한 권의 처음부터 끝까지 매끄럽게 읽히도록 구성했습니다.`;
  }

  // 2. 선택된 설교 수(1개 vs 여러 개) 및 업로드 자료에 맞춘 전략적 챕터(Chapters) 및 초안 생성
  const generatedChapters: BookChapterDraft[] = [];

  if (count === 1) {
    // 1편 선택 시: 해당 설교의 타임라인 구간들을 심층 챕터(4개 장)로 세분화 확장
    const s = targetSermons[0];
    const tl = s.timeline || [];
    const introItem = tl[0];
    const exegesisItem = tl[1] || tl[0];
    const illustItem = tl[2] || tl[1] || tl[0];
    const applyItem = tl[3] || tl[tl.length - 1];
    const prayerItem = tl[4] || tl[tl.length - 1];

    // Chapter 1: 도입 & 문제제기
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
        `3. 흔들리는 감정 너머에 있는 언약의 반석`,
      ],
      manuscriptDraft: formatByStyle(writingStyle, [
        `살다 보면 누구나 예상치 못한 인생의 밤을 마주하곤 합니다. ${s.meta.targetAudience}의 자리에서 우리는 종종 "주님, 지금 어디에 계십니까?"라고 조용히 되묻게 됩니다.`,
        `${introItem?.quote ? `"${introItem.quote}"\n` : ''}설교 「${s.meta.sermonTitle}」이 선포하는 첫 번째 메시지는 바로 그 아픔의 자리를 외면하지 않으시는 하나님의 시선입니다. ${s.summary}`,
        `성경 ${s.meta.scriptureRef}은 우리의 연약함과 두려움을 정죄하지 않습니다. 오히려 우리의 힘으로 어찌할 수 없는 바로 그 지점에서 하나님의 신실하신 구원 섭리가 어떻게 시작되는지를 선명하게 보여줍니다. 이제 그 말씀의 깊은 우물 속으로 함께 걸어가 보려 합니다.`,
      ]),
      reflectionQuestions: [
        s.smallGroupQuestions?.[0]?.question ||
          `오늘 「${s.meta.sermonTitle}」 말씀 앞에서 내가 주님께 가장 솔직하게 내려놓아야 할 마음의 짐은 무엇입니까?`,
        `내 감정과 상황보다 앞서 신뢰해야 할 ${s.meta.scriptureRef}의 약속은 무엇입니까?`,
      ],
      closingPrayer: `사랑의 주님, 우리의 연약한 한숨을 아시고 ${s.meta.scriptureRef} 말씀으로 찾아와 주시니 감사합니다. 세상의 소음 대신 주님의 세미한 음성에 귀 기울이게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
      wordCount: 720,
    });

    // Chapter 2: 본문 심층 강해
    const verseInfo = s.scriptureVerses?.[0];
    generatedChapters.push({
      chapterNum: 2,
      partTitle: `제1부 | 삶의 질문 앞에서 (${s.meta.sermonTitle})`,
      chapterTitle: exegesisItem
        ? exegesisItem.title.replace(/^본문.*?:\s*/, '')
        : `${s.meta.scriptureRef} 본문 속에 담긴 하나님의 설계도`,
      subtitle: verseInfo?.greekOrHebrewKeyword
        ? `원어(${verseInfo.greekOrHebrewKeyword})로 풀어보는 말씀의 본질`
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
        `3. 오늘 우리의 삶을 다시 해석하는 성경적 렌즈`,
      ],
      manuscriptDraft: formatByStyle(writingStyle, [
        `성경 본문 ${s.meta.scriptureRef}을 천천히 읽어 내려가다 보면, 그 행간에 흐르는 하나님의 뜨거운 마음을 만나게 됩니다.${
          verseInfo?.koreanText ? `\n\n"${verseInfo.koreanText}" (${s.meta.scriptureRef})` : ''
        }`,
        `${exegesisItem?.summary || ''} ${
          verseInfo?.originalMeaning
            ? `특별히 본문의 원어적 의미를 살펴보면 '${verseInfo.originalMeaning}'라는 뜻이 담겨 있습니다. ${verseInfo.pastoralPoint || ''}`
            : ''
        }`,
        `${exegesisItem?.quote ? `"${exegesisItem.quote}"\n` : ''}결국 「${s.meta.sermonTitle}」이 우리에게 일깨워 주는 진리는 분명합니다. 내 삶의 주도권을 내가 쥐고 씨름할 때는 두려움이 떠나지 않지만, 말씀의 주인이신 하나님께 시선을 고정할 때 비로소 참된 평안과 길이 열리기 시작합니다.`,
      ]),
      reflectionQuestions: [
        `${s.meta.scriptureRef} 본문 중에서 오늘 내 마음에 가장 새롭게 다가온 단어는 무엇입니까?`,
        `내 삶을 바라보던 시선을 하나님의 관점으로 바꿀 때 무엇이 달라집니까?`,
      ],
      closingPrayer: `말씀의 주인이신 하나님, ${s.meta.scriptureRef}의 진리가 지식이 아니라 내 삶을 지탱하는 생명의 능력이 되게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
      wordCount: 790,
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

    // 만약 업로드된 자료(PDF/PPT)가 있다면 Chapter 4로 자료 심화 통합 챕터 구성
    if (materials.length > 0) {
      generatedChapters.push({
        chapterNum: 4,
        partTitle: `제2부 | 말씀으로 살아내는 일상`,
        chapterTitle: `심화 묵상: ${materials[0].fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}`,
        subtitle: `목회 연구 자료와 함께 읽는 「${s.meta.sermonTitle}」 실천 가이드`,
        scriptureFocus: s.meta.scriptureRef,
        coreMessage: materials.map((m) => m.summaryPoint).join(' / '),
        subSections: materials.map(
          (m, idx) => `${idx + 1}. [${m.fileType.toUpperCase()}] ${m.fileName} 핵심 통찰`
        ),
        manuscriptDraft: formatByStyle(writingStyle, [
          `「${s.meta.sermonTitle}」의 메시지를 더욱 깊이 있게 삶에 뿌리내리기 위해, 함께 연구된 목회 자료(${materials
            .map((m) => m.fileName)
            .join(', ')})의 핵심 통찰을 정리합니다.`,
          ...materials.map(
            (m) => `■ ${m.fileName}\n${m.extractedText}\n(핵심 요약: ${m.summaryPoint})`
          ),
          `이처럼 강단에서 선포된 말씀과 체계적인 성경 연구가 만날 때, 우리의 신앙은 흔들리지 않는 뿌리를 내리게 됩니다.`,
        ]),
        reflectionQuestions: [
          `심화 자료를 통해 새롭게 깨닫게 된 신앙적 통찰은 무엇입니까?`,
          `우리 공동체와 가정이 함께 붙잡아야 할 기도 제목을 적어 보십시오.`,
        ],
        closingPrayer: `진리의 성령님, 말씀을 더욱 깊이 알고 깨닫게 하시니 감사합니다. 우리의 지성과 영성이 함께 자라나 그리스도의 장성한 분량에 이르게 하옵소서. 아멘.`,
        wordCount: 740,
      });
    }
  } else {
    // 2편 이상 다중 설교 선택 시: 선택된 모든 설교(1~N편)를 각각 전략적 Part & Chapter로 빠짐없이 편성!
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

      // 각 설교마다 [장 A: 말씀의 빛 (도입 & 본문 강해)] 생성
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
          `3. ${s.keyStrengths?.[0] || '본문이 선포하는 하나님의 약속'}`,
        ],
        manuscriptDraft: formatByStyle(writingStyle, [
          `[설교 ${sIdx + 1}: 「${s.meta.sermonTitle}」 (${s.meta.scriptureRef} / ${s.meta.date}) 기반 집필]\n\n${
            introTl?.summary || ''
          } ${s.meta.targetAudience}의 걸음 속에서 우리는 종종 멈추어 서서 묻게 됩니다. 그때 주님께서는 ${
            s.meta.scriptureRef
          } 말씀을 통해 우리에게 분명한 음성을 들려주십니다.`,
          `${verse0?.koreanText ? `"${verse0.koreanText}" (${s.meta.scriptureRef})\n\n` : ''}${
            s.summary
          }`,
          `${exegesisTl?.summary || ''} ${
            verse0?.originalMeaning
              ? `본문 원어(${verse0.greekOrHebrewKeyword || ''})가 보여주는 의미처럼, '${verse0.originalMeaning}'의 은혜가 오늘 우리의 삶을 붙들고 있습니다.`
              : ''
          }\n${exegesisTl?.quote ? `"${exegesisTl.quote}"` : ''}`,
        ]),
        reflectionQuestions: [
          s.smallGroupQuestions?.[0]?.question ||
            `「${s.meta.sermonTitle}」(${s.meta.scriptureRef}) 말씀 중 오늘 내게 주시는 하나님의 음성은 무엇입니까?`,
          `${s.meta.scriptureRef}의 약속을 내 삶의 문제에 적용할 때 어떤 소망이 생깁니까?`,
        ],
        closingPrayer: `주님, 제${sIdx + 1}부 「${s.meta.sermonTitle}」(${s.meta.scriptureRef}) 말씀을 통해 저의 닫힌 시선을 열어 주시니 감사합니다. 주님의 약속 위에 굳게 서게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
        wordCount: 810,
      });

      // 각 설교마다 [장 B: 삶의 적용 & 결단 (예화 + 적용 + 기도)] 생성
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
              ? `이 은혜의 결단은 다음 장에서 이어질 「${targetSermons[sIdx + 1].meta.sermonTitle}」(${targetSermons[sIdx + 1].meta.scriptureRef})의 비전으로 더욱 넓게 확장됩니다.`
              : `이로써 앞서 나눈 ${count}편의 말씀(${titles.map((t) => `「${t}」`).join(', ')})이 하나의 온전한 순종으로 완성됩니다.`
          }`,
          `${applyTl?.quote ? `"${applyTl.quote}"\n` : ''}${
            prayerTl?.summary || ''
          }\n${prayerTl?.quote ? `"${prayerTl.quote}"` : ''}`,
        ]),
        reflectionQuestions: [
          s.smallGroupQuestions?.[1]?.question ||
            `「${s.meta.sermonTitle}」의 가르침 중 이번 주 내가 가정과 일터에서 바로 실천할 한 가지는 무엇입니까?`,
          s.smallGroupQuestions?.[2]?.question ||
            `이 말씀을 통해 위로하고 섬겨야 할 내 주변의 이웃은 누구입니까?`,
        ],
        closingPrayer: `은혜의 아버지 하나님, 「${s.meta.sermonTitle}」 말씀이 나의 입술의 고백과 삶의 열매가 되게 하옵소서. 예수 그리스도의 이름으로 기도드립니다. 아멘.`,
        wordCount: 780,
      });
    });

    // 업로드된 참고자료(PDF/PPT 등)가 있으면 마지막 총결론/부록 챕터로 통합 편성
    if (materials.length > 0) {
      generatedChapters.push({
        chapterNum: chapCounter++,
        partTitle: `에필로그 | ${count}편의 설교와 목회 연구 자료 통합 결론`,
        chapterTitle: `말씀에서 삶으로: ${materials[0].fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')} 통합 정리`,
        subtitle: `${titles.map((t) => `「${t}」`).join(' · ')} 및 부교재 핵심 요약`,
        scriptureFocus: scriptures.join(' / '),
        coreMessage: `선포된 ${count}편의 강단 말씀과 목회 연구 자료(${materialNames.join(', ')})를 통해 성도의 전인적 성숙을 완성한다.`,
        subSections: [
          `1. ${count}편 설교(${scriptures.join(', ')})의 핵심 메시지 총정리`,
          ...materials.map(
            (m, i) => `${i + 2}. [${m.fileType.toUpperCase()}] ${m.fileName} 핵심 요약`
          ),
        ],
        manuscriptDraft: formatByStyle(writingStyle, [
          `지금까지 우리는 ${churchName} ${authorName}가 선포한 ${count}편의 설교 — ${targetSermons
            .map((s) => `「${s.meta.sermonTitle}」(${s.meta.scriptureRef})`)
            .join(', ')} — 를 따라 깊은 은혜의 여정을 걸어왔습니다.`,
          ...materials.map(
            (m) =>
              `[참고 문헌 및 목회 자료 통합: ${m.fileName}]\n${m.extractedText}\n• 핵심 통찰: ${m.summaryPoint}`
          ),
          `이 모든 말씀과 연구가 가리키는 결론은 하나입니다. 하나님의 말씀은 어제나 오늘이나 영원토록 동일하시며, 그 말씀을 붙들고 세상 속으로 걸어가는 한 사람의 성도를 통해 하나님 나라는 오늘도 확장되고 있습니다.`,
        ]),
        reflectionQuestions: [
          `지금까지 함께 읽은 ${count}편의 말씀(${titles.join(', ')}) 중 내 인생의 이정표로 삼고 싶은 한 구절은 무엇입니까?`,
          `이 책을 덮으며 앞으로 한 달 동안 주님 앞에 드릴 나의 신앙 결단문을 작성해 보십시오.`,
        ],
        closingPrayer: `알파와 오메가 되시는 주님, ${count}편의 귀한 말씀(${scriptures.join(', ')})을 통해 우리의 영혼을 새롭게 빚어 주시니 감사합니다. 평생토록 말씀의 사람으로 살아가게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
        wordCount: 840,
      });
    }
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
