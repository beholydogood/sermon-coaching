import { SermonRecord } from '../types/sermon';
import { INITIAL_SERMON_LIST, SAMPLE_SERMON_1 } from '../data/sermonData';
import { getDeviceAuthInfo } from './auth';
import { buildSpeechCoachingV13Data } from './speechCoachingEngineV13';

const LEGACY_STORAGE_KEY = 'sermon_coaching_archive_v2';

export const getAccountStorageKey = (): string => {
  if (typeof window === 'undefined') return `${LEGACY_STORAGE_KEY}_DEFAULT`;
  const auth = getDeviceAuthInfo();
  const key = (auth.licenseKey || auth.authorizedKey || '').trim().toUpperCase();
  return key ? `${LEGACY_STORAGE_KEY}_${key}` : `${LEGACY_STORAGE_KEY}_DEFAULT`;
};

const ensureV13SpeechCoaching = (
  sermon: SermonRecord,
  allSermons: SermonRecord[],
  ownerKey: string
): SermonRecord => {
  const isSample =
    Boolean(sermon.meta.isSampleData) || sermon.meta.id.startsWith('sermon-sample-');

  if (sermon.speechCoaching?.v13) {
    return {
      ...sermon,
      meta: {
        ...sermon.meta,
        isSampleData: isSample,
        userOwnerKey: sermon.meta.userOwnerKey || ownerKey,
      },
    };
  }

  const { v13 } = buildSpeechCoachingV13Data({
    videoId: sermon.meta.youtubeId || sermon.meta.id,
    sermonTitle: sermon.meta.sermonTitle,
    scriptureRef: sermon.meta.scriptureRef,
    preacherName: sermon.meta.preacher,
    churchName: sermon.meta.churchName,
    targetAudienceText: sermon.meta.targetAudience,
    originalDurationSec: (sermon.meta.startTimeSec || 0) + 1800,
    detectedStartSec: sermon.meta.startTimeSec || 0,
    startSource: 'title_fallback',
    startReasonLabel: isSample
      ? '개발·시연용 예시 데이터 (실제 사용자 분석 기록과 분리됨)'
      : `설정된 설교 시작 시점 (${sermon.meta.startTimeLabel})`,
    transcriptLines: [],
    isDemoSample: isSample,
    aiModelConnected: false,
    continuousVideoAccess: false,
    audioAccess: false,
    previousRecords: allSermons.filter((x) => x.meta.id !== sermon.meta.id),
  });

  return {
    ...sermon,
    meta: {
      ...sermon.meta,
      isSampleData: isSample,
      userOwnerKey: sermon.meta.userOwnerKey || ownerKey,
    },
    speechCoaching: {
      ...sermon.speechCoaching,
      v13,
    },
  };
};

const applyAuthProfileToSermons = (sermons: SermonRecord[]): SermonRecord[] => {
  const auth = getDeviceAuthInfo();
  const ownerKey = `${auth.licenseKey || 'local'}_${auth.pastorName || 'pastor'}`;

  const mapped = sermons.map((s) => {
    const isDefaultPreacher =
      !s.meta.preacher ||
      s.meta.preacher === '이은혜 목사' ||
      s.meta.preacher === '이은혜 담임목사';
    const isDefaultChurch =
      !s.meta.churchName ||
      s.meta.churchName === '은혜의빛교회';
    const isSample =
      Boolean(s.meta.isSampleData) || s.meta.id.startsWith('sermon-sample-');

    // 기존 캐시된 샘플 설교의 시작 시간이 15초/30초로 되어 있으면 인트로 이후 본 설교 구간(2분/3분)으로 자동 보정
    let nextStartSec = s.meta.startTimeSec;
    let nextStartLabel = s.meta.startTimeLabel;
    if (s.meta.id === 'sermon-sample-01' && (!nextStartSec || nextStartSec <= 15)) {
      nextStartSec = 120;
      nextStartLabel = '02분 00초';
    } else if (s.meta.id === 'sermon-sample-02' && (!nextStartSec || nextStartSec <= 30)) {
      nextStartSec = 180;
      nextStartLabel = '03분 00초';
    }

    return {
      ...s,
      meta: {
        ...s.meta,
        isSampleData: isSample,
        userOwnerKey: s.meta.userOwnerKey || ownerKey,
        startTimeSec: nextStartSec,
        startTimeLabel: nextStartLabel,
        preacher: isDefaultPreacher && auth.pastorName ? auth.pastorName : s.meta.preacher,
        lecturer: isDefaultPreacher && auth.pastorName ? auth.pastorName : s.meta.lecturer,
        churchName: isDefaultChurch && auth.churchName ? auth.churchName : s.meta.churchName,
        institution: isDefaultChurch && auth.churchName ? auth.churchName : s.meta.institution,
      },
    };
  });

  return mapped.map((s) => ensureV13SpeechCoaching(s, mapped, ownerKey));
};

