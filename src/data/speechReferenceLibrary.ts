export type ReferenceReviewStatus =
  | 'source_candidate' // 출처·게시 정보 기반 후보 (시청각 구간 검토 전, 24편)
  | 'preliminary_intro_analysis' // 도입부 예비 분석 및 일부 원본 화면·자막 대조 완료 (전체 영상 검토 전, 김우준 목사 2편)
  | 'audiovisual_reviewed' // 해당 클립 시청각 검토 완료 (현재 0편)
  | 'service_approved'; // 서비스 내 이용 범위 확인 완료 (현재 0편)

export interface ReferenceCandidateItem {
  id: string;
  category: 'korean_sermon' | 'kim_woojun_preliminary' | 'international_sermon' | 'general_speech';
  speaker: string;
  title: string;
  organization: string;
  publishedDate?: string;
  officialUrl: string;
  officialListUrl?: string;
  reviewHypothesisOrVerifiedSkill: string;
  reviewStatus: ReferenceReviewStatus;
  allowedUse: 'unverified_link_only' | 'embed_verified' | 'service_approved';
  occasionTag: string | null; // 확인된 경우에만 부여, 제목·소재만으로 임의 부여 금지
  deliveryModeTags: string[];
  audienceTags: string[]; // 미확인 시 빈 배열 유지
  skillTags: string[];
  contextLimits: string[];
  preliminaryScenes?: Array<{
    timeDisplay: string;
    seconds: number;
    urlWithTimestamp: string;
    observedBehavior: string;
    strengthInterpretation: string;
    practiceTransfer: string;
    cautionLimit: string;
  }>;
}

export const REFERENCE_LIBRARY_SUMMARY = {
  preparedDate: '2026-11-14',
  version: 'v1.3',
  totalCount: 26,
  sourceMetadataCandidates: 24,
  introductoryPartialAnalyses: 2,
  fullyApprovedClips: 0,
  includedVideoFiles: 0,
  statusNotice:
    '설교형 스피치 참고 자료 26편은 출처·게시 정보 기반 참고 후보이며, 원본 공식 링크로 안내합니다.',
};

export const REFERENCE_COVERAGE_GAPS = [
  {
    group: '결혼식 설교',
    targetScene: '신랑·신부를 향한 축복, 하객을 포함하는 방향 전환, 짧은 마무리',
    currentLimit:
      'E11(Michael Curry)은 영어권 왕실 결혼식 사례로 한국의 일반 결혼예배 사례로 그대로 대체할 수 없음. K12는 결혼 이야기를 소재로 사용하지만 실제 행사는 주일예배이므로 결혼식 설교로 분류하지 않음.',
    status: '한국어 일반 결혼예배 표본 추가 확보·검토 필요',
  },
  {
    group: '장례식 설교',
    targetScene: '입관·발인·하관 등 의식 순서에 맞는 위로, 문장 뒤 여백, 절제된 표현',
    currentLimit: '해당 맥락이 확인된 후보는 현재 26편 목록에 미확보 상태임.',
    status: '미확보 (추측 매칭 금지)',
  },
  {
    group: '강해설교',
    targetScene: '낭독에서 설명으로 전환, 어려운 용어 해설, 긴 논지를 따라갈 신호',
    currentLimit: 'K01 등 일부 후보가 있으나 시청각 구간 검토와 실제 청중 확인은 미완료.',
    status: '구간 검토 전 후보 보유',
  },
  {
    group: '부흥회 설교',
    targetScene: '에너지의 대비, 반복의 기능, 청중 응답 뒤 발언 재개',
    currentLimit: '제목이나 열정적인 인상만으로 부흥회 태그를 부여할 수 없음.',
    status: '행사 맥락 검증 필요',
  },
  {
    group: '장년·청년·청소년 대상',
    targetScene: '각 청중에게 실제로 설명을 풀어 주고 질문을 처리하는 방식',
    currentLimit: '연령대별 대상이 확인된 표본 수는 아직 집계·검증 전임.',
    status: '청중 구성 미확인',
  },
  {
    group: '어린이 대상',
    targetScene: '실제 연령 범위별 구체적 설명, 한 단계의 참여 지시, 의미와 연결된 동작',
    currentLimit: '어린이 대상임이 확인된 후보는 현재 목록에 미확보 상태임.',
    status: '미확보 (추측 매칭 금지)',
  },
  {
    group: '혼합 청중',
    targetScene: '낯선 용어를 짧게 풀기, 주된 청중을 유지하며 다른 참석자도 배려하는 전환',
    currentLimit: '각 영상의 실제 참석자 구성은 미확인 상태임.',
    status: '참석자 구성 미확인',
  },
];

