import {
  SermonRecord,
  SpeechCoachingV13Data,
  TargetSelectionSpec,
  SpeechCapabilitiesSpec,
  SpeakerContextSpec,
  SpeechContextSpec,
  SpeechObservationItem,
  SpeechMeasurementItem,
  SpeechInterpretationItem,
  SpeechPracticeDrill,
  SpeechChangeJudgment,
  SermonOccasionType,
  SermonDeliveryModeType,
  SermonCommunicationGoalType,
  SermonAudienceGroupType,
} from '../types/sermon';
import { TranscriptLine, formatSecToMmSs } from './youtubeSermonDetector';

export interface BuildSpeechV13Input {
  videoId: string;
  sermonTitle: string;
  scriptureRef: string;
  preacherName: string;
  churchName: string;
  targetAudienceText?: string;
  originalDurationSec: number;
  detectedStartSec: number;
  startSource:
    | 'user_input'
    | 'url_param'
    | 'youtube_chapter'
    | 'description_timetable'
    | 'transcript_analysis'
    | 'title_fallback';
  startReasonLabel: string;
  transcriptLines?: TranscriptLine[];
  isDemoSample?: boolean;
  aiModelConnected?: boolean;
  continuousVideoAccess?: boolean;
  audioAccess?: boolean;
  customSpeechContext?: Partial<SpeechContextSpec>;
  customSpeakerContext?: Partial<SpeakerContextSpec>;
  previousRecords?: SermonRecord[];
}

/**
 * 제목이나 예화 소재(예: 백만장자와의 결혼 이야기)만으로 결혼식 설교로 오분류하지 않고,
 * 명시된 사용자 입력 또는 명확한 예배 표지에서만 초기 맥락을 설정한다.
 */
export function inferInitialSpeechContext(
  sermonTitle: string,
  targetAudienceText: string,
  custom?: Partial<SpeechContextSpec>
): SpeechContextSpec {
  let occasion: SermonOccasionType = custom?.occasion || '주일예배';
  let ceremonialStage: string | null = custom?.ceremonial_stage || null;
  let occasionSource: '사용자 입력' | '공식 게시 정보' | '잠정 추정' = custom?.occasion
    ? '사용자 입력'
    : '잠정 추정';

  if (!custom?.occasion) {
    if (/(발인\s*예배|입관\s*예배|하관\s*예배|장례\s*예배|위로\s*예배)/.test(sermonTitle)) {
      occasion = '장례식';
      occasionSource = '공식 게시 정보';
      if (/입관/.test(sermonTitle)) ceremonialStage = '입관예배';
      else if (/발인/.test(sermonTitle)) ceremonialStage = '발인예배';
      else if (/하관/.test(sermonTitle)) ceremonialStage = '하관예배';
      else ceremonialStage = '위로예배';
    } else if (/(결혼\s*예배|혼인\s*예배|주례사)/.test(sermonTitle)) {
      // 단순 '결혼' 단어(예화 소재)만으로는 결혼식 설교로 분류하지 않음! '결혼예배/혼인예배/주례사'가 명시된 경우만 분류
      occasion = '결혼식';
      occasionSource = '공식 게시 정보';
      ceremonialStage = '결혼예배 말씀·축복';
    } else if (/(부흥회|성회|부흥성회)/.test(sermonTitle)) {
      occasion = '부흥회';
      occasionSource = '공식 게시 정보';
    } else if (/(수련회|캠프)/.test(sermonTitle)) {
      occasion = '수련회';
      occasionSource = '공식 게시 정보';
    } else if (/(수요예배|수요성서|금요예배|금요철야|금요성령)/.test(sermonTitle)) {
      occasion = '수요·금요예배';
      occasionSource = '공식 게시 정보';
    } else if (/(새벽기도|새벽예배)/.test(sermonTitle)) {
      occasion = '새벽기도회';
      occasionSource = '공식 게시 정보';
    } else if (/(특강|세미나|강연|강의)/.test(sermonTitle)) {
      occasion = '교육·강연';
      occasionSource = '공식 게시 정보';
    }
  }

  const deliveryModes: SermonDeliveryModeType[] =
    custom?.delivery_modes && custom.delivery_modes.length > 0
      ? custom.delivery_modes
      : ['강해', '권면·호소'];

  const communicationGoals: SermonCommunicationGoalType[] =
    custom?.communication_goals && custom.communication_goals.length > 0
      ? custom.communication_goals
      : occasion === '장례식'
      ? ['위로', '성찰']
      : occasion === '결혼식'
      ? ['축복', '권면' as any, '기억'].filter((x): x is SermonCommunicationGoalType =>
          ['이해', '기억', '위로', '축복', '성찰', '실천 권유'].includes(x)
        )
      : ['이해', '실천 권유'];

  const audienceGroups: SermonAudienceGroupType[] =
    custom?.audience?.groups && custom.audience.groups.length > 0
      ? custom.audience.groups
      : /청년|대학/.test(targetAudienceText)
      ? ['청년']
      : /청소년|중고등/.test(targetAudienceText)
      ? ['청소년']
      : /어린이|주일학교|초등/.test(targetAudienceText)
      ? ['어린이']
      : ['장년', '혼합 청중'];

  return {
    occasion,
    ceremonial_stage: ceremonialStage,
    delivery_modes: deliveryModes,
    communication_goals: communicationGoals,
    planned_duration_seconds: custom?.planned_duration_seconds ?? null,
    audience: {
      groups: audienceGroups,
      primary_groups: custom?.audience?.primary_groups || [audienceGroups[0] || '장년'],
      actual_age_ranges_if_provided: custom?.audience?.actual_age_ranges_if_provided || [],
      religious_vocabulary_familiarity:
        custom?.audience?.religious_vocabulary_familiarity || '보통',
      language_needs: custom?.audience?.language_needs || ['한국어'],
      accessibility_needs_if_provided: custom?.audience?.accessibility_needs_if_provided || [],
      speaker_relationship: custom?.audience?.speaker_relationship || '담임/설교 목회자',
    },
    setting: {
      format: custom?.setting?.format || '대면+온라인 병행',
      venue_and_size_if_provided: custom?.setting?.venue_and_size_if_provided || null,
      manuscript_usage: custom?.setting?.manuscript_usage || '요약 노트/태블릿',
      planned_participation: custom?.setting?.planned_participation || null,
    },
    context_evidence: [
      {
        field: 'occasion',
        source: occasionSource,
        status: custom?.occasion ? 'confirmed' : 'provisional',
      },
      {
        field: 'delivery_modes',
        source: custom?.delivery_modes ? '사용자 입력' : '잠정 추정',
        status: custom?.delivery_modes ? 'confirmed' : 'provisional',
      },
      {
        field: 'audience',
        source: custom?.audience ? '사용자 입력' : '잠정 추정',
        status: custom?.audience ? 'confirmed' : 'provisional',
      },
    ],
    confirmation_status: custom?.occasion ? 'confirmed' : 'provisional',
    segment_overrides: custom?.segment_overrides || [],
    profile_version: 'v1.3',
  };
}

/**
 * 맥락 4축(행사·전달 방식·청중·목적)에 따라 우선 살필 전달 기능과 피할 고정관념을 생성
 */
