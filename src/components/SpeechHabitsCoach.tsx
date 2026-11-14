import { useState } from 'react';
import {
  CheckCircle2,
  PlayCircle,
  Sparkles,
  ShieldAlert,
  Sliders,
  Compass,
  BookOpen,
  History,
  ExternalLink,
  Edit3,
  Check,
  AlertCircle,
  Video,
  Mic,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  SermonRecord,
  SpeechCoachingData,
  SpeechCoachingV13Data,
  SermonOccasionType,
  SermonDeliveryModeType,
  SermonAudienceGroupType,
  SermonCommunicationGoalType,
  PracticeDrillStatus,
  SpeechUserCorrection,
} from '../types/sermon';
import {
  buildSpeechCoachingV13Data,
  buildContextCriteriaAndPriorities,
  buildInterpretationsAndDrillsV13,
  evaluateComparableHistoryV13,
} from '../utils/speechCoachingEngineV13';
import {
  SERMON_REFERENCE_LIBRARY_26,
  REFERENCE_LIBRARY_SUMMARY,
  REFERENCE_COVERAGE_GAPS,
  KIM_WOOJUN_PRELIMINARY_REPORT,
} from '../data/speechReferenceLibrary';
import { formatSecToMmSs, parseTimeStringToSec } from '../utils/youtubeSermonDetector';
import {
  getPersonalGeminiApiKey,
  setPersonalGeminiApiKey,
  hasPersonalGeminiApiKey,
} from '../utils/auth';

interface SpeechHabitsCoachProps {
  sermon?: SermonRecord;
  allSermons?: SermonRecord[];
  speechData: SpeechCoachingData;
  onUpdateSermonRecord?: (updated: SermonRecord) => { saved: boolean; error?: string };
  onJumpToTimestamp: (seconds: number) => void;
}

