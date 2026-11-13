import { useState } from 'react';
import {
  Mic,
  Eye,
  Hand,
  Activity,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  Flame,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { SpeechCoachingData, HabitCategory } from '../types/sermon';

interface SpeechHabitsCoachProps {
  speechData: SpeechCoachingData;
  onJumpToTimestamp: (seconds: number) => void;
}

export const SpeechHabitsCoach: React.FC<SpeechHabitsCoachProps> = ({
  speechData,
  onJumpToTimestamp,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all');

  const habits = speechData.habits || [];
  const filteredHabits =
    selectedCategory === 'all'
      ? habits
      : habits.filter((h) => h.category === selectedCategory);

  const getCategoryBadge = (category: HabitCategory) => {
    switch (category) {
      case 'filler':
        return { label: '말투/추임새', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'gesture':
        return { label: '손버릇/제스처', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'gaze':
        return { label: '시선 처리', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'tic':
        return { label: '틱/무의식적 동작', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
    }
  };

  const getSeverityBadge = (sev: 'low' | 'medium' | 'high') => {
    switch (sev) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">집중 교정 권장</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">주의 필요</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">경미한 습관</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 상단 스피치 종합 지표 대시보드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              시선 배분 안정도
            </span>
            <span className="font-mono text-emerald-400 font-bold">{speechData.eyeContactScore}점</span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${speechData.eyeContactScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">회중석 3점 분산도 분석</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Hand className="w-3.5 h-3.5 text-blue-400" />
              제스처 자연스러움
            </span>
            <span className="font-mono text-blue-400 font-bold">{speechData.gestureScore}점</span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${speechData.gestureScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">설교대 파지 및 개방감</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              발성 및 억양 완급
            </span>
            <span className="font-mono text-indigo-400 font-bold">{speechData.vocalStabilityScore}점</span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${speechData.vocalStabilityScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">성량 조절 및 종결 어미</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              설교 스피치 템포
            </span>
            <span className="font-semibold text-amber-400">{speechData.speechPace}</span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div className="bg-amber-400 h-2 rounded-full" style={{ width: '85%' }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">분당 약 280-310음절 (적정)</p>
        </div>
      </div>

      {/* 2. 스피치 강점 (Strengths) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>설교자 스피치 탁월한 강점 (Vocal Strengths)</span>
        </div>
        <div className="space-y-2">
          {speechData.vocalStrengths.map((str, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{str}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 단점 및 무의식적 버릇 정밀 코칭 (Habits & Quirks Coaching) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>무의식적 습관 & 단점 정밀 코칭 (Speech & Mannerism Diagnosis)</span>
            </div>
            <p className="text-xs text-slate-400">
              말투, 손버릇, 시선 쏠림, 틱 등 회중의 몰입을 방해하는 요소를 짚고 실전 교정 훈련법을 제안합니다.
            </p>
          </div>

          {/* 카테고리 필터 탭 */}
          <div className="flex items-center space-x-1 overflow-x-auto bg-slate-950/60 p-1 rounded-xl border border-slate-800 shrink-0">
            {[
              { id: 'all', label: '전체' },
              { id: 'filler', label: '말투/추임새' },
              { id: 'gesture', label: '손버릇' },
              { id: 'gaze', label: '시선' },
              { id: 'tic', label: '틱/동작' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 습관별 상세 카드 리스트 */}
        <div className="space-y-4">
          {filteredHabits.map((habit) => {
            const badge = getCategoryBadge(habit.category);
            return (
              <div
                key={habit.id}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {getSeverityBadge(habit.severity)}
                    <h4 className="text-sm font-bold text-white">{habit.title}</h4>
                  </div>
                  {habit.count && (
                    <span className="text-xs text-amber-400/90 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
                      총 {habit.count}회 감지
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-1">
                  {habit.description}
                </p>

                {/* 타임스탬프 클릭 이동 버튼들 */}
                {habit.timestamps && habit.timestamps.length > 0 && (
                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>영상에서 직접 확인하기 (클릭 시 해당 구간 이동):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {habit.timestamps.map((ts, idx) => (
                        <button
                          key={idx}
                          onClick={() => onJumpToTimestamp(ts.seconds)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 text-xs border border-indigo-500/30 transition-all cursor-pointer group active:scale-95"
                          title={ts.note}
                        >
                          <PlayCircle className="w-3 h-3 text-indigo-400 group-hover:text-indigo-300" />
                          <span className="font-mono font-semibold">{ts.timeDisplay}</span>
                          <span className="text-slate-400 text-[10px] truncate max-w-[150px]">
                            - {ts.note}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 전문가 교정 훈련 드릴 (Drill) */}
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-300 mr-1.5">【실전 교정 훈련 드릴】</span>
                    <span className="text-slate-200 leading-relaxed">{habit.remedyTip}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