export function buildContextCriteriaAndPriorities(ctx: SpeechContextSpec): {
  banner: string;
  priorities: string[];
} {
  const occasionLabel = ctx.ceremonial_stage
    ? `${ctx.occasion || '주일예배'}(${ctx.ceremonial_stage})`
    : ctx.occasion || '주일예배';
  const modesLabel =
    ctx.delivery_modes.length > 0 ? `${ctx.delivery_modes.join('·')} 방식` : '강해 방식';
  const goalsLabel =
    ctx.communication_goals.length > 0
      ? `${ctx.communication_goals.join('·')} 중심`
      : '이해·실천 중심';
  const audLabel =
    ctx.audience.groups.length > 0 ? ctx.audience.groups.join('·') : '장년·혼합 청중';

  const banner = `이번 코칭의 기준: ${occasionLabel} / ${modesLabel} / ${goalsLabel} / 대상: ${audLabel}`;
  const priorities: string[] = [];

  if (ctx.occasion === '장례식') {
    priorities.push(
      '장례식 맥락: 위로 문장이 분명히 들리는 명료성과 발언 뒤 여백(쉼), 표현 강도의 절제를 우선 살핍니다. 낮은 활력·적은 미소·긴 쉼 자체를 결점이나 퇴보로 삼지 않습니다.'
    );
  } else if (ctx.occasion === '결혼식') {
    priorities.push(
      '결혼식 맥락: 축복 문장의 끝맺음과 시선, 신랑·신부에게 말하다 전체 하객으로 방향을 여는 전환을 우선 살핍니다. 모든 결혼식에 유머·활기·미소를 일률적으로 요구하지 않습니다.'
    );
  } else if (ctx.occasion === '부흥회' || ctx.occasion === '수련회') {
    priorities.push(
      '부흥회·집회 맥락: 강조가 이어질 때 에너지 대비가 남는지, 호소 문장의 명료성과 청중 반응 뒤 발언이 겹치지 않는지 살핍니다. 무조건 큰 음량이나 빠른 속도를 성과로 고정하지 않습니다.'
    );
  }

  if (ctx.delivery_modes.includes('강해')) {
    priorities.push(
      '강해 전달 방식: 설교 중 본문 낭독과 설명의 구별(낭독 후 청중으로 돌아오는 신호), 긴 문장의 의미 단위 구분, 핵심 명제의 청각적 표시를 우선 살핍니다. 본문 낭독이나 원고 확인을 위해 아래를 보는 행위 자체를 감점하지 않습니다.'
    );
  }
  if (ctx.delivery_modes.includes('이야기·간증')) {
    priorities.push(
      '이야기·간증 방식: 이야기의 기대 형성과 전환 신호, 예화에서 본문 핵심 메시지로 복귀하는 연결 문장의 명료성을 확인합니다.'
    );
  }

  if (ctx.audience.groups.includes('청년')) {
    priorities.push(
      '청년 청중 고려: 추상적 개념과 구체적 삶의 상황 연결, 질문 뒤 성찰의 여백, 동등하고 존중하는 어조를 살핍니다(빠른 말이나 유행어를 강요하지 않음).'
    );
  }
  if (ctx.audience.groups.includes('청소년')) {
    priorities.push(
      '청소년 청중 고려: 추상적 신학 용어를 일상 언어로 풀어 주는 단계와 질문의 구체성을 살핍니다(어린아이 취급이나 과장된 말투를 처방하지 않음).'
    );
  }
  if (ctx.audience.groups.includes('어린이')) {
    priorities.push(
      '어린이 청중 고려: 실제 연령 범위에 맞는 구체적 설명과 한 번에 요구하는 행동의 수를 살핍니다(유아와 초등 고학년을 동일시하거나 과장된 목소리를 강제하지 않음).'
    );
  }
  if (ctx.audience.groups.includes('장년') || ctx.audience.groups.includes('혼합 청중')) {
    priorities.push(
      '장년·혼합 청중 고려: 성경 용어 친숙도 차이를 배려한 짧은 풀이와 모두가 따라갈 수 있는 전환 신호를 점검합니다.'
    );
  }

  if (ctx.segment_overrides && ctx.segment_overrides.length > 0) {
    priorities.push(
      `구간별 목적 예외 적용(${ctx.segment_overrides.length}개 구간): 전체 행사 기준을 기계적으로 강제하지 않고 해당 구간의 목적(${ctx.segment_overrides
        .map((s) => `${formatSecToMmSs(s.startSec)}~${formatSecToMmSs(s.endSec)} ${s.goal}`)
        .join(', ')})에 맞춰 해석합니다.`
    );
  }

  return { banner, priorities };
}

/**
 * 전체 예배 영상에서 대상 설교자의 실제 설교 구간(시작~종료), 설교 내 본문 낭독 구간,
 * 그리고 제외된 다른 예배 순서(찬양·별도 봉독·광고·사회·기도·축도)를 분리한다.
 */
export function buildTargetSelectionFromTranscriptAndMeta(params: {
  preacherName: string;
  videoId: string;
  originalDurationSec: number;
  startSec: number;
  startSource: BuildSpeechV13Input['startSource'];
  startReasonLabel: string;
  transcriptLines: TranscriptLine[];
  continuousVideoAccess: boolean;
  cameraAndEditing?: string | null;
}): TargetSelectionSpec {
  const {
    preacherName,
    videoId,
    originalDurationSec,
    startSec,
    startSource,
    startReasonLabel,
    transcriptLines,
    continuousVideoAccess,
    cameraAndEditing,
  } = params;

  const totalSec =
    originalDurationSec > startSec
      ? originalDurationSec
      : transcriptLines.length > 0
      ? Math.max(
          startSec + 1200,
          Math.ceil(
            transcriptLines[transcriptLines.length - 1].sec +
              transcriptLines[transcriptLines.length - 1].dur
          )
        )
      : startSec + 2100;

  // 설교 종료 시점 탐지 (후반부 찬양/헌금/광고/축도 구간을 설교 구간에서 제외)
  let sermonEndSec = totalSec;
  const postWorshipReasons: Array<{
    startSec: number;
    endSec: number;
    role: string;
    reason: string;
  }> = [];

  if (transcriptLines.length > 0) {
    const postBoundaryMinSec = startSec + 600; // 최소 10분 이후부터 종료 순서 탐색
    for (const line of transcriptLines) {
      if (line.sec < postBoundaryMinSec) continue;
      const clean = line.txt.trim();
      if (
        /(다\s*같이\s*찬양|함께\s*찬양|찬송가\s*\d+장|결단의\s*찬양|봉헌\s*찬양|헌금\s*위원|광고\s*말씀\s*드리겠습니다|교회\s*소식|지금은\s*우리\s*주\s*예수\s*그리스도의\s*은혜와|축도함으로|축복하며\s*예배를\s*마칩니다)/.test(
          clean
        )
      ) {
        sermonEndSec = Math.floor(line.sec);
        postWorshipReasons.push({
          startSec: sermonEndSec,
          endSec: totalSec,
          role: '설교 후 예배 순서 (결단찬양·봉헌·광고·축도)',
          reason: `자막 "${clean.slice(0, 32)}..." 지점부터 설교 이후 예배 순서로 확인되어 대상 설교자 스피치 측정 분모에서 제외함.`,
        });
        break;
      }
    }
  }

  const excludedIntervals: Array<{
    startSec: number;
    endSec: number;
    role: string;
    reason: string;
  }> = [];

  if (startSec > 0) {
    excludedIntervals.push({
      startSec: 0,
      endSec: startSec,
      role: '설교 전 예배 순서 (찬양·사회·대표기도·성가대·광고·별도 성경봉독)',
      reason: `00:00 ~ ${formatSecToMmSs(startSec)} 구간은 찬양인도자·기도자·사회자·별도 성경봉독자·성가대 또는 설교 전 순서이므로 대상 설교자의 스피치 코칭·측정·누적 기록에서 완전히 제외함.`,
    });
  }
  excludedIntervals.push(...postWorshipReasons);

  // 설교 구간 내부에서 설교자 자신이 본문을 읽는 구간(scripture_reading)과 설명 구간(explanation) 구분
  const sermonLines = transcriptLines.filter(
    (l) => l.sec >= startSec && l.sec <= sermonEndSec
  );
  const sermonIntervals: TargetSelectionSpec['sermon_intervals'] = [];

  if (sermonLines.length > 0) {
    // 초반 본문 낭독 구간 여부 탐색
    const readingLines = sermonLines.filter(
      (l) =>
        l.sec <= startSec + 300 &&
        /(절입니다|절 말씀|봉독|읽겠습니다|기록되어|말씀에|하시니라|하느니라|도다|이르시되)/.test(
          l.txt
        )
    );
    if (readingLines.length > 0) {
      const readStart = Math.max(startSec, Math.floor(readingLines[0].sec));
      const readEnd = Math.min(
        sermonEndSec,
        Math.ceil(
          readingLines[readingLines.length - 1].sec +
            (readingLines[readingLines.length - 1].dur || 8)
        )
      );
      if (readStart > startSec + 10) {
        sermonIntervals.push({
          startSec,
          endSec: readStart,
          label: '설교 도입 인사 및 서론',
          role: 'target_preacher',
          deliveryFunction: 'explanation',
        });
      }
      sermonIntervals.push({
        startSec: readStart,
        endSec: readEnd,
        label: '설교자 자신의 설교 중 성경 본문 낭독 (별도 봉독자와 구별해 포함)',
        role: 'target_preacher',
        deliveryFunction: 'scripture_reading',
      });
      if (readEnd < sermonEndSec) {
        sermonIntervals.push({
          startSec: readEnd,
          endSec: sermonEndSec,
          label: '본 설교 강해 · 예화 · 적용 · 권면',
          role: 'target_preacher',
          deliveryFunction: 'explanation',
        });
      }
    } else {
      sermonIntervals.push({
        startSec,
        endSec: sermonEndSec,
        label: '확인된 대상 설교자 실제 설교 구간',
        role: 'target_preacher',
        deliveryFunction: 'explanation',
      });
    }
  } else {
    sermonIntervals.push({
      startSec,
      endSec: sermonEndSec,
      label: '확인된 대상 설교자 설교 구간',
      role: 'target_preacher',
      deliveryFunction: 'explanation',
    });
  }

  const isHandOccluded =
    cameraAndEditing?.includes('손 가림') || cameraAndEditing?.includes('강대상');
  const isInterpreterPip = cameraAndEditing?.includes('수어통역');

  const eligibleVisualIntervals: TargetSelectionSpec['eligible_visual_intervals'] =
    continuousVideoAccess && !cameraAndEditing?.includes('시각 화면 미확인')
      ? [
          {
            startSec,
            endSec: sermonEndSec,
            label: isHandOccluded
              ? '설교자 상반신 시각 구간 (단, 강대상 가림으로 손동작 분모는 제외)'
              : isInterpreterPip
              ? '설교자 시각 구간 (분할 화면 수어통역자 손동작·표정은 설교자 지표에서 제외)'
              : '설교자 시각 관찰 가능 구간',
            role: 'target_preacher',
          },
        ]
      : [];

  const evidenceList: string[] = [
    `사용자 지정/확인 설교자: ${preacherName}`,
    startReasonLabel ||
      `설교 시작 시점 ${formatSecToMmSs(startSec)} (${startSource}) ~ 종료 ${formatSecToMmSs(sermonEndSec)} 선별`,
  ];
  if (startSec > 0) {
    evidenceList.push(
      `전체 영상 길이(${formatSecToMmSs(totalSec)})를 설교 길이로 사용하지 않고, 앞선 예배 순서(${formatSecToMmSs(startSec)} 이전)를 제외함.`
    );
  }
  if (sermonLines.length > 0) {
    evidenceList.push(
      `적격 설교 구간 내 시간 정보가 있는 자막 세그먼트 ${sermonLines.length}개 확인 완료.`
    );
  }

  return {
    user_provided_name: preacherName || null,
    video_local_target_id: `speaker_target_${videoId}`,
    selection_source: startSource,
    confirmation_status: preacherName ? 'confirmed' : 'provisional',
    evidence: evidenceList,
    sermon_intervals: sermonIntervals,
    eligible_audio_intervals: [
      {
        startSec,
        endSec: sermonEndSec,
        label: `대상 설교자 적격 발화 구간 (${formatSecToMmSs(startSec)} ~ ${formatSecToMmSs(sermonEndSec)})`,
        role: 'target_preacher',
      },
    ],
    eligible_visual_intervals: eligibleVisualIntervals,
    excluded_intervals_with_reasons: excludedIntervals,
  };
}

