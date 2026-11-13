import { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, Clock, Youtube, Edit3, Check } from 'lucide-react';
import { SermonMeta, HomileticTimelineItem } from '../types/sermon';

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

export const VideoPlayerSection: React.FC<VideoPlayerSectionProps> = ({
  currentTimestamp,
  onSeek,
  meta,
  timeline,
  onUpdateYoutubeId,
  onUpdateStartTime,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');

  const [isEditingStart, setIsEditingStart] = useState(false);
  const [customStartInput, setCustomStartInput] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // 설교 시작 지점(초): meta.startTimeSec 또는 첫 대지(서론) 시작 시점, 없으면 기본 15초(앞부분 인트로 스킵)
  const sermonStartSec =
    meta.startTimeSec && meta.startTimeSec > 0
      ? meta.startTimeSec
      : timeline && timeline.length > 0 && timeline[0].seconds > 0
      ? timeline[0].seconds
      : 15;

  // 현재 재생할 타깃 시점: 0초일 경우 자동으로 설교 시작 부분(sermonStartSec)으로 지정
  const effectiveStartSec = Math.floor(
    currentTimestamp > 0 ? currentTimestamp : sermonStartSec
  );

  // 유튜브 IFrame Player API postMessage를 통해 설교 시작 지점으로 강제 점프 및 자동 재생
  const sendYoutubeSeekAndPlay = (targetSec: number) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const seekPayload = JSON.stringify({
      event: 'command',
      func: 'seekTo',
      args: [targetSec, true],
    });
    const playPayload = JSON.stringify({
      event: 'command',
      func: 'playVideo',
      args: [],
    });
    win.postMessage(seekPayload, '*');
    win.postMessage(playPayload, '*');
  };

  // 로컬 비디오 파일(<video>) 및 유튜브(<iframe>) 모두 설교 시작 지점으로 자동 이동 및 재생
  useEffect(() => {
    if (meta.videoSourceType === 'file' && videoRef.current) {
      const vid = videoRef.current;
      if (Math.abs(vid.currentTime - effectiveStartSec) > 1) {
        vid.currentTime = effectiveStartSec;
      }
      vid.play().catch(() => {});
    } else if (iframeRef.current) {
      sendYoutubeSeekAndPlay(effectiveStartSec);
      const timer1 = setTimeout(() => sendYoutubeSeekAndPlay(effectiveStartSec), 600);
      const timer2 = setTimeout(() => sendYoutubeSeekAndPlay(effectiveStartSec), 1400);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [effectiveStartSec, meta.id, meta.videoFileUrl, meta.videoSourceType, iframeKey]);

  const handleJump = (sec: number) => {
    onSeek(sec);
    if (meta.videoSourceType === 'file' && videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    } else {
      sendYoutubeSeekAndPlay(sec);
      setIframeKey((prev) => prev + 1);
    }
  };

  const handleQuickStartPreset = (sec: number) => {
    if (onUpdateStartTime) {
      onUpdateStartTime(sec);
    }
    handleJump(sec);
  };

  const handleApplyUrl = async () => {
    if (!customInputUrl.trim()) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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
      } catch (e) {
        // ignore
      }

      onUpdateYoutubeId(videoId, detectedStartSec);
      setIsEditingUrl(false);
      setCustomInputUrl('');
      setIframeKey((prev) => prev + 1);
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
  };

  const activeVideoId = meta.youtubeId;
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
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
            설교 시작: {displayStartLabel} ~ 자동 재생
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {onUpdateStartTime && (
            <button
              onClick={handleOpenStartEditor}
              className="text-xs text-slate-300 hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer"
              title="설교 시작 시간(분:초) 직접 지정"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>설교 시작점 설정</span>
            </button>
          )}

          {onUpdateYoutubeId && (
            <button
              onClick={() => setIsEditingUrl(!isEditingUrl)}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer"
              title="설교 유튜브 영상 링크 변경"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>영상 링크 변경</span>
            </button>
          )}

          <button
            onClick={() => handleJump(sermonStartSec)}
            className="text-xs text-amber-300 hover:text-amber-200 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
            title="설교 시작 시점부터 즉시 다시 재생"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>설교 시작부터 재생 ({displayStartLabel})</span>
          </button>
        </div>
      </div>

      {/* 설교 시작점 1클릭 빠른 이동 & 고정 바 (예배 전체 영상에서 찬양/기도 건너뛰기용) */}
      <div className="mb-3 px-3 py-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mr-1">
            <Clock className="w-3.5 h-3.5" />
            <span>설교 시작점 즉시 지정:</span>
          </span>
          {[
            { label: '00:15 (단편설교)', sec: 15 },
            { label: '05:00', sec: 300 },
            { label: '15:00', sec: 900 },
            { label: '20:00 (예배실황)', sec: 1200 },
            { label: '25:00', sec: 1500 },
            { label: '30:00', sec: 1800 },
          ].map((preset) => {
            const isCurrent = Math.abs(sermonStartSec - preset.sec) < 5;
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
        <div className="mb-3 p-3 bg-slate-850 rounded-xl border border-amber-500/30 flex items-center space-x-2 animate-in fade-in">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">
            설교 본문 시작 시간:
          </span>
          <input
            type="text"
            value={customStartInput}
            onChange={(e) => setCustomStartInput(e.target.value)}
            placeholder="예: 25:10 또는 00:15"
            className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
          />
          <button
            onClick={handleApplyStartTime}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>시작점 저장 &amp; 재생</span>
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
            placeholder="새 유튜브 설교 영상 주소를 입력하세요 (설교 시작 시간 자동 감지)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-400"
          />
          <button
            onClick={handleApplyUrl}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>적용</span>
          </button>
        </div>
      )}

      {/* 16:9 반응형 비디오 플레이어 (유튜브 및 로컬 영상 파일 모두 설교 시작 지점부터 자동 재생) */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
        {meta.videoSourceType === 'file' && meta.videoFileUrl ? (
          <video
            ref={videoRef}
            key={`${meta.videoFileUrl}-${iframeKey}`}
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
              // 처음 0초 근처에서 재생 버튼을 누른 경우 자동으로 설교 시작 부분으로 점프
              if (video.currentTime < 2 && sermonStartSec > 2) {
                video.currentTime = sermonStartSec;
              }
            }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            key={`${activeVideoId}-${effectiveStartSec}-${iframeKey}`}
            src={`https://www.youtube.com/embed/${activeVideoId}?start=${effectiveStartSec}&autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
            title={meta.sermonTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
              sendYoutubeSeekAndPlay(effectiveStartSec);
              setTimeout(() => sendYoutubeSeekAndPlay(effectiveStartSec), 500);
            }}
            className="absolute inset-0 w-full h-full border-0"
          />
        )}
      </div>

      {/* 대지별 퀵 점프 칩 바 */}
      <div className="mt-3.5 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center space-x-1.5 font-semibold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>설교 구간별 즉시 이동 (클릭 시 해당 시간부터 재생)</span>
          </span>
          <span className="font-mono text-amber-400 font-bold">
            현재 재생 위치: {Math.floor(effectiveStartSec / 60)}분 {effectiveStartSec % 60}초
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {timeline?.map((item) => {
            const isNear = Math.abs(item.seconds - effectiveStartSec) < 30;
            return (
              <button
                key={item.id}
                onClick={() => handleJump(item.seconds)}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
                  isNear
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{item.timeDisplay}</span>
                <span className="truncate max-w-[130px] font-medium">{item.title}</span>
                <Play className="w-3 h-3 ml-0.5 text-indigo-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