export const SpeechHabitsCoach: React.FC<SpeechHabitsCoachProps> = ({
  sermon,
  allSermons = [],
  speechData,
  onUpdateSermonRecord,
  onJumpToTimestamp,
}) => {
  // v13 데이터가 없는 기존 레코드일 경우 즉시 초기화
  const initialV13: SpeechCoachingV13Data =
    speechData.v13 ||
    buildSpeechCoachingV13Data({
      videoId: sermon?.meta.youtubeId || sermon?.meta.id || 'sample',
      sermonTitle: sermon?.meta.sermonTitle || '설교 영상',
      scriptureRef: sermon?.meta.scriptureRef || '성경 본문',
      preacherName: sermon?.meta.preacher || '담임목사',
      churchName: sermon?.meta.churchName || '소속교회',
      targetAudienceText: sermon?.meta.targetAudience,
      originalDurationSec: (sermon?.meta.startTimeSec || 0) + 1800,
      detectedStartSec: sermon?.meta.startTimeSec || 0,
      startSource: 'title_fallback',
      startReasonLabel: `설정된 설교 시작 시점 (${sermon?.meta.startTimeLabel || '00:00'})`,
      transcriptLines: [],
      isDemoSample:
        Boolean(sermon?.meta.isSampleData) ||
        Boolean(sermon?.meta.id?.startsWith('sermon-sample-')),
      aiModelConnected: false,
      continuousVideoAccess: false,
      audioAccess: false,
      previousRecords: allSermons.filter((s) => s.meta.id !== sermon?.meta.id),
    }).v13;

  const [v13State, setV13State] = useState<SpeechCoachingV13Data>(initialV13);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [reEvaluating, setReEvaluating] = useState(false);

  // 대상 설교자 · 설교 구간 · 제외 구간 편집 상태
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editPreacherName, setEditPreacherName] = useState(
    v13State.targetSelection.user_provided_name || sermon?.meta.preacher || ''
  );
  const [editTargetStatus, setEditTargetStatus] = useState<
    SpeechCoachingV13Data['targetSelection']['confirmation_status']
  >(v13State.targetSelection.confirmation_status);
  const audioIv = v13State.targetSelection.eligible_audio_intervals[0] || {
    startSec: sermon?.meta.startTimeSec || 0,
    endSec: (sermon?.meta.startTimeSec || 0) + 1800,
  };
  const [editStartMmSs, setEditStartMmSs] = useState(formatSecToMmSs(audioIv.startSec));
  const [editEndMmSs, setEditEndMmSs] = useState(formatSecToMmSs(audioIv.endSec));
  const [extraExcludedStart, setExtraExcludedStart] = useState('');
  const [extraExcludedEnd, setExtraExcludedEnd] = useState('');
  const [extraExcludedRole, setExtraExcludedRole] = useState(
    '동일 설교자의 광고/사회/축도 구간 (설교 코칭에서 제외)'
  );

  // 4축 맥락 편집 상태
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [occasion, setOccasion] = useState<SermonOccasionType>(
    v13State.speechContext.occasion || '주일예배'
  );
  const [ceremonialStage, setCeremonialStage] = useState<string>(
    v13State.speechContext.ceremonial_stage || ''
  );
  const [deliveryModes, setDeliveryModes] = useState<SermonDeliveryModeType[]>(
    v13State.speechContext.delivery_modes.length > 0
      ? v13State.speechContext.delivery_modes
      : ['강해']
  );
  const [audienceGroups, setAudienceGroups] = useState<SermonAudienceGroupType[]>(
    v13State.speechContext.audience.groups.length > 0
      ? v13State.speechContext.audience.groups
      : ['장년']
  );
  const [communicationGoals, setCommunicationGoals] = useState<SermonCommunicationGoalType[]>(
    v13State.speechContext.communication_goals.length > 0
      ? v13State.speechContext.communication_goals
      : ['이해', '실천 권유']
  );
  const [vocabFamiliarity, setVocabFamiliarity] = useState<
    '익숙함' | '보통' | '낯섦(새신자·비신자 포함)' | '미확인'
  >(v13State.speechContext.audience.religious_vocabulary_familiarity || '보통');
  const [cameraCondition, setCameraCondition] = useState<string>(
    v13State.speakerContext.camera_and_editing || '시각 화면 미확인 (자막/음성 중심)'
  );
  const [overrideStartMmSs, setOverrideStartMmSs] = useState('');
  const [overrideEndMmSs, setOverrideEndMmSs] = useState('');
  const [overrideGoal, setOverrideGoal] = useState('부흥회/예배 중 애도·위로 장면 (활력 강제 제외)');

  // 사용자 사실 정정(User Correction) 입력 상태
  const [correctingObsId, setCorrectingObsId] = useState<string | null>(null);
  const [correctionType, setCorrectionType] = useState<SpeechUserCorrection['correctionType']>(
    'scripture_reading'
  );
  const [correctionNote, setCorrectionNote] = useState('');

  // 참고 영상 필터 탭 상태
  const [refFilter, setRefFilter] = useState<
    'recommended' | 'kim_woojun' | 'all_26' | 'coverage_gaps'
  >('kim_woojun');

  // 방식 B: 목회자 개인 Gemini API 키 인라인 설정 상태
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [personalKeyInput, setPersonalKeyInput] = useState(() => getPersonalGeminiApiKey());
  const [hasPersonalKey, setHasPersonalKey] = useState(() => hasPersonalGeminiApiKey());
  const [testingPersonalKey, setTestingPersonalKey] = useState(false);

  const handleSaveAndTestPersonalKey = async () => {
    const trimmed = personalKeyInput.trim();
    setPersonalGeminiApiKey(trimmed);
    setHasPersonalKey(hasPersonalGeminiApiKey());
    if (!trimmed) {
      setSaveFeedback({
        type: 'success',
        msg: '개인 Gemini API 키가 기기에서 제거되었습니다. (자막·규칙 기반 코칭 모드로 동작합니다)',
      });
      setTimeout(() => setSaveFeedback(null), 4000);
      return;
    }
    setTestingPersonalKey(true);
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
      if (data.success) {
        setShowKeyPanel(false);
        setSaveFeedback({
          type: 'success',
          msg: data.message || '본인 전용 Gemini API 키가 연결·저장되었습니다!',
        });
      } else {
        setSaveFeedback({
          type: 'error',
          msg: data.message || 'API 키 확인에 실패했습니다.',
        });
      }
    } catch {
      setSaveFeedback({
        type: 'error',
        msg: '네트워크 오류로 키 테스트에 실패했습니다.',
      });
    } finally {
      setTestingPersonalKey(false);
      setTimeout(() => setSaveFeedback(null), 5000);
    }
  };

  const notifyAndPersist = (nextV13: SpeechCoachingV13Data, successMessage: string) => {
    setV13State(nextV13);
    if (sermon && onUpdateSermonRecord) {
      const nextStartSec =
        nextV13.targetSelection.eligible_audio_intervals[0]?.startSec ??
        sermon.meta.startTimeSec;
      const nextEndSec =
        nextV13.targetSelection.eligible_audio_intervals[0]?.endSec ??
        sermon.meta.endTimeSec;
      const startMin = Math.floor(nextStartSec / 60);
      const startRem = nextStartSec % 60;
      const updatedRecord: SermonRecord = {
        ...sermon,
        meta: {
          ...sermon.meta,
          preacher: nextV13.targetSelection.user_provided_name || sermon.meta.preacher,
          startTimeSec: nextStartSec,
          endTimeSec: nextEndSec,
          startTimeLabel: `${String(startMin).padStart(2, '0')}분 ${String(startRem).padStart(2, '0')}초`,
        },
        speechCoaching: {
          ...speechData,
          v13: nextV13,
        },
      };
      const result = onUpdateSermonRecord(updatedRecord);
      if (result.saved) {
        setSaveFeedback({ type: 'success', msg: successMessage });
      } else {
        setSaveFeedback({
          type: 'error',
          msg: `저장소 기록에 실패하여 저장 완료로 처리하지 않았습니다: ${result.error || '오류'}`,
        });
      }
      setTimeout(() => setSaveFeedback(null), 5000);
    }
  };

  const toggleMulti = <T extends string>(list: T[], item: T, setter: (next: T[]) => void) => {
    if (list.includes(item)) {
      if (list.length > 1) setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  // 대상 설교자 및 설교 구간/제외 구간 정정 저장
  const handleSaveTargetSelection = () => {
    const parsedStart = parseTimeStringToSec(editStartMmSs) ?? audioIv.startSec;
    const parsedEnd = Math.max(
      parsedStart + 60,
      parseTimeStringToSec(editEndMmSs) ?? audioIv.endSec
    );

    const nextExcluded = [...v13State.targetSelection.excluded_intervals_with_reasons];
    const exStart = parseTimeStringToSec(extraExcludedStart);
    const exEnd = parseTimeStringToSec(extraExcludedEnd);
    if (exStart !== null && exEnd !== null && exEnd > exStart) {
      nextExcluded.push({
        startSec: exStart,
        endSec: exEnd,
        role: extraExcludedRole,
        reason: `사용자 직접 지정 제외 구간 (${formatSecToMmSs(exStart)}~${formatSecToMmSs(exEnd)}): ${extraExcludedRole}`,
      });
      setExtraExcludedStart('');
      setExtraExcludedEnd('');
    }

    const nextTarget: SpeechCoachingV13Data['targetSelection'] = {
      ...v13State.targetSelection,
      user_provided_name: editPreacherName.trim() || v13State.targetSelection.user_provided_name,
      confirmation_status: editTargetStatus,
      sermon_intervals: [
        {
          startSec: parsedStart,
          endSec: parsedEnd,
          label: '사용자 확인 실제 설교 구간',
          role: 'target_preacher',
          deliveryFunction: 'explanation',
        },
      ],
      eligible_audio_intervals: [
        {
          startSec: parsedStart,
          endSec: parsedEnd,
          label: `대상 설교자 적격 발화 구간 (${formatSecToMmSs(parsedStart)} ~ ${formatSecToMmSs(parsedEnd)})`,
          role: 'target_preacher',
        },
      ],
      excluded_intervals_with_reasons: nextExcluded,
      evidence: [
        `사용자 확인 설교자: ${editPreacherName.trim() || '대상 설교자'}`,
        `사용자 확인 실제 설교 구간: ${formatSecToMmSs(parsedStart)} ~ ${formatSecToMmSs(parsedEnd)}`,
        ...v13State.targetSelection.evidence.slice(0, 2),
      ],
    };

    const nextV13: SpeechCoachingV13Data = {
      ...v13State,
      targetSelection: nextTarget,
    };
    setIsEditingTarget(false);
    notifyAndPersist(
      nextV13,
      '대상 설교자 및 적격 설교 구간(제외 구간 포함) 설정이 검증·저장되었습니다.'
    );
  };

  // 4축 맥락 수정 반영 (원래 관찰 사실과 측정값은 덮어쓰지 않고 적합성 해석·과제·비교만 재검토!)
  const handleApplyContextUpdate = async () => {
    setReEvaluating(true);
    try {
      const nextOverrides = [...(v13State.speechContext.segment_overrides || [])];
      const ovStart = parseTimeStringToSec(overrideStartMmSs);
      const ovEnd = parseTimeStringToSec(overrideEndMmSs);
      if (ovStart !== null && ovEnd !== null && ovEnd > ovStart && overrideGoal.trim()) {
        nextOverrides.push({
          startSec: ovStart,
          endSec: ovEnd,
          goal: overrideGoal.trim(),
          note: `구간 예외(${formatSecToMmSs(ovStart)}~${formatSecToMmSs(ovEnd)}): 전체 행사 기준 대신 해당 구간 목적 우선`,
        });
        setOverrideStartMmSs('');
        setOverrideEndMmSs('');
      }

      const nextSpeechContext: SpeechCoachingV13Data['speechContext'] = {
        ...v13State.speechContext,
        occasion,
        ceremonial_stage: occasion === '장례식' || occasion === '결혼식' ? ceremonialStage.trim() || null : null,
        delivery_modes: deliveryModes,
        communication_goals: communicationGoals,
        audience: {
          ...v13State.speechContext.audience,
          groups: audienceGroups,
          primary_groups: [audienceGroups[0] || '장년'],
          religious_vocabulary_familiarity: vocabFamiliarity,
        },
        context_evidence: [
          { field: 'occasion', source: '사용자 입력', status: 'confirmed' },
          { field: 'delivery_modes', source: '사용자 입력', status: 'confirmed' },
          { field: 'audience', source: '사용자 입력', status: 'confirmed' },
          { field: 'communication_goals', source: '사용자 입력', status: 'confirmed' },
        ],
        confirmation_status: 'confirmed',
        segment_overrides: nextOverrides,
        profile_version: 'v1.3',
      };

      const nextSpeakerContext: SpeechCoachingV13Data['speakerContext'] = {
        ...v13State.speakerContext,
        camera_and_editing: cameraCondition,
      };

      const { banner, priorities } = buildContextCriteriaAndPriorities(nextSpeechContext);

      // 관찰 사실(observations)은 그대로 보존하고, 해석·훈련 드릴·변화 판정만 새 맥락으로 재계산
      const {
        coreConclusion,
        interpretations,
        practiceDrills,
        recommendedReferenceIds,
      } = buildInterpretationsAndDrillsV13({
        sermonTitle: sermon?.meta.sermonTitle || '설교',
        scriptureRef: sermon?.meta.scriptureRef || '본문',
        startSec: audioIv.startSec,
        observations: v13State.observations,
        measurements: v13State.measurements,
        speechContext: nextSpeechContext,
        existingDrills: v13State.practiceDrills,
      });

      const updatedMeasurements = v13State.measurements.map((m) => {
        if (m.metricId === 'hand_gestures_normalized') {
          const isHandHidden =
            cameraCondition.includes('손 가림') || cameraCondition.includes('강대상');
          return {
            ...m,
            numeratorLabel: isHandHidden ? '강대상 손 가림' : '시각 프레임 미연결',
            denominatorLabel: isHandHidden ? '손 가시 시간 0분 (가림 제외)' : '시각 관찰 분모 미확보',
            unassessableReason: isHandHidden
              ? '강대상/하단 가림으로 손이 보이지 않는 조건입니다. 안 보였다는 사실을 손버릇 0회나 개선으로 허위 기록하지 않고 [평가·비교 불가]로 보존합니다.'
              : m.unassessableReason,
          };
        }
        if (m.metricId === 'gaze_and_manuscript') {
          const isSide = cameraCondition.includes('측면 카메라');
          return {
            ...m,
            unassessableReason: isSide
              ? '측면 카메라 조건으로 확인되어 화면 정면 비율을 실제 청중 눈맞춤 비율로 보고하지 않습니다.'
              : m.unassessableReason,
          };
        }
        return m;
      });

      const nextChangeJudgments = evaluateComparableHistoryV13({
        currentVideoId: sermon?.meta.youtubeId || sermon?.meta.id || 'video',
        preacherName: v13State.targetSelection.user_provided_name || sermon?.meta.preacher || '',
        isDemoSample: Boolean(v13State.capabilities.is_demo_sample),
        currentTargetSelection: v13State.targetSelection,
        currentMeasurements: updatedMeasurements,
        currentSpeechContext: nextSpeechContext,
        currentSpeakerContext: nextSpeakerContext,
        previousRecords: allSermons.filter((s) => s.meta.id !== sermon?.meta.id),
      });

      const nextV13: SpeechCoachingV13Data = {
        ...v13State,
        coreConclusion,
        contextCriteriaBanner: banner,
        contextPriorityFocus: priorities,
        speechContext: nextSpeechContext,
        speakerContext: nextSpeakerContext,
        measurements: updatedMeasurements,
        interpretations,
        practiceDrills,
        changeJudgments: nextChangeJudgments,
        recommendedReferenceIds,
      };

      setIsEditingContext(false);
      notifyAndPersist(
        nextV13,
        '4축 맥락 프로필(행사·전달방식·청중·목적) 및 촬영 조건이 반영되었습니다. (기존 관찰 사실 보존 완료)'
      );
    } finally {
      setReEvaluating(false);
    }
  };

  // 사용자 사실 정정(User Correction) 등록 (원래 관찰 기록 ID를 보존하고 정정 이력을 추가)
  const handleAddUserCorrection = (obsId: string, originalFact: string) => {
    if (!correctionNote.trim()) return;
    const newCorrection: SpeechUserCorrection = {
      id: `corr-${Date.now()}`,
      observationId: obsId,
      originalText: originalFact,
      correctedExplanation: correctionNote.trim(),
      correctionType,
      createdAt: new Date().toLocaleString('ko-KR'),
      status: 'applied',
    };

    const nextV13: SpeechCoachingV13Data = {
      ...v13State,
      userCorrections: [newCorrection, ...(v13State.userCorrections || [])],
    };
    setCorrectingObsId(null);
    setCorrectionNote('');
    notifyAndPersist(
      nextV13,
      '목회자 사실 정정 내역이 관찰 이력과 분리되어 기록·반영되었습니다.'
    );
  };

  // 훈련 과제 이행 상태 변경 (사용자가 직접 실행 여부를 선택할 때만 상태 변경)
  const handleDrillStatusChange = (drillId: string, nextStatus: PracticeDrillStatus) => {
    const nextDrills = v13State.practiceDrills.map((d) =>
      d.id === drillId ? { ...d, status: nextStatus } : d
    );
    const nextV13: SpeechCoachingV13Data = {
      ...v13State,
      practiceDrills: nextDrills,
    };
    notifyAndPersist(
      nextV13,
      `훈련 과제 상태가 [${nextStatus}]로 업데이트되어 저장되었습니다.`
    );
  };

  const isTargetBlocked =
    v13State.targetSelection.confirmation_status === 'unconfirmed' ||
    v13State.targetSelection.confirmation_status === 'ambiguous_multiple_speakers' ||
    v13State.targetSelection.confirmation_status === 'no_sermon_found';

  const eligibleDurSec = Math.max(0, audioIv.endSec - audioIv.startSec);
  const eligibleDurMinLabel = `${Math.floor(eligibleDurSec / 60)}분 ${eligibleDurSec % 60}초`;

  const recommendedRefs = SERMON_REFERENCE_LIBRARY_26.filter((r) =>
    v13State.recommendedReferenceIds?.includes(r.id)
  );
  const kimWoojunRefs = SERMON_REFERENCE_LIBRARY_26.filter(
    (r) => r.category === 'kim_woojun_preliminary'
  );

  return (
    <div className="space-y-6 text-xs">
      {/* 저장 성공 검증 알림 배너 */}
      {saveFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {saveFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{saveFeedback.msg}</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          섹션 1: 실제 분석 연결 상태 & 대상 설교자·설교 적격 구간 선별 (선행 조건)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                설교 스피치 코칭 마스터 {v13State.promptVersion}
              </span>
              {v13State.capabilities.is_demo_sample ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ⚠️ 개발·시연용 예시 데이터 (실제 사용자 누적 이력과 분리됨)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ 실제 설교 분석 기록 (개인별 이력 분리 저장)
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white">
              1. 대상 설교자 및 실제 설교 적격 구간 선별 (비설교 순서·타 출연자 엄격 제외)
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPersonalKeyInput(getPersonalGeminiApiKey());
                setShowKeyPanel(!showKeyPanel);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border cursor-pointer ${
                hasPersonalKey
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-500/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{hasPersonalKey ? '내 AI 키 연결됨 (설정)' : '개인 AI 키 등록 (방식 B)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingTarget(!isEditingTarget)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold border border-slate-700 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingTarget ? ' 닫기' : '대상·구간·제외순서 직접 정정'}</span>
            </button>
          </div>
        </div>

        {/* 방식 B: 목회자 개인 무료 Gemini API 키 등록 패널 */}
        {showKeyPanel && (
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-amber-300">
                🔑 본인 전용 무료 Gemini API 키 등록 (방식 B — 각 목회자 개별 키 사용)
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-300 hover:underline font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google AI Studio에서 무료 키 발급받기</span>
              </a>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              • 다른 목회자들과 서버 API 키를 공유하지 않고, 본인의 구글 무료 API 키(`AQ...` 또는 `AIzaSy...`)를 본 기기 브라우저에만 독립 저장하여 사용합니다. 키를 연결하면 자막 분석뿐 아니라 **실제 설교 구간 영상(시선·손동작) 및 음성(강세·끝맺음) 멀티모달 분석**이 함께 작동합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={personalKeyInput}
                onChange={(e) => setPersonalKeyInput(e.target.value)}
                placeholder="AQ... 또는 AIzaSy... 형식의 본인 Gemini API 키 붙여넣기"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
              <button
                type="button"
                disabled={testingPersonalKey}
                onClick={handleSaveAndTestPersonalKey}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold cursor-pointer shrink-0"
              >
                {testingPersonalKey ? '연결 확인 중...' : '본인 기기에 저장 및 연결 확인'}
              </button>
            </div>
          </div>
        )}

        {/* 모달리티 연결 상태 표시 (가짜 완료 화면 방지) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">시간 정보 자막·전사</div>
            <div className="font-bold text-slate-100 mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  v13State.capabilities.timestamped_transcript ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {v13State.capabilities.timestamped_transcript
                  ? '실제 자막 연결됨'
                  : '자막 트랙 미제공'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">음성 적격 구간 분모</div>
            <div className="font-bold text-emerald-300 mt-0.5 font-mono">
              {formatSecToMmSs(audioIv.startSec)} ~ {formatSecToMmSs(audioIv.endSec)} ({eligibleDurMinLabel})
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">연속 영상(시선·손동작) 분석</div>
            <div className="font-bold text-slate-300 mt-0.5 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {v13State.capabilities.continuous_video_access
                  ? '시각 스트림 연결'
                  : '미연결 (시각 점수 생성 안 함)'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">촬영·가림·화면 조건</div>
            <div className="font-bold text-amber-300 mt-0.5 truncate" title={v13State.speakerContext.camera_and_editing || ''}>
              {v13State.speakerContext.camera_and_editing || '자막/음성 중심'}
            </div>
          </div>
        </div>

        {/* 확인된 대상 설교자 및 포함·제외 구간 상세 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-indigo-950/25 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-300">
                ✓ 코칭 포함 구간 (확인된 설교자: {v13State.targetSelection.user_provided_name || sermon?.meta.preacher})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono">
                상태: {v13State.targetSelection.confirmation_status}
              </span>
            </div>
            <div className="space-y-1.5">
              {v13State.targetSelection.sermon_intervals.map((iv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <div>
                    <span className="font-mono font-bold text-emerald-300 mr-2">
                      {formatSecToMmSs(iv.startSec)} ~ {formatSecToMmSs(iv.endSec)}
                    </span>
                    <span className="text-slate-200">{iv.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJumpToTimestamp(iv.startSec)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 text-[11px] cursor-pointer"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>구간 재생</span>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • 설교 중 설교자 자신이 성경 본문을 직접 낭독하는 구간은 별도 봉독자와 구별하여 설교 수행에 포함하되, 본문을 보는 시선을 감점하지 않습니다.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-950/15 border border-rose-500/25 space-y-2">
            <div className="font-bold text-rose-300">
              ✕ 코칭·측정·누적 기록에서 제외된 구간 (타 출연자 및 비설교 순서)
            </div>
            {v13State.targetSelection.excluded_intervals_with_reasons.length > 0 ? (
              <div className="space-y-1.5">
                {v13State.targetSelection.excluded_intervals_with_reasons.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]"
                  >
                    <div className="font-semibold text-rose-200">
                      <span className="font-mono mr-1.5">
                        {formatSecToMmSs(ex.startSec)} ~ {formatSecToMmSs(ex.endSec)}
                      </span>
                      <span>[{ex.role}]</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{ex.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">
                00:00부터 곧바로 대상 설교자의 설교가 시작되는 단편 설교 영상입니다. (찬양인도자·사회자·별도 성경봉독자·광고·수어통역자·회중 화면이 등장하더라도 설교자 지표에 합산하지 않습니다.)
              </p>
            )}
          </div>
        </div>

        {/* 대상·구간 정정 폼 */}
        {isEditingTarget && (
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-3">
            <div className="font-bold text-indigo-300">
              대상 설교자 및 실제 설교 시작·종료 시각 / 동일 목회자 비설교 역할(광고·사회) 제외 설정
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">대상 설교자 성함</label>
                <input
                  type="text"
                  value={editPreacherName}
                  onChange={(e) => setEditPreacherName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">설교 시작 시각 (MM:SS)</label>
                <input
                  type="text"
                  value={editStartMmSs}
                  onChange={(e) => setEditStartMmSs(e.target.value)}
                  placeholder="예: 28:15"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">설교 종료 시각 (MM:SS)</label>
                <input
                  type="text"
                  value={editEndMmSs}
                  onChange={(e) => setEditEndMmSs(e.target.value)}
                  placeholder="예: 58:40"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">대상 확인 상태</label>
                <select
                  value={editTargetStatus}
                  onChange={(e) => setEditTargetStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="confirmed">확인됨 (설교 코칭 진행)</option>
                  <option value="provisional">잠정 확인</option>
                  <option value="ambiguous_multiple_speakers">설교자 다수/불명확 (코칭 보류)</option>
                  <option value="no_sermon_found">설교 구간 없음 (찬양·광고만 있음)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  추가 제외 시작 (예: 동일 목회자 광고/사회)
                </label>
                <input
                  type="text"
                  value={extraExcludedStart}
                  onChange={(e) => setExtraExcludedStart(e.target.value)}
                  placeholder="예: 59:00"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">추가 제외 종료 (MM:SS)</label>
                <input
                  type="text"
                  value={extraExcludedEnd}
                  onChange={(e) => setExtraExcludedEnd(e.target.value)}
                  placeholder="예: 64:00"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">제외 역할·사유</label>
                <input
                  type="text"
                  value={extraExcludedRole}
                  onChange={(e) => setExtraExcludedRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveTargetSelection}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>대상 및 적격 구간 확정 저장</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 대상 불명확 또는 설교 구간 미확인 시 코칭 보류 안내 (추측 코칭 금지 규율) */}
      {isTargetBlocked ? (
        <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">
            {v13State.targetSelection.confirmation_status === 'no_sermon_found'
              ? '설교 구간을 확인하지 못했습니다 (다른 출연자를 대신 코칭하지 않습니다)'
              : '대상 설교자 또는 분석할 설교 시간 구간 확인이 필요합니다'}
          </h4>
          <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
            마스터 프롬프트 v1.3의 대상 선별 규율(2-B)에 따라, 대상 설교자가 불명확하거나 설교가 없는 영상에서는 찬양인도자·사회자·광고 담당자 등 다른 출연자를 추측해 코칭하거나 점수를 생성하지 않습니다. 상단의 [대상·구간·제외순서 직접 정정] 버튼에서 어느 설교자의 어느 시간 구간을 분석할지 지정해 주세요.
          </p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              섹션 2: 행사 · 전달 방식 · 청중 · 장면 목적 4축 맥락 기준 설정 (2-A)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  <span>{v13State.contextCriteriaBanner}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  행사·전달 방식·청중·발언 목적을 단일 목록으로 섞지 않고 독립 조합하여 전달 적합성을 해석합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingContext(!isEditingContext)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-700 cursor-pointer shrink-0"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isEditingContext ? '맥락 설정 닫기' : '4축 맥락·촬영 조건 변경'}</span>
              </button>
            </div>

            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              {v13State.contextPriorityFocus.map((p, idx) => (
                <div key={idx} className="text-slate-300 leading-relaxed flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>

            {isEditingContext && (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">1. 행사·예배 상황</label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value as SermonOccasionType)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      {(
                        [
                          '주일예배',
                          '수요·금요예배',
                          '새벽기도회',
                          '부흥회',
                          '수련회',
                          '결혼식',
                          '장례식',
                          '교육·강연',
                        ] as SermonOccasionType[]
                      ).map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      의식 세부 순서 (장례 입관/발인/하관 등)
                    </label>
                    <input
                      type="text"
                      value={ceremonialStage}
                      onChange={(e) => setCeremonialStage(e.target.value)}
                      placeholder="예: 발인예배 / 입관예배 / 결혼 축복"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      카메라·가림·통역 화면 조건
                    </label>
                    <select
                      value={cameraCondition}
                      onChange={(e) => setCameraCondition(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="시각 화면 미확인 (자막/음성 중심)">
                        시각 화면 미확인 (자막/음성 중심)
                      </option>
                      <option value="강대상/하단 가림 (손동작 일부 또는 전체 비가시)">
                        강대상 손 가림 (손동작 0회/향상 오판 방지)
                      </option>
                      <option value="측면 카메라 (정면 시선과 실제 눈맞춤 불일치)">
                        측면 카메라 (정면=눈맞춤 환산 제외)
                      </option>
                      <option value="수어통역 분할/삽입(PIP) 화면 포함">
                        수어통역 삽입 화면 포함 (통역자 제스처 제외)
                      </option>
                      <option value="정면 카메라 (설교자 상반신·손 확인 가능)">
                        정면 카메라 (상반신·손 가시)
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    2. 전달 방식 (복수 조합 가능 — 예: 부흥회 + 강해 방식)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      ['강해', '주제 설명', '이야기·간증', '권면·호소', '교육·강의', '혼합'] as SermonDeliveryModeType[]
                    ).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMulti(deliveryModes, m, setDeliveryModes)}
                        className={`px-2.5 py-1 rounded-lg font-medium border cursor-pointer ${
                          deliveryModes.includes(m)
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      3. 청중 구성 (복수 선택)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {(
                        ['장년', '청년', '청소년', '어린이', '혼합 청중'] as SermonAudienceGroupType[]
                      ).map((aud) => (
                        <button
                          key={aud}
                          type="button"
                          onClick={() => toggleMulti(audienceGroups, aud, setAudienceGroups)}
                          className={`px-2 py-1 rounded-md border cursor-pointer ${
                            audienceGroups.includes(aud)
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {aud}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      청중의 성경·신앙 용어 친숙도
                    </label>
                    <select
                      value={vocabFamiliarity}
                      onChange={(e) => setVocabFamiliarity(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="익숙함">익숙함 (기성 성도 중심)</option>
                      <option value="보통">보통 (낯선 신학 용어는 짧은 풀이 권장)</option>
                      <option value="낯섦(새신자·비신자 포함)">
                        낯섦 (하객·조문객·새신자 포함 — 용어 접근성 우선)
                      </option>
                      <option value="미확인">미확인</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      4. 발언 목적 (복수 선택)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {(
                        ['이해', '기억', '위로', '축복', '성찰', '실천 권유'] as SermonCommunicationGoalType[]
                      ).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() =>
                            toggleMulti(communicationGoals, g, setCommunicationGoals)
                          }
                          className={`px-2 py-1 rounded-md border cursor-pointer ${
                            communicationGoals.includes(g)
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-300'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 구간별 목적 예외 (예: 부흥회 중 애도·위로 장면) */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    구간별 장면 목적 예외 추가 (예: 부흥회 중 애도·위로 장면에는 높은 활력 기대를 강제하지 않음)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={overrideStartMmSs}
                      onChange={(e) => setOverrideStartMmSs(e.target.value)}
                      placeholder="시작 (예: 35:00)"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                    <input
                      type="text"
                      value={overrideEndMmSs}
                      onChange={(e) => setOverrideEndMmSs(e.target.value)}
                      placeholder="종료 (예: 39:00)"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                    <input
                      type="text"
                      value={overrideGoal}
                      onChange={(e) => setOverrideGoal(e.target.value)}
                      placeholder="예: 애도·위로 장면 (절제된 쉼 존중)"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={reEvaluating}
                    onClick={handleApplyContextUpdate}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reEvaluating ? 'animate-spin' : ''}`} />
                    <span>맥락 기준 재적용 (관찰 사실 보존 · 적합성 및 과제 재검토)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              섹션 3: 이번 영상의 핵심 결론 & 검증된 측정 지표 (단위·분모·제외 범위 명시)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-4">
            <div>
              <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                2. 이번 설교 스피치 코칭 핵심 결론 (100점 단일 총점 대체)
              </div>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                {v13State.coreConclusion}
              </p>
            </div>

            {/* 정량 측정 테이블 (정의 · 단위 · 분모 · 제외 구간 · 출처) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300">
                검증된 측정 지표 및 모달리티별 분모 (근거 없는 수치·소수점 생성 금지 규율 적용)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {v13State.measurements.map((m) => (
                  <div
                    key={m.metricId}
                    className={`p-3 rounded-xl border ${
                      m.assessable
                        ? 'bg-slate-900/90 border-slate-700'
                        : 'bg-slate-950/70 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-200">{m.label}</span>
                      {m.assessable ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                          {m.value}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold text-[11px]">
                          평가 보류 (수치 미생성)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{m.definition}</p>
                    {m.assessable ? (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5 font-mono">
                        <div>• 분자/단위: {m.numeratorLabel} ({m.unit})</div>
                        <div>• 분모(적격 범위): {m.denominatorLabel}</div>
                        <div>• 측정 도구: {m.toolSource} ({m.toolVersion})</div>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-amber-300/90">
                        • 보류 사유: {m.unassessableReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              섹션 4: 실제 장면 기반 관찰 사실(Fact) · 코치 해석(Interpretation) · 사용자 사실 정정
             ══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                3. 실제 장면 관찰 사실 · 전달 기능 해석 · 목회자 사실 정정
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                어느 장면에서 무엇을 했는가(관찰 사실) → 그 문장의 전달 목적과 어떤 관계가 있는가(해석) → 무엇을 유지하거나 바꿀 것인가를 분리해 기록합니다.
              </p>
            </div>

            <div className="space-y-3">
              {v13State.interpretations.map((interp) => {
                const linkedObs = v13State.observations.find((o) =>
                  interp.observationIds.includes(o.id)
                );
                const existingCorrections = (v13State.userCorrections || []).filter(
                  (c) => c.observationId === linkedObs?.id
                );

                return (
                  <div
                    key={interp.id}
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      interp.isStrength
                        ? 'bg-emerald-950/15 border-emerald-500/30'
                        : 'bg-slate-800/70 border-amber-500/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            interp.isStrength
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {interp.isStrength ? '유지할 강점' : '우선 점검 과제'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          영역: {interp.category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 text-[10px]">
                          문장 기능: {interp.sentenceFunction}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{interp.title}</h4>
                      </div>

                      {linkedObs && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onJumpToTimestamp(linkedObs.startSec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>{linkedObs.timeDisplay} 장면 재생</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCorrectingObsId(
                                correctingObsId === linkedObs.id ? null : linkedObs.id
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-[11px] cursor-pointer"
                          >
                            사실 정정
                          </button>
                        </div>
                      )}
                    </div>

                    {linkedObs && (
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
                        <div className="text-slate-300">
                          <span className="font-bold text-indigo-300 mr-1.5">[관찰 사실]</span>
                          {linkedObs.observedFact}
                        </div>
                        <div className="text-slate-400 font-mono">
                          <span className="text-slate-500 mr-1.5">[원본 발언/행동]</span>
                          {linkedObs.quoteOrBehavior} ({linkedObs.sourceLabel})
                        </div>
                      </div>
                    )}

                    <div className="text-slate-200 leading-relaxed">
                      <span className="font-bold text-amber-300 mr-1.5">[전달 효과 해석]</span>
                      {interp.deliveryHypothesis}
                    </div>

                    {interp.alternativeExplanation && (
                      <div className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300 mr-1">[대안 설명]</span>
                        {interp.alternativeExplanation}
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] space-y-1">
                      <div className="text-emerald-300 font-semibold">
                        → {interp.actionToKeepOrChange}
                      </div>
                      <div className="text-slate-400">
                        • 다음 촬영 확인 조건: {interp.nextCheckCondition}
                      </div>
                    </div>

                    {/* 사용자 정정 기록 표시 */}
                    {existingCorrections.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-400/40 space-y-1">
                        <div className="text-[11px] font-bold text-indigo-300">
                          ✓ 목회자 확인·정정 반영됨 (원래 관찰 기록과 함께 보존)
                        </div>
                        {existingCorrections.map((c) => (
                          <div key={c.id} className="text-[11px] text-slate-200">
                            • [{c.correctionType}] {c.correctedExplanation} ({c.createdAt})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 사용자 사실 정정 입력창 */}
                    {linkedObs && correctingObsId === linkedObs.id && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2">
                        <div className="font-bold text-indigo-300">
                          관찰 사실 정정 (예: 성경 본문 낭독·통역 확인·마이크 조정 등을 손버릇이나 시선 회피로 오인한 경우)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={correctionType}
                            onChange={(e) => setCorrectionType(e.target.value as any)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                          >
                            <option value="scripture_reading">설교 중 성경 본문 낭독 구간임</option>
                            <option value="manuscript_check">필수 인용문/원고 확인 구간임</option>
                            <option value="interpreter_check">수어통역자/찬양대/회중 응답 확인임</option>
                            <option value="mic_adjustment">마이크·강대상 보조도구 조정임</option>
                            <option value="other_speaker">대상 설교자가 아닌 다른 사람의 음성/화면임</option>
                            <option value="other">기타 정정</option>
                          </select>
                          <input
                            type="text"
                            value={correctionNote}
                            onChange={(e) => setCorrectionNote(e.target.value)}
                            placeholder="정정 내용을 입력해 주세요 (예: 이 구간은 성경 구절을 직접 읽는 장면입니다)"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddUserCorrection(linkedObs.id, linkedObs.observedFact)
                            }
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                          >
                            정정 이력 저장
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              섹션 5: 3~5분 실전 교정 훈련 설계 (1~2개 중심, 최대 3개 제한)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-sm text-white">
                    4. 이번 회차 3~5분 실전 교정 훈련 설계 (핵심 {v13State.practiceDrills.length}개 과제 집중)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  한꺼번에 많은 과제를 늘리지 않고, 실제 발언 문장을 보존한 전달 시범과 다음 촬영 확인 조건까지 설계합니다.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {v13State.practiceDrills.map((drill) => (
                <div
                  key={drill.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold mr-2">
                        기술 태그: {drill.skillTag}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{drill.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-[11px] text-slate-400">과제 이행 상태:</label>
                      <select
                        value={drill.status}
                        onChange={(e) =>
                          handleDrillStatusChange(drill.id, e.target.value as PracticeDrillStatus)
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-bold text-[11px]"
                      >
                        <option value="proposed">제안됨 (proposed)</option>
                        <option value="accepted">수락함 (accepted)</option>
                        <option value="attempted">연습 실행함 (attempted)</option>
                        <option value="improved">개선 확인됨 (improved)</option>
                        <option value="maintenance">강점 유지 단계 (maintenance)</option>
                        <option value="reappeared">재발 관찰 (reappeared)</option>
                        <option value="not_assessable">판정 보류 (not_assessable)</option>
                      </select>
                    </div>
                  </div>

                  {/* 다시 볼 실제 영상 구간 */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-300">
                      <span className="font-bold text-indigo-300 mr-1.5">[다시 볼 실제 장면]</span>
                      <span className="font-mono text-amber-300 mr-1.5">
                        {drill.reviewInterval.timeDisplay}
                      </span>
                      <span>{drill.reviewInterval.quoteOrGist}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToTimestamp(drill.reviewInterval.startSec)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>해당 구간 재생</span>
                    </button>
                  </div>

                  {/* 말하기 전 실행할 단서 1개 */}
                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-slate-200">
                    <span className="font-bold text-amber-300 mr-1.5">
                      • 말하기 전 실행할 간단한 단서(Cue) 1개:
                    </span>
                    <span>{drill.preSpeechCue}</span>
                  </div>

                  {/* 3~5분 연습 순서 */}
                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-200">• 3~5분 연습 순서 (제안값):</div>
                    {drill.steps3to5Min.map((step, idx) => (
                      <div key={idx} className="text-slate-300 pl-2 leading-relaxed">
                        {step}
                      </div>
                    ))}
                  </div>

                  {/* 전달 시범 스크립트 (원래 신학적 의미 보존) */}
                  {drill.sampleScriptWithNotation && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 font-mono text-[11px] text-indigo-100 whitespace-pre-line leading-relaxed">
                      {drill.sampleScriptWithNotation}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/25">
                      <span className="font-bold text-emerald-300 block mb-0.5">
                        ✓ 성공 기준
                      </span>
                      <span className="text-slate-300">{drill.successCriteria}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/25">
                      <span className="font-bold text-rose-300 block mb-0.5">
                        ⚠️ 과장·경직 방지 확인점
                      </span>
                      <span className="text-slate-300">{drill.overcorrectionGuard}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/25">
                      <span className="font-bold text-indigo-300 block mb-0.5">
                        🎥 다음 촬영 재확인 조건
                      </span>
                      <span className="text-slate-300">{drill.nextRecordingCheck}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              섹션 6: 개인별 누적 기록과 변화 판정 (기준선 / 개선 관찰 / 유지 / 악화 관찰 / 혼재 / 비교 불가)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                5. 개인별 누적 기록 및 조건부 변화 판정 (허위 향상 보고 방지 규율 적용)
              </h3>
            </div>

            <div className="space-y-2.5">
              {v13State.changeJudgments.map((cj, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-slate-200">{cj.metricOrSkill}</span>
                    <div className="flex items-center gap-1.5">
                      {cj.isLongTermTrend && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          최근 {cj.consecutiveCount}회 연속 관찰된 추세
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                          cj.judgment === '개선 관찰'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : cj.judgment === '유지'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : cj.judgment === '악화 관찰'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : cj.judgment === '기준선(첫 기록)'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        판정: {cj.judgment}
                      </span>
                    </div>
                  </div>

                  {cj.previousEvidence && (
                    <div className="text-[11px] text-slate-400">
                      • 이전 근거: {cj.previousEvidence}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-300">
                    • 이번 근거: {cj.currentEvidence}
                  </div>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                    → {cj.nonComparableReason || cj.analysisNote}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              섹션 7: 참고 영상 후보 26편 & 김우준 목사 도입부 강점 예비 분석 연결
             ══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    6. 설교형 스피치 참고 자료 26편 &amp; 김우준 목사 도입부 예비 분석 (v1.3)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {REFERENCE_LIBRARY_SUMMARY.statusNotice}
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {[
                  { id: 'kim_woojun', label: '김우준 목사 예비분석 (2편)' },
                  { id: 'recommended', label: `이번 과제 연관 후보 (${recommendedRefs.length})` },
                  { id: 'all_26', label: '전체 후보 26편' },
                  { id: 'coverage_gaps', label: '미확보 영역 현황' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRefFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      refFilter === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 탭 1: 김우준 목사 설교 2편 도입부 예비 분석 (원본 시각 대조 완료) */}
            {refFilter === 'kim_woojun' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="font-bold text-emerald-300">
                    {KIM_WOOJUN_PRELIMINARY_REPORT.title}
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    • 핵심 판단: {KIM_WOOJUN_PRELIMINARY_REPORT.coreFinding}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    • 분석 범위 및 주의점: {KIM_WOOJUN_PRELIMINARY_REPORT.scopeDisclaimer} ({KIM_WOOJUN_PRELIMINARY_REPORT.timestampCaution})
                  </p>
                </div>

                {kimWoojunRefs.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-emerald-400">[{item.id}]</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            상태: 도입부 예비 분석 완료 (전체 영상 검토 전)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            실제 행사: {item.occasionTag || '주일예배'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {item.speaker} 목사 — {item.title} ({item.organization}, {item.publishedDate})
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={item.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>원본 영상 링크</span>
                        </a>
                        {item.officialListUrl && (
                          <a
                            href={item.officialListUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>공식 게시물</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 원본 대조 확인된 장면들 */}
                    <div className="space-y-2">
                      {item.preliminaryScenes?.map((sc, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-amber-300">
                              원본 대조 시각: {sc.timeDisplay}
                            </span>
                            <a
                              href={sc.urlWithTimestamp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-indigo-300 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>원본 {sc.timeDisplay} 지점 열기</span>
                            </a>
                          </div>
                          <div className="text-slate-200">
                            <span className="font-bold text-indigo-300 mr-1">[관찰 행동]</span>
                            {sc.observedBehavior}
                          </div>
                          <div className="text-slate-300">
                            <span className="font-bold text-emerald-300 mr-1">[강점 원리]</span>
                            {sc.strengthInterpretation}
                          </div>
                          <div className="text-amber-200/90">
                            <span className="font-bold text-amber-300 mr-1">
                              [다른 목회자가 적용할 연습 (목소리·말투 복제 금지)]
                            </span>
                            {sc.practiceTransfer}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            • 적용 제한: {sc.cautionLimit}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-rose-300/90 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/20">
                      • 분류 및 적용 한계: {item.contextLimits.join(' / ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 탭 2 & 3: 이번 과제 연관 후보 또는 전체 후보 26편 */}
            {(refFilter === 'recommended' || refFilter === 'all_26') && (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {(refFilter === 'recommended' ? recommendedRefs : SERMON_REFERENCE_LIBRARY_26).map(
                  (item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-indigo-400">[{item.id}]</span>
                          <span className="font-bold text-white">{item.speaker}</span>
                          <span className="text-slate-300">— {item.title}</span>
                          <span className="text-slate-500">({item.organization})</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.reviewStatus === 'preliminary_intro_analysis'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.reviewStatus === 'preliminary_intro_analysis'
                              ? '도입부 예비 분석 완료 (전체 검토 전)'
                              : '출처·게시 정보 기반 후보 (시청각 구간 검토 전)'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            이용 범위: 원본 공식 링크 (서비스 내 복제·학습 미승인)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          • {item.reviewHypothesisOrVerifiedSkill}
                        </p>
                      </div>

                      <a
                        href={item.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold border border-slate-700 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>공식 출처 열기</span>
                      </a>
                    </div>
                  )
                )}
              </div>
            )}

            {/* 탭 4: 유형·대상별 미확보 영역 현황 */}
            {refFilter === 'coverage_gaps' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200">
                  현재 26편이 모든 예배 유형과 청중 연령대를 포괄한다고 표시하지 않습니다. 장례식 설교·어린이 대상 설교 등 미확보 영역은 억지로 다른 맥락의 영상을 매칭하지 않고 현황을 투명하게 공개합니다.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {REFERENCE_COVERAGE_GAPS.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{gap.group}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-semibold">
                          {gap.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        • 찾을 장면: {gap.targetScene}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        • 현재 한계: {gap.currentLimit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
