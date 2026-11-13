import { useState, useRef, useEffect } from 'react';
import {
  X,
  Youtube,
  Clock,
  BookOpen,
  User,
  Building2,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Users,
  Upload,
  Video,
  FileVideo,
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

  const [startTime, setStartTime] = useState('00:00');
  const [title, setTitle] = useState('');
  const [scripture, setScripture] = useState('');
  const [preacher, setPreacher] = useState(defaultPreacher || '이은혜 목사');
  const [churchName, setChurchName] = useState(defaultChurchName || '은혜의빛교회');
  const [targetAudience, setTargetAudience] = useState('삶의 고난 속에서 위로와 믿음의 결단을 바라는 성도');

  useEffect(() => {
    if (defaultPreacher) setPreacher(defaultPreacher);
    if (defaultChurchName) setChurchName(defaultChurchName);
  }, [defaultPreacher, defaultChurchName, isOpen]);

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<{ title?: string; channel?: string; thumb?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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

  // 유튜브 URL 입력 시 제목 & 채널 자동 추출
  const handleAutoExtract = async (urlToExtract?: string) => {
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
        setExtractedInfo({
          title: data.title,
          channel: data.channel,
          thumb: data.thumbnailUrl,
        });

        if (data.title) {
          setTitle(data.title);
        }
        if (autoScripture) {
          setScripture(autoScripture);
        }
        if (data.channel && (!churchName || churchName === '은혜의빛교회')) {
          setChurchName(data.channel);
        }
        if (data.detectedStartTime) {
          setStartTime(data.detectedStartTime);
        }
        return {
          title: data.title || '',
          scripture: autoScripture || '',
          channel: data.channel || '',
          detectedStartTime: data.detectedStartTime || '',
        };
      } else {
        setErrorMsg('영상 정보를 가져오지 못했습니다. 링크를 확인해 주세요.');
      }
    } catch (e: any) {
      setErrorMsg('영상 정보를 불러오는 중 네트워크 오류가 발생했습니다.');
    } finally {
      setExtracting(false);
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoFilePreviewUrl(url);

      // 파일명 기반 제목 & 성경 본문 자동 추천
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      if (!title) {
        setTitle(cleanName);
      }
      const detectedScripture = detectScriptureFromTitle(cleanName);
      if (detectedScripture && !scripture) {
        setScripture(detectedScripture);
      }

      // 업로드 영상 길이를 분석하여 전체 예배 영상(50분 이상)이면 설교 시작점(22:00), 설교 단편이면 인트로 이후(00:15)로 자동 설정
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        if (startTime === '00:00') {
          if (tempVideo.duration >= 3000) {
            setStartTime('22:00');
          } else if (tempVideo.duration > 30) {
            setStartTime('00:15');
          }
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
      let currentStartTime = startTime;

      // 유튜브 모드에서 제목을 비워두었거나 시작 시점이 00:00(미지정)인 경우 유튜브 챕터/설명란/자막에서 설교 시작 시점 자동 감지!
      if (sourceMode === 'youtube' && (!currentTitle || currentStartTime === '00:00')) {
        const extracted = await handleAutoExtract(youtubeUrl.trim());
        if (extracted) {
          if (!currentTitle && extracted.title) currentTitle = extracted.title;
          if (extracted.scripture && !currentScripture) currentScripture = extracted.scripture;
          if (extracted.detectedStartTime && currentStartTime === '00:00') {
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
            // 구버전 서버의 고정 템플릿("오케스트라" / "조각목")인지 확인 후 맞춤형 분석으로 업그레이드
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

      // 로컬 파일 업로드이거나 맞춤형 분석이 필요한 경우 해당 설교 전용 분석 리포트 생성
      if (!finalRecord) {
        finalRecord = buildTailoredSermonRecord({
          youtubeUrl: youtubeUrl.trim(),
          videoId: parseYoutubeVideoId(youtubeUrl.trim()) || undefined,
          startTime: currentStartTime,
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

      // 파일 모드인 경우 로컬 blob URL 보존
      if (sourceMode === 'file' && videoFilePreviewUrl) {
        finalRecord.meta.videoSourceType = 'file';
        finalRecord.meta.videoFileUrl = videoFilePreviewUrl;
        finalRecord.meta.videoFileName = videoFile?.name;
      }

      // 다음 등록을 위해 입력 폼 초기화
      setYoutubeUrl('');
      setTitle('');
      setScripture('');
      setVideoFile(null);
      setExtractedInfo(null);

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
                유튜브 링크 또는 영상 파일을 등록하면 지난 분석 데이터와 누적되어 아카이빙됩니다.
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
                    const urlStart = extractStartTimeFromUrl(val);
                    if (urlStart) {
                      setStartTime(urlStart);
                    }
                  }}
                  placeholder="예: https://www.youtube.com/watch?v=... (시작시간 포함 링크도 지원)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-400"
                  required={sourceMode === 'youtube'}
                />
                <button
                  type="button"
                  onClick={() => handleAutoExtract()}
                  disabled={extracting}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-indigo-300 font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '정보 가져오기'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                링크 입력 후 [정보 가져오기]를 누르면 설교 제목과 교회명이 자동 인식됩니다.
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

          {/* 설교 시작 시점 (찬양/광고 건너뛰기) */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <label className="block text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>실제 설교 시작 시점 (예배 찬양/기도/광고 구간 건너뛰기)</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="예: 20:00 또는 00:15"
                className="w-36 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-amber-400"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: '00:15 (단편설교)', val: '00:15' },
                  { label: '15:00', val: '15:00' },
                  { label: '20:00 (예배실황)', val: '20:00' },
                  { label: '25:00', val: '25:00' },
                  { label: '30:00', val: '30:00' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setStartTime(preset.val)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                      startTime === preset.val
                        ? 'bg-amber-500 text-slate-950 font-extrabold border-amber-400'
                        : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              전체 예배 영상인 경우 목사님 등단 시점(예: 20:00, 25:00)을 선택하면 설교 시작 부분부터 즉시 재생됩니다.
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
              disabled={loading}
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
