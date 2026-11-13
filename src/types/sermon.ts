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
  startTimeLabel: string;
  totalLengthLabel: string;
  createdAt: string;
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
  churchName: string;
  role: 'pastor' | 'admin';
  maxDevices: number;
  status: 'active' | 'revoked';
  expiresAt: string;
  createdAt: string;
  registeredDevices: RegisteredDevice[];
  memo?: string;
}

export interface DeviceAuthInfo {
  isAuthorized: boolean;
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
