import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bell,
  Sparkles,
  KeyRound,
  RotateCw,
  ExternalLink,
  Laptop,
  Mic,
  BookMarked,
  Pin,
  Calendar,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { hasPersonalGeminiApiKey } from '../utils/auth';

interface NoticeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKeySettings: () => void;
}

interface NoticePost {
  id: number;
  category: '필독 공지' | '업데이트' | '가이드' | '출시 안내';
  isPinned?: boolean;
  title: string;
  date: string;
  version: string;
  summary: string;
  blocks: Array<{
    heading: string;
    bullets: string[];
  }>;
}

const NOTICE_POSTS: NoticePost[] = [
  {
    id: 4,
    category: '필독 공지',
    isPinned: true,
    title: '[v2.5.2 최신 배포] 스피치 마스터 정밀 코칭 · 다중 도서 집필 스튜디오 · 실시간 동기화 업데이트',
    date: '2026. 11. 15',
    version: 'v2.5.2',
    summary:
      '스피치 딜리버리 & 보컬 코칭 상단 대시보드 복원 및 하단 스피치 마스터 정밀 코칭(1~5번) 개편, 다중 도서 프로젝트 동시 집필 스튜디오, 공지사항 전용 게시판이 적용되었습니다.',
    blocks: [
      {
        heading: '1. 스피치 딜리버리 & 보컬 코칭 구성 개편',
        bullets: [
          '상단 기본 메뉴 복원: 4대 핵심 지표(시선 배분 안정도, 제스처 자연스러움, 발성 및 억양 완급, 설교 스피치 템포), 설교자 스피치 탁월한 강점, 무의식적 습관 & 단점 코칭이 상단에 표시됩니다.',
          '하단 [스피치 마스터 정밀 코칭] 탑재: 1) 대상 설교자 및 실제 설교 적격 구간 선별, 2) 실제 장면 관찰 사실·전달 기능 해석·목회자 사실 정정, 3) 이번 회차 3~5분 실전 교정 훈련 설계, 4) 개인별 누적 기록 및 조건부 변화 판정, 5) 설교형 스피치 참고 자료 26편이 체계적으로 제공됩니다.',
        ],
      },
      {
        heading: '2. 책 집필 스튜디오 메인 화면 전환 & 다중 도서 프로젝트 지원',
        bullets: [
          '상단 [책 집필 스튜디오] 클릭 시 팝업이 아닌 전용 메인 워크스페이스로 화면이 전환됩니다.',
          '좌측 사이드바에 [도서 집필 프로젝트] 목록이 쌓여 여러 권의 책을 동시에 기획·집필할 수 있으며, 각 프로젝트 선택 시 1단계~4단계 집필 메뉴가 연동됩니다.',
        ],
      },
      {
        heading: '3. 다중 기기 실시간 설교 아카이브 동기화 & 최신 Gemini 3.8 지원',
        bullets: [
          '동일한 라이선스 계정으로 접속 시 스마트폰, 태블릿, PC 어디서나 등록한 설교 및 코칭 내역이 실시간으로 동기화됩니다.',
          'Google AI Studio의 신규 키 규격(AQ.Ab8RN6... 및 AIzaSy...)과 차세대 gemini-3.8-flash 모델을 완벽 지원합니다.',
        ],
      },
    ],
  },
  {
    id: 3,
    category: '가이드',
    isPinned: true,
    title: '목회자 개인 Google Gemini API 키(방식 B) 1분 무료 발급 및 등록 안내',
    date: '2026. 11. 14',
    version: 'v2.5.2',
    summary:
      '다른 사용자와 분당 API 요청 한도를 공유하지 않고, 목회자 본인 전용 무료 키로 안정적인 AI 심층 분석을 사용하는 방법입니다.',
    blocks: [
      {
        heading: '발급 및 등록 절차 (약 1분 소요)',
        bullets: [
          '1단계: Google AI Studio (https://aistudio.google.com/apikey) 에 구글 계정으로 로그인합니다.',
          '2단계: 우측 상단 [API 키 만들기 (Create API key)] 버튼을 눌러 발급된 키(AQ... 또는 AIzaSy...)를 복사합니다.',
          '3단계: 스튜디오 상단 목회자 성함/교회명을 클릭하거나 아래 [개인 API 키 설정 열기] 버튼을 눌러 복사한 키를 붙여넣고 [연결 테스트] 후 저장합니다.',
        ],
      },
    ],
  },
  {
    id: 2,
    category: '업데이트',
    isPinned: false,
    title: '다른 디바이스(PC · 태블릿 · 스마트폰) 동일 계정 설교 내역 자동 동기화 안내',
    date: '2026. 11. 14',
    version: 'v2.5.1',
    summary:
      '교회 데스크톱에서 등록한 설교를 자택 노트북이나 아이패드에서도 동일하게 열람할 수 있도록 계정 기반 서버 동기화가 적용되었습니다.',
    blocks: [
      {
        heading: '주요 동기화 기능',
        bullets: [
          '동일한 인가 라이선스 키로 로그인된 모든 기기 간에 설교 아카이브가 실시간 병합·동기화됩니다.',
          '새 설교를 등록하거나 삭제하면 서버 안전 저장소에 즉시 반영되며, 다른 기기에서 창을 열면 자동으로 최신 목록이 표시됩니다.',
        ],
      },
    ],
  },
  {
    id: 1,
    category: '출시 안내',
    isPinned: false,
    title: 'AI 설교 코칭 & 도서 출판 스튜디오 v2.5 정식 오픈 안내',
    date: '2026. 11. 10',
    version: 'v2.5.0',
    summary:
      '설교학 4대 진단, 스피치 딜리버리 코칭, AI 설교 코치 1:1 상담, 구역 나눔 질문 생성 및 도서 집필 스튜디오가 통합 탑재되었습니다.',
    blocks: [
      {
        heading: '핵심 제공 기능',
        bullets: [
          '유튜브 설교 링크 등록 시 본문 말씀·설교 시작 시점 자동 감지 및 타임라인 정밀 진단',
          '누적 설교 피드백 아카이브 및 회차별 설교 성장 종합 보고서 제공',
          '강단 구어체 설교를 출판용 문어체 원고로 변환하는 도서 집필 스튜디오 탑재',
        ],
      },
    ],
  },
];

