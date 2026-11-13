import { useState } from 'react';
import {
  History,
  TrendingUp,
  PlusCircle,
  Trash2,
  Calendar,
  User,
  BookOpen,
  Award,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { SermonRecord } from '../types/sermon';

interface SermonArchiveSidebarProps {
  sermons: SermonRecord[];
  activeSermonId: string;
  onSelectSermon: (sermon: SermonRecord) => void;
  onDeleteSermon: (sermonId: string, e: React.MouseEvent) => void;
  onOpenAnalyzeModal: () => void;
  onOpenGrowthModal: () => void;
}

export const SermonArchiveSidebar: React.FC<SermonArchiveSidebarProps> = ({
  sermons,
  activeSermonId,
  onSelectSermon,
  onDeleteSermon,
  onOpenAnalyzeModal,
  onOpenGrowthModal,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>설교 피드백 아카이브</span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30">
                {sermons.length}편 누적
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">지난 설교와 피드백을 다시 열람합니다</p>
          </div>
        </div>

        <button
          onClick={onOpenGrowthModal}
          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
          title="회차별 설교 점수 및 스피치 습관 개선 추이 비교"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-semibold text-[11px] hidden sm:inline">성장 리포트</span>
        </button>
      </div>

      {/* 새 설교 등록 버튼 */}
      <button
        onClick={onOpenAnalyzeModal}
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#ffffff' }}
        className="w-full mb-3.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold border border-indigo-400/30 shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-98"
      >
        <PlusCircle className="w-4 h-4" />
        <span>새 설교 등록 &amp; AI 정밀 코칭</span>
      </button>

      {/* 누적 설교 리스트 */}
      <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1">
        {sermons.map((sermon, idx) => {
          const isActive = sermon.meta.id === activeSermonId;
          const speechScore = sermon.metrics.find((m) => m.category.includes('스피치'))?.score || 90;

          return (
            <div
              key={sermon.meta.id}
              onClick={() => onSelectSermon(sermon)}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative group ${
                isActive
                  ? 'bg-slate-800/95 border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    #{sermons.length - idx}회차
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {sermon.meta.date}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                    {sermon.averageScore}점
                  </span>
                  {sermons.length > 1 && (
                    <button
                      onClick={(e) => onDeleteSermon(sermon.meta.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-400 transition-opacity"
                      title="이 설교 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                {sermon.meta.sermonTitle}
              </h4>

              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[170px] text-indigo-300/90 font-medium">
                  {sermon.meta.scriptureRef}
                </span>
                <span className="text-slate-400 text-[10px]">
                  스피치 {speechScore}점
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
