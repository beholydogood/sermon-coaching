import { useState, useEffect } from 'react';
import {
  Check,
  Sparkles,
  UserCheck,
  PanelLeft,
  ShieldCheck,
  Church,
  BookMarked,
  Download,
  ArrowUpCircle,
  Edit3,
  X,
  Bell,
  KeyRound,
} from 'lucide-react';
import { SermonMeta, DeviceAuthInfo, AppReleaseInfo } from '../types/sermon';
import {
  getPersonalGeminiApiKey,
  setPersonalGeminiApiKey,
  hasPersonalGeminiApiKey,
} from '../utils/auth';
import { NoticeBoardModal } from './NoticeBoardModal';

interface SermonHeaderProps {
  onPlayFromStart: () => void;
  onOpenScripture: () => void;
  onPrint: () => void;
  onOpenAnalyzeModal: () => void;
  onOpenGrowthModal: () => void;
  onOpenBookStudio?: () => void;
  onOpenAdminModal?: () => void;
  onToggleSidebar?: () => void;
  onUpdateProfile?: (pastorName: string, churchName: string) => void;
  archiveCount: number;
  authInfo?: DeviceAuthInfo;
  meta: SermonMeta;
  hasUpdateAvailable?: boolean;
  releaseInfo?: AppReleaseInfo;
  onApplyUpdate?: () => void;
}

