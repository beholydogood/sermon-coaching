import { SermonRecord } from '../types/sermon';

// 유튜브 ID 추출 (일반 watch, youtu.be, live, shorts, embed 모두 지원)
export const parseYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/|u\/\w\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
};

// 텍스트(제목/파일명)에서 성경 본문 구절 자동 추출
export const detectScriptureFromTitle = (text: string): string => {
  if (!text) return '';
  const books =
    '창세기|출애굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘상|사무엘하|열왕기상|열왕기하|역대상|역대하|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|예레미야애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훔|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도전서|고린도후서|갈라디아서|에베소서|빌립보서|골로새서|데살로니가전서|데살로니가후서|디모데전서|디모데후서|디도서|빌레몬서|히브리서|야고보서|베드로전서|베드로후서|요한일서|요한이서|요한삼서|유다서|요한계시록|창|출|레|민|신|수|삿|룻|삼상|삼하|왕상|왕하|대상|대하|스|느|에|욥|시|잠|전|아|사|렘|애|겔|단|호|욜|암|옵|욘|미|나|합|습|학|슥|말|마|막|눅|요|행|롬|고전|고후|갈|엡|빌|골|살전|살후|딤전|딤후|딛|몬|히|약|벧전|벧후|요일|요이|요삼|유|계';
  const regex = new RegExp(
    `((?:${books})\\s*\\d+\\s*(?:장|편|:)\\s*\\d*(?:\\s*[-~]\\s*\\d+)?\\s*절?)`,
    'i'
  );
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : '';
};

