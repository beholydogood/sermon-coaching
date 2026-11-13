import { useState, useEffect } from 'react';
import { SermonHeader } from './components/SermonHeader';
import { VideoPlayerSection } from './components/VideoPlayerSection';
import { TimelineSection } from './components/TimelineSection';
import { FeedbackDashboard } from './components/FeedbackDashboard';
import { AiCoachChat } from './components/AiCoachChat';
import { ScriptureModal } from './components/ScriptureModal';
import { AnalyzeSermonModal } from './components/AnalyzeSermonModal';
import { SermonArchiveSidebar } from './components/SermonArchiveSidebar';
import { SermonGrowthReportModal } from './components/SermonGrowthReportModal';
import { DeviceAuthModal } from './components/DeviceAuthModal';
import { BookWritingStudio } from './components/BookWritingStudio';
import { AdminReleaseModal } from './components/AdminReleaseModal';
import { AdminAppPage } from './components/AdminAppPage';
import {
  getAllArchivedSermons,
  saveSermonToArchive,
  deleteSermonFromArchive,
  updateAllSermonsProfile,
} from './utils/sermonStorage';
import { getDeviceAuthInfo, updateDeviceProfileInfo } from './utils/auth';
import { SermonRecord, DeviceAuthInfo, AppReleaseInfo } from './types/sermon';
import {
  Award,
  BookOpen,
  MessageSquare,
  Church,
} from 'lucide-react';

