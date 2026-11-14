import { useState, useRef, useEffect } from 'react';
import {
  X,
  Youtube,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload,
  Video,
  FileVideo,
} from 'lucide-react';
import {
  SermonRecord,
  SermonOccasionType,
  SermonDeliveryModeType,
  SermonAudienceGroupType,
  SermonCommunicationGoalType,
} from '../types/sermon';
import {
  buildTailoredSermonRecord,
  detectScriptureFromTitle,
  parseYoutubeVideoId,
} from '../utils/sermonAnalyzer';
import { getAllArchivedSermons } from '../utils/sermonStorage';
import { buildSpeechCoachingV13Data } from '../utils/speechCoachingEngineV13';
import { getPersonalGeminiApiKey, getDeviceAuthInfo } from '../utils/auth';

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

  const [detectedStartTime, setDetectedStartTime] = useState('');
  const [title, setTitle] = useState('');
  const [scripture, setScripture] = useState('');
  const [preacher, setPreacher] = useState(defaultPreacher || '이은혜 목사');
  const [churchName, setChurchName] = useState(defaultChurchName || '은혜의빛교회');
  const [targetAudience, setTargetAudience] = useState('삶의 고난 속에서 위로와 믿음의 결단을 바라는 성도');

  // 스피치 코칭 v1.3 독립 4축 맥락 입력 (행사 · 전달 방식 · 청중 · 발언 목적)
  const [occasion, setOccasion] = useState<SermonOccasionType>('주일예배');
  const [ceremonialStage, setCeremonialStage] = useState<string>('');
  const [deliveryModes, setDeliveryModes] = useState<SermonDeliveryModeType[]>(['강해']);
  const [audienceGroups, setAudienceGroups] = useState<SermonAudienceGroupType[]>(['장년', '혼합 청중']);
  const [communicationGoals, setCommunicationGoals] = useState<SermonCommunicationGoalType[]>([
    '이해',
    '실천 권유',
  ]);
  const [cameraCondition, setCameraCondition] = useState<string>(
    '시각 화면 미확인 (자막/음성 중심)'
  );

  const toggleItem = <T extends string>(list: T[], item: T, setter: (next: T[]) => void) => {
    if (list.includes(item)) {
      if (list.length > 1) setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAutoExtractedVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDetectedStartTime('');
      setErrorMsg(null);
      lastAutoExtractedVideoIdRef.current = null;
      if (defaultPreacher) setPreacher(defaultPreacher);
      if (defaultChurchName) setChurchName(defaultChurchName);
    }
  }, [defaultPreacher, defaultChurchName, isOpen]);

  // 유튜브 URL 입력 시 제목·본문 및 백그라운드 실제 설교 시작 시점 자동 추출
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

        if (data.title) {
          setTitle(data.title);
        }
        if (autoScripture) {
          setScripture(autoScripture);
        }
        if (data.channel && (!churchName || churchName === '은혜의빛교회')) {
          setChurchName(data.channel);
        }
        if (typeof data.detectedStartTime === 'string') {
          setDetectedStartTime(data.detectedStartTime);
        }
        return {
          title: data.title || '',
          scripture: autoScripture || '',
          channel: data.channel || '',
          detectedStartTime: data.detectedStartTime || '00:00',
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
      handleAutoExtract(trimmed);
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
      let currentStartTime = detectedStartTime.trim();

      if (sourceMode === 'youtube' && (!currentTitle || !currentStartTime)) {
        const extracted = await handleAutoExtract(youtubeUrl.trim());
        if (extracted) {
          if (!currentTitle && extracted.title) currentTitle = extracted.title;
          if (extracted.scripture && !currentScripture) currentScripture = extracted.scripture;
          if (extracted.detectedStartTime) {
            currentStartTime = extracted.detectedStartTime;
          }
        }
      }

      if (!currentScripture && currentTitle) {
        currentScripture = detectScriptureFromTitle(currentTitle);
      }

      const resolvedPreacher = preacher.trim() || defaultPreacher || '담임목사';
      const resolvedChurch = churchName.trim() || defaultChurchName || '소속교회';
      const previousRecords = getAllArchivedSermons();

      const customSpeechContext = {
        occasion,
        ceremonial_stage: ceremonialStage.trim() || null,
        delivery_modes: deliveryModes,
        communication_goals: communicationGoals,
        audience: {
          groups: audienceGroups,
          primary_groups: [audienceGroups[0] || '장년'],
          actual_age_ranges_if_provided: [],
          religious_vocabulary_familiarity: '보통' as const,
          language_needs: ['한국어'],
          accessibility_needs_if_provided: [],
          speaker_relationship: '담임/설교 목회자',
        },
      };

      const customSpeakerContext = {
        camera_and_editing: cameraCondition,
      };

      let finalRecord: SermonRecord | null = null;

      if (sourceMode === 'youtube') {
        try {
          const payload: any = {
            youtubeUrl: youtubeUrl.trim(),
            startTime: currentStartTime,
            startTimeAuto: true,
            title: currentTitle,
            scripture: currentScripture,
            preacher: resolvedPreacher,
            churchName: resolvedChurch,
            targetAudience: targetAudience || '모든 주일 예배 참석 성도',
            videoSourceType: 'youtube',
            speechContext: customSpeechContext,
            speakerContext: customSpeakerContext,
            previousRecords,
            licenseKey: (getDeviceAuthInfo().licenseKey || getDeviceAuthInfo().authorizedKey || '').trim().toUpperCase(),
          };

          const response = await fetch('/api/analyze-sermon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-gemini-key': getPersonalGeminiApiKey(),
            },
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
        const { v13, computedPaceLabel } = buildSpeechCoachingV13Data({
          videoId: finalRecord.meta.youtubeId || finalRecord.meta.id,
          sermonTitle: finalRecord.meta.sermonTitle,
          scriptureRef: finalRecord.meta.scriptureRef,
          preacherName: resolvedPreacher,
          churchName: resolvedChurch,
          targetAudienceText: targetAudience,
          originalDurationSec: (finalRecord.meta.startTimeSec || 0) + 1800,
          detectedStartSec: finalRecord.meta.startTimeSec || 0,
          startSource: 'user_input',
          startReasonLabel: `설교 시작 시점 (${finalRecord.meta.startTimeLabel})`,
          transcriptLines: [],
          isDemoSample: false,
          aiModelConnected: false,
          continuousVideoAccess: false,
          audioAccess: false,
          customSpeechContext: customSpeechContext as any,
          customSpeakerContext: customSpeakerContext as any,
          previousRecords,
        });
        finalRecord.meta.isSampleData = false;
        finalRecord.speechCoaching.speechPace = computedPaceLabel;
        finalRecord.speechCoaching.v13 = v13;
      }

      if (sourceMode === 'file' && videoFilePreviewUrl) {
        finalRecord.meta.videoSourceType = 'file';
        finalRecord.meta.videoFileUrl = videoFilePreviewUrl;
        finalRecord.meta.videoFileName = videoFile?.name;
      }

      setYoutubeUrl('');
      setDetectedStartTime('');
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
                    setDetectedStartTime('');
                  }}
                  placeholder="예: https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-400"
                  required={sourceMode === 'youtube'}
                />
                <button
                  type="button"
                  onClick={() => handleAutoExtract(youtubeUrl)}
                  disabled={extracting}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-indigo-300 font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '정보 가져오기'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                유튜브 주소를 붙여넣으면 설교 제목과 본문 구절이 자동 입력됩니다.
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

          {/* 대상 성도 및 상황 */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">대상 성도 및 상황</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="예: 삶의 고난과 불확실성 속에서 위로와 믿음을 구하는 성도"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          {/* 스피치 코칭 4축 독립 맥락 조합 (행사 · 전달 방식 · 청중 · 장면 목적) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300">
                🎙️ 스피치 코칭 4축 맥락 조합 (행사 · 전달 방식 · 청중 · 목적 독립 설정)
              </span>
              <span className="text-[10px] text-slate-400">복수 조합 가능</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">1. 행사·예배 상황</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value as SermonOccasionType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  {(['주일예배', '수요·금요예배', '새벽기도회', '부흥회', '수련회', '결혼식', '장례식', '교육·강연'] as SermonOccasionType[]).map(
                    (occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  촬영·시각 관찰 조건 (분모 분리용)
                </label>
                <select
                  value={cameraCondition}
                  onChange={(e) => setCameraCondition(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="시각 화면 미확인 (자막/음성 중심)">유튜브 자막·음성 중심 (시각 추정 제외)</option>
                  <option value="강대상/하단 가림 (손동작 일부 또는 전체 비가시)">강대상 손 가림 (손동작 분모 제외)</option>
                  <option value="측면 카메라 (정면 시선과 실제 눈맞춤 불일치)">측면 카메라 (정면=눈맞춤 환산 제외)</option>
                  <option value="수어통역 분할/삽입(PIP) 화면 포함">수어통역 삽입 화면 포함 (통역자 동작 제외)</option>
                  <option value="정면 카메라 (설교자 상반신·손 확인 가능)">정면 카메라 (상반신·손 가시)</option>
                </select>
              </div>
            </div>

            {occasion === '장례식' && (
              <div>
                <label className="block text-[11px] text-amber-300 mb-1">
                  장례 의식 세부 순서 (위로·여백·절제 기준 적용)
                </label>
                <input
                  type="text"
                  value={ceremonialStage}
                  onChange={(e) => setCeremonialStage(e.target.value)}
                  placeholder="예: 입관예배 / 발인예배 / 하관예배 / 위로예배"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">2. 전달 방식 (복수 선택 가능)</label>
              <div className="flex flex-wrap gap-1.5">
                {(['강해', '주제 설명', '이야기·간증', '권면·호소', '교육·강의', '혼합'] as SermonDeliveryModeType[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleItem(deliveryModes, mode, setDeliveryModes)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        deliveryModes.includes(mode)
                          ? 'bg-indigo-600/80 text-white border-indigo-400'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">3. 청중 구성 (복수 선택)</label>
                <div className="flex flex-wrap gap-1">
                  {(['장년', '청년', '청소년', '어린이', '혼합 청중'] as SermonAudienceGroupType[]).map(
                    (aud) => (
                      <button
                        key={aud}
                        type="button"
                        onClick={() => toggleItem(audienceGroups, aud, setAudienceGroups)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          audienceGroups.includes(aud)
                            ? 'bg-emerald-600/80 text-white border-emerald-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {aud}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">4. 발언 목적 (복수 선택)</label>
                <div className="flex flex-wrap gap-1">
                  {(['이해', '기억', '위로', '축복', '성찰', '실천 권유'] as SermonCommunicationGoalType[]).map(
                    (goal) => (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleItem(communicationGoals, goal, setCommunicationGoals)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          communicationGoals.includes(goal)
                            ? 'bg-amber-500/80 text-slate-950 font-bold border-amber-300'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {goal}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
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
                  <span>설교학 진단 및 스피치 습관 정밀 분석 중 (약 5~10초)...</span>
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