/**
 * 실제 접근 가능한 자막/전사 및 모달리티 범위 안에서만 정량 측정을 수행한다.
 * 연결되지 않은 시각/음성 지표는 절대 가짜 숫자를 만들지 않고 assessable: false 로 표시한다.
 */
export function computeTranscriptMeasurementsV13(params: {
  targetSelection: TargetSelectionSpec;
  transcriptLines: TranscriptLine[];
  capabilities: SpeechCapabilitiesSpec;
  speakerContext: SpeakerContextSpec;
}): {
  measurements: SpeechMeasurementItem[];
  observations: SpeechObservationItem[];
  computedPaceLabel: '느림' | '안정적(적절)' | '약간 빠름' | '매우 빠름';
} {
  const { targetSelection, transcriptLines, capabilities, speakerContext } = params;
  const audioInterval = targetSelection.eligible_audio_intervals[0] || {
    startSec: 0,
    endSec: 1800,
  };
  const startSec = audioInterval.startSec;
  const endSec = audioInterval.endSec;
  const eligibleDurationSec = Math.max(60, endSec - startSec);
  const eligibleMin = +(eligibleDurationSec / 60).toFixed(1);

  const sermonLines = transcriptLines.filter(
    (l) =>
      l.sec >= startSec &&
      l.sec <= endSec &&
      !/^\[(음악|박수|노래|찬양|침묵)\]$/.test(l.txt.trim())
  );

  const hasTranscript = capabilities.timestamped_transcript && sermonLines.length >= 5;
  const excludedSummary =
    targetSelection.excluded_intervals_with_reasons.length > 0
      ? targetSelection.excluded_intervals_with_reasons
          .map((ex) => `${formatSecToMmSs(ex.startSec)}~${formatSecToMmSs(ex.endSec)}(${ex.role})`)
          .join(', ')
      : '비설교 제외 구간 없음 (단편 설교 영상)';

  const measurements: SpeechMeasurementItem[] = [];
  const observations: SpeechObservationItem[] = [];
  let computedPaceLabel: '느림' | '안정적(적절)' | '약간 빠름' | '매우 빠름' = '안정적(적절)';

  if (hasTranscript) {
    // 1. 한국어 말의 속도 (음절/분 및 어절/분) — 실제 설교 적격 발화 구간 기준
    const fullSermonText = sermonLines
      .map((l) => l.txt.replace(/\[[^\]]+\]/g, '').trim())
      .filter(Boolean)
      .join(' ');
    const koreanSyllables = (fullSermonText.match(/[가-힣]/g) || []).length;
    const koreanWords = fullSermonText.split(/\s+/).filter(Boolean).length;

    const firstLineSec = sermonLines[0].sec;
    const lastLine = sermonLines[sermonLines.length - 1];
    const lastLineEndSec = lastLine.sec + (lastLine.dur || 4);
    const activeSpanSec = Math.max(60, lastLineEndSec - firstLineSec);
    const activeSpanMin = activeSpanSec / 60;

    const syllablesPerMin = Math.round(koreanSyllables / activeSpanMin);
    const wordsPerMin = Math.round(koreanWords / activeSpanMin);

    if (syllablesPerMin < 230) computedPaceLabel = '느림';
    else if (syllablesPerMin <= 325) computedPaceLabel = '안정적(적절)';
    else if (syllablesPerMin <= 370) computedPaceLabel = '약간 빠름';
    else computedPaceLabel = '매우 빠름';

    measurements.push({
      metricId: 'speech_rate_ko',
      label: '한국어 발화 속도 (쉼 포함 적격 설교 구간)',
      definition: '대상 설교자의 적격 설교 구간 내 분당 한국어 음절 수(음절/분) 및 어절 수(어절/분)',
      value: `${syllablesPerMin} 음절/분 (${wordsPerMin} 어절/분)`,
      unit: '음절/분 · 어절/분',
      numeratorLabel: `총 ${koreanSyllables.toLocaleString()}음절 (${koreanWords.toLocaleString()}어절)`,
      denominatorLabel: `설교 적격 발화 ${ (activeSpanSec / 60).toFixed(1) }분 (${formatSecToMmSs(firstLineSec)}~${formatSecToMmSs(lastLineEndSec)}, 쉼 포함)`,
      eligibleDurationSec: Math.round(activeSpanSec),
      excludedSummary,
      toolSource: 'YouTube InnerTube Timestamped Transcript Analyzer',
      toolVersion: 'v1.3.0',
      assessable: true,
    });

    // 2. 문맥 확인을 거친 습관어/담화 채움어 (의미 있는 '여러분', '아멘', '우리'는 제외!)
    const fillerPatterns = /(?:^|\s)(어+|그+|이제|사실은|그러니까|뭐냐면|참\s+이제)(?=\s|$)/g;
    let fillerCount = 0;
    const fillerExamples: Array<{ sec: number; endSec: number; txt: string; token: string }> = [];

    for (const line of sermonLines) {
      const matches = line.txt.match(fillerPatterns);
      if (matches && matches.length > 0) {
        fillerCount += matches.length;
        if (fillerExamples.length < 4) {
          fillerExamples.push({
            sec: Math.floor(line.sec),
            endSec: Math.ceil(line.sec + (line.dur || 5)),
            txt: line.txt,
            token: matches[0].trim(),
          });
        }
      }
    }

    const fillerPerMin = +(fillerCount / activeSpanMin).toFixed(2);
    measurements.push({
      metricId: 'context_checked_fillers',
      label: '문맥 확인 습관성 채움어 빈도',
      definition:
        "회중 호칭('여러분')·신앙 고백('아멘') 등 의미 있는 상호작용을 제외하고, 문장 전환 시 반복된 채움어('이제', '그러니까', '사실은', '어/그') 횟수 / 적격 발화 분",
      value: `${fillerPerMin} 회/분 (총 ${fillerCount}회)`,
      unit: '회/발화분',
      numeratorLabel: `문맥 확인 채움어 ${fillerCount}회 ('여러분·아멘' 제외)`,
      denominatorLabel: `설교 적격 발화 ${(activeSpanSec / 60).toFixed(1)}분`,
      eligibleDurationSec: Math.round(activeSpanSec),
      excludedSummary,
      toolSource: 'Korean Sermon Discourse Marker Analyzer',
      toolVersion: 'v1.3.0',
      assessable: true,
    });

    // 3. 핵심 문장·질문 전후의 쉼(Pause) 및 전환 신호
    let meaningfulPauseCount = 0;
    const pauseScenes: Array<{ sec: number; gapSec: number; beforeTxt: string; afterTxt: string }> =
      [];
    for (let i = 0; i < sermonLines.length - 1; i++) {
      const curr = sermonLines[i];
      const next = sermonLines[i + 1];
      const currEnd = curr.sec + (curr.dur || 3.5);
      const gap = next.sec - currEnd;
      if (
        gap >= 1.4 &&
        gap <= 6.5 &&
        (/(\?|입니까|습니까|까요|있으십니까|보십시오|기억하십시오|말씀합니다)/.test(curr.txt) ||
          /^(그러나|하지만|그런데|사랑하는|여러분|첫째|둘째|결론적으로)/.test(next.txt.trim()))
      ) {
        meaningfulPauseCount++;
        if (pauseScenes.length < 3) {
          pauseScenes.push({
            sec: Math.floor(curr.sec),
            gapSec: +gap.toFixed(1),
            beforeTxt: curr.txt,
            afterTxt: next.txt,
          });
        }
      }
    }

    measurements.push({
      metricId: 'key_sentence_pauses',
      label: '질문·전환·핵심 문장 전후 쉼(여백) 구간',
      definition:
        '질문이나 역접(그러나/하지만)·핵심 권면 전후에 1.4~6.5초 간격으로 확보된 의미 있는 여백 횟수 (편집·찬양 무음 제외)',
      value: `${meaningfulPauseCount} 개 구간 확인`,
      unit: '구간 수',
      numeratorLabel: `질문·전환 전후 여백 ${meaningfulPauseCount}회`,
      denominatorLabel: `설교 적격 자막 세그먼트 ${sermonLines.length}개 구간`,
      eligibleDurationSec: Math.round(activeSpanSec),
      excludedSummary,
      toolSource: 'Caption Gap & Turn Boundary Detector',
      toolVersion: 'v1.3.0',
      assessable: true,
    });

    // 4. 설교 중 본문 낭독 vs 설명 구간 비율
    const readingIntervals = targetSelection.sermon_intervals.filter(
      (iv) => iv.deliveryFunction === 'scripture_reading'
    );
    const readingSec = readingIntervals.reduce(
      (acc, iv) => acc + Math.max(0, iv.endSec - iv.startSec),
      0
    );
    const readingPct = Math.round((readingSec / eligibleDurationSec) * 100);
    measurements.push({
      metricId: 'scripture_reading_vs_explanation',
      label: '설교 내 본문 낭독 vs 설명·선포 구간 구분',
      definition:
        '별도 성경봉독 순서를 제외하고, 설교자가 설교 중 직접 본문을 낭독한 시간과 설명·강해 시간의 비율 (낭독 시 성경/원고 주시는 감점 대상 아님)',
      value: `본문 낭독 ${readingPct}% / 설명·선포 ${100 - readingPct}%`,
      unit: '% (시간 비율)',
      numeratorLabel: `설교 내 본문 낭독 ${Math.round(readingSec)}초`,
      denominatorLabel: `설교 전체 적격 시간 ${eligibleDurationSec}초`,
      eligibleDurationSec,
      excludedSummary,
      toolSource: 'Sermon Delivery Function Classifier',
      toolVersion: 'v1.3.0',
      assessable: true,
    });

    // 실제 자막 타임스탬프와 대응하는 관찰 사실(Observations) 추출
    // (A) 도입부 질문/청중 경험 환기 관찰
    const introQuestions = sermonLines.filter(
      (l) =>
        l.sec <= startSec + 360 &&
        /(\?|있으십니까|보셨습니까|어떻습니까|생각해|경험|우리가\s*살면서)/.test(l.txt)
    );
    if (introQuestions.length > 0) {
      const qLine = introQuestions[0];
      observations.push({
        id: 'obs-intro-question',
        startSec: Math.floor(qLine.sec),
        endSec: Math.ceil(qLine.sec + (qLine.dur || 6)),
        timeDisplay: formatSecToMmSs(qLine.sec),
        modality: 'transcript',
        observedFact:
          '설교 도입부에서 청중의 실제 삶·신앙 경험을 환기하는 질문/문장으로 설교를 시작함.',
        quoteOrBehavior: `"${qLine.txt}"`,
        deliveryFunction: 'question',
        frequencyType: 'single_observation',
        isStrength: true,
        targetId: targetSelection.video_local_target_id || 'target_preacher',
        sourceLabel: '원본 자막 타임스탬프 대조 확인',
      });
    } else {
      const firstLine = sermonLines[0];
      observations.push({
        id: 'obs-intro-start',
        startSec: Math.floor(firstLine.sec),
        endSec: Math.ceil(firstLine.sec + (firstLine.dur || 6)),
        timeDisplay: formatSecToMmSs(firstLine.sec),
        modality: 'transcript',
        observedFact: '확인된 실제 설교 시작 구간에서 본문 주제와 말씀을 선포하며 시작함.',
        quoteOrBehavior: `"${firstLine.txt}"`,
        deliveryFunction: 'explanation',
        frequencyType: 'single_observation',
        isStrength: true,
        targetId: targetSelection.video_local_target_id || 'target_preacher',
        sourceLabel: '원본 자막 타임스탬프 대조 확인',
      });
    }

    // (B) 예상 반론 수용 및 대조/전환 관찰
    const contrastLines = sermonLines.filter((l) =>
      /(물론|그럴\s*수\s*있습니다|하지만|그러나\s*성경은|반면에|여기서\s*중요한\s*것은)/.test(l.txt)
    );
    if (contrastLines.length > 0) {
      const cLine = contrastLines[0];
      observations.push({
        id: 'obs-contrast-transition',
        startSec: Math.floor(cLine.sec),
        endSec: Math.ceil(cLine.sec + (cLine.dur || 6)),
        timeDisplay: formatSecToMmSs(cLine.sec),
        modality: 'transcript',
        observedFact:
          '설명 중 반론 수용 또는 역접 표지(물론/그러나/여기서 중요한 것은)를 사용해 논지의 전환점을 청각적으로 알림.',
        quoteOrBehavior: `"${cLine.txt}"`,
        deliveryFunction: 'explanation',
        frequencyType:
          contrastLines.length >= 2 ? 'repeated_in_this_video' : 'single_observation',
        isStrength: true,
        targetId: targetSelection.video_local_target_id || 'target_preacher',
        sourceLabel: '원본 자막 타임스탬프 대조 확인',
      });
    }

    // (C) 긴 호흡 문장 / 정보 밀집 구간 관찰 (의미 단위 끊어 읽기 과제 연결)
    const denseLines = sermonLines.filter((l) => l.txt.length >= 34);
    if (denseLines.length > 0) {
      const dLine = denseLines[Math.min(1, denseLines.length - 1)];
      observations.push({
        id: 'obs-dense-sentence',
        startSec: Math.floor(dLine.sec),
        endSec: Math.ceil(dLine.sec + (dLine.dur || 7)),
        timeDisplay: formatSecToMmSs(dLine.sec),
        modality: 'transcript',
        observedFact:
          '한 호흡에 전달되는 어절 수가 많아 핵심 주어·서술어 사이의 청각적 쉼(/)이 짧아지는 구간이 관찰됨.',
        quoteOrBehavior: `"${dLine.txt}"`,
        deliveryFunction: 'explanation',
        frequencyType:
          denseLines.length >= 3 ? 'repeated_in_this_video' : 'single_observation',
        isStrength: false,
        targetId: targetSelection.video_local_target_id || 'target_preacher',
        sourceLabel: '원본 자막 타임스탬프 대조 확인',
      });
    }

    // (D) 문맥 확인 채움어 관찰 (실제 감지된 경우에만 기록, 없으면 억지로 단점을 만들지 않음!)
    if (fillerExamples.length > 0) {
      const fEx = fillerExamples[0];
      observations.push({
        id: 'obs-filler-marker',
        startSec: fEx.sec,
        endSec: fEx.endSec,
        timeDisplay: formatSecToMmSs(fEx.sec),
        modality: 'transcript',
        observedFact: `문장 전환 시 무의식적 담화 채움어('${fEx.token}')가 쉼 대신 사용된 장면이 관찰됨 (전체 적격 구간 내 ${fillerCount}회, 분당 ${fillerPerMin}회).`,
        quoteOrBehavior: `"${fEx.txt}"`,
        deliveryFunction: 'explanation',
        frequencyType:
          fillerCount >= 3 ? 'repeated_in_this_video' : 'single_observation',
        isStrength: false,
        targetId: targetSelection.video_local_target_id || 'target_preacher',
        sourceLabel: '원본 자막 타임스탬프 대조 확인',
      });
    }
  } else {
    // 자막 트랙이 없는 영상인 경우: 허위 수치를 생성하지 않고 미확보 사유를 명시
    measurements.push({
      metricId: 'speech_rate_ko',
      label: '한국어 발화 속도 (음절/분 · 어절/분)',
      definition: '대상 설교자의 적격 설교 구간 내 분당 한국어 음절 수 및 어절 수',
      value: null,
      unit: '음절/분 · 어절/분',
      numeratorLabel: '시간 정보 전사 미확보',
      denominatorLabel: `설교 구간 ${eligibleMin}분`,
      eligibleDurationSec,
      excludedSummary,
      toolSource: 'YouTube InnerTube Timestamped Transcript Analyzer',
      toolVersion: 'v1.3.0',
      assessable: false,
      unassessableReason:
        '본 영상에서 시간 정보가 있는 자막(Transcript) 트랙이 제공되지 않아 임의의 속도 수치를 생성하지 않고 보류했습니다.',
    });
  }

  // 5. 시각 지표 (시선 분포 / 원고 사용 / 반복 손동작 / 표정) — 실제 연속 영상 분석 여부 및 가림 조건 반영
  const cameraCond = speakerContext.camera_and_editing || '';
  const isHandHidden = cameraCond.includes('손 가림') || cameraCond.includes('강대상');
  const isSideCamera = cameraCond.includes('측면 카메라');

  measurements.push({
    metricId: 'gaze_and_manuscript',
    label: '시선 분포 및 설명 구간 원고 주시 비율',
    definition:
      '설교 내 본문 낭독 구간을 제외한 설명 구간에서 화면 기준 좌·정면·우·아래 방향 시선(또는 고개 방향 대리 지표) 비율',
    value: null,
    unit: '% (시각 관찰 분모 기준)',
    numeratorLabel: capabilities.continuous_video_access ? '측정 대기' : '시각 스트림 미연결',
    denominatorLabel:
      targetSelection.eligible_visual_intervals.length > 0
        ? `시각 적격 구간 ${eligibleMin}분`
        : '시각 적격 구간 미연결 (0초)',
    eligibleDurationSec: targetSelection.eligible_visual_intervals.length > 0 ? eligibleDurationSec : 0,
    excludedSummary: isSideCamera
      ? `${excludedSummary} + 측면 카메라 촬영이므로 화면 정면 응시 비율을 실제 청중 눈맞춤 비율로 환산하지 않음`
      : excludedSummary,
    toolSource: 'Visual Gaze & Head Orientation Inspector',
    toolVersion: 'v1.3.0',
    assessable: false,
    unassessableReason: isSideCamera
      ? '측면 카메라 조건으로 확인되어 화면 정면 비율을 실제 청중 눈맞춤 비율로 보고하지 않습니다.'
      : !capabilities.continuous_video_access
      ? '연속 영상(시각 프레임) 분석 도구가 연결되지 않은 상태입니다. 전사·자막만으로는 시선 분포를 추정하거나 점수화하지 않습니다.'
      : '눈동자/고개 방향 정량 계수 전이므로 질적 확인 대상으로 유지합니다.',
  });

  measurements.push({
    metricId: 'hand_gestures_normalized',
    label: '반복 손동작 및 의미 제스처 빈도 (손 가시 시간 정규화)',
    definition:
      '강대상·자막 가림 시간과 수어통역 분할 화면을 제외한 실제 설교자의 손이 보이는 시간(분)당 반복 동작 횟수',
    value: null,
    unit: '회 / 손 가시 분',
    numeratorLabel: isHandHidden ? '강대상 손 가림' : '시각 프레임 미연결',
    denominatorLabel: isHandHidden ? '손 가시 시간 0분 (가림 제외)' : '시각 관찰 분모 미확보',
    eligibleDurationSec: 0,
    excludedSummary: `${excludedSummary} + 손이 가려진 시간 및 수어통역 PIP 화면은 분모에서 완전히 제외`,
    toolSource: 'Gesture & Occlusion-Aware Vision Tracker',
    toolVersion: 'v1.3.0',
    assessable: false,
    unassessableReason: isHandHidden
      ? '강대상/하단 가림으로 손이 보이지 않는 조건입니다. 안 보였다는 사실을 손버릇 0회나 개선으로 허위 기록하지 않고 [평가·비교 불가]로 보존합니다.'
      : '연속 영상 프레임 분석이 연결되지 않아 손버릇·제스처 횟수를 임의로 생성하지 않습니다.',
  });

  measurements.push({
    metricId: 'acoustic_timbre_prosody',
    label: '음성 파형 기반 성량·음높이·끝맺음 명료도',
    definition:
      '마이크 자동 음량 조절(AGC)·예배당 잔향을 고려한 문장 종결부 에너지 유지율',
    value: null,
    unit: 'dB / Hz 편차',
    numeratorLabel: capabilities.audio_access ? '원시 오디오 측정 대기' : '원시 오디오 미연결',
    denominatorLabel: `설교 적격 음성 구간 ${eligibleMin}분`,
    eligibleDurationSec,
    excludedSummary,
    toolSource: 'Acoustic Prosody Analyzer',
    toolVersion: 'v1.3.0',
    assessable: false,
    unassessableReason:
      '원시 오디오 파형(Pitch/dB) 계수기가 연결되지 않았으며, 녹음 음량만으로 실제 예배당 발성 압력이나 음색을 단정하지 않습니다.',
  });

  return { measurements, observations, computedPaceLabel };
}

