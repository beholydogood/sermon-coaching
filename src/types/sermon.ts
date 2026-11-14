export type HabitCategory = 'filler' | 'gesture' | 'gaze' | 'tic';

export interface SpeechHabitItem {
  id: string;
  category: HabitCategory; // filler(말투/추임새), gesture(손버릇/제스처), gaze(시선처리), tic(기타 무의식적 틱/동작)
  title: string;
  count?: number; // 감지 횟수
  severity: 'low' | 'medium' | 'high';
  description: string;
  remedyTip: string; // 교정 실천법
  resolved?: boolean; // 교정 완료 체크 여부
  timestamps: Array<{ seconds: number; timeDisplay: string; note: string }>;
}

export interface SpeechStrengthDetail {
  id: string;
  category: '발성/성량' | '어조/딕션' | '침묵/호흡' | '시선/공감' | '제스처/매너';
  title: string;
  description: string;
  highlightTime?: { seconds: number; timeDisplay: string; note: string };
}

// ==========================================
// 설교 스피치 코칭 v1.3 (sermon-coach-antigravity 규격)
// ==========================================
export type DeliveryFunctionType =
  | 'explanation'
  | 'scripture_reading'
  | 'question'
  | 'story'
  | 'comfort'
  | 'exhortation';

export interface SpeechTimeInterval {
  startSec: number;
  endSec: number;
  label?: string;
  role?: string;
  reason?: string;
  deliveryFunction?: DeliveryFunctionType;
}

export interface TargetSelectionSpec {
  user_provided_name: string | null;
  video_local_target_id: string | null;
  selection_source:
    | 'user_input'
    | 'url_param'
    | 'youtube_chapter'
    | 'description_timetable'
    | 'transcript_analysis'
    | 'title_fallback'
    | null;
  confirmation_status:
    | 'confirmed'
    | 'provisional'
    | 'unconfirmed'
    | 'ambiguous_multiple_speakers'
    | 'no_sermon_found';
  evidence: string[];
  sermon_intervals: SpeechTimeInterval[];
  eligible_audio_intervals: SpeechTimeInterval[];
  eligible_visual_intervals: SpeechTimeInterval[];
  excluded_intervals_with_reasons: Array<{
    startSec: number;
    endSec: number;
    role: string;
    reason: string;
  }>;
}

export interface SpeechCapabilitiesSpec {
  audio_access: boolean;
  continuous_video_access: boolean;
  timestamped_transcript: boolean;
  tool_measurements: boolean;
  ai_model_connected?: boolean;
  is_demo_sample?: boolean;
  modality_note?: string;
}

export interface SpeakerContextSpec {
  language: string;
  current_goal: string | null;
  strengths_to_preserve: string[];
  podium_and_microphone: string | null;
  camera_and_editing:
    | '정면 카메라 (설교자 상반신·손 확인 가능)'
    | '강대상/하단 가림 (손동작 일부 또는 전체 비가시)'
    | '측면 카메라 (정면 시선과 실제 눈맞춤 불일치)'
    | '회중·찬양대·자료 화면 전환 포함'
    | '수어통역 분할/삽입(PIP) 화면 포함'
    | '시각 화면 미확인 (자막/음성 중심)'
    | string
    | null;
  user_provided_accommodations: string[];
}

export type SermonOccasionType =
  | '주일예배'
  | '수요·금요예배'
  | '새벽기도회'
  | '결혼식'
  | '장례식'
  | '부흥회'
  | '수련회'
  | '교육·강연'
  | '기타';

export type SermonDeliveryModeType =
  | '강해'
  | '주제 설명'
  | '이야기·간증'
  | '권면·호소'
  | '교육·강의'
  | '혼합';

export type SermonCommunicationGoalType =
  | '이해'
  | '기억'
  | '위로'
  | '축복'
  | '성찰'
  | '실천 권유';

export type SermonAudienceGroupType =
  | '장년'
  | '청년'
  | '청소년'
  | '어린이'
  | '혼합 청중';

export interface SpeechContextSpec {
  occasion: SermonOccasionType | null;
  ceremonial_stage: string | null;
  delivery_modes: SermonDeliveryModeType[];
  communication_goals: SermonCommunicationGoalType[];
  planned_duration_seconds: number | null;
  audience: {
    groups: SermonAudienceGroupType[];
    primary_groups: string[];
    actual_age_ranges_if_provided: string[];
    religious_vocabulary_familiarity:
      | '익숙함'
      | '보통'
      | '낯섦(새신자·비신자 포함)'
      | '미확인'
      | null;
    language_needs: string[];
    accessibility_needs_if_provided: string[];
    speaker_relationship: string | null;
  };
  setting: {
    format: '대면 예배' | '온라인 생중계/녹화' | '대면+온라인 병행' | null;
    venue_and_size_if_provided: string | null;
    manuscript_usage?:
      | '원고 전체 지참'
      | '요약 노트/태블릿'
      | '성경만 지참(무원고)'
      | '프롬프터'
      | '미확인'
      | null;
    planned_participation: string | null;
  };
  context_evidence: Array<{
    field: string;
    source: '사용자 입력' | '운영자 확인' | '공식 게시 정보' | '잠정 추정';
    status: 'confirmed' | 'provisional' | 'unknown';
  }>;
  confirmation_status: 'confirmed' | 'provisional' | 'unknown';
  segment_overrides: Array<{
    startSec: number;
    endSec: number;
    goal: string;
    note: string;
  }>;
  profile_version?: string;
}

