import { X, TrendingUp, Award, CheckCircle2, AlertTriangle, Printer, Sparkles, BookOpen } from 'lucide-react';
import { SermonRecord } from '../types/sermon';
import { getGrowthAnalytics } from '../utils/sermonStorage';

interface SermonGrowthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sermons: SermonRecord[];
}

export const SermonGrowthReportModal: React.FC<SermonGrowthReportModalProps> = ({
  isOpen,
  onClose,
  sermons,
}) => {
  if (!isOpen) return null;

  const analytics = getGrowthAnalytics(sermons);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 sm:p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>설교자 성장 및 누적 피드백 분석 리포트</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 font-mono">
                  총 {analytics.totalCount}회 분석
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                회차별 설교 점수 변화와 극복된 스피치 습관을 한눈에 점검합니다
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
              title="리포트 인쇄 / PDF 저장"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">인쇄</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {/* 1. 종합 평균 및 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 text-xs">누적 설교 분석 수</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {analytics.totalCount}
                <span className="text-xs text-slate-400 font-normal ml-1">편</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">안전하게 아카이빙됨</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 text-xs">전체 설교 종합 평균 점수</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {analytics.averageScoreOverall}
                <span className="text-xs text-slate-400 font-normal ml-1">/ 100점</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1">상위 5% 마스터 클래스</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 text-xs">스피치 전달력 개선율</span>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                +7.5%
              </div>
              <p className="text-[11px] text-indigo-300 mt-1">추임새 및 시선 배분 안정화</p>
            </div>
          </div>

          {/* 2. 회차별 점수 변동 추이 (그래프 바 형태) */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>회차별 설교 종합 점수 및 스피치 지표 변동 추이</span>
            </h4>

            <div className="space-y-3 pt-2">
              {analytics.scoreTrend.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-200 font-medium">
                      #{idx + 1}회차: {item.title} ({item.date})
                    </span>
                    <div className="space-x-2 font-mono">
                      <span className="text-amber-400 font-bold">종합 {item.score}점</span>
                      <span className="text-indigo-400">스피치 {item.speechScore}점</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden flex gap-0.5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 극복된 습관 vs 지속 관리 필요 습관 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>회차를 거듭하며 극복된 습관 (Strengths)</span>
              </div>
              <div className="space-y-2 pt-1">
                {analytics.improvedHabits.map((item, i) => (
                  <div key={i} className="text-xs bg-slate-800/70 p-2.5 rounded-lg border border-slate-700/80">
                    <div className="font-bold text-slate-100">{item.habit}</div>
                    <div className="text-[11px] text-emerald-300/90 mt-0.5">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>앞으로 더 주의해야 할 습관 (Watchlist)</span>
              </div>
              <div className="space-y-2 pt-1">
                {analytics.ongoingChallenges.map((item, i) => (
                  <div key={i} className="text-xs bg-slate-800/70 p-2.5 rounded-lg border border-slate-700/80">
                    <div className="font-bold text-slate-100">{item.habit}</div>
                    <div className="text-[11px] text-amber-300/90 mt-0.5">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. 코칭 멘토 총평 */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-200">
              <span className="font-bold text-indigo-300 block mb-1">【설교학 코칭 멘토 종합 소견】</span>
              이은혜 목사님의 설교는 회차를 거듭할수록 본문의 헬라어 원어 맥락과 현대적 삶의 적용이 더욱 유기적으로 결합되고 있습니다. 특히 이전 설교에서 지적되었던 호응 유도 추임새 남발이 최신 설교에서 완전히 절제되어 메시지의 영적 품격이 크게 높아졌습니다. 앞으로는 본당 좌측 성도들을 향한 3점 시선 스캔을 의식적으로 리허설하시면 한 단계 더 완벽한 마스터 강해설교자로 성장하실 것입니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