/**
 * 관찰 사실(Observations)과 4축 맥락을 바탕으로 코치의 해석(Interpretations)과
 * 3~5분 내에 실행 가능한 훈련 과제(Practice Drills, 최대 3개)를 생성한다.
 */
export function buildInterpretationsAndDrillsV13(params: {
  sermonTitle: string;
  scriptureRef: string;
  startSec: number;
  observations: SpeechObservationItem[];
  measurements: SpeechMeasurementItem[];
  speechContext: SpeechContextSpec;
  existingDrills?: SpeechPracticeDrill[];
}): {
  coreConclusion: string;
  interpretations: SpeechInterpretationItem[];
  practiceDrills: SpeechPracticeDrill[];
  recommendedReferenceIds: string[];
} {
  const {
    sermonTitle,
    scriptureRef,
    startSec,
    observations,
    measurements,
    speechContext,
    existingDrills,
  } = params;

  const interpretations: SpeechInterpretationItem[] = [];
  const practiceDrills: SpeechPracticeDrill[] = [];
  const recommendedReferenceIds = new Set<string>(['K11', 'K12']);

  const strengthObs = observations.filter((o) => o.isStrength);
  const issueObs = observations.filter((o) => !o.isStrength);

  // 1. 강점 해석 (관찰된 사실과 해당 문장의 전달 목적 연결)
  for (const sObs of strengthObs) {
    if (sObs.id === 'obs-intro-question') {
      interpretations.push({
        id: 'interp-strength-question',
        observationIds: [sObs.id],
        title: '청중의 삶·경험을 질문으로 불러와 본문 설명을 들을 이유를 만드는 도입',
        category: '청중 추적 과정',
        isStrength: true,
        sentenceFunction: '도입 질문 · 청중 경험 환기',
        deliveryHypothesis: `${sObs.timeDisplay} 장면(${sObs.quoteOrBehavior})에서 처음부터 추상적 개념 설명으로 들어가지 않고 청중이 자신의 상황을 떠올릴 질문을 먼저 제시해, 이어질 ${scriptureRef} 본문 강해를 따라올 인지적 통로를 열었습니다.`,
        confidenceBasis: `${sObs.sourceLabel} (${sObs.timeDisplay})`,
        actionToKeepOrChange:
          '유지할 강점: 질문 직후 바로 답을 이어 말하지 않고 1.5~2초간 청중이 속으로 답해 볼 여백을 유지하세요.',
        nextCheckCondition: '다음 설교 도입 질문 직후 첫 설명 문장이 시작되기 전 1.5초 이상의 여백이 유지되는지 확인',
      });
    } else if (sObs.id === 'obs-contrast-transition') {
      interpretations.push({
        id: 'interp-strength-contrast',
        observationIds: [sObs.id],
        title: '반론 수용 및 역접 표지를 통한 논지 전환 신호 제시',
        category: '청중 추적 과정',
        isStrength: true,
        sentenceFunction: '예상 반론 수용 후 핵심 명제 구별',
        deliveryHypothesis: `${sObs.timeDisplay} 장면(${sObs.quoteOrBehavior})에서 청중이 생각할 수 있는 전제를 먼저 짚은 뒤 전환 표지로 지금 다룰 핵심 질문의 범위를 명확히 좁혀 주었습니다.`,
        confidenceBasis: `${sObs.sourceLabel} (${sObs.timeDisplay})`,
        actionToKeepOrChange:
          '유지할 강점: 전환 표지 직전 짧은 쉼(/)을 두어 앞 문장과 뒤 핵심 문장의 청각적 대비를 유지하세요.',
        nextCheckCondition: '다음 촬영의 본론 대지 전환 구간에서 전환어 앞뒤의 속도 대비 확인',
      });
      recommendedReferenceIds.add('K01');
      recommendedReferenceIds.add('K09');
    } else {
      interpretations.push({
        id: `interp-strength-${sObs.id}`,
        observationIds: [sObs.id],
        title: '실제 설교 도입 선언의 분명한 주제 제시',
        category: '명료성·습관어',
        isStrength: true,
        sentenceFunction: '설교 주제 및 본문 선포',
        deliveryHypothesis: `${sObs.timeDisplay} 실제 설교 시작 지점(${sObs.quoteOrBehavior})에서 앞선 예배 순서와 구분되는 또렷한 첫 문장으로 설교의 중심 주제를 제시했습니다.`,
        confidenceBasis: `${sObs.sourceLabel} (${sObs.timeDisplay})`,
        actionToKeepOrChange: '유지할 강점: 첫 문장을 시작하기 전 강단에서 시선을 먼저 정돈한 뒤 첫 음절을 선명하게 발화하기',
        nextCheckCondition: '다음 설교 시작 첫 30초 구간의 첫 문장 종결 어미 명료도 확인',
      });
    }
  }

  // 2. 우선 교정 과제 해석 및 3~5분 실전 훈련 드릴 (최대 2~3개로 엄격 제한)
  const denseObs = issueObs.find((o) => o.id === 'obs-dense-sentence');
  const fillerObs = issueObs.find((o) => o.id === 'obs-filler-marker');

  if (denseObs) {
    interpretations.push({
      id: 'interp-issue-dense',
      observationIds: [denseObs.id],
      title: '정보가 몰리는 긴 설명 문장에서 의미 단위 끊어 읽기와 종결부 여백 확보',
      category: '속도·강세·쉼',
      isStrength: false,
      sentenceFunction:
        speechContext.occasion === '장례식'
          ? '위로와 소망의 핵심 문장 전달'
          : '본문 핵심 원리 설명 및 적용 연결',
      deliveryHypothesis: `${denseObs.timeDisplay} 구간(${denseObs.quoteOrBehavior})처럼 한 문장에 여러 절이 이어질 때 의미 단위 사이의 짧은 쉼(/)이 생략되면, 청중이 앞선 개념을 소화하기 전에 다음 문장이 겹쳐 핵심 어구가 묻힐 가능성이 있습니다.`,
      alternativeExplanation:
        '정해진 예배 시간 안에 준비한 강해 내용을 모두 전달하려는 과정에서 호흡 간격이 짧아졌을 수 있습니다.',
      confidenceBasis: `${denseObs.sourceLabel} (${denseObs.timeDisplay})`,
      actionToKeepOrChange:
        '바꿀 행동: 원고의 긴 문장을 두 개의 의미 덩어리로 나누어 핵심 주어 뒤에서 짧은 쉼(/)을 두고, 문장 마침표 뒤에는 고개를 들어 1.5초간 마무리 쉼(//)을 둡니다.',
      nextCheckCondition:
        '다음 설교 본론의 핵심 명제 문장 전후로 1.5초 이상의 마무리 쉼(//)과 종결 어미 들림이 확보되는지 확인',
    });

    const cleanQuote = denseObs.quoteOrBehavior.replace(/^"|"$/g, '').trim();
    const midIdx = Math.floor(cleanQuote.length / 2);
    const splitPos = cleanQuote.indexOf(' ', midIdx);
    const partA = splitPos > 0 ? cleanQuote.slice(0, splitPos) : cleanQuote;
    const partB = splitPos > 0 ? cleanQuote.slice(splitPos + 1) : '하나님의 말씀을 붙드시기 바랍니다';

    const prevStatus = existingDrills?.find((d) => d.id === 'drill-meaning-unit-pause')?.status;

    practiceDrills.push({
      id: 'drill-meaning-unit-pause',
      title: '과제 1: 긴 설명 문장의 의미 단위 끊기(/)와 핵심 문장 마무리 쉼(//) 훈련',
      skillTag: '의미 단위 끊어 읽기 · 속도·강세·쉼',
      targetBehavior:
        '핵심 설명 문장을 한 호흡에 몰아 읽지 않고, 의미 단위(/)와 문장 끝 마무리 쉼(//)으로 나누어 청중이 따라올 시간을 확보합니다.',
      reviewInterval: {
        startSec: denseObs.startSec,
        endSec: denseObs.endSec,
        timeDisplay: denseObs.timeDisplay,
        quoteOrGist: denseObs.quoteOrBehavior,
      },
      preSpeechCue:
        '원고의 핵심 문장 바로 앞에 연필로 슬래시 두 개(//)를 크게 표시하고, 그 표시를 보면 숨을 한 번 고른 뒤 청중을 보며 말하기',
      steps3to5Min: [
        `1단계 (1분): ${denseObs.timeDisplay} 구간의 실제 발언 문장을 다시 듣고, 한 호흡에 이어 말한 연결 어미 지점에 '/' 표시를 합니다.`,
        `2단계 (2분): 아래 전달 시범 표기대로 '/'에서는 반 박자 숨을 고르고, '[시선 들기]' 표시에서 원고에서 눈을 떼어 정면 청중 쪽으로 고개를 든 채 문장 끝까지 분명히 마무리합니다.`,
        `3단계 (1분): 휴대폰 음성녹음으로 3문장만 녹음해 문장 끝 받침과 종결 어미가 흐려지지 않고 '//' 여백이 들리는지 확인합니다.`,
      ],
      sampleScriptWithNotation: `[표기 기준: '/' = 짧은 의미 구분 쉼(0.5초), '//' = 충분히 마무리하는 쉼(1.5초), **굵은 글씨** = 핵심 강세 단어, [시선 들기] = 원고에서 청중 쪽으로 고개를 드는 시점]\n\n"${partA} / [시선 들기] **${partB}** //"` ,
      successCriteria:
        '핵심 문장 직후 바로 다음 문장으로 넘어가지 않고 1.5초의 여백(//)이 들리며, 문장 마지막 음절까지 성량이 급격히 떨어지지 않으면 성공입니다.',
      overcorrectionGuard:
        '모든 단어마다 기계적으로 끊어 읽어 말투가 어색하거나 경직되지 않도록, 한 단락에서 가장 중요한 핵심 문장 1개에만 의식적으로 적용하세요.',
      nextRecordingCheck:
        '다음 설교 영상의 본론 첫 핵심 명제 구간(설교 시작 후 5~10분 사이)에서 핵심 문장 전후 쉼과 시선 전환을 재확인합니다.',
      status: prevStatus || 'proposed',
    });

    recommendedReferenceIds.add('K04');
    recommendedReferenceIds.add('K08');
  }

  if (fillerObs) {
    interpretations.push({
      id: 'interp-issue-filler',
      observationIds: [fillerObs.id],
      title: '문장 전환 시 무의식적 담화 채움어를 짧은 침묵(호흡)으로 대체하기',
      category: '명료성·습관어',
      isStrength: false,
      sentenceFunction: '단락 전환 및 다음 설명 생각 정리',
      deliveryHypothesis: `${fillerObs.timeDisplay} 장면(${fillerObs.quoteOrBehavior})에서 다음 문장을 이어갈 때 침묵 대신 습관적인 연결어가 들어가면서 문장 간 경계가 흐려질 수 있습니다. (단, 회중과의 상호작용을 위한 '여러분', '아멘'은 교정 대상에서 제외했습니다.)`,
      confidenceBasis: `${fillerObs.sourceLabel} (${fillerObs.timeDisplay})`,
      actionToKeepOrChange:
        '바꿀 행동: 다음 문장이 떠오르는 1초 동안 소리를 내어 채우지 않고 입술을 가볍게 다문 채 코로 짧게 호흡하며 침묵으로 전환합니다.',
      nextCheckCondition:
        '다음 촬영에서 동일 길이(적격 설교 발화 분) 기준 문맥 확인 채움어 빈도가 감소했는지 확인',
    });

    const prevStatus = existingDrills?.find((d) => d.id === 'drill-silent-transition')?.status;

    practiceDrills.push({
      id: 'drill-silent-transition',
      title: '과제 2: 단락 전환 시 채움어 대신 1초 무음 호흡(Silent Transition) 훈련',
      skillTag: '명료성·습관어 · 전환 신호',
      targetBehavior:
        "문장과 문장 사이를 '이제/그러니까/어'로 잇지 않고, 1초간 고요한 호흡으로 전환해 메시지의 권위와 명료성을 높입니다.",
      reviewInterval: {
        startSec: fillerObs.startSec,
        endSec: fillerObs.endSec,
        timeDisplay: fillerObs.timeDisplay,
        quoteOrGist: fillerObs.quoteOrBehavior,
      },
      preSpeechCue:
        '마침표가 끝나면 다음 단어를 바로 발음하기 전 입술을 한 번 닫고 코로 짧게 숨 들이쉬기',
      steps3to5Min: [
        `1단계 (1분): ${fillerObs.timeDisplay} 구간을 재생하여 문장이 끝난 직후 어떤 연결어가 습관적으로 나오는지 직접 확인합니다.`,
        `2단계 (2분): 원고의 한 단락(4~5문장)을 읽되, 마침표마다 의도적으로 입을 다물고 속으로 '하나'를 센 뒤 다음 문장의 첫 주어를 바로 시작합니다.`,
        `3단계 (1분): 원고 없이 핵심 요지 1분을 말해보며 생각이 멈추는 순간 소리를 내는 대신 고개를 끄덕이며 1초 쉼을 두는 연습을 합니다.`,
      ],
      sampleScriptWithNotation: `[표기 기준: '//' = 소리 내지 않고 코로 호흡하는 1초 전환 쉼]\n\n"앞선 본문의 상황을 보십시오. // (채움어 없이 1초 호흡) [시선 들기] **그러나 하나님께서는** 우리의 생각과 전혀 다른 길을 예비하셨습니다. //"`,
      successCriteria:
        '단락 전환 지점에서 불필요한 연결어 없이 1초의 고요한 여백 뒤 핵심 접속사(그러나, 그러므로, 첫째)가 또렷하게 시작되면 성공입니다.',
      overcorrectionGuard:
        '채움어를 의식하느라 말의 자연스러운 추진력이나 따뜻한 구어체 호흡까지 잃지 않도록, 단락이 바뀌는 큰 전환점에서만 먼저 실행하세요.',
      nextRecordingCheck:
        '다음 동일 맥락 설교의 도입~본론 전환 구간(첫 10분)에서 발화 분당 채움어 빈도 변화를 비교합니다.',
      status: prevStatus || 'proposed',
    });
  }

  // 만약 자막상 특별한 단점(dense/filler)이 관찰되지 않았거나 훈련 과제가 1개 이하라면,
  // 억지로 결점을 꾸며내지 않고 강해/설교 전달력을 높이는 '본문 낭독 후 설명 전환 신호' 연습 1개를 제안
  if (practiceDrills.length === 0) {
    const reviewStart = startSec;
    const prevStatus = existingDrills?.find((d) => d.id === 'drill-reading-to-explanation')?.status;
    practiceDrills.push({
      id: 'drill-reading-to-explanation',
      title: '과제 1: 설교 중 성경 본문 낭독에서 청중 설명으로 돌아오는 전환 신호 훈련',
      skillTag: '낭독과 설명의 전환 · 시선·원고',
      targetBehavior:
        '설교 중 본문 구절을 읽은 직후, 성경/원고에 시선을 둔 채 바로 해설을 시작하지 않고 고개를 들어 청중과 방향을 맞춘 뒤 첫 설명 문장을 시작합니다.',
      reviewInterval: {
        startSec: reviewStart,
        endSec: reviewStart + 45,
        timeDisplay: formatSecToMmSs(reviewStart),
        quoteOrGist: `${sermonTitle} (${scriptureRef}) 설교 도입 및 본문 낭독 전환 구간`,
      },
      preSpeechCue:
        '본문 구절 마지막 절을 읽고 나면 성경/원고에서 손을 살짝 떼며 고개를 먼저 들기',
      steps3to5Min: [
        '1단계 (1분): 설교 원고에서 성경 구절을 직접 인용해 읽는 문장 끝에 표시([고개 들기 //])를 합니다.',
        '2단계 (2분): 본문 구절은 차분하고 정확하게 낭독한 뒤, 1.5초간 쉼(//)을 두며 정면 청중 쪽으로 시선을 완전히 옮긴 후에 첫 해설 문장을 시작합니다.',
        '3단계 (1분): 낭독 톤(경건하고 또렷한 어조)과 설명 톤(대화하듯 풀어주는 어조)의 청각적 구분이 들리는지 점검합니다.',
      ],
      sampleScriptWithNotation: `[표기 기준: '/' = 짧은 의미 구분, '//' = 본문 낭독 마무리 쉼(1.5초), [시선 들기] = 원고에서 청중으로 전환]\n\n"(본문 낭독) ${scriptureRef} 말씀입니다. // [시선 들기] **방금 읽은 이 구절이** 오늘 우리에게 던지는 질문은 무엇입니까? /"`,
      successCriteria:
        '본문 낭독의 마지막 어미와 첫 설명 문장 사이에 1.5초의 여백과 시선(고개 방향) 전환이 분명히 구분되면 성공입니다.',
      overcorrectionGuard:
        '본문을 정확히 읽기 위해 원고나 성경을 보는 행위 자체를 줄이려 하지 마세요. 낭독할 때는 충분히 보되, 설명 첫 문장으로 넘어오는 전환점 하나만 분명히 만듭니다.',
      nextRecordingCheck:
        '다음 설교에서 설교 중 성경 구절 인용 직후 첫 해설 문장이 시작되는 10초 구간을 확인합니다.',
      status: prevStatus || 'proposed',
    });
    recommendedReferenceIds.add('K06');
  }

  const coreConclusion =
    strengthObs.length > 0 && issueObs.length > 0
      ? `확인된 대상 설교자의 실제 설교 구간(${formatSecToMmSs(startSec)}~) 분석 결과, ${
          strengthObs[0].timeDisplay
        } 장면에서 청중의 생각과 주의를 여는 도입·전환 전달력이 분명한 강점으로 확인되었습니다. 이번 회차에는 이 강점을 유지하면서, ${
          issueObs[0].timeDisplay
        } 구간에서 관찰된 [${
          issueObs[0].id === 'obs-dense-sentence'
            ? '긴 설명 문장의 의미 단위 끊기(/)와 마무리 쉼(//)'
            : '문장 전환 시 채움어를 1초 무음 호흡으로 바꾸기'
        }] 과제 ${practiceDrills.length}개에 집중해 연습하시는 것을 권장합니다.`
      : `확인된 대상 설교자의 설교 구간(${formatSecToMmSs(startSec)}~)을 기준으로 현재 접근 가능한 범위에서 전달 흐름을 점검했습니다. 근거 없는 결점을 임의로 추가하지 않고, 실제 설교 장면에서 바로 실행할 수 있는 핵심 전환 훈련 ${practiceDrills.length}개를 제안합니다.`;

  return {
    coreConclusion,
    interpretations,
    practiceDrills: practiceDrills.slice(0, 3),
    recommendedReferenceIds: Array.from(recommendedReferenceIds),
  };
}

