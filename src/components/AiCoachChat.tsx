import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  HelpCircle,
  BookOpen,
  Mic,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { ChatMessage, SermonRecord } from '../types/sermon';
import { getPersonalGeminiApiKey } from '../utils/auth';

interface AiCoachChatProps {
  sermon?: SermonRecord;
}

export const AiCoachChat: React.FC<AiCoachChatProps> = ({ sermon }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `목사님, 반갑습니다. 대한민국 설교학(Homiletics) & 스피치 전문 AI 코칭 멘토입니다.

현재 분석 중인 **「${sermon?.meta?.sermonTitle || '주일 강해 설교'}」**(${sermon?.meta?.scriptureRef || '본문'})에 대해 어떤 점이든 편하게 물어보세요:

1. **도입부 후크(Hook)**: 성도들의 고단한 현실과 마음을 단 1분 만에 여는 오프닝 질문
2. **스피치 습관 교정**: 무의식적인 추임새("이제...", "할렐루야") 절제 및 시선 처리 드릴
3. **거룩한 침묵(Sacred Pause)**: 핵심 명제 선포 후 감동의 여운을 주는 호흡법
4. **소그룹 적용**: 성도들이 직장과 가정에서 나눌 수 있는 실제적 예화 추천`,
      timestamp: '방금 전',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-gemini-key': getPersonalGeminiApiKey(),
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-6),
          sermonContext: sermon?.meta,
        }),
      });

      const data = await response.json();
      const replyText =
        data.reply ||
        '목사님, 귀한 질문 감사드립니다. 설교학적으로 본문의 중심 명제를 명확히 선포하신 뒤, 성도들의 현실적인 삶의 자리와 연결하는 적용을 1문장 더 강조하시면 은혜의 잔상이 더욱 깊어집니다.';

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '죄송합니다. 잠시 통신이 원활하지 않습니다. 잠시 후 다시 질문해 주세요.',
          timestamp: '방금 전',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setInput(q);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-[650px] shadow-xl overflow-hidden">
      {/* 챗봇 헤더 */}
      <div className="p-3.5 sm:p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>AI 설교학 & 스피치 멘토 코치</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400">
              Gemini 3.8 Flash 기반 목회자 1:1 맞춤 설교 코칭
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/30">
          실시간 코칭
        </div>
      </div>

      {/* 대화 메시지 영역 */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs shadow-md'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-xs shadow-inner'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              <div
                className={`text-[10px] text-right font-mono ${
                  m.role === 'user' ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-indigo-400 bg-slate-800/60 p-3 rounded-xl w-fit">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">설교학 코칭 멘토가 답변을 작성 중입니다...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* 추천 빠른 질문 칩들 */}
      <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 overflow-x-auto flex items-center space-x-1.5 shrink-0">
        {[
          '도입부에서 성도들 시선을 사로잡는 오프닝 질문',
          '설교 중 "이제..." 같은 추임새 줄이는 훈련법',
          '본문 핵심 명제 선포 후 거룩한 침묵(Sacred Pause) 팁',
          '다음 주 설교를 위한 3가지 목회적 실천',
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickQuestion(chip)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] border border-slate-700 whitespace-nowrap transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 메시지 입력창 */}
      <form onSubmit={handleSend} className="p-3 bg-slate-850 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="설교 도입부, 스피치 습관, 예화 등에 대해 질문하세요..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-40 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
