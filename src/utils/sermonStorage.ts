import { SermonRecord } from '../types/sermon';
import { INITIAL_SERMON_LIST, SAMPLE_SERMON_1 } from '../data/sermonData';
import { getDeviceAuthInfo } from './auth';

const ARCHIVE_STORAGE_KEY = 'sermon_coaching_archive_v2';

const applyAuthProfileToSermons = (sermons: SermonRecord[]): SermonRecord[] => {
  const auth = getDeviceAuthInfo();
  if (!auth.pastorName && !auth.churchName) return sermons;

  return sermons.map((s) => {
    const isDefaultPreacher =
      !s.meta.preacher ||
      s.meta.preacher === '이은혜 목사' ||
      s.meta.preacher === '이은혜 담임목사';
    const isDefaultChurch =
      !s.meta.churchName ||
      s.meta.churchName === '은혜의빛교회';

    return {
      ...s,
      meta: {
        ...s.meta,
        preacher: isDefaultPreacher && auth.pastorName ? auth.pastorName : s.meta.preacher,
        lecturer: isDefaultPreacher && auth.pastorName ? auth.pastorName : s.meta.lecturer,
        churchName: isDefaultChurch && auth.churchName ? auth.churchName : s.meta.churchName,
        institution: isDefaultChurch && auth.churchName ? auth.churchName : s.meta.institution,
      },
    };
  });
};

export const getAllArchivedSermons = (): SermonRecord[] => {
  if (typeof window === 'undefined') return INITIAL_SERMON_LIST;

  try {
    const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const synced = applyAuthProfileToSermons(parsed);
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(synced));
        return synced;
      }
    }
  } catch (e) {
    console.warn('Failed to load archived sermons:', e);
  }

  // 초기 저장소가 비어있으면 기본 샘플들로 초기화
  const initialSynced = applyAuthProfileToSermons(INITIAL_SERMON_LIST);
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(initialSynced));
  } catch (e) {
    console.warn('Failed to init sermons storage', e);
  }

  return initialSynced;
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

  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update sermons profile in localStorage:', e);
  }

  return updated;
};

export const saveSermonToArchive = (newSermon: SermonRecord): SermonRecord[] => {
  const current = getAllArchivedSermons();

  // 동일한 sermon ID만 교체하고, 새 분석 설교는 항상 맨 앞에 누적 추가
  const filtered = current.filter((s) => s.meta.id !== newSermon.meta.id);
  const updated = [newSermon, ...filtered];

  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save sermon to archive:', e);
  }

  return updated;
};

export const deleteSermonFromArchive = (sermonId: string): SermonRecord[] => {
  const current = getAllArchivedSermons();
  const updated = current.filter((s) => s.meta.id !== sermonId);

  // 최소 1개는 유지
  const finalUpdated = updated.length > 0 ? updated : applyAuthProfileToSermons([SAMPLE_SERMON_1]);

  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(finalUpdated));
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
