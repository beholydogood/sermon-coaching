import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserCheck,
  Building2,
  Laptop,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lock,
  Smartphone,
} from 'lucide-react';
import { DeviceAuthInfo } from '../types/sermon';

interface DeviceAuthGateProps {
  deviceId: string;
  appVersion: string;
  onAuthorized: (authInfo: DeviceAuthInfo) => void;
}

export const DeviceAuthGate: React.FC<DeviceAuthGateProps> = ({
  deviceId,
  appVersion,
  onAuthorized,
}) => {
  const [licenseKey, setLicenseKey] = useState('SERMON-VIP-2026');
  const [pastorName, setPastorName] = useState('이은혜 담임목사');
  const [churchName, setChurchName] = useState('은혜의빛교회');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickPresets = [
    {
      label: 'VIP 담임목사 키 (SERMON-VIP-2026)',
      key: 'SERMON-VIP-2026',
      pastor: '이은혜 담임목사',
      church: '은혜의빛교회',
    },
    {
      label: '설교코칭 아카데미 키 (GRACE-COACH-777)',
      key: 'GRACE-COACH-777',
      pastor: '김선교 목사',
      church: '새소망전원교회',
    },
    {
      label: '총괄 관리자 마스터 키 (ADMIN-MASTER-2026)',
      key: 'ADMIN-MASTER-2026',
      pastor: '총괄 관리자',
      church: '중앙 코칭 & 출판 본부',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setErrorMsg('관리자로부터 발급받은 인가 라이선스 키를 입력해 주세요.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim().toUpperCase(),
          pastorName: pastorName.trim() || '담임목사',
          churchName: churchName.trim() || '섬기는교회',
          deviceId,
          deviceLabel: `${navigator.platform || 'PC'} (${new Date().toLocaleDateString('ko-KR')})`,
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (data.success && data.authInfo) {
        onAuthorized(data.authInfo);
      } else {
        setErrorMsg(data.error || '유효하지 않거나 차단된 라이선스 키입니다.');
      }
    } catch (err) {
      // 오프라인 또는 서버 미응답 시 기본 마스터 키 폴백 허용
      const cleanKey = licenseKey.trim().toUpperCase();
      if (
        ['SERMON-VIP-2026', 'GRACE-COACH-777', 'PASTOR-ALPHA-2026', 'ADMIN-MASTER-2026'].includes(
          cleanKey
        )
      ) {
        onAuthorized({
          isAuthorized: true,
          licenseKey: cleanKey,
          pastorName: pastorName.trim() || '이은혜 담임목사',
          churchName: churchName.trim() || '은혜의빛교회',
          role: cleanKey === 'ADMIN-MASTER-2026' ? 'admin' : 'pastor',
          deviceId,
          authorizedAt: new Date().toISOString(),
        });
      } else {
        setErrorMsg('라이선스 인증 서버와 통신할 수 없습니다. 인가 키를 확인해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Top Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>허가된 목회자 전용 기기 보안 인증</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              배포 버전 v{appVersion}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            AI 설교 코칭 & 도서집필 스튜디오
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            중앙 관리자로부터 사용 허가를 받은 목회자님의 기기(PC·태블릿·스마트폰)만 등록하여 설치 및 사용하실 수 있습니다.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Demo Fill */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>원클릭 인가 키 자동 입력 (즉시 접속용)</span>
              </span>
              <span className="text-[10px] text-slate-400">클릭 시 자동 입력됩니다</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setLicenseKey(preset.key);
                    setPastorName(preset.pastor);
                    setChurchName(preset.church);
                    setErrorMsg(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                    licenseKey === preset.key
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* License Key Input */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>발급받은 정식 인가 라이선스 키 *</span>
            </label>
            <input
              type="text"
              required
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="예: SERMON-VIP-2026"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-bold text-amber-300 tracking-wider placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Pastor & Church */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>목사님 / 사용자 성함</span>
              </label>
              <input
                type="text"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                placeholder="예: 이은혜 담임목사"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>섬기시는 교회 / 기관명</span>
              </label>
              <input
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="예: 은혜의빛교회"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Device Binding Info */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start space-x-3 text-[11px] text-slate-400">
            <Laptop className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-slate-200 font-semibold flex items-center gap-2">
                <span>현재 기기 고유 식별 번호:</span>
                <code className="text-amber-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {deviceId}
                </code>
              </div>
              <p className="leading-relaxed">
                인증 완료 시 현재 사용 중인 기기가 정식 인가 기기로 등록되며, 상단 메뉴의{' '}
                <strong className="text-indigo-300">[내 기기에 앱 설치]</strong>를 통해 바탕화면에 전용 앱으로 설치하실 수 있습니다.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-99"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? '기기 인가 확인 중...' : '이 기기 정식 인증하고 스튜디오 입장하기'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