export const SermonHeader: React.FC<SermonHeaderProps> = ({
  onOpenAnalyzeModal,
  onOpenBookStudio,
  onToggleSidebar,
  onUpdateProfile,
  authInfo,
  meta,
  hasUpdateAvailable,
  releaseInfo,
  onApplyUpdate,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // 이름 / 교회 / 개인 AI 키 수정 모달 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isNoticeBoardOpen, setIsNoticeBoardOpen] = useState(false);
  const [editPastorName, setEditPastorName] = useState('');
  const [editChurchName, setEditChurchName] = useState('');
  const [editPersonalKey, setEditPersonalKey] = useState('');
  const [hasKey, setHasKey] = useState<boolean>(() => hasPersonalGeminiApiKey());
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestMsg, setKeyTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const syncKeyState = () => setHasKey(hasPersonalGeminiApiKey());
    window.addEventListener('personal-gemini-key-updated', syncKeyState);
    return () => window.removeEventListener('personal-gemini-key-updated', syncKeyState);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('본 기기에 전용 데스크톱/모바일 앱으로 바로가기를 설치할 수 있습니다.\n브라우저 주소창 우측의 [앱 설치] 아이콘을 클릭하시거나 바로가기를 추가해 주세요.');
    }
  };

  // 인증 시 입력한 교회명과 목회자 성함을 최우선으로 표시
  const churchName =
    authInfo?.churchName || meta.churchName || meta.institution || '은혜의빛교회';
  const preacherName =
    authInfo?.pastorName || meta.preacher || meta.lecturer || '이은혜 목사';
  const sermonTitle =
    meta.sermonTitle || meta.lectureTitle || '모든 것이 합력하여 선을 이루느니라';
  const scriptureRef =
    meta.scriptureRef || meta.topicRef || '로마서 8장 28~30절';

  const openProfileEditor = () => {
    setEditPastorName(preacherName);
    setEditChurchName(churchName);
    setEditPersonalKey(getPersonalGeminiApiKey());
    setKeyTestMsg(null);
    setIsEditingProfile(true);
  };

  const handleTestPersonalKey = async () => {
    const trimmed = editPersonalKey.trim();
    if (!trimmed) {
      setKeyTestMsg({ ok: false, text: '테스트할 Gemini API 키(AQ... 또는 AIzaSy...)를 입력해 주세요.' });
      return;
    }
    setTestingKey(true);
    setKeyTestMsg(null);
    try {
      const res = await fetch('/api/auth/test-gemini-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-gemini-key': trimmed,
        },
        body: JSON.stringify({ userGeminiApiKey: trimmed }),
      });
      const data = await res.json();
      setKeyTestMsg({ ok: Boolean(data.success), text: data.message || '확인 완료' });
    } catch {
      setKeyTestMsg({ ok: false, text: '네트워크 오류로 키 테스트에 실패했습니다.' });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPastorName.trim() || !editChurchName.trim()) return;
    setPersonalGeminiApiKey(editPersonalKey.trim());
    setHasKey(hasPersonalGeminiApiKey());
    if (onUpdateProfile) {
      onUpdateProfile(editPastorName.trim(), editChurchName.trim());
    }
    setIsEditingProfile(false);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-xl sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      {/* ─── 중앙 원격 업데이트 배너 ─── */}
      {hasUpdateAvailable && (
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 px-4 py-2 text-xs font-bold text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <ArrowUpCircle className="w-4 h-4 animate-bounce" />
            <span>
              [중앙 원격 업그레이드 배포] {releaseInfo?.version || 'v2.5.0'} 최신 버전이 발행되었습니다: {releaseInfo?.releaseTitle || '새 기능 및 버그 패치'}
            </span>
          </div>
          <button
            onClick={onApplyUpdate}
            className="bg-slate-950 text-emerald-300 hover:text-white hover:bg-slate-900 px-3 py-1 rounded-lg text-[11px] font-extrabold border border-emerald-400/40 shadow-sm transition-all cursor-pointer"
          >
            지금 원클릭 적용
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* 설교자 및 교회 브랜딩 정보 */}
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <Church className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={openProfileEditor}
                  className="font-bold uppercase tracking-wider text-indigo-300 hover:text-indigo-200 hover:underline transition-colors cursor-pointer"
                  title="클릭하여 소속 교회명 및 성함 수정"
                >
                  {churchName}
                </button>
                <span className="text-slate-500">•</span>
                <button
                  type="button"
                  onClick={openProfileEditor}
                  className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 hover:underline transition-colors cursor-pointer"
                  title="클릭하여 목회자 성함 및 소속 교회명 수정"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{preacherName}</span>
                </button>
                {authInfo?.isAuthorized && (
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>인가된 기기</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={openProfileEditor}
                  className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-colors ${
                    hasKey
                      ? 'bg-indigo-950/70 text-indigo-200 border-indigo-500/40 hover:bg-indigo-900'
                      : 'bg-amber-950/70 text-amber-300 border-amber-500/40 hover:bg-amber-900'
                  }`}
                  title="본인 전용 무료 Gemini API 키 설정 (타인과 공유되지 않음)"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{hasKey ? '내 AI 키 연결됨' : '개인 AI 키 등록'}</span>
                </button>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
                <span>{sermonTitle}</span>
                <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20 truncate max-w-[200px] sm:max-w-none">
                  {scriptureRef}
                </span>
              </h1>
            </div>
          </div>

          {/* 우측 퀵 컨트롤 버튼들 */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* 1. 📢 공지 & 업데이트 버튼 (항상 최상단 노출) */}
            <button
              onClick={() => setIsNoticeBoardOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-bold border border-indigo-400/50 shadow-md shadow-indigo-950/40 transition-all cursor-pointer active:scale-95"
              title="공지사항, 최신 기능 업데이트 내역 확인 및 최신 버전 즉시 새로고침"
            >
              <Bell className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>공지</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-400 text-slate-950 tracking-tight leading-none">
                NEW
              </span>
            </button>

            {/* 2. 🔑 개인 AI 키 버튼 (직접 클릭 가능) */}
            <button
              onClick={openProfileEditor}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                hasKey
                  ? 'bg-slate-800 hover:bg-slate-750 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/50 shadow-md shadow-amber-500/20'
              }`}
              title="Google Gemini 개인 API 키(무료) 등록 및 연결 상태 확인"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{hasKey ? '개인 AI 키: 연결됨' : '🔑 개인 AI 키 등록'}</span>
            </button>

            {/* 3. 사이드바 버튼 */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition-all cursor-pointer active:scale-95"
                title="사이드바 열기/닫기"
              >
                <PanelLeft className="w-4 h-4 text-indigo-400" />
                <span>사이드바</span>
              </button>
            )}

            {/* 4. 새 설교 등록 & 코칭 (사이드바와 책 집필 스튜디오 사이 배치) */}
            <button
              onClick={onOpenAnalyzeModal}
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold border border-amber-300 shadow-md shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
              title="유튜브 설교 링크 또는 영상 파일 등록 및 AI 정밀 분석"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>새 설교 등록 &amp; 코칭</span>
            </button>

            {/* 5. 책 집필 스튜디오 버튼 */}
            {onOpenBookStudio && (
              <button
                onClick={onOpenBookStudio}
                style={{ background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', color: '#ffffff' }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold border border-amber-400/40 shadow-md shadow-amber-600/25 transition-all cursor-pointer active:scale-95"
                title="설교 영상 및 자료 기반 도서 기획 & 원고 초안 생성"
              >
                <BookMarked className="w-4 h-4 text-amber-100" />
                <span>책 집필 스튜디오</span>
              </button>
            )}

            {/* 6. 기기 앱 설치 PWA */}
            {!isInstalled && (
              <button
                onClick={handleInstallPwa}
                className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                title="본 기기에 전용 데스크톱 앱으로 설치"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>앱 설치</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 이름 및 소속 교회 수정 모달 ─── */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Church className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">목회자 성함 · 소속 교회 수정</h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  소속 교회 / 사역지명
                </label>
                <input
                  type="text"
                  value={editChurchName}
                  onChange={(e) => setEditChurchName(e.target.value)}
                  placeholder="예: 사랑의교회"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  목회자 성함 / 직분
                </label>
                <input
                  type="text"
                  value={editPastorName}
                  onChange={(e) => setEditPastorName(e.target.value)}
                  placeholder="예: 홍길동 담임목사"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-300">
                    🔑 본인 전용 Gemini API 키 (방식 B · 개별 사용)
                  </label>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-300 hover:underline font-semibold"
                  >
                    무료 키 발급받기 ↗
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  구글 AI 스튜디오에서 무료로 발급받은 본인 키(`AQ...` 또는 `AIzaSy...`)를 입력하시면, 다른 사용자와 할당량을 공유하지 않고 본인 기기에서만 안전하게 AI 심층·영상 분석을 사용합니다.
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={editPersonalKey}
                    onChange={(e) => setEditPersonalKey(e.target.value)}
                    placeholder="AQ... 또는 AIzaSy... (본인 기기에만 저장됨)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={testingKey}
                    onClick={handleTestPersonalKey}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-bold cursor-pointer shrink-0"
                  >
                    {testingKey ? '확인중...' : '연결 테스트'}
                  </button>
                </div>
                {keyTestMsg && (
                  <div
                    className={`p-2 rounded-lg text-[11px] ${
                      keyTestMsg.ok
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {keyTestMsg.text}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>변경 내용 저장</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 📢 공지 & 업데이트 모달 ─── */}
      <NoticeBoardModal
        isOpen={isNoticeBoardOpen}
        onClose={() => setIsNoticeBoardOpen(false)}
        onOpenKeySettings={openProfileEditor}
      />
    </header>
  );
};
