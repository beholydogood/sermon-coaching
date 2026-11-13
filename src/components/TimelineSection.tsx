import React, { useState } from 'react';
import { Play, Quote, Award, Lightbulb, Compass, Filter } from 'lucide-react';
import { HomileticTimelineItem } from '../types/sermon';

interface TimelineSectionProps {
  currentTimestamp: number;
  onSeek: (seconds: number) => void;
  customTimeline?: HomileticTimelineItem[];
  // 하위 호환 props (App.tsx에서 넘길 때)
  timeline?: HomileticTimelineItem[];
  currentSeconds?: number;
  onSeekTo?: (seconds: number) => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = (props) => {
  const {
    customTimeline,
    timeline,
    currentTimestamp,
    currentSeconds,
    onSeek,
    onSeekTo,
  } = props;

  // 여러 prop 이름에 대응
  const items = timeline || customTimeline || [];
  const activeSec = currentSeconds ?? currentTimestamp ?? 0;
  const handleSeek = onSeekTo ?? onSeek;

  const [filter, setFilter] = useState<string>('all');

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'intro') return item.type === 'intro';
    if (filter === 'theory') return item.type === 'theory' || item.type === 'exegesis' || item.type === 'scripture';
    if (filter === 'case') return item.type === 'case' || item.type === 'illustration';
    if (filter === 'interaction') return item.type === 'interaction' || item.type === 'application';
    if (filter === 'action') return item.type === 'action' || item.type === 'prayer';
    return item.type === filter;
  });

  const getBadgeStyle = (type: HomileticTimelineItem['type']) => {
    switch (type) {
      case 'intro':
        return 'background:#1e3a5f;color:#93c5fd;border:1px solid #3b82f640';
      case 'theory':
      case 'exegesis':
      case 'scripture':
        return 'background:#2e1a4a;color:#c084fc;border:1px solid #a855f740';
      case 'case':
      case 'illustration':
        return 'background:#14342b;color:#6ee7b7;border:1px solid #10b98140';
      case 'interaction':
      case 'application':
        return 'background:#3a2a0a;color:#fcd34d;border:1px solid #f59e0b40';
      case 'action':
      case 'prayer':
        return 'background:#3a1a1a;color:#fca5a5;border:1px solid #ef444440';
      default:
        return 'background:#1e293b;color:#94a3b8;border:1px solid #33415540';
    }
  };

  const getTypeText = (type: HomileticTimelineItem['type']) => {
    switch (type) {
      case 'intro':       return '오프닝 & 라포';
      case 'scripture':   return '본문 선포';
      case 'theory':
      case 'exegesis':    return '핵심 주해';
      case 'case':
      case 'illustration':return '임팩트 스토리';
      case 'interaction':
      case 'application': return '삶의 적용';
      case 'action':
      case 'prayer':      return '결단 & 기도';
      default:            return type;
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b', padding: 32, textAlign: 'center', color: '#475569' }}>
        <Compass style={{ width: 32, height: 32, margin: '0 auto 12px', color: '#334155' }} />
        <p style={{ fontSize: 14 }}>타임라인 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b', padding: '20px 20px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid #1e293b', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Compass style={{ width: 20, height: 20, color: '#818cf8' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>설교 전개 타임라인 & 교수법 구간 분석</h2>
        </div>

        {/* 필터 칩 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          <span style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
            <Filter style={{ width: 11, height: 11 }} /> 분류:
          </span>
          {[
            { id: 'all',         label: `전체 (${items.length})` },
            { id: 'intro',       label: '오프닝' },
            { id: 'theory',      label: '주해' },
            { id: 'case',        label: '사례' },
            { id: 'interaction', label: '적용' },
            { id: 'action',      label: '결단' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                whiteSpace: 'nowrap',
                fontWeight: filter === btn.id ? 700 : 400,
                background: filter === btn.id ? '#4f46e5' : '#1e293b',
                color: filter === btn.id ? '#fff' : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 타임라인 아이템 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredItems.map((item) => {
          const isSelected = Math.abs(activeSec - item.seconds) < 30;
          const noteText = item.homileticNote || item.pedagogyNote || '설교학적 구조 분석';
          return (
            <div
              key={item.id}
              style={{
                borderRadius: 12,
                border: isSelected ? '1px solid #4f46e5' : '1px solid #1e293b',
                padding: 16,
                background: isSelected ? 'rgba(79,70,229,0.08)' : 'rgba(30,41,59,0.4)',
                boxShadow: isSelected ? '0 0 0 2px rgba(79,70,229,0.2)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {/* 상단 뱃지 + 제목 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleSeek(item.seconds)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 8,
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
                      color: '#fcd34d', fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    title="이 구간 영상 재생"
                  >
                    <Play style={{ width: 11, height: 11, color: '#fbbf24' }} />
                    <span>{item.timeDisplay}</span>
                  </button>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, ...Object.fromEntries(getBadgeStyle(item.type).split(';').filter(Boolean).map(s => { const [k,v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_,c)=>c.toUpperCase()), v?.trim()]; })) }}>
                    {getTypeText(item.type)}
                  </span>
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, flex: 1, minWidth: 150 }}>
                  {item.title}
                </h3>
              </div>

              {/* 요약 */}
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 10px' }}>
                {item.summary}
              </p>

              {/* 명언 / 선포문 */}
              {item.quote && (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.8)', borderLeft: '2px solid #818cf8', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Quote style={{ width: 13, height: 13, color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 11, fontStyle: 'italic', color: '#c7d2fe', lineHeight: 1.6 }}>"{item.quote}"</span>
                </div>
              )}

              {/* 하단: 설교학 분석 + 전달 코칭 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, paddingTop: 10, borderTop: '1px solid #1e293b80' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(15,23,42,0.4)', padding: 10, borderRadius: 8, border: '1px solid #1e293b50' }}>
                  <Award style={{ width: 15, height: 15, color: '#34d399', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6ee7b7', display: 'block', marginBottom: 3 }}>설교학 분석 (Homiletics)</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{noteText}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(15,23,42,0.4)', padding: 10, borderRadius: 8, border: '1px solid #1e293b50' }}>
                  <Lightbulb style={{ width: 15, height: 15, color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fcd34d', display: 'block', marginBottom: 3 }}>스피치 & 전달력 코칭</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{item.deliveryTip}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
