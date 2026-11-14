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
} from 'lucide-react';
import { SermonMeta, DeviceAuthInfo, AppReleaseInfo } from '../types/sermon';

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

  // 이름 / 교회 수정 모달 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPastorName, setEditPastorName] = useState('');
  const [editChurchName, setEditChurchName] = useState('');

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
    setIsEditingProfile(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPastorName.trim() || !editChurchName.trim()) return;
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
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
                <span>{sermonTitle}</span>
                <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20 truncate max-w-[200px] sm:max-w-none">
                  {scriptureRef}
                </span>
              </h1>
            </div>
          </div>

          {/* 우측 퀵 컨트롤 버튼들: 사이드바 -> 새 설교 등록 & 코칭 -> 책 집필 스튜디오 -> 앱 설치 */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* 1. 사이드바 버튼 */}
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

            {/* 2. 새 설교 등록 & 코칭 (사이드바와 책 집필 스튜디오 사이 배치) */}
            <button
              onClick={onOpenAnalyzeModal}
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold border border-amber-300 shadow-md shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
              title="유튜브 설교 링크 또는 영상 파일 등록 및 AI 정밀 분석"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>새 설교 등록 &amp; 코칭</span>
            </button>

            {/* 3. 책 집필 스튜디오 버튼 */}
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

            {/* 4. 기기 앱 설치 PWA */}
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
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
    </header>
  );
};