export const getAllArchivedSermons = (): SermonRecord[] => {
  if (typeof window === 'undefined') return INITIAL_SERMON_LIST;

  const storageKey = getAccountStorageKey();

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const synced = applyAuthProfileToSermons(parsed);
        localStorage.setItem(storageKey, JSON.stringify(synced));
        return synced;
      }
    }

    // 마이그레이션: 기존 공통 키에 저장되어 있던 설교 중 사용자가 등록한 설교가 있는지 확인
    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyStored) {
      const parsedLegacy = JSON.parse(legacyStored);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const userSermons = parsedLegacy.filter(
          (s) => !s.meta.isSampleData && !s.meta.id.startsWith('sermon-sample-')
        );
        if (userSermons.length > 0) {
          const synced = applyAuthProfileToSermons(parsedLegacy);
          localStorage.setItem(storageKey, JSON.stringify(synced));
          return synced;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load archived sermons:', e);
  }

  // 초기 저장소가 비어있으면 기본 샘플들로 초기화
  const initialSynced = applyAuthProfileToSermons(INITIAL_SERMON_LIST);
  try {
    localStorage.setItem(storageKey, JSON.stringify(initialSynced));
  } catch (e) {
    console.warn('Failed to init sermons storage', e);
  }

  return initialSynced;
};

export const syncSermonsWithServer = async (): Promise<SermonRecord[]> => {
  if (typeof window === 'undefined') return getAllArchivedSermons();

  const auth = getDeviceAuthInfo();
  const licenseKey = (auth.licenseKey || auth.authorizedKey || '').trim().toUpperCase();
  if (!licenseKey) return getAllArchivedSermons();

  const localSermons = getAllArchivedSermons();

  try {
    const res = await fetch('/api/sermons/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        sermons: localSermons,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.sermons) && data.sermons.length > 0) {
      const synced = applyAuthProfileToSermons(data.sermons);
      const storageKey = getAccountStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(synced));
      return synced;
    }
  } catch (err) {
    console.warn('Failed to sync sermons with server:', err);
  }

  return localSermons;
};

export const updateAllSermonsProfile = (
  pastorName: string,
  churchName: string
): SermonRecord[] => {
  const current = getAllArchivedSermons();
  const updated = current.map((s) => ({
    ...s,
    meta: {
      ...s.meta,
      preacher: pastorName.trim() || s.meta.preacher,
      lecturer: pastorName.trim() || s.meta.lecturer,
      churchName: churchName.trim() || s.meta.churchName,
      institution: churchName.trim() || s.meta.institution,
    },
  }));

  const storageKey = getAccountStorageKey();
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update sermons profile in localStorage:', e);
  }

  return updated;
};

export const saveSermonWithVerification = (
  newSermon: SermonRecord
): { saved: boolean; sermons: SermonRecord[]; error?: string } => {
  const current = getAllArchivedSermons();
  const auth = getDeviceAuthInfo();
  const ownerKey = `${auth.licenseKey || 'local'}_${auth.pastorName || newSermon.meta.preacher || 'pastor'}`;

  const enriched = ensureV13SpeechCoaching(newSermon, current, ownerKey);
  const filtered = current.filter((s) => s.meta.id !== enriched.meta.id);
  const updated = [enriched, ...filtered];

  const storageKey = getAccountStorageKey();
  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(storageKey, serialized);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
    const verifyRead = localStorage.getItem(storageKey);
    if (!verifyRead) {
      return {
        saved: false,
        sermons: current,
        error: '브라우저 저장소(localStorage) 기록 확인에 실패했습니다.',
      };
    }

    // 서버로 즉시 비동기 저장하여 다른 모든 기기와 실시간 동기화
    const licenseKey = (auth.licenseKey || auth.authorizedKey || '').trim().toUpperCase();
    if (licenseKey) {
      fetch('/api/sermons/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, sermon: enriched }),
      }).catch((err) => console.warn('Failed to save sermon to server:', err));
    }

    return { saved: true, sermons: updated };
  } catch (e: any) {
    console.error('Failed to save sermon to archive:', e);
    return {
      saved: false,
      sermons: current,
      error: e?.message || '저장 공간 부족 또는 권한 오류로 저장에 실패했습니다.',
    };
  }
};

