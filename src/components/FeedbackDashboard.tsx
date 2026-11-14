import {
  Users,
  Bookmark,
} from 'lucide-react';
import { SermonRecord } from '../types/sermon';
import { SpeechHabitsCoach } from './SpeechHabitsCoach';

interface FeedbackDashboardProps {
  sermon: SermonRecord;
  allSermons?: SermonRecord[];
  onUpdateSermonRecord?: (updated: SermonRecord) => { saved: boolean; error?: string };
  onJumpToTimestamp: (seconds: number) => void;
  section?: 'homiletics' | 'speech' | 'application';
}

export const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({
  sermon,
  allSermons = [],
  onUpdateSermonRecord,
  onJumpToTimestamp,
  section = 'homiletics',
}) => {
  const allMetrics = sermon?.metrics || [];
  // '설교학 4대 진단': 스피치 딜리버리 & 보컬 코칭 항목을 제외한 4대 설교학 지표 표시
  const homileticFourMetrics = allMetrics.filter(
    (m) => !m.category.includes('스피치') && !m.category.includes('Speech')
  );
  const displayMetrics =
    homileticFourMetrics.length > 0 ? homileticFourMetrics.slice(0, 4) : allMetrics.slice(0, 4);

  const discussionQuestions = sermon?.smallGroupQuestions || [];
  const pastoralPlan = sermon?.pastoralActionPlan || [];
  const speechCoaching = sermon?.speechCoaching;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl">
      {/* 1. 설교학 4대 진단 ('📖 본문 해석 & 설교학 4대 지표' 내용) */}
      {section === 'homiletics' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-indigo-950/30 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
            💡 설교학(Homiletics) 전문 평가 기준에 따른 4대 영역별 세부 진단 결과입니다.
          </div>

          <div className="space-y-3.5">
            {displayMetrics.map((metric, i) => (
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

      {/* 2. 스피치 딜리버리 & 보컬 코칭 ('🎙️ 스피치 & 바디랭귀지 코칭' 내용) */}
      {section === 'speech' && speechCoaching && (
        <SpeechHabitsCoach
          sermon={sermon}
          allSermons={allSermons}
          speechData={speechCoaching}
          onUpdateSermonRecord={onUpdateSermonRecord}
          onJumpToTimestamp={onJumpToTimestamp}
        />
      )}

      {/* 3. 🙏 구역 나눔 & 다음 주 개선 플랜 */}
      {section === 'application' && (
        <div className="space-y-6">
          {/* 소그룹 구역예배 나눔 질문 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>주일 설교 연계 소그룹/구역예배 나눔 질문</span>
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
              <span>설교자를 위한 다음 주 설교 개선 액션 플랜</span>
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