export const NoticeBoardModal: React.FC<NoticeBoardModalProps> = ({
  isOpen,
  onClose,
  onOpenKeySettings,
}) => {
  const [selectedPostId, setSelectedPostId] = useState<number>(NOTICE_POSTS[0].id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const hasKey = hasPersonalGeminiApiKey();

  if (!isOpen || typeof document === 'undefined') return null;

  const selectedPost = NOTICE_POSTS.find((p) => p.id === selectedPostId) || NOTICE_POSTS[0];

  // 브라우저 Service Worker 및 캐시를 완전히 비우고 최신 배포본으로 강제 새로고침
  const handleForceUpdateAndClearCache = async () => {
    setIsRefreshing(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      sessionStorage.clear();
      setRefreshDone(true);

      setTimeout(() => {
        const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
        window.location.href = cleanUrl;
      }, 600);
    } catch (err) {
      console.error('캐시 초기화 실패:', err);
      window.location.reload();
    }
  };

  const getCategoryStyle = (cat: NoticePost['category']) => {
    switch (cat) {
      case '필독 공지':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case '업데이트':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case '가이드':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case '출시 안내':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col overflow-y-auto">
      {/* ─── 상단 고정 게시판 헤더 바 ─── */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  스튜디오 공지사항 &amp; 업데이트 게시판
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950">
                  최신 v2.5.2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                새로운 기능 업데이트 내역을 확인하고 최신 버전을 즉시 적용할 수 있습니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleForceUpdateAndClearCache}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {refreshDone
                  ? '최신 버전 새로고침 중...'
                  : isRefreshing
                  ? '캐시 초기화 중...'
                  : '최신 버전 즉시 새로고침 (캐시 초기화)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>스튜디오로 돌아가기</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 게시판 본문 영역 (좌측 게시글 목록 + 우측 선택 공지 상세 열람) ─── */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 좌측: 공지 게시판 목록 (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <span className="text-xs font-extrabold text-white flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>전체 공지 목록 ({NOTICE_POSTS.length}건)</span>
              </span>
              <span className="text-[11px] text-slate-400">최신순 정렬</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {NOTICE_POSTS.map((post) => {
                const isSelected = post.id === selectedPost.id;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPostId(post.id)}
                    className={`w-full text-left p-4 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/50 border-l-4 border-l-amber-400'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getCategoryStyle(
                            post.category
                          )}`}
                        >
                          {post.category}
                        </span>
                        <span className="text-[11px] font-mono text-indigo-300 font-semibold">
                          {post.version}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {post.date}
                        </span>
                      </div>
                      <h3
                        className={`text-xs sm:text-sm font-bold leading-snug ${
                          isSelected ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {post.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {post.summary}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 ${
                        isSelected ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 우측: 선택된 공지사항 상세 본문 (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
            {/* 게시글 헤더 */}
            <div className="border-b border-slate-800 pb-4 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getCategoryStyle(
                      selectedPost.category
                    )}`}
                  >
                    {selectedPost.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                    버전 {selectedPost.version}
                  </span>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>게시일: {selectedPost.date}</span>
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-extrabold text-white leading-snug">
                {selectedPost.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                {selectedPost.summary}
              </p>
            </div>

            {/* 게시글 상세 섹션들 */}
            <div className="space-y-4">
              {selectedPost.blocks.map((block, bIdx) => (
                <div
                  key={bIdx}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 space-y-2.5"
                >
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{block.heading}</span>
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed pl-1">
                    {block.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* 하단 바로가기 액션 카드 */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>목회자 개인 Google Gemini API 키 설정</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  무료 키(AQ... 또는 AIzaSy...)를 등록하시면 타인과 할당량 공유 없이 독립적으로 작동합니다.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs border border-slate-700 inline-flex items-center gap-1"
                >
                  <span>무료 키 발급</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenKeySettings();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  {hasKey ? '내 API 키 확인/수정' : 'API 키 등록 창 열기'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