export interface SpeechObservationItem {
  id: string;
  startSec: number;
  endSec: number;
  timeDisplay: string;
  modality: 'transcript' | 'audio' | 'visual';
  observedFact: string;
  quoteOrBehavior: string;
  deliveryFunction: DeliveryFunctionType;
  frequencyType:
    | 'single_observation'
    | 'repeated_in_this_video'
    | 'repeated_across_comparable_videos';
  isStrength: boolean;
  targetId: string;
  sourceLabel: string;
}

export interface SpeechMeasurementItem {
  metricId: string;
  label: string;
  definition: string;
  value: number | string | null;
  unit: string;
  numeratorLabel: string;
  denominatorLabel: string;
  eligibleDurationSec: number;
  excludedSummary: string;
  toolSource: string;
  toolVersion: string;
  assessable: boolean;
  unassessableReason?: string;
}

export interface SpeechInterpretationItem {
  id: string;
  observationIds: string[];
  title: string;
  category:
    | '명료성·습관어'
    | '속도·강세·쉼'
    | '시선·원고'
    | '표정'
    | '손동작·자세'
    | '말·몸 협응'
    | '청중 추적 과정';
  isStrength: boolean;
  sentenceFunction: string;
  deliveryHypothesis: string;
  alternativeExplanation?: string;
  confidenceBasis: string;
  actionToKeepOrChange: string;
  nextCheckCondition: string;
}

export type PracticeDrillStatus =
  | 'proposed'
  | 'accepted'
  | 'attempted'
  | 'improved'
  | 'maintenance'
  | 'reappeared'
  | 'not_assessable';

export interface SpeechPracticeDrill {
  id: string;
  title: string;
  skillTag: string;
  targetBehavior: string;
  reviewInterval: {
    startSec: number;
    endSec: number;
    timeDisplay: string;
    quoteOrGist: string;
  };
  preSpeechCue: string;
  steps3to5Min: string[];
  sampleScriptWithNotation?: string;
  successCriteria: string;
  overcorrectionGuard: string;
  nextRecordingCheck: string;
  status: PracticeDrillStatus;
}

export type ChangeJudgmentType =
  | '개선 관찰'
  | '유지'
  | '악화 관찰'
  | '혼재'
  | '비교 불가'
  | '기준선(첫 기록)';

export interface SpeechChangeJudgment {
  metricOrSkill: string;
  previousVideoId: string | null;
  previousSermonTitle?: string | null;
  previousIntervalLabel: string | null;
  comparable: boolean;
  nonComparableReason?: string;
  judgment: ChangeJudgmentType;
  isLongTermTrend: boolean;
  consecutiveCount?: number;
  previousEvidence?: string;
  currentEvidence: string;
  analysisNote: string;
}

export interface SpeechUserCorrection {
  id: string;
  observationId: string;
  originalText: string;
  correctedExplanation: string;
  correctionType:
    | 'scripture_reading'
    | 'manuscript_check'
    | 'interpreter_check'
    | 'other_speaker'
    | 'mic_adjustment'
    | 'context_override'
    | 'other';
  createdAt: string;
  status: 'applied';
}

export interface SpeechCoachingV13Data {
  promptVersion: string;
  coreConclusion: string;
  contextCriteriaBanner: string;
  contextPriorityFocus: string[];
  originalDurationSec: number;
  targetSelection: TargetSelectionSpec;
  capabilities: SpeechCapabilitiesSpec;
  speakerContext: SpeakerContextSpec;
  speechContext: SpeechContextSpec;
  observations: SpeechObservationItem[];
  measurements: SpeechMeasurementItem[];
  interpretations: SpeechInterpretationItem[];
  practiceDrills: SpeechPracticeDrill[];
  changeJudgments: SpeechChangeJudgment[];
  userCorrections: SpeechUserCorrection[];
  recommendedReferenceIds: string[];
}

export interface SpeechCoachingData {
  vocalStrengths: string[];
  strengthDetails?: SpeechStrengthDetail[];
  vocalImprovements: string[];
  eyeContactScore: number; // 0-100
  gestureScore: number; // 0-100
  vocalStabilityScore: number; // 0-100
  pacingScore?: number; // 0-100
  speechPace: '느림' | '안정적(적절)' | '약간 빠름' | '매우 빠름';
  habits: SpeechHabitItem[];
  v13?: SpeechCoachingV13Data;
}

export interface HomileticTimelineItem {
  id: string;
  timeDisplay: string;
  seconds: number;
  title: string;
  type:
    | 'intro'
    | 'scripture'
    | 'exegesis'
    | 'illustration'
    | 'application'
    | 'prayer'
    | 'theory'
    | 'case'
    | 'interaction'
    | 'action';
  summary: string;
  homileticNote: string; // 설교학적 분석
  pedagogyNote?: string;
  deliveryTip: string; // 전달 및 보컬 코칭 팁
  quote?: string; // 핵심 선포 문장
  badgeColor: string;
}