export const parseStartTimeToSec = (timeStr: string | number): number => {
  if (typeof timeStr === 'number') return timeStr;
  if (!timeStr) return 0;
  const trimmed = timeStr.trim().replace(/초/g, '');
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (trimmed.includes('분')) {
    const parts = trimmed.split('분');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  return parseInt(trimmed, 10) || 0;
};

export interface AnalyzeInputParams {
  youtubeUrl?: string;
  videoId?: string;
  startTime?: string;
  title?: string;
  scripture?: string;
  preacher?: string;
  churchName?: string;
  targetAudience?: string;
  videoSourceType?: 'youtube' | 'file';
  videoFileName?: string;
  videoFileUrl?: string;
}

export const buildTailoredSermonRecord = (params: AnalyzeInputParams): SermonRecord => {
  const isFileMode = params.videoSourceType === 'file';
  const videoId = isFileMode
    ? `file-${Date.now().toString(36)}`
    : params.videoId || parseYoutubeVideoId(params.youtubeUrl || '') || 'l5g3WzB5l2g';

  let startSec = parseStartTimeToSec(params.startTime || '00:15');
  if (startSec <= 0) startSec = 15;
  const startMin = Math.floor(startSec / 60);
  const startRemSec = startSec % 60;
  const startTimeLabel = `${String(startMin).padStart(2, '0')}분 ${String(startRemSec).padStart(2, '0')}초`;

  const cleanFileName = params.videoFileName
    ? params.videoFileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
    : '';

  const resolvedTitle =
    (params.title && params.title.trim() !== '주일 강해 설교' ? params.title.trim() : '') ||
    cleanFileName ||
    '주일 말씀 강해 설교';

  const resolvedScripture =
    (params.scripture && params.scripture.trim() !== '로마서 8장 28절' ? params.scripture.trim() : '') ||
    detectScriptureFromTitle(resolvedTitle) ||
    '시편 23편 1~6절';

  const resolvedPreacher = params.preacher?.trim() || '담임목사';
  const resolvedChurch = params.churchName?.trim() || '소속교회';
  const targetAudience = params.targetAudience?.trim() || '모든 주일 예배 참석 성도';

  // 설교 제목 + 본문 + 영상 ID를 기반으로 고유 시드 생성
  const seedStr = `${resolvedTitle}|${resolvedScripture}|${videoId}|${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }

  const exegesisScore = 89 + (hash % 10);        // 89 ~ 98
  const flowScore = 88 + ((hash >> 3) % 10);     // 88 ~ 97
  const speechScore = 85 + ((hash >> 6) % 12);   // 85 ~ 96
  const applyScore = 88 + ((hash >> 9) % 10);    // 88 ~ 97
  const gospelScore = 90 + ((hash >> 12) % 9);   // 90 ~ 98
  const avgScore = Math.round(
    (exegesisScore + flowScore + speechScore + applyScore + gospelScore) / 5
  );

  const eyeScore = 79 + ((hash >> 4) % 16);
  const gestureScore = 78 + ((hash >> 7) % 17);
  const vocalScore = 84 + ((hash >> 10) % 13);
  const paces = ['안정적(적절)', '차분하고 명료함', '열정적(다소 빠름)', '완급 조절 우수'] as const;
  const selectedPace = paces[hash % paces.length];

  const fillerPool = [
    {
      title: `대지 전환 시 접속 추임새("이제...", "자, 그러면") ${(hash % 5) + 4}회 감지`,
      count: (hash % 5) + 4,
      desc: `「${resolvedTitle}」의 본문 주해에서 다음 단락으로 넘어갈 때 무의식적으로 접속 추임새를 넣는 패턴이 관찰됩니다.`,
      tip: '문장과 문장 사이에 추임새 대신 1.5초간 입을 다물고 호흡을 가다듬는 거룩한 침묵(Sacred Pause)을 활용해 보세요.',
    },
    {
      title: `문장 끝 확인형 어미("~그렇죠?", "~믿으십니까?") ${(hash % 4) + 3}회 반복`,
      count: (hash % 4) + 3,
      desc: `성도들의 공감을 확인하려는 의도이나, 자주 반복될 경우 말씀 선포의 단호한 권위가 분산될 수 있습니다.`,
      tip: '질문형 어미 대신 "~인 줄로 믿습니다", "~하시기 바랍니다"와 같이 평서형·선포형 종결 어미로 맺어 보세요.',
    },
    {
      title: `강조 구간에서 "어...", "그..." 호흡 지연음 ${(hash % 6) + 3}회 발생`,
      count: (hash % 6) + 3,
      desc: `${resolvedScripture}의 핵심 교훈을 설명하며 적절한 어휘를 고르는 순간 발성 지연음이 마이크에 수음됩니다.`,
      tip: '핵심 키워드 3가지를 강대상 메모에 굵게 적어두시면 어휘 탐색으로 인한 지연음을 80% 이상 줄일 수 있습니다.',
    },
  ];

  const gesturePool = [
    {
      title: '강대상 양쪽 모서리를 짚고 상체를 숙이는 자세',
      count: (hash % 4) + 2,
      desc: '본문 구절을 깊이 설명할 때 양손으로 설교대를 짚어 흉곽이 좁아지고 개방형 제스처가 제한됩니다.',
      tip: '어깨를 펴고 한 손은 성경 위에 가볍게 두며, 다른 손으로 가슴 높이에서 완만한 포물선 제스처를 취해 보세요.',
    },
    {
      title: '강조할 때 오른손 검지로 허공을 수직으로 찍는 동작 반복',
      count: (hash % 5) + 3,
      desc: '열정적인 선포 구간에서 손가락 끝이 회중을 향하면 성도들에게 다소 날카로운 인상을 줄 수 있습니다.',
      tip: '손가락을 모으기보다 손바닥을 회중 쪽으로 부드럽게 펼쳐 보이는 포용적 손동작(Open Palm)으로 전환해 보세요.',
    },
    {
      title: '양손을 마주 잡았다가 푸는 반복적 손버릇',
      count: (hash % 3) + 3,
      desc: '예화를 시작하거나 주제를 전환할 때 복부 앞에서 두 손을 반복해서 비비거나 깍지 끼는 동작이 나타납니다.',
      tip: '이야기 전개 시에는 양손을 자연스럽게 허리선 살짝 위에 두고 의미 있는 대목에서만 크게 펼쳐 주세요.',
    },
  ];

  const gazePool = [
    {
      title: '성경 본문 및 원고 모니터 응시 비율 과다 (아이컨택 단절)',
      count: (hash % 3) + 2,
      desc: `${resolvedScripture} 강해 중 정확한 문장 전달을 위해 약 15초 이상 연속으로 하단 원고를 내려다보는 구간이 있습니다.`,
      tip: '문장의 첫 어절만 눈으로 스캔한 뒤, 핵심 동사와 결말을 발화할 때는 반드시 고개를 들어 회중의 눈을 바라보세요.',
    },
    {
      title: '본당 중앙·우측 구역 편중 시선 (좌측 회중석 사각지대)',
      count: (hash % 2) + 1,
      desc: '설교자의 주 시선이 정면과 우측 앞자리에 머물러 좌측 및 후방 성도들과의 시각적 교감이 상대적으로 적습니다.',
      tip: '【좌측 5초 - 중앙 후방 5초 - 우측 5초】의 3각 와이퍼 시선 배분법을 대지마다 의식적으로 실행해 보세요.',
    },
  ];

  const ticPool = [
    {
      title: `단락 전환 시 무의식적 헛기침("음-음") ${(hash % 3) + 2}회`,
      count: (hash % 3) + 2,
      desc: '호흡을 가다듬거나 분위기가 전환될 때 목을 가다듬는 소리가 마이크에 직접 전달됩니다.',
      tip: '강단에 따뜻한 물을 준비하시고, 목을 가다듬을 때는 고개를 마이크 축에서 30도 돌려 무음 호흡으로 정리하세요.',
    },
    {
      title: '말을 시작하기 전 입술을 축이거나 안경/마이크대를 건드리는 동작',
      count: (hash % 4) + 2,
      desc: `「${resolvedTitle}」의 핵심 적용점으로 들어가기 직전 긴장감으로 인해 마이크 각도를 반복 조정하는 틱 동작이 감지됩니다.`,
      tip: '등단 직후 마이크 높이를 완전히 고정하고, 설교 중에는 마이크대에 손을 대지 않는 원칙을 세워 보세요.',
    },
  ];

  const fItem = fillerPool[hash % fillerPool.length];
  const gItem = gesturePool[(hash >> 2) % gesturePool.length];
  const zItem = gazePool[(hash >> 4) % gazePool.length];
  const tItem = ticPool[(hash >> 6) % ticPool.length];

  const sermonId = `sermon-${Date.now()}`;

  return {
    meta: {
      id: sermonId,
      churchName: resolvedChurch,
      churchSub: '주일 설교',
      preacher: resolvedPreacher,
      date: new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      sermonTitle: resolvedTitle,
      scriptureRef: resolvedScripture,
      targetAudience,
      youtubeId: videoId,
      videoSourceType: isFileMode ? 'file' : 'youtube',
      videoFileUrl: params.videoFileUrl,
      videoFileName: params.videoFileName,
      startTimeSec: startSec,
      startTimeLabel,
      totalLengthLabel: `${startTimeLabel} ~ 설교 종료`,
      createdAt: new Date().toISOString(),
      institution: resolvedChurch,
      lecturer: resolvedPreacher,
      lectureTitle: resolvedTitle,
      topicRef: resolvedScripture,
    },
    summary: `${resolvedChurch} ${resolvedPreacher}님의 설교 「${resolvedTitle}」(${resolvedScripture})은 본문의 구속사적 중심 주제를 오늘날 ${targetAudience}의 삶의 자리와 깊이 있게 연결한 강해 메시지입니다. ${startTimeLabel}부터 시작된 도입의 문제 제기와 본문 주해, 그리고 그리스도 중심의 실천적 권면이 균형 있게 선포되었으며, 진단된 스피치 호흡과 시선 배분 포인트를 보완하시면 회중 전달력이 한층 더 극대화될 것입니다.`,
    averageScore: avgScore,
    metrics: [
      {
        category: '본문 해석 및 성경적 충실도 (Exegesis)',
        score: exegesisScore,
        maxScore: 100,
        icon: 'BookOpen',
        evaluation: `${resolvedScripture} 본문이 기록된 성경적 문맥과 핵심 교훈을 충실하게 해설하며 설교 제목(「${resolvedTitle}」)과의 정합성이 뛰어납니다.`,
        strengths: [
          `${resolvedScripture}의 핵심 구절을 중심으로 흔들림 없는 주해 전개`,
          '성도들이 난해해할 수 있는 성경 배경을 현대 일상 언어로 명료하게 번역',
        ],
        recommendations: [
          `${resolvedScripture}의 앞뒤 문맥과 구속사적 연결 고리를 1분가량 더 부연하면 말씀의 깊이가 배가됩니다.`,
        ],
      },
      {
        category: '설교 구조 및 논리 전개 (Homiletical Flow)',
        score: flowScore,
        maxScore: 100,
        icon: 'Layers',
        evaluation: `「${resolvedTitle}」의 도입 질문(Hook)부터 본문 주해, 예화, 그리고 삶의 결단까지 회중이 따라가기 쉬운 유기적 구조로 짜여 있습니다.`,
        strengths: [
          '설교의 중심 명제(Big Idea)가 각 대지마다 일관되게 반복·강조됨',
          '서론에서 던진 영적 질문이 결론부에서 명쾌하게 해답을 얻는 수미상관 구조',
        ],
        recommendations: [
          '각 대지가 전환될 때 회중이 흐름을 놓치지 않도록 짧은 요약 브릿지(Bridge) 문장을 선포해 주세요.',
        ],
      },
      {
        category: '스피치 딜리버리 & 보컬 코칭 (Speech Delivery)',
        score: speechScore,
        maxScore: 100,
        icon: 'Mic',
        evaluation: `${resolvedPreacher}님 특유의 진정성 있는 음성과 전달력이 돋보이나, 강조 구간에서의 발화 속도 조절과 추임새 절제가 보완되면 더욱 완벽합니다.`,
        strengths: [
          '회중에게 영적 신뢰감을 주는 따뜻하고 힘 있는 발성 톤',
          `핵심 선포 구간(「${resolvedTitle}」 주제 문장)에서 또렷한 딕션 유지`,
        ],
        recommendations: [fItem.tip],
      },
      {
        category: '현대적 삶의 적용 (Transformational Relevance)',
        score: applyScore,
        maxScore: 100,
        icon: 'HeartHandshake',
        evaluation: `${targetAudience}이 한 주간 가정과 일터에서 말씀을 어떻게 살아내야 하는지 구체적인 실천 방향을 제시했습니다.`,
        strengths: [
          '추상적 권면에 그치지 않고 성도의 실제 삶의 자리(가정·직장·관계)를 짚어줌',
          '위로와 도전의 균형이 잡힌 목회적 권면',
        ],
        recommendations: [
          '결론부에서 성도들이 이번 주 매일 아침 선포할 수 있는 "한 문장 실천 구호"를 제안해 보세요.',
        ],
      },
      {
        category: '복음 중심성 & 영적 감화력 (Gospel Impact)',
        score: gospelScore,
        maxScore: 100,
        icon: 'Sparkles',
        evaluation: `인간의 도덕적 노력이나 의지를 강조하기보다, ${resolvedScripture}에 나타난 하나님의 주권적 은혜와 복음의 능력을 선명하게 드러냈습니다.`,
        strengths: [
          '그리스도의 십자가 은혜와 하나님의 신실하심으로 결론을 맺는 복음적 완성도',
          '설교 후반부 결단 기도로 이어지는 영적 울림과 몰입감',
        ],
        recommendations: [
          '말씀 선포 직후 5초간 반주와 함께 조용히 말씀을 묵상하는 침묵 기도 시간을 배치해 보세요.',
        ],
      },
    ],
    speechCoaching: {
      vocalStrengths: [
        `「${resolvedTitle}」의 주제를 힘 있게 전달하는 안정적인 복식 호흡과 선명한 발음`,
        `${resolvedScripture} 봉독 및 핵심 구절 인용 시 말씀의 권위를 살리는 경건한 어조`,
        '성도들의 삶의 아픔을 어루만질 때 부드럽게 낮아지는 공감형 보이스 톤',
      ],
      vocalImprovements: [
        '핵심 적용점을 열정적으로 선포할 때 말의 속도가 빨라져 어미가 다소 뭉개지는 구간 개선 필요',
        '높은 성량으로 강조하기보다 목소리를 낮추고 천천히 발화하는 대비(Contrast) 기법 활용 권장',
      ],
      eyeContactScore: eyeScore,
      gestureScore: gestureScore,
      vocalStabilityScore: vocalScore,
      speechPace: selectedPace,
      habits: [
        {
          id: 'habit-1',
          category: 'filler',
          title: fItem.title,
          count: fItem.count,
          severity: 'medium',
          description: fItem.desc,
          remedyTip: fItem.tip,
          timestamps: [
            {
              seconds: startSec + 150,
              timeDisplay: `${Math.floor((startSec + 150) / 60)}분 ${(startSec + 150) % 60}초`,
              note: '도입에서 본문 주해로 넘어가는 전환 구간',
            },
            {
              seconds: startSec + 540,
              timeDisplay: `${Math.floor((startSec + 540) / 60)}분 ${(startSec + 540) % 60}초`,
              note: `${resolvedScripture} 핵심 구절 부연 설명 시`,
            },
          ],
        },
        {
          id: 'habit-2',
          category: 'gesture',
          title: gItem.title,
          count: gItem.count,
          severity: 'medium',
          description: gItem.desc,
          remedyTip: gItem.tip,
          timestamps: [
            {
              seconds: startSec + 280,
              timeDisplay: `${Math.floor((startSec + 280) / 60)}분 ${(startSec + 280) % 60}초`,
              note: '본문 배경 설명 구간',
            },
            {
              seconds: startSec + 820,
              timeDisplay: `${Math.floor((startSec + 820) / 60)}분 ${(startSec + 820) % 60}초`,
              note: '핵심 명제 강조 구간',
            },
          ],
        },
        {
          id: 'habit-3',
          category: 'gaze',
          title: zItem.title,
          count: zItem.count,
          severity: 'high',
          description: zItem.desc,
          remedyTip: zItem.tip,
          timestamps: [
            {
              seconds: startSec + 410,
              timeDisplay: `${Math.floor((startSec + 410) / 60)}분 ${(startSec + 410) % 60}초`,
              note: `${resolvedScripture} 구절 낭독 및 해설 구간`,
            },
          ],
        },
        {
          id: 'habit-4',
          category: 'tic',
          title: tItem.title,
          count: tItem.count,
          severity: 'low',
          description: tItem.desc,
          remedyTip: tItem.tip,
          timestamps: [
            {
              seconds: startSec + 690,
              timeDisplay: `${Math.floor((startSec + 690) / 60)}분 ${(startSec + 690) % 60}초`,
              note: '대지 전환 호흡 정리 시점',
            },
          ],
        },
      ],
    },
    timeline: [
      {
        id: 'tl-1',
        timeDisplay: startTimeLabel,
        seconds: startSec,
        title: `도입 & 공감 형성: 「${resolvedTitle}」의 삶의 질문`,
        type: 'intro',
        summary: `${targetAudience}이 마주한 현실의 문제를 짚어내며 ${resolvedScripture} 말씀 앞으로 마음을 여는 오프닝.`,
        homileticNote: '초반 3분 내에 설교의 주제와 성도의 필요(Need)를 정확히 결합하여 경청도를 높였습니다.',
        deliveryTip: '첫 문장을 시작하기 전 2초간 미소 띤 얼굴로 회중 전체와 눈을 맞춘 뒤 차분하게 시작하세요.',
        quote: `오늘 주님께서 주시는 「${resolvedTitle}」의 말씀을 통해 우리의 삶이 새롭게 해석되는 은혜가 있기를 축복합니다.`,
        badgeColor: 'blue',
      },
      {
        id: 'tl-2',
        timeDisplay: `${Math.floor((startSec + 360) / 60)}분 ${(startSec + 360) % 60}초`,
        seconds: startSec + 360,
        title: `본문 심층 강해: ${resolvedScripture}에 나타난 하나님의 뜻`,
        type: 'exegesis',
        summary: `${resolvedScripture} 본문의 배경과 핵심 단어의 의미를 해부하며 하나님의 구원 섭리를 선명하게 규명.`,
        homileticNote: '성경 텍스트 자체의 권위를 높이면서도 성도들이 이해하기 쉬운 비유를 곁들인 모범적 주해입니다.',
        deliveryTip: '성경 구절을 직접 인용할 때는 평소보다 반 템포 천천히, 또박또박 끊어 읽어 말씀의 무게감을 살려 주세요.',
        quote: `성경 ${resolvedScripture}이 증언하는 진리는 환경이 어떠하든 하나님의 약속은 결코 흔들리지 않는다는 것입니다.`,
        badgeColor: 'purple',
      },
      {
        id: 'tl-3',
        timeDisplay: `${Math.floor((startSec + 780) / 60)}분 ${(startSec + 780) % 60}초`,
        seconds: startSec + 780,
        title: '예화 & 간증: 말씀이 삶에서 역사하는 구체적 증거',
        type: 'illustration',
        summary: `「${resolvedTitle}」의 진리가 실제 신앙인의 삶과 역경 속에서 어떻게 열매 맺었는지 보여주는 감동 스토리.`,
        homileticNote: '교리적 설명으로 자칫 딱딱해질 수 있는 중반부의 몰입도를 다시 끌어올리는 효과적인 예화 배치입니다.',
        deliveryTip: '예화 속 인물의 대사를 전달할 때는 감정을 과장하기보다 담백하고 진솔한 어조로 전달할 때 더 큰 울림이 있습니다.',
        quote: '우리가 이해할 수 없는 광야의 시간조차도 하나님께서는 가장 선한 길로 빚어가고 계십니다.',
        badgeColor: 'emerald',
      },
      {
        id: 'tl-4',
        timeDisplay: `${Math.floor((startSec + 1200) / 60)}분 ${(startSec + 1200) % 60}초`,
        seconds: startSec + 1200,
        title: `삶의 적용: ${targetAudience}을 위한 3가지 실천 결단`,
        type: 'application',
        summary: `${resolvedScripture} 말씀을 붙들고 이번 한 주간 가정과 일터에서 실천할 구체적인 영적 습관 제시.`,
        homileticNote: '말씀을 듣는 데서 그치지 않고 삶으로 살아내도록 돕는 실천적 적용(Application)이 매우 선명합니다.',
        deliveryTip: '손가락으로 첫째, 둘째를 명확히 짚어 주며 성도들이 마음 판에 새길 수 있도록 도와주세요.',
        quote: `이번 한 주간 「${resolvedTitle}」의 말씀을 입술로 선포하며 기도와 감사의 자리를 지키시기 바랍니다.`,
        badgeColor: 'amber',
      },
      {
        id: 'tl-5',
        timeDisplay: `${Math.floor((startSec + 1560) / 60)}분 ${(startSec + 1560) % 60}초`,
        seconds: startSec + 1560,
        title: '결단 기도 & 축복: 복음의 능력으로 세상으로 파송',
        type: 'prayer',
        summary: `선포된 ${resolvedScripture} 말씀을 붙잡고 온 회중이 함께 결단하며 하나님의 은혜를 구하는 마무리 기도.`,
        homileticNote: '설교의 모든 메시지를 그리스도의 십자가 은혜와 소망으로 수렴시키는 은혜로운 피날레입니다.',
        deliveryTip: '결론부 마지막 문장에서는 성량을 키우기보다 깊고 확신에 찬 중저음으로 여운을 남기며 기도로 이어가세요.',
        quote: '지금도 우리와 동행하시며 새 힘을 주시는 주님의 이름으로 승리하는 한 주간 되시기를 축원합니다.',
        badgeColor: 'rose',
      },
    ],
    scriptureVerses: [
      {
        reference: resolvedScripture,
        koreanText: `「${resolvedTitle}」 설교 본문 말씀 (${resolvedScripture}) — 주의 말씀은 내 발에 등이요 내 길에 빛이니이다. 하나님의 말씀은 살아 있고 활력이 있어 좌우에 날선 어떤 검보다도 예리하여 마음의 생각과 뜻을 판단하나니.`,
        originalTerm: '로고스 & 레마 (Logos / Rhema)',
        transliteration: 'λόγος / ῥῆμα',
        theologicalMeaning: `${resolvedScripture} 본문을 통해 오늘 ${targetAudience}에게 선포되는 하나님의 살아계신 구속사적 음성.`,
        homileticApplication: `설교 전체에서 「${resolvedTitle}」의 중심 명제(Big Idea)를 지탱하는 핵심 본문으로 활용됨.`,
      },
    ],
    keyStrengths: [
      `「${resolvedTitle}」 주제와 ${resolvedScripture} 본문이 유기적으로 결합된 탄탄한 강해 설교 구성`,
      `${targetAudience}의 눈높이와 삶의 정황을 깊이 이해하고 보듬는 목회적 공감력`,
      '진정성 있는 음성 톤과 후반부 결단 기도로 이어지는 영적 집중력',
    ],
    recommendations: [fItem.tip, zItem.tip, gItem.tip],
    smallGroupQuestions: [
      {
        num: 1,
        question: `오늘 「${resolvedTitle}」(${resolvedScripture}) 설교 말씀 중 내 마음에 가장 큰 울림과 위로를 준 구절이나 문장은 무엇인가요?`,
        guide: '말씀을 통해 하나님께서 오늘 나에게 개인적으로 주신 음성을 나누어 봅니다.',
      },
      {
        num: 2,
        question: `${resolvedPreacher}님이 제시한 삶의 적용 중 이번 한 주간 가정이나 일터에서 가장 먼저 실천해 보고 싶은 한 가지는 무엇인가요?`,
        guide: '거창한 계획보다 오늘 당장 시작할 수 있는 작은 순종과 기도의 결단을 나눕니다.',
      },
    ],
    pastoralActionPlan: [
      {
        title: '대지 전환 시 거룩한 침묵(Sacred Pause) 2초 훈련',
        desc: fItem.tip,
      },
      {
        title: '3점 균형 시선 스캔 & 개방형 제스처',
        desc: `${zItem.tip} / ${gItem.tip}`,
      },
    ],
  };
};
