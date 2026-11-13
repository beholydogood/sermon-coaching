import { useState } from 'react';
import { X, BookOpen, Sparkles, Copy, Check, Lightbulb } from 'lucide-react';
import { ScriptureVerse, SermonMeta } from '../types/sermon';
import { SCRIPTURE_VERSES } from '../data/sermonData';

interface ScriptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses?: ScriptureVerse[];
  meta?: SermonMeta;
}

export const ScriptureModal: React.FC<ScriptureModalProps> = ({
  isOpen,
  onClose,
  verses = SCRIPTURE_VERSES,
  meta,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyScripture = () => {
    const fullText = verses
      .map(
        (v) =>
          `[${meta?.scriptureRef || '본문 말씀'} ${v.verse}절]\n${v.koreanText}\n- 원어 키워드: ${v.greekOrHebrewKeyword || '원어 맥락'}\n- 신학적 의미: ${v.originalMeaning || ''}\n- 목회적 설교 포인트: ${v.pastoralPoint}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 sm:p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>설교 본문 구절 및 성경 원어 강해 가이드</span>
                <span className="text-xs text-amber-400 font-mono">
                  {meta?.scriptureRef || '로마서 8:28-30'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {meta?.churchName} | {meta?.sermonTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyScripture}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>본문 전체 복사</span>
                </>
              )}
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {verses.map((v) => (
            <div
              key={v.verse}
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start space-x-2.5 mb-2">
                <span className="w-6 h-6 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                  {v.verse}
                </span>
                <p className="text-sm font-bold text-slate-100 leading-relaxed">
                  {v.koreanText}
                </p>
              </div>

              {v.greekOrHebrewKeyword && (
                <div className="ml-8 mb-2 px-2.5 py-1.5 rounded-md bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-xs font-mono">
                    {v.greekOrHebrewKeyword}
                  </span>
                  <span className="text-slate-400 text-xs">—</span>
                  <span className="text-slate-300 text-xs">{v.originalMeaning}</span>
                </div>
              )}

              <div className="ml-8 mt-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start space-x-2 text-slate-300">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-amber-300">목회적 설교 포인트: </span>
                  {v.pastoralPoint}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