export const KIM_WOOJUN_PRELIMINARY_REPORT = {
  title: '지구촌교회 김우준 목사 — 설교 스피치 강점 예비 분석 (2026-11-14)',
  scopeDisclaimer:
    '전체 두 편을 연속 시청·청취한 종합 평가가 아니며, 도입부에서 확인한 전달 기법의 예비 분석입니다. 청중의 실제 이해·감정 효과 및 연령 구성은 조사하지 않았고, 발화 속도·음높이·쉼 길이·시선 분포·동작 빈도는 정량 측정하지 않았습니다.',
  coreFinding:
    '두 편의 도입부에서 가장 분명하게 드러난 강점은 청중이 궁금해할 질문을 먼저 제시해, 이어질 설명을 들을 이유를 만드는 능력입니다. A(K11)는 신앙생활의 어려움에서, B(K12)는 흥미로운 이야기와 반전에서 출발하여 듣는 사람의 생각이 움직일 자리를 만듭니다.',
  timestampCaution:
    '자동 분석이 반환한 장면 시각 일부는 원본과 달랐기 때문에(예: B의 기대·반전 장면은 원본 01:45와 01:50에서 확인), 원본 플레이어로 직접 대조 확인한 시각만 기재했습니다.',
};

export const SERMON_REFERENCE_LIBRARY_26: ReferenceCandidateItem[] = [
  // 1. 김우준 목사 자료 2편 — 도입부 예비 분석 (원본 시각 대조 완료, 전체 영상 검토 전)
  {
    id: 'K11',
    category: 'kim_woojun_preliminary',
    speaker: '김우준',
    title: '하나님 나라 6: 하나님, 왜 이런 고난을 허락하시나요? (욥기 38:1-7)',
    organization: '지구촌교회',
    publishedDate: '2026-07-19',
    officialUrl: 'https://www.youtube.com/watch?v=vi7fXdjrWl8',
    officialListUrl: 'https://www.jiguchon.or.kr/bbs/board.php?bo_table=C01&wr_id=12198',
    reviewHypothesisOrVerifiedSkill:
      '도입부의 청중 경험 질문, 예상 반론 수용 후 구별, 추상적 주제를 생활 장면(재정난·투병)으로 구체화, 발언 의미와 연결되는 손동작 후보 (원본 00:05·00:22·00:50·01:00·01:30 화면·자막 대조 / 전체 영상 검토 전)',
    reviewStatus: 'preliminary_intro_analysis',
    allowedUse: 'unverified_link_only',
    occasionTag: '주일예배',
    deliveryModeTags: ['강해', '주제 설명'],
    audienceTags: [],
    skillTags: ['청중 경험 질문', '예상 반론 수용', '추상어 구체화', '발언과 제스처의 의미 연결'],
    contextLimits: [
      '장례식의 위로, 어린이 대상 설명의 모범 표본으로 자동 분류하지 않음',
      '정지 화면 대조만으로 전체 제스처의 자연스러움·리듬·빈도를 확정하지 않음',
    ],
    preliminaryScenes: [
      {
        timeDisplay: '00:05',
        seconds: 5,
        urlWithTimestamp: 'https://www.youtube.com/watch?v=vi7fXdjrWl8&t=0s',
        observedBehavior:
          '시작에서 신앙생활 중 어려웠던 경험을 묻고, 기도에 대한 응답이 느껴지지 않는 상황을 제시함.',
        strengthInterpretation:
          '처음부터 추상적인 설명으로 들어가지 않고 청중이 자신의 경험을 떠올릴 출발점을 제공함.',
        practiceTransfer:
          '다음 설교에서 개념을 바로 말하기 전, 청중이 실제로 겪을 법한 한 가지 상황을 질문으로 작성하고 본문 설명과 연결되는지 확인하기.',
        cautionLimit: '질문의 개수나 자극성 자체를 늘리는 훈련으로 오해하지 않기.',
      },
      {
        timeDisplay: '00:22',
        seconds: 22,
        urlWithTimestamp: 'https://www.youtube.com/watch?v=vi7fXdjrWl8&t=22s',
        observedBehavior:
          '기도하러 나아가는 상황을 말하며 양팔을 열고 손바닥을 보임 (00:50 한 손바닥 위로 폄, 01:00 가슴 앞에 손을 둠).',
        strengthInterpretation:
          '확인한 지점에서는 말의 의미와 연결해 손동작을 달리하는 장면 수준의 강점 후보로 볼 수 있음.',
        practiceTransfer:
          '동작 모양을 복제하기보다 자신의 원고에서 의미를 드러낼 제스처 하나를 선택해 강조할 단어와 시점이 맞는지 점검하기.',
        cautionLimit: '연속 동작의 시작·끝과 과잉 여부는 추가 연속 영상 검토 필요.',
      },
      {
        timeDisplay: '00:50 ~ 01:00',
        seconds: 50,
        urlWithTimestamp: 'https://www.youtube.com/watch?v=vi7fXdjrWl8&t=50s',
        observedBehavior:
          '00:50에서 이기적인 욕심에서 비롯된 요청의 경우를 먼저 인정한 뒤, 01:00에서 재정난과 투병처럼 다른 성격의 고난 상황을 구별해 제시함.',
        strengthInterpretation:
          '청중이 떠올릴 수 있는 예상 반론을 대신 말해주고 지금 다룰 질문의 범위를 좁혀 설득력을 높임. 추상적인 고난을 재정난·투병이라는 구체적 일상 장면으로 풀어냄.',
        practiceTransfer:
          '핵심 문장에 대해 청중이 제기할 수 있는 반론 하나를 써 보고 인정할 부분과 구별할 부분을 짧은 전환 문장으로 연결하기. 원고의 추상어 하나를 일상 장면 하나로 풀어 본 뒤 본래 설명으로 복귀하는 문장 만들기.',
        cautionLimit: '타인의 신앙이나 동기를 단정·추정하는 문장은 피하기.',
      },
    ],
  },
  {
    id: 'K12',
    category: 'kim_woojun_preliminary',
    speaker: '김우준',
    title: '복음수업 2: 복음, 한 마디로! (누가복음 15:11-24)',
    organization: '지구촌교회',
    publishedDate: '2026-03-01',
    officialUrl: 'https://www.youtube.com/watch?v=D0iPq6IgXlM',
    officialListUrl: 'https://www.jiguchon.or.kr/bbs/board.php?bo_table=C01&wr_id=11841',
    reviewHypothesisOrVerifiedSkill:
      '도입 이야기의 기대 형성과 짧은 반전 (원본 01:45 예상 질문과 01:50 갈등 전환 대조 완료 / 실제 행사는 주일예배이며 결혼식 설교로 태그하지 않음 / 전체 영상 검토 전)',
    reviewStatus: 'preliminary_intro_analysis',
    allowedUse: 'unverified_link_only',
    occasionTag: '주일예배',
    deliveryModeTags: ['이야기·간증', '주제 설명'],
    audienceTags: [],
    skillTags: ['이야기의 기대 형성', '질문', '짧은 반전', '전환 신호'],
    contextLimits: [
      '도입 예화 소재가 백만장자와의 결혼이라는 이유로 결혼식 설교 표본으로 분류하지 않음 (실제 행사는 주일예배)',
      '반전만 흥미롭고 본문 핵심 메시지와 연결되지 않는 장식적 예화가 되지 않도록 주의',
    ],
    preliminaryScenes: [
      {
        timeDisplay: '01:45 ~ 01:50',
        seconds: 105,
        urlWithTimestamp: 'https://www.youtube.com/watch?v=D0iPq6IgXlM&t=105s',
        observedBehavior:
          '백만장자와의 결혼 이야기를 전개하며 01:45에서 행복하게 살았을 것이라는 예상에 동의를 구하는 질문을 던진 뒤, 01:50에서 그 예상을 짧게 부정하며 갈등으로 전환함.',
        strengthInterpretation:
          '결과를 한 번에 설명하지 않고 청중이 먼저 결론을 예상하게 만든 뒤 짧은 반전으로 다음 설명을 듣게 만드는 장치로 작동함.',
        practiceTransfer:
          '예화를 [상황 → 자연스러운 예상(질문) → 짧은 전환 → 설명할 핵심 메시지] 4단계로 정리해 보기.',
        cautionLimit: '이야기의 흥미가 본문 설명을 가리지 않도록 핵심 복귀 문장을 반드시 점검.',
      },
    ],
  },

  // 2. 국내 설교 자료 10편 — 출처·게시 정보 기반 후보 (시청각 구간 검토 전)
  {
    id: 'K01',
    category: 'korean_sermon',
    speaker: '이재훈',
    title: '사사기 강해(8) 가시나무 그늘, 큰 바위 그늘',
    organization: '온누리교회',
    publishedDate: '2026-11-08',
    officialUrl: 'https://www.onnuri.org/videos/MsVPfmIK9Yv',
    officialListUrl: 'https://www.onnuri.org/videos',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 설명에서 핵심 문장으로 전환하는 속도·강세·쉼',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['강해'],
    audienceTags: [],
    skillTags: ['속도·강세·쉼', '핵심 문장 전환'],
    contextLimits: ['시청각 구간 검토 전 후보이므로 특정 타임스탬프나 모범 판정을 자동 생성하지 않음'],
  },
  {
    id: 'K02',
    category: 'korean_sermon',
    speaker: '박종길',
    title: '영적 게으름에서 깨어나라!',
    organization: '온누리교회',
    publishedDate: '2026-11-13',
    officialUrl: 'https://www.onnuri.org/videos/2qoughxzBXj',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 짧은 설교의 문장 끝맺음과 권면의 표현 강도',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['권면·호소'],
    audienceTags: [],
    skillTags: ['끝맺음', '권면 표현 강도'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K03',
    category: 'korean_sermon',
    speaker: '김한나',
    title: '한 영혼을 향한 발걸음',
    organization: '온누리교회',
    publishedDate: '2026-11-11',
    officialUrl: 'https://www.onnuri.org/videos/OchDGNls8kH',
    officialListUrl: 'https://www.onnuri.org/videos',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 청중을 향한 발언에서 시선과 표정이 연결되는 장면',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['시선·원고', '표정', '말·몸 협응'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K04',
    category: 'korean_sermon',
    speaker: '이규현',
    title: '고도의 영적 분별력',
    organization: '수영로교회',
    publishedDate: '2026-09-27',
    officialUrl: 'https://www.youtube.com/watch?v=tSHvfMNNiro',
    officialListUrl: 'https://www.sooyoungro.org/main/syrmain/MainSearchList.jsp',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 긴 설명 안에서 의미 단위를 나누는 방식',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['주제 설명'],
    audienceTags: [],
    skillTags: ['의미 단위 끊어 읽기', '명료성·습관어'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K05',
    category: 'korean_sermon',
    speaker: '이규현',
    title: '야베스의 기도',
    organization: '수영로교회',
    publishedDate: '2026-09-25',
    officialUrl: 'https://www.youtube.com/watch?v=Y4xeUmoMEuw',
    officialListUrl: 'https://www.sooyoungro.org/main/syrmain/MainSearchList.jsp',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 예배 유형이 달라질 때 음성 에너지·쉼의 사용',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['속도·강세·쉼', '에너지 조절'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K06',
    category: 'korean_sermon',
    speaker: '김운성',
    title: '승리의 복음(5): 골방의 승리',
    organization: '영락교회',
    publishedDate: '2026-10-04',
    officialUrl: 'https://www.youtube.com/watch?v=21T31mekcbo',
    officialListUrl: 'https://itmedia.youngnak.net/portfolio-item/26-10-04-02/',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 본문 낭독과 청중을 향한 설명의 전환',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['강해'],
    audienceTags: [],
    skillTags: ['낭독과 설명의 전환', '시선·원고'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K07',
    category: 'korean_sermon',
    speaker: '김운성',
    title: '승리의 복음(4): 희망 없는 자의 승리',
    organization: '영락교회',
    publishedDate: '2026-09-27',
    officialUrl: 'https://www.youtube.com/watch?v=j4Qvsbyc-dc',
    officialListUrl: 'https://itmedia.youngnak.net/vod/installed-pastor/',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 위로하는 발언에서의 문장 끝·속도·표정',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['위로 전달', '끝맺음', '속도·강세·쉼'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K08',
    category: 'korean_sermon',
    speaker: '김기석',
    title: '우리는 새로운 시작',
    organization: '높은뜻광성교회',
    publishedDate: '2025-10-26',
    officialUrl: 'https://www.youtube.com/watch?v=UCzn3dRzG5k',
    officialListUrl: 'https://cms-gwks.dimode.co.kr/Board/Detail/50/42212',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 긴 문장의 의미 단위와 이야기의 여백',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['이야기·간증'],
    audienceTags: [],
    skillTags: ['의미 단위 끊어 읽기', '쉼과 여백'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K09',
    category: 'korean_sermon',
    speaker: '이동원',
    title: '요한 3:16 + 요일 3:16',
    organization: '지구촌교회',
    publishedDate: '2025-02-02',
    officialUrl: 'https://www.jiguchon.or.kr/bbs/board.php?bo_table=C01&wr_id=10883',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 서로 다른 개념을 청각적으로 대비시키는 방식',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['강해', '주제 설명'],
    audienceTags: [],
    skillTags: ['개념 대조 강조', '속도·강세·쉼'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'K10',
    category: 'korean_sermon',
    speaker: '이동원',
    title: '주를 향한 궁극적 소망',
    organization: '지구촌교회',
    publishedDate: '2025-01-26',
    officialUrl: 'https://www.jiguchon.or.kr/bbs/board.php?bo_table=C01&wr_id=10882',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 설명·권면·마무리 사이의 리듬 변화',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['구간 전환 리듬', '속도·강세·쉼'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },

  // 3. 해외 설교·종교 연설 자료 11편 — 출처·게시 정보 기반 후보 (시청각 구간 검토 전)
  {
    id: 'E01',
    category: 'international_sermon',
    speaker: 'Tim Keller',
    title: 'Boasting in Nothing Except the Cross',
    organization: 'The Gospel Coalition',
    officialUrl: 'https://www.thegospelcoalition.org/video/boasting-nothing-except-cross-galatians-6/',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 대조 설명, 문장의 강조점, 논지 전환',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['강해', '주제 설명'],
    audienceTags: [],
    skillTags: ['개념 대조 강조', '전환 신호'],
    contextLimits: ['해외 영어권 연사의 리듬·제스처를 한국어 예배에 그대로 이식하지 않고 대조 원리만 참고'],
  },
  {
    id: 'E02',
    category: 'international_sermon',
    speaker: 'John Piper',
    title: "Don't Waste Your Life — 공식 발췌 영상",
    organization: 'Desiring God',
    officialUrl:
      'https://www.desiringgod.org/messages/boasting-only-in-the-cross/excerpts/dont-waste-your-life',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 핵심 문장의 강세·쉼·반복 (발췌본이므로 전체 설교 구조의 표본으로 사용하지 않기)',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['권면·호소'],
    audienceTags: [],
    skillTags: ['핵심 문장 강세·쉼', '반복의 기능'],
    contextLimits: ['공식 발췌본이므로 전체 설교 구조 표본으로 사용 금지'],
  },
  {
    id: 'E03',
    category: 'international_sermon',
    speaker: 'Alistair Begg',
    title: 'The Power and Message of the Cross',
    organization: 'Truth For Life',
    officialUrl: 'https://www.truthforlife.org/resources/sermon/power-and-message-cross/',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 설명에서 예화·권면으로 넘어가는 음성 표현 (등록 시 재생 자료의 연속 영상 여부 재확인 필요)',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['강해'],
    audienceTags: [],
    skillTags: ['예화·권면 전환', '속도·강세·쉼'],
    contextLimits: ['음성 전용/정지 이미지 여부 확인 전에는 시선·제스처 표본으로 사용 금지'],
  },
  {
    id: 'E04',
    category: 'international_sermon',
    speaker: 'Haddon Robinson',
    title: 'Have You Heard the One About…The People With a Hearing Problem?',
    organization: 'Dallas Theological Seminary',
    officialUrl:
      'https://voice.dts.edu/chapel/have-you-heard-the-one-about-the-people-with-a-hearing-problem-robinson-haddon-w/',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 대화체 전달, 이야기 속 인용, 핵심으로 돌아오는 신호',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['이야기·간증', '강해'],
    audienceTags: [],
    skillTags: ['예화 후 핵심 복귀 신호', '대화체 전달'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'E05',
    category: 'international_sermon',
    speaker: 'Billy Graham',
    title: 'Who Is Jesus Christ',
    organization: 'Billy Graham Evangelistic Association',
    officialUrl: 'https://billygraham.org/sermons/who-is-jesus-christ',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 큰 청중을 향한 문장 길이·반복·분명한 끝맺음',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['권면·호소'],
    audienceTags: [],
    skillTags: ['끝맺음', '문장 길이 조절'],
    contextLimits: ['대형 집회 스타일을 소규모 예배나 장례·위로 맥락에 기계적으로 적용하지 않음'],
  },
  {
    id: 'E06',
    category: 'international_sermon',
    speaker: 'Billy Graham',
    title: 'The Value of a Soul',
    organization: 'Billy Graham Evangelistic Association',
    officialUrl: 'https://billygraham.org/sermons/the-value-of-a-soul-3',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 반복 문장의 강조 변화와 마무리',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['권면·호소'],
    audienceTags: [],
    skillTags: ['반복의 기능', '끝맺음'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'E07',
    category: 'international_sermon',
    speaker: 'Priscilla Shirer',
    title: 'God Can Use You Right Where You Are',
    organization: 'Going Beyond Ministries',
    officialUrl: 'https://www.youtube.com/watch?v=o1ZeQ6Mqbkg',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 말·표정·손동작의 협응과 질문의 처리',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['말·몸 협응', '질문 뒤 대기'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'E08',
    category: 'international_sermon',
    speaker: 'Priscilla Shirer',
    title: 'God Can Restore Your Circumstances',
    organization: 'Going Beyond Ministries',
    officialUrl: 'https://www.youtube.com/watch?v=HHRllMZKmlc',
    reviewHypothesisOrVerifiedSkill: '[검토 가설] 설명과 정서적 호소 사이의 표현 변화',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['에너지 조절', '속도·강세·쉼'],
    contextLimits: ['시청각 구간 검토 전 후보'],
  },
  {
    id: 'E09',
    category: 'international_sermon',
    speaker: 'Barbara Brown Taylor',
    title: 'The Parable of the Fearful Investor — 2011-11-13 예배',
    organization: 'DukeChapel',
    officialUrl: 'https://www.youtube.com/watch?v=sEzT7hFdhLU',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 강단에서의 이야기 전달과 문장 사이의 여백 (전체 예배 영상에서 설교 범위 먼저 분리 필요)',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: ['이야기·간증'],
    audienceTags: [],
    skillTags: ['쉼과 여백', '차분한 전달'],
    contextLimits: ['전체 예배 영상이므로 찬양·봉독·사회 구간을 제외하고 설교 범위만 분리해 검토해야 함'],
  },
  {
    id: 'E10',
    category: 'international_sermon',
    speaker: 'Barbara Brown Taylor',
    title: 'Worthless Religion — 2012-09-02 예배',
    organization: 'DukeChapel',
    officialUrl: 'https://www.youtube.com/watch?v=mgBA_5RiKEc',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 원고 사용과 청중 방향 전환, 조용한 표현의 전달력',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: null,
    deliveryModeTags: [],
    audienceTags: [],
    skillTags: ['시선·원고', '차분한 전달'],
    contextLimits: ['전체 예배 영상에서 설교 구간만 분리 필요'],
  },
  {
    id: 'E11',
    category: 'international_sermon',
    speaker: 'Michael Curry',
    title: 'Love Is the Way — Royal Wedding',
    organization: 'BBC',
    officialUrl: 'https://www.youtube.com/watch?v=OhV0PL49d3Y',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설] 반복, 점층, 청중 반응 뒤 다시 발언하는 시점 (BBC 게시본의 편집 범위 확인 필요)',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: '결혼식',
    deliveryModeTags: ['권면·호소'],
    audienceTags: [],
    skillTags: ['반복의 기능', '청중 반응 대기 후 재개'],
    contextLimits: [
      '영어권 왕실 결혼식 사례이므로 한국의 일반 결혼예배 사례로 그대로 대체할 수 없음',
    ],
  },

  // 4. 전달 기술을 보완할 일반 연설 자료 3편 (설교 아님 — 보조 자료로 분리)
  {
    id: 'S01',
    category: 'general_speech',
    speaker: 'Bryan Stevenson',
    title: 'We Need to Talk About an Injustice (일반 연설 보조 자료)',
    organization: 'TED',
    officialUrl: 'https://www.ted.com/talks/bryan_stevenson_we_need_to_talk_about_an_injustice',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설 · 비설교 보조자료] 개인적인 이야기에서 공적 메시지로 연결하는 전달 신호',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: '교육·강연',
    deliveryModeTags: ['이야기·간증'],
    audienceTags: [],
    skillTags: ['예화 후 핵심 복귀 신호', '전환 신호'],
    contextLimits: ['설교가 아닌 일반 연설 보조 자료임. 상업 교육 기능 도입 시 TED 라이선스 별도 확인 필요'],
  },
  {
    id: 'S02',
    category: 'general_speech',
    speaker: 'Julian Treasure',
    title: 'How to Speak So That People Want to Listen (일반 연설 보조 자료)',
    organization: 'TED',
    officialUrl: 'https://www.youtube.com/watch?v=eIho2S0ZahI',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설 · 비설교 보조자료] 음성 표현을 구별해 듣고 자신의 말로 재현하는 연습',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: '교육·강연',
    deliveryModeTags: ['교육·강의'],
    audienceTags: [],
    skillTags: ['속도·강세·쉼', '끝맺음'],
    contextLimits: ['설교가 아닌 일반 연설 보조 자료임'],
  },
  {
    id: 'S03',
    category: 'general_speech',
    speaker: 'Chimamanda Ngozi Adichie',
    title: 'The Danger of a Single Story (일반 연설 보조 자료)',
    organization: 'TED',
    officialUrl: 'https://www.ted.com/talks/chimamanda_ngozi_adichie_the_danger_of_a_single_story',
    reviewHypothesisOrVerifiedSkill:
      '[검토 가설 · 비설교 보조자료] 이야기의 전환, 반복되는 표현, 절제된 전달',
    reviewStatus: 'source_candidate',
    allowedUse: 'unverified_link_only',
    occasionTag: '교육·강연',
    deliveryModeTags: ['이야기·간증'],
    audienceTags: [],
    skillTags: ['전환 신호', '절제된 전달'],
    contextLimits: ['설교가 아닌 일반 연설 보조 자료임'],
  },
];
