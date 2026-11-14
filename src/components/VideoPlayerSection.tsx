import { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, Clock, Youtube, Edit3, Check, MapPin } from 'lucide-react';
import { SermonMeta, HomileticTimelineItem } from '../types/sermon';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface VideoPlayerSectionProps {
  currentTimestamp: number;
  onSeek: (seconds: number) => void;
  meta: SermonMeta;
  timeline: HomileticTimelineItem[];
  onUpdateYoutubeId?: (newId: string, detectedStartSec?: number) => void;
  onUpdateStartTime?: (startSec: number) => void;
}

const parseMmSsToSec = (str: string): number => {
  const trimmed = str.trim().replace(/초/g, '');
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

let ytApiPromise: Promise<void> | null = null;
function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const existing = document.getElementById('youtube-iframe-js-api');
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-js-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    } else {
      const checkTimer = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkTimer);
          resolve();
        }
      }, 150);
    }
  });

  return ytApiPromise;
}

export const VideoPlayerSection: React.FC<VideoPlayerSectionProps> = ({
  currentTimestamp,
  onSeek,
  meta,
  timeline,
  onUpdateYoutubeId,
  onUpdateStartTime,
}) => {
  const [reloadTick, setReloadTick] = useState(0);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');

  const [isEditingStart, setIsEditingStart] = useState(false);
  const [customStartInput, setCustomStartInput] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);
  const hasEnforcedInitialStartRef = useRef<boolean>(false);
  const targetStartSecRef = useRef<number>(0);

  // 설교 시작 지점(초): meta.startTimeSec(0초 포함) 우선, 없으면 첫 타임라인 구간 또는 0초
  const sermonStartSec =
    typeof meta.startTimeSec === 'number' && meta.startTimeSec >= 0
      ? meta.startTimeSec
      : timeline && timeline.length > 0 && typeof timeline[0].seconds === 'number'
      ? timeline[0].seconds
      : 0;

  // 현재 재생 타깃 시점: 외부 타임라인 클릭(currentTimestamp > 0)이 있으면 해당 위치, 아니면 실제 설교 시작점(sermonStartSec)
  const effectiveStartSec = Math.floor(
    currentTimestamp > 0 ? currentTimestamp : sermonStartSec
  );
  targetStartSecRef.current = effectiveStartSec;

  const activeVideoId = meta.youtubeId;

  // 1. 유튜브 공식 IFrame Player API 인스턴스 생성 및 설교 시작점 강제 점프 제어
  useEffect(() => {
    if (meta.videoSourceType === 'file') return;
    if (!activeVideoId) return;

    let cancelled = false;
    hasEnforcedInitialStartRef.current = false;
    ytReadyRef.current = false;

    loadYoutubeIframeApi().then(() => {
      if (cancelled || !ytContainerRef.current || !window.YT?.Player) return;

      // 기존 플레이어 정리
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }

      ytContainerRef.current.innerHTML = '';
      const mountEl = document.createElement('div');
      ytContainerRef.current.appendChild(mountEl);

      const initialSec = targetStartSecRef.current;

      ytPlayerRef.current = new window.YT.Player(mountEl, {
        width: '100%',
        height: '100%',
        videoId: activeVideoId,
        playerVars: {
          start: initialSec,
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (cancelled) return;
            ytReadyRef.current = true;
            const sec = targetStartSecRef.current;
            if (sec > 0) {
              try {
                event.target.seekTo(sec, true);
                event.target.playVideo();
              } catch {
                // ignore
              }
            }
          },
          onStateChange: (event: any) => {
            if (cancelled) return;
            // YT.PlayerState.PLAYING === 1
            // 브라우저 자동재생 정책 등으로 인해 사용자가 빨간 재생 버튼을 눌러 0:00부터 시작하려는 순간에도
            // 즉시 설교 시작 시점(targetStartSecRef.current)으로 강제 이동시킵니다!
            if (event.data === 1 && !hasEnforcedInitialStartRef.current) {
              hasEnforcedInitialStartRef.current = true;
              const desiredSec = targetStartSecRef.current;
              try {
                const cur = event.target.getCurrentTime?.() || 0;
                if (desiredSec > 3 && cur < desiredSec - 3) {
                  event.target.seekTo(desiredSec, true);
                }
              } catch {
                // ignore
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, [activeVideoId, meta.id, meta.videoSourceType, reloadTick]);

  // 2. 재생 중 타임라인/습관 구간 클릭 또는 설교 시작점 변경 시 부드러운 즉시 이동(seekTo)
  useEffect(() => {
    if (meta.videoSourceType === 'file' && videoRef.current) {
      const vid = videoRef.current;
      if (Math.abs(vid.currentTime - effectiveStartSec) > 1) {
        vid.currentTime = effectiveStartSec;
      }
      vid.play().catch(() => {});
    } else if (ytPlayerRef.current && ytReadyRef.current) {
      try {
        const cur = ytPlayerRef.current.getCurrentTime?.() || 0;
        if (Math.abs(cur - effectiveStartSec) > 2) {
          ytPlayerRef.current.seekTo(effectiveStartSec, true);
          ytPlayerRef.current.playVideo?.();
        }
      } catch {
        // ignore
      }
    }
  }, [effectiveStartSec, meta.videoSourceType]);

  const showTempNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleJump = (sec: number) => {
    targetStartSecRef.current = sec;
    hasEnforcedInitialStartRef.current = false;
    onSeek(sec);

    if (meta.videoSourceType === 'file' && videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    } else if (ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.seekTo(sec, true);
        ytPlayerRef.current.playVideo?.();
        hasEnforcedInitialStartRef.current = true;
      } catch {
        setReloadTick((prev) => prev + 1);
      }
    } else {
      setReloadTick((prev) => prev + 1);
    }
  };

  const handleQuickStartPreset = (sec: number) => {
    if (onUpdateStartTime) {
      onUpdateStartTime(sec);
    }
    handleJump(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    showTempNotice(`설교 시작점이 ${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초로 저장되었습니다.`);
  };

  // 현재 재생 중인 화면의 위치(초)를 그대로 설교 시작점으로 저장!
  const handleCaptureCurrentPositionAsStart = () => {
    let curSec = 0;
    if (meta.videoSourceType === 'file' && videoRef.current) {
      curSec = Math.floor(videoRef.current.currentTime || 0);
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      curSec = Math.floor(ytPlayerRef.current.getCurrentTime() || 0);
    }

    if (curSec <= 0) {
      showTempNotice('영상을 재생하거나 원하는 설교 시작 위치로 이동한 뒤 눌러주세요.');
      return;
    }

    if (onUpdateStartTime) {
      onUpdateStartTime(curSec);
    }
    onSeek(curSec);
    const m = Math.floor(curSec / 60);
    const s = curSec % 60;
    showTempNotice(`현재 위치(${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초)가 설교 시작점으로 고정되었습니다!`);
  };

  const handleApplyUrl = async () => {
    if (!customInputUrl.trim()) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = customInputUrl.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : customInputUrl.trim();

    if (videoId && onUpdateYoutubeId) {
      let detectedStartSec: number | undefined = undefined;
      try {
        const res = await fetch('/api/extract-youtube-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: customInputUrl.trim() }),
        });
        const data = await res.json();
        if (data.success && typeof data.detectedStartSec === 'number') {
          detectedStartSec = data.detectedStartSec;
        }
      } catch {
        // ignore
      }

      onUpdateYoutubeId(videoId, detectedStartSec);
      setIsEditingUrl(false);
      setCustomInputUrl('');
      setReloadTick((prev) => prev + 1);
    }
  };

  const handleOpenStartEditor = () => {
    const m = Math.floor(sermonStartSec / 60);
    const s = sermonStartSec % 60;
    setCustomStartInput(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    setIsEditingStart(!isEditingStart);
  };

  const handleApplyStartTime = () => {
    const sec = parseMmSsToSec(customStartInput);
    if (onUpdateStartTime) {
      onUpdateStartTime(sec);
    }
    handleJump(sec);
    setIsEditingStart(false);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    showTempNotice(`설교 시작점이 ${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초로 변경되었습니다.`);
  };

  const startMin = Math.floor(sermonStartSec / 60);
  const startRemSec = sermonStartSec % 60;
  const displayStartLabel = `${String(startMin).padStart(2, '0')}분 ${String(startRemSec).padStart(2, '0')}초`;

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-2xl">
      {/* Video Header & Segment Info */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-white tracking-wide">
            설교 영상 플레이어
          </span>
          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
            설교 시작점: {displayStartLabel} ~ 자동 점프 재생
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {onUpdateStartTime && (
            <button
              type="button"
              onClick={handleCaptureCurrentPositionAsStart}
              className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer font-semibold"
              title="영상 바를 원하는 설교 시작 위치에 놓고 누르면 그 위치가 시작점으로 영구 저장됩니다"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>현재 재생 위치를 시작점으로 고정</span>
            </button>
          )}

          {onUpdateYoutubeId && (
            <button
              type="button"
              onClick={() => setIsEditingUrl(!isEditingUrl)}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer"
              title="설교 유튜브 영상 링크 변경"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>영상 링크 변경</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleJump(sermonStartSec)}
            className="text-xs text-amber-300 hover:text-amber-200 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer font-bold"
            title="설교 시작 시점부터 즉시 다시 재생"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>설교 시작부터 재생 ({displayStartLabel})</span>
          </button>
        </div>
      </div>

      {/* 알림 토스트 */}
      {savedNotice && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* 설교 시작점 1클릭 빠른 이동 & 고정 바 */}
      <div className="mb-3 px-3 py-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mr-1">
            <Clock className="w-3.5 h-3.5" />
            <span>예배 앞부분 건너뛰기(시작점 변경):</span>
          </span>
          {[
            { label: '00:00', sec: 0 },
            { label: '01:00', sec: 60 },
            { label: '10:00', sec: 600 },
            { label: '20:00', sec: 1200 },
            { label: '30:00', sec: 1800 },
            { label: '40:00', sec: 2400 },
          ].map((preset) => {
            const isCurrent = Math.abs(sermonStartSec - preset.sec) < 3;
            return (
              <button
                key={preset.sec}
                type="button"
                onClick={() => handleQuickStartPreset(preset.sec)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-extrabold border-amber-400 shadow-xs'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleOpenStartEditor}
            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 cursor-pointer"
          >
            직접 입력 (분:초)
          </button>
        </div>
      </div>

      {/* 설교 시작 시간 변경 인라인 폼 */}
      {isEditingStart && (
        <div className="mb-3 p-3 bg-slate-850 rounded-xl border border-amber-500/30 flex items-center space-x-2 animate-in fade-in flex-wrap gap-y-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">
            설교 본문 시작 시간(분:초):
          </span>
          <input
            type="text"
            value={customStartInput}
            onChange={(e) => setCustomStartInput(e.target.value)}
            placeholder="예: 24:30 또는 02:00"
            className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
          />
          <button
            type="button"
            onClick={handleApplyStartTime}
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>시작점 저장 &amp; 즉시 점프</span>
          </button>
        </div>
      )}

      {/* URL 변경 인라인 폼 */}
      {isEditingUrl && (
        <div className="mb-3 p-3 bg-slate-850 rounded-xl border border-indigo-500/30 flex items-center space-x-2 animate-in fade-in">
          <Youtube className="w-4 h-4 text-rose-500 shrink-0" />
          <input
            type="text"
            value={customInputUrl}
            onChange={(e) => setCustomInputUrl(e.target.value)}
            placeholder="새 유튜브 설교 영상 주소를 입력하세요 (챕터·설명란 설교 시작 시간 자동 감지)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>적용</span>
          </button>
        </div>
      )}

      {/* 16:9 반응형 비디오 플레이어 (YT.Player API 제어로 00:00 재생을 원천 차단하고 설교 시작점으로 점프) */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
        {meta.videoSourceType === 'file' && meta.videoFileUrl ? (
          <video
            ref={videoRef}
            key={`${meta.videoFileUrl}-${reloadTick}`}
            src={`${meta.videoFileUrl}#t=${effectiveStartSec}`}
            controls
            autoPlay
            className="absolute inset-0 w-full h-full object-contain bg-black"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              if (effectiveStartSec > 0) {
                video.currentTime = effectiveStartSec;
              }
              video.play().catch(() => {});
            }}
            onPlay={(e) => {
              const video = e.currentTarget;
              if (video.currentTime < 3 && sermonStartSec > 3) {
                video.currentTime = sermonStartSec;
              }
            }}
          />
        ) : (
          <div
            ref={ytContainerRef}
            className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
          />
        )}
      </div>

      {/* 하단 설교 타임라인 빠른 점프 칩 */}
      {timeline && timeline.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Play className="w-3 h-3 text-indigo-400" />
            <span>설교 구간 바로가기:</span>
          </span>
          {timeline.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleJump(item.seconds)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700/80 hover:border-indigo-500/50 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="font-mono text-amber-400 font-bold">{item.timeDisplay}</span>
              <span className="truncate max-w-[140px]">{item.title.split(':')[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