export default function App() {
  const [sermons, setSermons] = useState<SermonRecord[]>([]);
  const [activeSermon, setActiveSermon] = useState<SermonRecord | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [activeMainTab, setActiveMainTab] = useState<'feedback' | 'timeline' | 'coach'>('feedback');

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState<boolean>(false);
  const [isGrowthModalOpen, setIsGrowthModalOpen] = useState<boolean>(false);
  const [isScriptureModalOpen, setIsScriptureModalOpen] = useState<boolean>(false);
  const [isBookStudioOpen, setIsBookStudioOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isAdminAppMode, setIsAdminAppMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname.startsWith('/admin') ||
      new URLSearchParams(window.location.search).get('mode') === 'admin'
    );
  });

  const [authInfo, setAuthInfo] = useState<DeviceAuthInfo>({ isAuthorized: false });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // 중앙 원격 배포 버전 상태 (Feature 5)
  const [releaseInfo, setReleaseInfo] = useState<AppReleaseInfo>({
    version: 'v2.5.0',
    buildNumber: 250,
    releasedAt: new Date().toISOString(),
    releaseTitle: '설교 누적 아카이브 & AI 도서 출판 스튜디오 v2.5 정식 배포',
    releaseNotes: [
      '영상 업로드 시 지난 피드백 누적 및 성장 비교 기능',
      '스피치 강점/단점(말투, 손버릇, 시선, 틱) 타임스탬프 연동 코칭',
      '설교 + PDF/PPT 기반 도서 기획안 및 출판 원고 초안 생성',
      '인가 기기 PWA 설치 및 중앙 라이선스 제어',
      '중앙 1클릭 원격 업그레이드 배포 및 파일 재배포 지원',
    ],
    mandatory: false,
  });
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState<boolean>(false);
  const [analyzeBannerMsg, setAnalyzeBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setIsAdminAppMode(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', onPopState);

    const auth = getDeviceAuthInfo();
    setAuthInfo(auth);

    // 초대 링크(/?key=...)로 접속했거나 미인증 상태이면 인증 모달 표시
    const hasInviteKey =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('key');
    if (!auth.isAuthorized || hasInviteKey) {
      setIsAuthModalOpen(true);
    }

    const archived = getAllArchivedSermons();
    setSermons(archived);
    if (archived.length > 0) {
      setActiveSermon(archived[0]);
      setCurrentTimestamp(archived[0].meta.startTimeSec || 0);
    }

    // 중앙 원격 최신 버전 확인
    fetch('/api/release/latest')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.releaseInfo) {
          if (data.releaseInfo.version !== 'v2.4.0' && data.releaseInfo.buildNumber > 240) {
            setReleaseInfo(data.releaseInfo);
            setHasUpdateAvailable(true);
          }
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const handleDeviceAuthorized = (newAuth: DeviceAuthInfo) => {
    setAuthInfo(newAuth);
    if (newAuth.pastorName || newAuth.churchName) {
      const updatedSermons = updateAllSermonsProfile(
        newAuth.pastorName || '',
        newAuth.churchName || ''
      );
      setSermons(updatedSermons);
      if (activeSermon) {
        const matched = updatedSermons.find((s) => s.meta.id === activeSermon.meta.id);
        setActiveSermon(matched || updatedSermons[0] || null);
      }
    }
    setIsAuthModalOpen(false);
  };

  const handleUpdateProfile = (pastorName: string, churchName: string) => {
    const updatedAuth = updateDeviceProfileInfo(pastorName, churchName);
    setAuthInfo(updatedAuth);

    const updatedSermons = updateAllSermonsProfile(pastorName, churchName);
    setSermons(updatedSermons);
    if (activeSermon) {
      const matched = updatedSermons.find((s) => s.meta.id === activeSermon.meta.id);
      setActiveSermon(matched || updatedSermons[0] || null);
    }
  };

  const handleSermonAnalyzed = (newSermon: SermonRecord) => {
    const updated = saveSermonToArchive(newSermon);
    setSermons(updated);
    setActiveSermon(newSermon);
    setActiveMainTab('feedback');
    setCurrentTimestamp(newSermon.meta.startTimeSec || 15);
    setAnalyzeBannerMsg(
      `✨ 「${newSermon.meta.sermonTitle}」 (${newSermon.meta.scriptureRef}) 설교 정밀 코칭 분석이 완료되어 아카이브에 누적 저장되었습니다! (종합 ${newSermon.averageScore}점)`
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setAnalyzeBannerMsg(null), 6000);
  };

  const handleSelectSermon = (sermon: SermonRecord) => {
    setActiveSermon(sermon);
    setCurrentTimestamp(sermon.meta.startTimeSec || 0);
  };

  const handleDeleteSermon = (sermonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSermonFromArchive(sermonId);
    setSermons(updated);
    if (activeSermon?.meta.id === sermonId) {
      setActiveSermon(updated[0] || null);
      setCurrentTimestamp(updated[0]?.meta.startTimeSec || 0);
    }
  };

  const handleJumpToTimestamp = (seconds: number) => {
    setCurrentTimestamp(seconds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayFromStart = () => {
    const startSec = activeSermon?.meta.startTimeSec || 0;
    setCurrentTimestamp(startSec);
  };

  const handleUpdateYoutubeId = (newId: string, detectedStartSec?: number) => {
    if (!activeSermon) return;
    const nextStartSec =
      typeof detectedStartSec === 'number' && detectedStartSec > 0
        ? detectedStartSec
        : activeSermon.meta.startTimeSec || 15;
    const startMin = Math.floor(nextStartSec / 60);
    const startRemSec = nextStartSec % 60;
    const updated = {
      ...activeSermon,
      meta: {
        ...activeSermon.meta,
        youtubeId: newId,
        startTimeSec: nextStartSec,
        startTimeLabel: `${String(startMin).padStart(2, '0')}분 ${String(startRemSec).padStart(2, '0')}초`,
      },
    };
    setActiveSermon(updated);
    setCurrentTimestamp(nextStartSec);
    const updatedList = saveSermonToArchive(updated);
    setSermons(updatedList);
  };

  const handleUpdateStartTime = (startSec: number) => {
    if (!activeSermon) return;
    const startMin = Math.floor(startSec / 60);
    const startRemSec = startSec % 60;
    const updated = {
      ...activeSermon,
      meta: {
        ...activeSermon.meta,
        startTimeSec: startSec,
        startTimeLabel: `${String(startMin).padStart(2, '0')}분 ${String(startRemSec).padStart(2, '0')}초`,
      },
    };
    setActiveSermon(updated);
    setCurrentTimestamp(startSec);
    const updatedList = saveSermonToArchive(updated);
    setSermons(updatedList);
  };

  const handleReleasePublished = (newRelease: AppReleaseInfo) => {
    setReleaseInfo(newRelease);
    setHasUpdateAvailable(false);
  };

  const handleApplyUpdate = () => {
    setHasUpdateAvailable(false);
    alert(`[${releaseInfo.version}] 업데이트가 본 기기에 성공적으로 반영되었습니다.`);
  };

  const handlePrint = () => window.print();

  const handleOpenAdminApp = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminAppMode(true);
  };

  const handleBackToStudio = () => {
    window.history.pushState({}, '', '/');
    setIsAdminAppMode(false);
  };

  if (isAdminAppMode) {
    return <AdminAppPage onGoToStudio={handleBackToStudio} />;
  }

  if (!activeSermon) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Church style={{ width: 40, height: 40, color: '#818cf8', margin: '0 auto 12px' }} />
          <p style={{ color: '#94a3b8', fontSize: 14 }}>설교 데이터를 불러오는 중입니다...</p>
        </div>
        <DeviceAuthModal isOpen={isAuthModalOpen} onAuthorized={handleDeviceAuthorized} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      {/* ─── 상단 헤더 ─── */}
      <SermonHeader
        meta={activeSermon.meta}
        authInfo={authInfo}
        archiveCount={sermons.length}
        hasUpdateAvailable={hasUpdateAvailable}
        releaseInfo={releaseInfo}
        onApplyUpdate={handleApplyUpdate}
        onPlayFromStart={handlePlayFromStart}
        onOpenScripture={() => setIsScriptureModalOpen(true)}
        onPrint={handlePrint}
        onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
        onOpenGrowthModal={() => setIsGrowthModalOpen(true)}
        onOpenBookStudio={() => setIsBookStudioOpen(true)}
        onOpenAdminModal={handleOpenAdminApp}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* ─── 메인 컨텐츠: 좌측 사이드바 + 우측 메인 ─── */}
      <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '20px 16px 40px', boxSizing: 'border-box' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSidebarOpen ? '340px 1fr' : '1fr',
          gap: 20,
          alignItems: 'start',
          minHeight: 0,
        }}>

          {/* ══ 좌측 아카이브 패널 (Feature 1: 누적 영상 & 피드백 선택) ══ */}
          {isSidebarOpen && (
            <aside style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <SermonArchiveSidebar
                sermons={sermons}
                activeSermonId={activeSermon.meta.id}
                onSelectSermon={handleSelectSermon}
                onDeleteSermon={handleDeleteSermon}
                onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
                onOpenGrowthModal={() => setIsGrowthModalOpen(true)}
              />
            </aside>
          )}

          {/* ══ 우측 메인 스테이지 ══ */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {/* 새 설교 분석 완료 알림 배너 */}
            {analyzeBannerMsg && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                  border: '1px solid #34d399',
                  color: '#ecfdf5',
                  padding: '12px 16px',
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)',
                }}
              >
                <span>{analyzeBannerMsg}</span>
                <button
                  onClick={() => setAnalyzeBannerMsg(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a7f3d0',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  닫기
                </button>
              </div>
            )}

            {/* 비디오 플레이어 */}
            <VideoPlayerSection
              currentTimestamp={currentTimestamp}
              onSeek={(sec) => setCurrentTimestamp(sec)}
              meta={activeSermon.meta}
              timeline={activeSermon.timeline}
              onUpdateYoutubeId={handleUpdateYoutubeId}
              onUpdateStartTime={handleUpdateStartTime}
            />

            {/* 탭 네비게이션 */}
            <div style={{
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid #1e293b',
              paddingBottom: 12,
              overflowX: 'auto',
            }}>
              {([
                { key: 'feedback', label: '설교학 5대 진단 & 스피치 코칭', icon: <Award style={{ width: 16, height: 16, color: '#fbbf24' }} /> },
                { key: 'timeline', label: `설교 타임라인 (${activeSermon.timeline.length}구간)`, icon: <BookOpen style={{ width: 16, height: 16, color: '#a5b4fc' }} /> },
                { key: 'coach',    label: 'AI 설교 코치 1:1 상담',          icon: <MessageSquare style={{ width: 16, height: 16, color: '#fde68a' }} /> },
              ] as const).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveMainTab(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    background: activeMainTab === key ? '#4f46e5' : '#1e293b',
                    color: activeMainTab === key ? '#fff' : '#94a3b8',
                    boxShadow: activeMainTab === key ? '0 4px 20px rgba(79,70,229,0.4)' : 'none',
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div>
              {activeMainTab === 'feedback' && (
                <FeedbackDashboard
                  key={activeSermon.meta.id}
                  sermon={activeSermon}
                  onJumpToTimestamp={handleJumpToTimestamp}
                />
              )}
              {activeMainTab === 'timeline' && (
                <TimelineSection
                  key={activeSermon.meta.id}
                  timeline={activeSermon.timeline}
                  currentTimestamp={currentTimestamp}
                  onSeek={(sec) => handleJumpToTimestamp(sec)}
                />
              )}
              {activeMainTab === 'coach' && (
                <AiCoachChat
                  key={activeSermon.meta.id}
                  sermon={activeSermon}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ─── 풋터 ─── */}
      <footer style={{ borderTop: '1px solid #0f172a', background: '#020617', padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#475569' }}>
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>AI 설교 코칭 &amp; 도서집필 스튜디오</span>
        <span> • 목회자 전용 강해설교 진단, 스피치 습관 교정 및 도서 출판 시스템</span>
      </footer>

      {/* ─── 모달들 ─── */}
      <AnalyzeSermonModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        onSermonAnalyzed={handleSermonAnalyzed}
        defaultPreacher={authInfo.pastorName}
        defaultChurchName={authInfo.churchName}
      />
      <SermonGrowthReportModal
        isOpen={isGrowthModalOpen}
        onClose={() => setIsGrowthModalOpen(false)}
        sermons={sermons}
      />
      <ScriptureModal
        isOpen={isScriptureModalOpen}
        onClose={() => setIsScriptureModalOpen(false)}
        verses={activeSermon.scriptureVerses}
        meta={activeSermon.meta}
      />
      <DeviceAuthModal
        isOpen={isAuthModalOpen}
        onAuthorized={handleDeviceAuthorized}
      />
      <BookWritingStudio
        isOpen={isBookStudioOpen}
        onClose={() => setIsBookStudioOpen(false)}
        sermons={sermons}
        activeSermonId={activeSermon.meta.id}
        defaultAuthorName={authInfo.pastorName}
        defaultChurchName={authInfo.churchName}
      />
      <AdminReleaseModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentAuthInfo={authInfo}
        currentReleaseInfo={releaseInfo}
        onReleasePublished={handleReleasePublished}
      />
    </div>
  );
}
