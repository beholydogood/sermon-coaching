import { useRef, useEffect } from 'react';
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
  meta,
  timeline,
}) => {
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

  // 현재 재생 타깃 시점: 외부 타임스탬프 점프(currentTimestamp > 0)가 있으면 해당 위치, 아니면 실제 설교 시작점(sermonStartSec)
  const effectiveStartSec = Math.floor(
    currentTimestamp > 0 ? currentTimestamp : sermonStartSec
  );
  targetStartSecRef.current = effectiveStartSec;

  const activeVideoId = meta.youtubeId;

  // 1. 유튜브 공식 IFrame Player API 인스턴스 생성 및 실제 설교 시작점 자동 점프
  useEffect(() => {
    if (meta.videoSourceType === 'file') return;
    if (!activeVideoId) return;

    let cancelled = false;
    hasEnforcedInitialStartRef.current = false;
    ytReadyRef.current = false;

    loadYoutubeIframeApi().then(() => {
      if (cancelled || !ytContainerRef.current || !window.YT?.Player) return;

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
  }, [activeVideoId, meta.id, meta.videoSourceType]);

  // 2. 재생 중 스피치 습관 타임스탬프 클릭 시 해당 시점으로 부드럽게 즉시 이동(seekTo)
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

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-3 sm:p-4 shadow-2xl">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
        {meta.videoSourceType === 'file' && meta.videoFileUrl ? (
          <video
            ref={videoRef}
            key={meta.videoFileUrl}
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
    </div>
  );
};