export type LectureTimelineItem = HomileticTimelineItem;

export interface MetricScore {
  category: string;
  score: number;
  maxScore: number;
  evaluation: string;
  strengths: string[];
  recommendations: string[];
  icon: string;
}

export interface ScriptureVerse {
  verse: number;
  koreanText: string;
  greekOrHebrewKeyword?: string;
  greekKeyword?: string;
  originalMeaning?: string;
  greekMeaning?: string;
  pastoralPoint: string;
}

export interface LectureCoreConcept {
  order: number;
  conceptTitle: string;
  summary: string;
  keyword: string;
  practicalTip: string;
}

export interface SmallGroupQuestion {
  num: number;
  question: string;
  guide: string;
}

export interface PastoralActionItem {
  title: string;
  desc: string;
}

export interface SermonMeta {
  id: string;
  sessionNumber?: number; // 누적 회차 번호
  churchName: string;
  churchSub?: string;
  preacher: string;
  date: string;
  sermonTitle: string;
  scriptureRef: string;
  targetAudience?: string;
  youtubeId: string;
  videoSourceType?: 'youtube' | 'file';
  videoFileUrl?: string;
  videoFileName?: string;
  startTimeSec: number;
  endTimeSec?: number;
  startTimeLabel: string;
  totalLengthLabel: string;
  createdAt: string;
  isSampleData?: boolean;
  userOwnerKey?: string;
  // 호환성 필드
  institution?: string;
  lecturer?: string;
  lectureTitle?: string;
  topicRef?: string;
}

export interface SermonRecord {
  meta: SermonMeta;
  summary: string;
  averageScore: number;
  metrics: MetricScore[];
  timeline: HomileticTimelineItem[];
  speechCoaching: SpeechCoachingData;
  keyStrengths: string[];
  recommendations: string[];
  smallGroupQuestions: SmallGroupQuestion[];
  pastoralActionPlan: PastoralActionItem[];
  scriptureVerses?: ScriptureVerse[];
  pastorNote?: string; // 목사님 개인 성찰 메모
}

// ==========================================
// 3. 책 집필 (Book Planning & Manuscript) 타입
// ==========================================
export interface UploadedMaterial {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'ppt' | 'docx' | 'txt' | 'other';
  fileSizeLabel: string;
  extractedText: string;
  summaryPoint?: string;
  uploadedAt: string;
}

export interface BookChapterDraft {
  chapterNum: number;
  partTitle?: string;
  chapterTitle: string;
  subtitle: string;
  scriptureFocus: string;
  coreMessage: string;
  subSections: string[];
  manuscriptDraft: string; // 실제 원고 초안 본문 (문어체 출판 원고)
  reflectionQuestions: string[];
  closingPrayer: string;
  wordCount?: number;
}

export interface BookProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  bookType: '에세이/신앙성숙' | '강해설교집' | '소그룹/제자훈련 교재' | '새신자/전도 입문서' | '목회 리더십';
  writingStyle: '따뜻한 감성 에세이체' | '깊이 있는 강해·신학체' | '실천 중심 라이프코칭체';
  authorPastor: string;
  churchName: string;
  selectedSermonIds: string[];
  uploadedMaterials: UploadedMaterial[];
  proposal: {
    mainTitle: string;
    subTitle: string;
    alternativeTitles: string[];
    publishingIntent: string; // 기획 의도 및 출판 배경
    targetReaders: string; // 핵심 타겟 독자층
    differentiationPoints: string[]; // 도서만의 차별화 강점 3가지
    editorialNote: string; // 설교 구어체 -> 출판 문어체 윤문 포인트
  };
  chapters: BookChapterDraft[];
}

// ==========================================
// 4 & 5. 관리자 기기 인증 & 중앙 업그레이드 배포 타입
// ==========================================
export interface RegisteredDevice {
  deviceId: string;
  deviceLabel: string;
  userAgent: string;
  registeredAt: string;
  lastActiveAt: string;
}

export interface LicenseUser {
  licenseKey: string;
  pastorName: string;
  titleRole?: string; // 담임목사, 부목사, 강도사, 전도사, 선교사 등
  churchName: string;
  phone?: string;
  email?: string;
  role: 'pastor' | 'admin';
  maxDevices: number;
  status: 'active' | 'revoked';
  expiresAt: string;
  createdAt: string;
  lastLoginAt?: string;
  registeredDevices: RegisteredDevice[];
  memo?: string;
}

export interface DeviceAuthInfo {
  isAuthorized: boolean;
  authorizedKey?: string;
  licenseKey?: string;
  pastorName?: string;
  churchName?: string;
  role?: 'pastor' | 'admin';
  deviceId?: string;
  authorizedAt?: string;
}

export interface AppReleaseInfo {
  version: string;
  buildNumber: number;
  releasedAt: string;
  releaseTitle: string;
  releaseNotes: string[];
  mandatory: boolean;
  downloadPackageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
