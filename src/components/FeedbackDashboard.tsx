import { useState } from 'react';
import {
  TrendingUp,
  Award,
  Sparkles,
  BookOpen,
  Mic,
  HeartHandshake,
  Users,
  Compass,
  ArrowRight,
  Bookmark,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SermonRecord, MetricScore } from '../types/sermon';
import { SpeechHabitsCoach } from './SpeechHabitsCoach';

interface FeedbackDashboardProps {
  sermon: SermonRecord;
  onJumpToTimestamp: (seconds: number) => void;
}

export const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({
  sermon,
  onJumpToTimestamp,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'speech' | 'homiletics' | 'application'>('summary');

  const metrics = sermon?.metrics || [];
  const averageScore = sermon?.averageScore || 95;
  const summaryText = sermon?.summary || '설교학 정밀 진단 리포트입니다.';
  const keyStrengths = sermon?.keyStrengths || [];
  const recommendations = sermon?.recommendations || [];
  const discussionQuestions = sermon?.smallGroupQuestions || [];
  const pastoralPlan = sermon?.pastoralActionPlan || [];
  const speechCoaching = sermon?.speechCoaching;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl">
      {/* 4대 네비게이션 탭 */}
      <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-3 mb-5 overflow-x-auto">
        {[
          { id: 'summary', label: '🌟 설교학 종합 진단', count: `${averageScore}점` },
          { id: 'speech', label: '🎙️ 스피치 & 바디랭귀지 코칭', count: '정밀 진단' },
          { id: 'homiletics', label: '📖 본문 해석 & 설교학 5대 지표', count: '심층 분석' },
          { id: 'application', label: '🙏 구역 나눔 & 다음 주 개선 플랜', count: '목회 실천' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-indigo-700/60 text-indigo-100'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: 종합 진단 리포트 (SUMMARY) */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* 상단 스코어 요약 배너 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>설교학 종합 정밀 진단 (Homiletical Diagnostic Report)</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {sermon?.meta?.churchName} {sermon?.meta?.preacher} 설교 분석 리포트
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {summaryText}
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 shadow-md">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                  {averageScore}
                  <span className="text-xs text-slate-400 font-normal"> / 100</span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>마스터 설교 등급</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5대 핵심 지표 미니 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium truncate max-w-[120px]">
                      {metric.category.split('(')[0]}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{metric.score}점</span>
                  </div>
                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden my-2">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${metric.score}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                  {metric.evaluation}
                </p>
              </div>
            ))}
          </div>

          {/* 핵심 강점 vs 권장 개선점 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-emerald-900/30 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>설교의 탁월한 3대 핵심 강점 (Key Strengths)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                {keyStrengths.map((str, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-amber-900/30 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>더 깊은 은혜를 위한 3대 권장 보완점 (Recommendations)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 스피치 & 바디랭귀지 정밀 코칭 (SPEECH) */}
      {activeTab === 'speech' && speechCoaching && (
        <SpeechHabitsCoach
          speechData={speechCoaching}
          onJumpToTimestamp={onJumpToTimestamp}
        />
      )}

      {/* TAB 3: 본문 해석 & 설교학 5대 지표 (HOMILETICS) */}
      {activeTab === 'homiletics' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-indigo-950/30 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
            💡 설교학(Homiletics) 전문 평가 기준에 따른 영역별 세부 진단 결과입니다.
          </div>

          <div className="space-y-3.5">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{metric.category}</span>
                  </h4>
                  <div className="font-mono text-base font-extrabold text-amber-400">
                    {metric.score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-1">
                  {metric.evaluation}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-slate-200">
                    <span className="font-bold text-emerald-400 block mb-1">【강점】</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                      {metric.strengths?.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-slate-200">
                    <span className="font-bold text-amber-400 block mb-1">【보완 제언】</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                      {metric.recommendations?.map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: 구역 나눔 질문 & 다음 주 개선 플랜 (APPLICATION) */}
      {activeTab === 'application' && (
        <div className="space-y-6">
          {/* 소그룹 구역예배 나눔 질문 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>주일 설교 연계 소그룹/구역예배 4대 나눔 질문</span>
            </div>
            <div className="space-y-3">
              {discussionQuestions.map((q) => (
                <div
                  key={q.num}
                  className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5"
                >
                  <div className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      Q{q.num}
                    </span>
                    <p className="text-xs font-bold text-white leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 ml-7 leading-relaxed">
                    💬 나눔 가이드: {q.guide}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 설교자를 위한 다음 주 목회적 개선 플랜 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>설교자를 위한 다음 주 설교 개선 3대 액션 플랜</span>
            </div>
            <div className="space-y-3">
              {pastoralPlan.map((plan, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1"
                >
                  <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span>{plan.title}</span>
                  </h5>
                  <p className="text-xs text-slate-300 ml-5 leading-relaxed">
                    {plan.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