/**
 * 개인별 누적 기록과 변화 판정 (마스터 프롬프트 6장 & 설계 문서 4장 규율 준수)
 * - 샘플 데이터는 비교 대상에서 제외
 * - 이전 기록이 없으면 '기준선(첫 기록)'으로 판정하며 허위 향상을 만들지 않음
 * - 촬영 조건(손 가림, 자막 유무), 분석 길이, 행사 맥락(장례식 vs 부흥회 등)을 먼저 확인해 비교 가능성을 판정
 */
export function evaluateComparableHistoryV13(params: {
  currentVideoId: string;
  preacherName: string;
  isDemoSample: boolean;
  currentTargetSelection: TargetSelectionSpec;
  currentMeasurements: SpeechMeasurementItem[];
  currentSpeechContext: SpeechContextSpec;
  currentSpeakerContext: SpeakerContextSpec;
  previousRecords: SermonRecord[];
}): SpeechChangeJudgment[] {
  const {
    currentVideoId,
    preacherName,
    isDemoSample,
    currentTargetSelection,
    currentMeasurements,
    currentSpeechContext,
    currentSpeakerContext,
    previousRecords,
  } = params;

  if (isDemoSample) {
    return [
      {
        metricOrSkill: '개발·시연용 예시 데이터 분리 안내',
        previousVideoId: null,
        previousSermonTitle: null,
        previousIntervalLabel: null,
        comparable: false,
        nonComparableReason:
          '현재 보고 계신 설교는 앱 기능 확인을 위한 [개발·시연용 예시 데이터]입니다. 실제 목회자님의 개인 누적 이력과 섞이지 않도록 분리되어 있으며, 새 설교 영상을 등록하시면 첫 영상이 개인 기준선(Baseline)으로 기록됩니다.',
        judgment: '기준선(첫 기록)',
        isLongTermTrend: false,
        currentEvidence: '시연용 예시 데이터 (실제 사용자 이력 합산 제외)',
        analysisNote: '새 설교 등록 & 코칭을 통해 실제 설교를 등록하면 첫 기준선이 생성됩니다.',
      },
    ];
  }

  // 동일 설교자의 실제 분석 기록(샘플 제외, 현재 영상 제외)만 시간순 조회
  const validPrev = (previousRecords || []).filter(
    (r) =>
      !r.meta.isSampleData &&
      !r.meta.id.startsWith('sermon-sample-') &&
      r.meta.youtubeId !== currentVideoId &&
      (!preacherName || !r.meta.preacher || r.meta.preacher === preacherName)
  );

  if (validPrev.length === 0) {
    const audioIv = currentTargetSelection.eligible_audio_intervals[0];
    const ivLabel = audioIv
      ? `${formatSecToMmSs(audioIv.startSec)} ~ ${formatSecToMmSs(audioIv.endSec)}`
      : '설교 구간';
    return [
      {
        metricOrSkill: '개인 기준선(Baseline) 설정 — 첫 설교 기록',
        previousVideoId: null,
        previousSermonTitle: null,
        previousIntervalLabel: null,
        comparable: false,
        nonComparableReason:
          '동일 설교자의 이전 분석 기록이 없는 첫 번째 실제 설교 영상입니다. 비교할 이전 자료가 없으므로 "이전보다 좋아졌다"는 허위 향상 판정을 생성하지 않고, 이번 영상의 측정·관찰 결과를 앞으로의 비교 기준선(Baseline)으로 저장합니다.',
        judgment: '기준선(첫 기록)',
        isLongTermTrend: false,
        currentEvidence: `대상 설교자(${preacherName}) 적격 구간(${ivLabel}) 초기 기준선 수립 완료`,
        analysisNote:
          '다음 설교 영상을 등록하시면 동일 지표 정의와 비교 가능 조건(길이·맥락·촬영 조건)을 검증한 뒤 변화를 판정합니다.',
      },
    ];
  }

  const prevRecord = validPrev[0];
  const prevV13 = prevRecord.speechCoaching?.v13;
  const judgments: SpeechChangeJudgment[] = [];

  const currAudioIv = currentTargetSelection.eligible_audio_intervals[0] || {
    startSec: 0,
    endSec: 1800,
  };
  const currDurSec = Math.max(60, currAudioIv.endSec - currAudioIv.startSec);
  const prevAudioIv = prevV13?.targetSelection?.eligible_audio_intervals?.[0];
  const prevDurSec = prevAudioIv
    ? Math.max(60, prevAudioIv.endSec - prevAudioIv.startSec)
    : 1800;

  // 1. 행사·예배 맥락 비교 가능성 확인 (예: 장례식 vs 부흥회 등)
  const prevOccasion = prevV13?.speechContext?.occasion || '주일예배';
  const currOccasion = currentSpeechContext.occasion || '주일예배';
  if (prevOccasion !== currOccasion && (currOccasion === '장례식' || prevOccasion === '장례식')) {
    judgments.push({
      metricOrSkill: '행사 맥락 차이에 따른 음성 에너지·표현 강도 비교 제한',
      previousVideoId: prevRecord.meta.youtubeId,
      previousSermonTitle: prevRecord.meta.sermonTitle,
      previousIntervalLabel: prevAudioIv
        ? `${formatSecToMmSs(prevAudioIv.startSec)}~${formatSecToMmSs(prevAudioIv.endSec)}`
        : prevRecord.meta.startTimeLabel,
      comparable: false,
      nonComparableReason: `이전 영상(${prevOccasion})과 이번 영상(${currOccasion})의 예배·의식 목적이 다릅니다. 장례식의 절제된 음량·동작·긴 쉼을 이전 예배 대비 표현력 퇴보나 악화로 판정하지 않습니다.`,
      judgment: '비교 불가',
      isLongTermTrend: false,
      previousEvidence: `이전 맥락: ${prevOccasion} (${prevRecord.meta.sermonTitle})`,
      currentEvidence: `이번 맥락: ${currOccasion}`,
      analysisNote: '맥락별 수행 기록을 분리하여 해당 의식 목적에 맞는 전달 적합성으로만 평가합니다.',
    });
  }

  // 2. 발화 속도 및 문맥 확인 채움어 비교 (분당 정규화 수치 기준, 단순 횟수 비교 금지)
  const currFillerM = currentMeasurements.find((m) => m.metricId === 'context_checked_fillers');
  const prevFillerM = prevV13?.measurements?.find((m) => m.metricId === 'context_checked_fillers');

  const durationRatio = Math.max(currDurSec, prevDurSec) / Math.min(currDurSec, prevDurSec);

  if (currFillerM?.assessable && prevFillerM?.assessable && currFillerM.value && prevFillerM.value) {
    const currRate = parseFloat(String(currFillerM.value));
    const prevRate = parseFloat(String(prevFillerM.value));
    if (!Number.isNaN(currRate) && !Number.isNaN(prevRate)) {
      const diff = +(currRate - prevRate).toFixed(2);
      let judgment: SpeechChangeJudgment['judgment'] = '유지';
      if (diff <= -0.3) judgment = '개선 관찰';
      else if (diff >= 0.35) judgment = '악화 관찰';

      // 최근 3회 이상 연속 추세인지 확인
      const comparableHistoryCount = validPrev.filter((r) =>
        r.speechCoaching?.v13?.measurements?.some(
          (m) => m.metricId === 'context_checked_fillers' && m.assessable
        )
      ).length;

      judgments.push({
        metricOrSkill: '문맥 확인 담화 채움어 빈도 (적격 발화 분당 정규화 비교)',
        previousVideoId: prevRecord.meta.youtubeId,
        previousSermonTitle: prevRecord.meta.sermonTitle,
        previousIntervalLabel: prevFillerM.denominatorLabel,
        comparable: true,
        judgment,
        isLongTermTrend: comparableHistoryCount >= 2 && judgment === '개선 관찰',
        consecutiveCount: comparableHistoryCount + 1,
        previousEvidence: `이전(${prevRecord.meta.sermonTitle}): ${prevFillerM.value} (${prevFillerM.denominatorLabel})`,
        currentEvidence: `이번: ${currFillerM.value} (${currFillerM.denominatorLabel})`,
        analysisNote:
          durationRatio >= 2.5
            ? `이전 영상과 이번 영상의 설교 길이 차이가 크므로 단순 감지 횟수를 비교하지 않고 '적격 발화 분당 빈도(회/분)'로 정규화해 비교했습니다.`
            : judgment === '개선 관찰'
            ? `동일한 측정 정의(회/발화분) 기준 이전 ${prevRate}회/분에서 이번 ${currRate}회/분으로 감소가 관찰되었습니다.`
            : judgment === '유지'
            ? `이전(${prevRate}회/분)과 이번(${currRate}회/분)이 유사한 범위로 유지되고 있습니다.`
            : `이번 설교 전환 구간에서 채움어 빈도가 소폭 증가(${prevRate} → ${currRate}회/분)하여 단락 전환 호흡 연습을 권장합니다.`,
      });
    }
  } else {
    judgments.push({
      metricOrSkill: '발화 속도 및 담화 채움어 정량 비교',
      previousVideoId: prevRecord.meta.youtubeId,
      previousSermonTitle: prevRecord.meta.sermonTitle,
      previousIntervalLabel: prevRecord.meta.startTimeLabel,
      comparable: false,
      nonComparableReason:
        '이전 영상 또는 이번 영상 중 한쪽에 시간 정보가 있는 자막(Transcript) 측정값이 없어 동일 기준 정량 비교를 보류했습니다.',
      judgment: '비교 불가',
      isLongTermTrend: false,
      previousEvidence: prevFillerM?.value ? String(prevFillerM.value) : '이전 정량 전사 측정값 없음',
      currentEvidence: currFillerM?.value ? String(currFillerM.value) : '이번 정량 전사 측정값 없음',
      analysisNote: '동일한 전사 측정 도구가 확보된 영상끼리만 수치 변화를 판정합니다.',
    });
  }

  // 3. 손동작·시선 시각 지표 비교 가능성 (손 가림 또는 시각 미연결 시 허위 개선 판정 방지)
  const isHandHidden =
    (currentSpeakerContext.camera_and_editing || '').includes('손 가림') ||
    (currentSpeakerContext.camera_and_editing || '').includes('강대상');

  judgments.push({
    metricOrSkill: '반복 손동작 및 시선 분포 시각 비교',
    previousVideoId: prevRecord.meta.youtubeId,
    previousSermonTitle: prevRecord.meta.sermonTitle,
    previousIntervalLabel: prevRecord.meta.startTimeLabel,
    comparable: false,
    nonComparableReason: isHandHidden
      ? '이번 영상에서 강대상/하단 가림으로 손이 보이지 않으므로, 손버릇이 관찰되지 않았다는 사실을 "개선"으로 판정하지 않고 [비교 불가]로 처리합니다.'
      : '연속 영상(시각) 정량 계수 조건이 동일하게 확인되지 않아 시각 지표의 향상/퇴보를 단정하지 않습니다.',
    judgment: '비교 불가',
    isLongTermTrend: false,
    previousEvidence: '이전 기록의 시각 관찰 조건과 분모 대조 필요',
    currentEvidence: isHandHidden ? '강대상 손 가림 (손 가시 분모 0분)' : '자막·전사 중심 분석 모드',
    analysisNote:
      '손이 실제로 보이는 구간과 동일한 카메라 각도가 확보된 경우에만 시각 지표 변화를 판정합니다.',
  });

  return judgments;
}

