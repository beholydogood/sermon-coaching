import React, { useState } from 'react';
import {
  X,
  Bell,
  Sparkles,
  KeyRound,
  RotateCw,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Mic,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { hasPersonalGeminiApiKey } from '../utils/auth';

interface NoticeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKeySettings: () => void;
}

export const NoticeBoardModal: React.FC<NoticeBoardModalProps> = ({
  isOpen,
  onClose,
  onOpenKeySettings,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const hasKey = hasPersonalGeminiApiKey();

  if (!isOpen) return null;

  // 브라우저 Service Worker 및 캐시를 완전히 비우고 최신 배포본으로 강제 새로고침
  const handleForceUpdateAndClearCache = async () => {
    setIsRefreshing(true);
    try {
      // 1. 모든 CacheStorage 비우기
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 2. 등록된 모든 Service Worker 등록 해제
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }

      // 3. sessionStorage 정리
      sessionStorage.clear();

      setRefreshDone(true);

      // 4. 캐시 무효화 타임스탬프와 함께 강제 새로고침
      setTimeout(() => {
        const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
        window.location.href = cleanUrl;
      }, 700);
    } catch (err) {
      console.error('캐시 초기화 실패:', err);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* 상단 헤더 */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-md">
              <Bell className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">스튜디오 공지 &amp; 업데이트</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 border border-indigo-400/40 text-indigo-300">
                  v2.5.2 최신 배포
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">최신 기능 확인 및 캐시 초기화 새로고침 센터</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* ⚡ 최신 버전 적용 퀵 액션 카드 */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 space-y-3 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-indigo-200 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>새 기능이 바로 보이지 않으시나요?</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  브라우저의 이전 임시 캐시(PWA)가 남아있을 경우 최신 화면이 즉시 반영되지 않을 수 있습니다.
                  아래 버튼을 누르면 이전 캐시를 완전히 비우고 최신 버전(v2.5.2)으로 즉시 갱신됩니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleForceUpdateAndClearCache}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{refreshDone ? '새로고침 적용 중...' : isRefreshing ? '캐시 삭제 중...' : '최신 버전 즉시 새로고침 (캐시 초기화)'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenKeySettings();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  hasKey
                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/40'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{hasKey ? '내 개인 API 키 확인/수정' : '🔑 개인 Gemini API 키 등록'}</span>
              </button>
            </div>
          </div>

          {/* 📢 공지 1: 최신 v2.5.2 릴리즈 상세 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                v2.5.2 업데이트 안내 (현재 배포본)
              </span>
              <span className="text-xs text-slate-400">2026년 11월</span>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              
              {/* 항목 1: 개인 API 키 (방식 B) */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>1. 목회자 개인 Google Gemini API 키 연동 (방식 B)</span>
                </div>
                <p className="text-slate-300 pl-6">
                  • 다른 목회자와 분당 API 요청수(할당량)를 공유하지 않고, 목회자 본인의 무료 구글 키로 영상 분석 및 AI 코칭을 독립적으로 무제한 실행합니다.
                </p>
                <p className="text-slate-300 pl-6">
                  • <b>최신 키 규격 지원:</b> 구글의 신규 키 규격인 <code className="text-amber-300 font-mono">AQ.Ab8RN6...</code> 및 기존 <code className="text-amber-300 font-mono">AIzaSy...</code> 키를 모두 지원합니다.
                </p>
                <p className="text-slate-300 pl-6">
                  • <b>차세대 AI 모델 자동 탑재:</b> 구글이 최근 2.5 버전을 신규 발급자 대상 단종함에 따라, 최신 <code className="text-indigo-300 font-mono">gemini-3.8-flash</code> 모델로 자동 연동되어 404 오류 없이 즉시 테스트 및 분석이 가능합니다.
                </p>
              </div>

              {/* 항목 2: 다중 기기 실시간 동기화 */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Laptop className="w-4 h-4 text-cyan-400" />
                  <span>2. 다중 기기 실시간 설교 아카이브 동기화</span>
                </div>
                <p className="text-slate-300 pl-6">
                  • 스마트폰, 아이패드, 노트북, 교회 데스크톱 등 다른 기기에서 접속하더라도 <b>동일한 라이선스 계정</b>으로 로그인하시면 등록하신 모든 설교 영상과 AI 코칭 분석 내역이 자동으로 상호 동기화됩니다.
                </p>
              </div>

              {/* 항목 3: 스피치 딜리버리 & 보컬 코칭 v1.3 */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Mic className="w-4 h-4 text-purple-400" />
                  <span>3. 스피치 딜리버리 &amp; 보컬 코칭 v1.3</span>
                </div>
                <p className="text-slate-300 pl-6">
                  • 상단 두 번째 탭 <b>[스피치 딜리버리 &amp; 보컬 코칭]</b>에서 김우준 목사 등 26개 설교학 기준 표본 라이브러리와 설교자의 4축 맥락(도입/설명/예화/결단)을 비교 진단합니다.
                </p>
                <p className="text-slate-300 pl-6">
                  • 긴 설교 전체를 다 보지 않아도 원하는 특정 발화 구간(30초~3분)만 콕 집어 AI 정밀 진단을 실행할 수 있습니다.
                </p>
              </div>

              {/* 항목 4: 헤더 바로가기 */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>4. 상단 헤더에 [📢 공지] 및 [🔑 개인 AI 키] 상시 버튼 탑재</span>
                </div>
                <p className="text-slate-300 pl-6">
                  • 복잡한 메뉴를 찾으실 필요 없이, 상단 헤더의 <b className="text-white">📢 공지</b> 버튼으로 언제든 업데이트 내역을 확인하고 최신 버전으로 새로고침할 수 있습니다.
                </p>
              </div>

            </div>
          </div>

          {/* 💡 Google AI Studio 키 발급 안내 */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Google Gemini API 키가 아직 없으신가요? (무료 1분 발급)</span>
            </h4>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              Google AI Studio에서 구글 계정으로 로그인 후 <b>[Create API key]</b>를 누르시면 신용카드 등록 없이 무료로 키가 발급됩니다.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
              >
                <span>Google AI Studio 키 발급 바로가기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-slate-500">•</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenKeySettings();
                }}
                className="text-xs text-amber-400 hover:text-amber-300 hover:underline font-semibold cursor-pointer"
              >
                발급받은 키 등록 창 열기 →
              </button>
            </div>
          </div>

        </div>

        {/* 하단 푸터 */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">Sermon Coaching Studio Build 252</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