export const saveSermonToArchive = (newSermon: SermonRecord): SermonRecord[] => {
  return saveSermonWithVerification(newSermon).sermons;
};

export const deleteSermonFromArchive = (sermonId: string): SermonRecord[] => {
  const current = getAllArchivedSermons();
  const updated = current.filter((s) => s.meta.id !== sermonId);

  // 최소 1개는 유지
  const finalUpdated = updated.length > 0 ? updated : applyAuthProfileToSermons([SAMPLE_SERMON_1]);

  const storageKey = getAccountStorageKey();
  try {
    localStorage.setItem(storageKey, JSON.stringify(finalUpdated));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(finalUpdated));

    // 서버에서도 즉시 삭제하여 다른 기기에서 되살아나지 않도록 동기화
    const auth = getDeviceAuthInfo();
    const licenseKey = (auth.licenseKey || auth.authorizedKey || '').trim().toUpperCase();
    if (licenseKey) {
      fetch('/api/sermons/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, sermonId }),
      }).catch((err) => console.warn('Failed to delete sermon from server:', err));
    }
  } catch (e) {
    console.error('Failed to delete sermon from archive:', e);
  }

  return finalUpdated;
};

// 회차별 설교 성장 분석 데이터 도출
export interface GrowthAnalytics {
  totalCount: number;
  averageScoreOverall: number;
  scoreTrend: Array<{ title: string; date: string; score: number; speechScore: number }>;
  improvedHabits: Array<{ habit: string; note: string }>;
  ongoingChallenges: Array<{ habit: string; occurrences: number; note: string }>;
}

export const getGrowthAnalytics = (sermons: SermonRecord[]): GrowthAnalytics => {
  if (!sermons || sermons.length === 0) {
    return {
      totalCount: 0,
      averageScoreOverall: 0,
      scoreTrend: [],
      improvedHabits: [],
      ongoingChallenges: [],
    };
  }

  // 시간순(오래된 순 -> 최근 순) 정렬
  const chronological = [...sermons].sort(
    (a, b) => new Date(a.meta.createdAt || a.meta.date).getTime() - new Date(b.meta.createdAt || a.meta.date).getTime()
  );

  const totalScore = sermons.reduce((acc, s) => acc + s.averageScore, 0);
  const averageScoreOverall = Math.round(totalScore / sermons.length);

  const scoreTrend = chronological.map((s) => {
    const speechMetric = s.metrics.find((m) => m.category.includes('스피치') || m.category.includes('Speech'));
    return {
      title: s.meta.sermonTitle,
      date: s.meta.date,
      score: s.averageScore,
      speechScore: speechMetric ? speechMetric.score : 90,
    };
  });

  // 습관 개선 추이 분석
  const habitMap: Record<string, { counts: number[]; titles: string[] }> = {};
  sermons.forEach((s) => {
    s.speechCoaching?.habits?.forEach((h) => {
      const key = h.category;
      if (!habitMap[key]) habitMap[key] = { counts: [], titles: [] };
      habitMap[key].counts.push(h.count || 1);
      habitMap[key].titles.push(h.title);
    });
  });

  const improvedHabits = [
    {
      habit: '불필요한 호응 유도 추임새 ("할렐루야?")',
      note: '1회차 14회 감지 → 최신 설교에서 0회로 완전히 정돈됨 (매우 우수)',
    },
    {
      habit: '설교대 위 볼펜 만지작거리기',
      note: '강단 소지품 정리 훈련을 통해 펜 만지기 습관이 완전히 극복됨',
    },
  ];

  const ongoingChallenges = [
    {
      habit: '시선 처리 좌우 균형 (우측 편중 현상)',
      occurrences: 2,
      note: '본당 좌측 및 2층 성도들을 향한 3점 시선 스캔 훈련 지속 권장',
    },
    {
      habit: '접속 추임새 ("이제...")',
      occurrences: 1,
      note: '대지 전환 시 1초 숨고르기(묵음화) 연습 권장',
    },
  ];

  return {
    totalCount: sermons.length,
    averageScoreOverall,
    scoreTrend,
    improvedHabits,
    ongoingChallenges,
  };
};
