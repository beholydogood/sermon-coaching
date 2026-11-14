import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#020617',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 460,
              width: '100%',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              화면 최신 모듈을 다시 불러옵니다
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
              업데이트 직후 브라우저 캐시 충돌이 감지되었습니다 ({this.state.errorMsg}). 아래 버튼을 누르면 최신 화면으로 즉시 복구됩니다.
            </p>
            <button
              onClick={async () => {
                try {
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                  }
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                } catch {
                  // ignore
                }
                window.location.href = `${window.location.pathname}?v=${Date.now()}`;
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: '#4f46e5',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              최신 화면 즉시 다시 열기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
