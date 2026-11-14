import { useState, useRef, useEffect } from 'react';
import {
  X,
  Youtube,
  Clock,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Upload,
  Video,
  FileVideo,
  Search,
} from 'lucide-react';
import { SermonRecord } from '../types/sermon';
import {
  buildTailoredSermonRecord,
  detectScriptureFromTitle,
  parseYoutubeVideoId,
} from '../utils/sermonAnalyzer';

interface AnalyzeSermonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSermonAnalyzed: (newSermon: SermonRecord) => void;
  defaultPreacher?: string;
  defaultChurchName?: string;
}

export const AnalyzeSermonModal: React.FC<AnalyzeSermonModalProps> = ({
  isOpen,
  onClose,
  onSermonAnalyzed,
  defaultPreacher,
  defaultChurchName,
}) => {
  const [sourceMode, setSourceMode] = useState<'youtube' | 'file'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFilePreviewUrl, setVideoFilePreviewUrl] = useState<string | null>(null);

  const [startTime, setStartTime] = useState('');
  const [isManualStart, setIsManualStart] = useState(false);
  const [startReasonLabel, setStartReasonLabel] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [scripture, setScripture] = useState('');
  const [preacher, setPreacher] = useState(defaultPreacher || '이은혜 목사');
  const [churchName, setChurchName] = useState(defaultChurchName || '은혜의빛교회');
  const [targetAudience, setTargetAudience] = useState('삶의 고난 속에서 위로와 믿음의 결단을 바라는 성도');

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAutoExtractedVideoIdRef = useRef<string | null>(null);

  // 모달이 열릴 때마다 이전 설교의 시작 시간(예: 25:00 등)이 남아있지 않도록 깨끗하게 초기화
  useEffect(() => {
    if (isOpen) {
      setStartTime('');
      setIsManualStart(false);
      setStartReasonLabel(null);
      setErrorMsg(null);
      lastAutoExtractedVideoIdRef.current = null;
      if (defaultPreacher) setPreacher(defaultPreacher);
      if (defaultChurchName) setChurchName(defaultChurchName);
    }
  }, [defaultPreacher, defaultChurchName, isOpen]);

  // 유튜브 URL 내 시작 시간 파라미터(?t=1250, &t=20m15s, &start=900 등) 즉시 추출 헬퍼
  const extractStartTimeFromUrl = (rawUrl: string): string | null => {
    const tMatch = rawUrl.match(/[?&](?:t|start)=([0-9hms]+)/i);
    if (!tMatch) return null;
    const rawT = tMatch[1];
    let sec = 0;
    if (/^\d+$/.test(rawT)) {
      sec = parseInt(rawT, 10);
    } else {
      const h = rawT.match(/(\d+)h/i);
      const m = rawT.match(/(\d+)m/i);
      const s = rawT.match(/(\d+)s/i);
      sec =
        (h ? parseInt(h[1], 10) * 3600 : 0) +
        (m ? parseInt(m[1], 10) * 60 : 0) +
        (s ? parseInt(s[1], 10) : 0);
    }
    if (sec > 0) {
      const mm = Math.floor(sec / 60);
      const ss = sec % 60;
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
    return null;
  };

  // 유튜브 URL 입력 시 실제 설교 시작 시점(자막/챕터/설명란 분석) & 제목 & 본문 자동 추출
  const handleAutoExtract = async (
    urlToExtract?: string,
    options?: { forceStartOverride?: boolean }
  ) => {
    const targetUrl = (typeof urlToExtract === 'string' ? urlToExtract : youtubeUrl).trim();
    if (!targetUrl) {
      setErrorMsg('유튜브 설교 영상 주소를 입력해 주세요.');
      return null;
    }
    setErrorMsg(null);
    setExtracting(true);

    try {
      const res = await fetch('/api/extract-youtube-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (data.success) {
        const autoScripture =
          data.scripture || detectScriptureFromTitle(data.title || '');

        if (data.title) {
          setTitle(data.title);
        }
        if (autoScripture) {
          setScripture(autoScripture);
        }
        if (data.channel && (!churchName || churchName === '은혜의빛교회')) {
          setChurchName(data.channel);
        }
        if (
          typeof data.detectedStartTime === 'string' &&
          (options?.forceStartOverride || !isManualStart)
        ) {
          setStartTime(data.detectedStartTime);
          setIsManualStart(false);
          setStartReasonLabel(
            data.startReasonLabel ||
              `실제 설교 시작 시점(${data.detectedStartTime})이 자동 감지되었습니다.`
          );
        }
        return {
          title: data.title || '',
          scripture: autoScripture || '',
          channel: data.channel || '',
          detectedStartTime: data.detectedStartTime || '00:00',
          detectedStartSec:
            typeof data.detectedStartSec === 'number' ? data.detectedStartSec : 0,
        };
      } else {
        setErrorMsg('영상 정보를 가져오지 못했습니다. 링크를 확인해 주세요.');
      }
    } catch {
      setErrorMsg('영상 정보를 불러오는 중 네트워크 오류가 발생했습니다.');
    } finally {
      setExtracting(false);
    }
    return null;
  };

  // 유튜브 링크를 붙여넣으면 별도로 버튼을 누르지 않아도 즉시 실제 설교 시작 시간을 자동 탐색!
  useEffect(() => {
    if (!isOpen || sourceMode !== 'youtube') return;
    const trimmed = youtubeUrl.trim();
    const vid = parseYoutubeVideoId(trimmed);
    if (!vid) {
      lastAutoExtractedVideoIdRef.current = null;
      return;
    }
    if (lastAutoExtractedVideoIdRef.current === vid) return;

    const timer = setTimeout(() => {
      lastAutoExtractedVideoIdRef.current = vid;
      const urlStart = extractStartTimeFromUrl(trimmed);
      if (urlStart) {
        setStartTime(urlStart);
        setIsManualStart(true);
        setStartReasonLabel(`링크에 포함된 시작 시간(${urlStart})이 적용되었습니다.`);
      }
      handleAutoExtract(trimmed, { forceStartOverride: !urlStart });
    }, 350);

    return () => clearTimeout(timer);
  }, [youtubeUrl, isOpen, sourceMode]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoFilePreviewUrl(url);

      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      if (!title) {
        setTitle(cleanName);
      }
      const detectedScripture = detectScriptureFromTitle(cleanName);
      if (detectedScripture && !scripture) {
        setScripture(detectedScripture);
      }

      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        if (!isManualStart) {
          setStartTime('00:00');
          setStartReasonLabel(
            `업로드된 영상 파일(${Math.floor(tempVideo.duration / 60)}분) 처음부터 재생합니다. 필요시 시작 시점을 입력해 주세요.`
          );
        }
      };
      tempVideo.src = url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceMode === 'youtube' && !youtubeUrl.trim()) {
      setErrorMsg('유튜브 설교 영상 링크를 입력해 주세요.');
      return;
    }
    if (sourceMode === 'file' && !videoFile) {
      setErrorMsg('분석할 설교 영상 파일(MP4 등)을 선택해 주세요.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      let currentTitle = title.trim();
      let currentScripture = scripture.trim();
      let currentStartTime = startTime.trim();

      // 아직 자동 감지가 완료되지 않은 상태에서 바로 제출한 경우 즉시 실제 설교 시작 시점 추출
      if (sourceMode === 'youtube' && (!currentTitle || (!isManualStart && !currentStartTime))) {
        const extracted = await handleAutoExtract(youtubeUrl.trim(), {
          forceStartOverride: !isManualStart,
        });
        if (extracted) {
          if (!currentTitle && extracted.title) currentTitle = extracted.title;
          if (extracted.scripture && !currentScripture) currentScripture = extracted.scripture;
          if (!isManualStart && extracted.detectedStartTime) {
            currentStartTime = extracted.detectedStartTime;
          }
        }
      }

      if (!currentScripture && currentTitle) {
        currentScripture = detectScriptureFromTitle(currentTitle);
      }

      const resolvedPreacher = preacher.trim() || defaultPreacher || '담임목사';
      const resolvedChurch = churchName.trim() || defaultChurchName || '소속교회';

      let finalRecord: SermonRecord | null = null;

      if (sourceMode === 'youtube') {
        try {
          const payload: any = {
            youtubeUrl: youtubeUrl.trim(),
            startTime: currentStartTime,
            startTimeAuto: !isManualStart,
            title: currentTitle,
            scripture: currentScripture,
            preacher: resolvedPreacher,
            churchName: resolvedChurch,
            targetAudience: targetAudience || '모든 주일 예배 참석 성도',
            videoSourceType: 'youtube',
          };

          const response = await fetch('/api/analyze-sermon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          if (data.success && (data.sermonData || data.lectureData)) {
            const candidate: SermonRecord = data.sermonData || data.lectureData;
            const isLegacyStaticTemplate =
              candidate.timeline?.some((t) => t.title.includes('오케스트라') || t.title.includes('조각목'));

            if (!isLegacyStaticTemplate) {
              finalRecord = candidate;
            }
          }
        } catch (apiErr) {
          console.warn('Fallback to client tailored analyzer:', apiErr);
        }
      }

      if (!finalRecord) {
        finalRecord = buildTailoredSermonRecord({
          youtubeUrl: youtubeUrl.trim(),
          videoId: parseYoutubeVideoId(youtubeUrl.trim()) || undefined,
          startTime: currentStartTime || '00:00',
          title: currentTitle,
          scripture: currentScripture,
          preacher: resolvedPreacher,
          churchName: resolvedChurch,
          targetAudience: targetAudience || '모든 주일 예배 참석 성도',
          videoSourceType: sourceMode,
          videoFileName: videoFile?.name,
          videoFileUrl: videoFilePreviewUrl || undefined,
        });
      }

      if (sourceMode === 'file' && videoFilePreviewUrl) {
        finalRecord.meta.videoSourceType = 'file';
        finalRecord.meta.videoFileUrl = videoFilePreviewUrl;
        finalRecord.meta.videoFileName = videoFile?.name;
      }

      // 다음 등록을 위해 입력 폼 및 시작 시간 완전 초기화
      setYoutubeUrl('');
      setStartTime('');
      setIsManualStart(false);
      setStartReasonLabel(null);
      lastAutoExtractedVideoIdRef.current = null;
      setTitle('');
      setScripture('');
      setVideoFile(null);

      onSermonAnalyzed(finalRecord);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('설교 분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 sm:p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-md font-bold">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>새 설교 영상 등록 &amp; AI 정밀 코칭</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                유튜브 링크를 붙여넣으면 찬양·기도·성가대를 구분해 실제 설교 시작 시점을 자동으로 찾아냅니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 영상 소스 모드 탭 (유튜브 vs 파일 직접 업로드) */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSourceMode('youtube')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sourceMode === 'youtube'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>유튜브 링크로 등록</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sourceMode === 'file'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>영상 파일 직접 업로드 (MP4, MOV)</span>
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 소스 모드 1: 유튜브 영상 링크 */}
          {sourceMode === 'youtube' && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-rose-500" />
                <span>유튜브 설교 영상 주소 (URL)</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setYoutubeUrl(val);
                    setIsManualStart(false);
                    setStartReasonLabel(null);
                    setStartTime('');
                  }}
                  placeholder="예: https://www.youtube.com/watch?v=... (링크 붙여넣기 시 설교 시작점 자동 탐색)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-400"
                  required={sourceMode === 'youtube'}
                />
                <button
                  type="button"
                  onClick={() => handleAutoExtract(youtubeUrl, { forceStartOverride: true })}
                  disabled={extracting}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-indigo-300 font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>설교 시점 분석 중...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>설교 시작점 찾기</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                유튜브 주소를 붙여넣으면 영상의 챕터·예배순서·음성 자막을 분석하여 실제 설교 시작 시간과 본문이 자동 입력됩니다.
              </p>
            </div>
          )}

          {/* 소스 모드 2: 영상 파일 업로드 */}
          {sourceMode === 'file' && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <FileVideo className="w-4 h-4 text-indigo-400" />
                <span>로컬 설교 영상 파일 (MP4, MOV, WebM)</span>
                <span className="text-rose-400">*</span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl bg-slate-800/40 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-7 h-7 text-indigo-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-200">
                  {videoFile ? videoFile.name : '클릭하여 내 컴퓨터의 설교 영상 파일 선택'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {videoFile
                    ? `용량: ${(videoFile.size / (1024 * 1024)).toFixed(1)} MB (분석 준비 완료)`
                    : 'MP4, MOV, WebM 비디오 포맷 지원'}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* 실제 설교 시작 시점 (AI 자막/챕터 자동 탐지 + 수동 미세조정 지원) */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>실제 설교 시작 시점 (찬양·기도·성가대 이후 실제 말씀 시작 시간)</span>
              </label>
              {sourceMode === 'youtube' && youtubeUrl.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualStart(false);
                    handleAutoExtract(youtubeUrl, { forceStartOverride: true });
                  }}
                  disabled={extracting}
                  className="text-[11px] text-emerald-300 hover:text-emerald-200 underline cursor-pointer disabled:opacity-50"
                >
                  자동 감지 다시 실행
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setIsManualStart(true);
                  setStartReasonLabel('직접 입력한 설교 시작 시점으로 재생됩니다.');
                }}
                placeholder={extracting ? '탐색 중...' : '자동 감지 (예: 00:00, 31:20)'}
                className="w-44 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-amber-400"
              />

              {extracting && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-[11px] text-indigo-200 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>영상 자막·챕터에서 실제 설교 시작 시점을 찾는 중...</span>
                </span>
              )}

              {!extracting && startReasonLabel && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-200 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{startReasonLabel}</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              단편 설교 영상은 말씀이 바로 시작되는 지점(예: 00:00~00:10)으로, 전체 예배 영상은 찬양·기도·찬양대가 끝난 실제 등단 시점(예: 23:40, 38:15, 44:55 등)으로 자동 설정됩니다. 직접 수정도 가능합니다.
            </p>
          </div>

          {/* 설교 제목 및 본문 구절 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">설교 제목 (비워두면 영상에서 자동 추출)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 모든 것이 합력하여 선을 이루느니라"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">본문 성경 구절 (자동 인식 지원)</label>
              <input
                type="text"
                value={scripture}
                onChange={(e) => setScripture(e.target.value)}
                placeholder="예: 로마서 8장 28~30절"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
              />
            </div>
          </div>

          {/* 설교자 및 교회명 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">설교자 성함</label>
              <input
                type="text"
                value={preacher}
                onChange={(e) => setPreacher(e.target.value)}
                placeholder="예: 이은혜 담임목사"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">교회명</label>
              <input
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="예: 은혜의빛교회"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
              />
            </div>
          </div>

          {/* 청중 및 회중 상황 */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">타겟 성도 및 상황</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="예: 삶의 고난과 불확실성 속에서 위로와 믿음을 구하는 성도"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* 제출 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || extracting}
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs border border-amber-300 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>설교학 5대 지표 및 스피치 습관 정밀 분석 중 (약 5~10초)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>설교 분석 시작 및 누적 아카이브에 자동 저장</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