/**
 * 전체 v1.3 스피치 코칭 데이터 조립
 */
export function buildSpeechCoachingV13Data(
  input: BuildSpeechV13Input
): {
  v13: SpeechCoachingV13Data;
  computedPaceLabel: '느림' | '안정적(적절)' | '약간 빠름' | '매우 빠름';
} {
  const transcriptLines = input.transcriptLines || [];
  const hasTranscript = transcriptLines.length >= 5;

  const capabilities: SpeechCapabilitiesSpec = {
    audio_access: Boolean(input.audioAccess),
    continuous_video_access: Boolean(input.continuousVideoAccess),
    timestamped_transcript: hasTranscript,
    tool_measurements: hasTranscript,
    ai_model_connected: Boolean(input.aiModelConnected),
    is_demo_sample: Boolean(input.isDemoSample),
    modality_note: hasTranscript
      ? 'YouTube InnerTube 시간 정보 자막(Transcript) 및 예배 순서 분리기 연결 완료 (원시 시각 프레임/오디오 파형 미연결 항목은 평가 보류 처리)'
      : '시간 정보 자막 트랙 미제공 영상 (확인된 설교 구간 및 예배 맥락 기준 안내, 미확인 정량 수치 생성 안 함)',
  };

  const speakerContext: SpeakerContextSpec = {
    language: 'ko',
    current_goal:
      input.customSpeakerContext?.current_goal ||
      '의미 단위 끊어 읽기와 핵심 문장 전후의 분명한 쉼 확보',
    strengths_to_preserve: input.customSpeakerContext?.strengths_to_preserve || [
      '청중의 삶을 환기하는 도입 질문과 진정성 있는 말씀 선포 어조',
    ],
    podium_and_microphone:
      input.customSpeakerContext?.podium_and_microphone || '강대상 고정 마이크 / 핸드 마이크',
    camera_and_editing:
      input.customSpeakerContext?.camera_and_editing ||
      (capabilities.continuous_video_access
        ? '정면 카메라 (설교자 상반신·손 확인 가능)'
        : '시각 화면 미확인 (자막/음성 중심)'),
    user_provided_accommodations:
      input.customSpeakerContext?.user_provided_accommodations || [],
  };

  const speechContext = inferInitialSpeechContext(
    input.sermonTitle,
    input.targetAudienceText || '',
    input.customSpeechContext
  );

  const targetSelection = buildTargetSelectionFromTranscriptAndMeta({
    preacherName: input.preacherName,
    videoId: input.videoId,
    originalDurationSec: input.originalDurationSec,
    startSec: input.detectedStartSec,
    startSource: input.startSource,
    startReasonLabel: input.startReasonLabel,
    transcriptLines,
    continuousVideoAccess: capabilities.continuous_video_access,
    cameraAndEditing: speakerContext.camera_and_editing,
  });

  const { measurements, observations, computedPaceLabel } =
    computeTranscriptMeasurementsV13({
      targetSelection,
      transcriptLines,
      capabilities,
      speakerContext,
    });

  const { banner, priorities } = buildContextCriteriaAndPriorities(speechContext);

  const {
    coreConclusion,
    interpretations,
    practiceDrills,
    recommendedReferenceIds,
  } = buildInterpretationsAndDrillsV13({
    sermonTitle: input.sermonTitle,
    scriptureRef: input.scriptureRef,
    startSec: input.detectedStartSec,
    observations,
    measurements,
    speechContext,
  });

  const changeJudgments = evaluateComparableHistoryV13({
    currentVideoId: input.videoId,
    preacherName: input.preacherName,
    isDemoSample: Boolean(input.isDemoSample),
    currentTargetSelection: targetSelection,
    currentMeasurements: measurements,
    currentSpeechContext: speechContext,
    currentSpeakerContext: speakerContext,
    previousRecords: input.previousRecords || [],
  });

  const totalSec =
    input.originalDurationSec > input.detectedStartSec
      ? input.originalDurationSec
      : targetSelection.eligible_audio_intervals[0]?.endSec || input.detectedStartSec + 1800;

  return {
    computedPaceLabel,
    v13: {
      promptVersion: 'v1.3',
      coreConclusion,
      contextCriteriaBanner: banner,
      contextPriorityFocus: priorities,
      originalDurationSec: totalSec,
      targetSelection,
      capabilities,
      speakerContext,
      speechContext,
      observations,
      measurements,
      interpretations,
      practiceDrills,
      changeJudgments,
      userCorrections: [],
      recommendedReferenceIds,
    },
  };
}
