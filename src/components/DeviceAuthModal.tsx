import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Building2,
  UserCheck,
  Check,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { verifyAndAuthorizeDeviceAsync } from '../utils/auth';
import { DeviceAuthInfo } from '../types/sermon';

interface DeviceAuthModalProps {
  isOpen: boolean;
  onAuthorized: (info: DeviceAuthInfo) => void;
}

export const DeviceAuthModal: React.FC<DeviceAuthModalProps> = ({
  isOpen,
  onAuthorized,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 초대 링크(/?key=SERMON-XXXX)로 접속한 경우 자동으로 키와 관리자 등록 성함·교회명 채우기!
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const invitedKey = params.get('key')?.trim();
    if (invitedKey) {
      setLicenseKey(invitedKey.toUpperCase());
      lookupRegisteredInfo(invitedKey);
    }
  }, [isOpen]);

  const lookupRegisteredInfo = async (rawKey: string) => {
    const clean = rawKey.trim().toUpperCase();
    if (clean.length < 6) {
      setLookupHint(null);
      return;
    }
    try {
      const res = await fetch(`/api/auth/lookup-key?key=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.pastorName && !pastorName) setPastorName(data.pastorName);
          if (data.churchName && !churchName) setChurchName(data.churchName);
          setLookupHint(
            `등록 확인됨: ${data.pastorName} (${data.churchName}) · 기기 ${data.registeredCount}/${data.maxDevices}대 사용 중`
          );
          setErrorMsg(null);
        }
      } else {
        setLookupHint(null);
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!licenseKey.trim()) {
      setErrorMsg('관리자로부터 발급받으신 라이선스 키를 입력해 주세요.');
      return;
    }

    if (!pastorName.trim() || !churchName.trim()) {
      setErrorMsg('목회자 성함과 소속 교회명을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyAndAuthorizeDeviceAsync(licenseKey, pastorName, churchName);
      if (res.success && res.authInfo) {
        setSuccessMsg(res.message);
        // URL에 ?key= 파라미터가 있었다면 깔끔하게 정리
        if (window.location.search.includes('key=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        setTimeout(() => {
          onAuthorized(res.authInfo!);
        }, 500);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-7 relative">
        {/* 상단 보안 엠블럼 */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            목회자 전용 스튜디오 기기 인증
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            관리자로부터 발급받으신 라이선스 키를 입력하시면 본 기기(PC·태블릿)가 정식 등록됩니다.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {lookupHint && !errorMsg && !successMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-[11px] flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>{lookupHint}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>발급받은 라이선스 키</span>
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setLicenseKey(v);
                if (v.length >= 10) lookupRegisteredInfo(v);
              }}
              onBlur={() => lookupRegisteredInfo(licenseKey)}
              placeholder="예: SERMON-XXXX-1234"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-amber-400 transition-colors uppercase tracking-wider"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>목회자 성함</span>
              </label>
              <input
                type="text"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                placeholder="예: 홍길동 목사"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>소속 교회/사역지</span>
              </label>
              <input
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="예: 사랑의교회"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs border border-amber-300 shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>중앙 서버 라이선스 확인 중...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>본 기기 인가 등록 및 스튜디오 시작</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>등록 후 상단 [이름·교회 수정] 가능</span>
          <a
            href="/admin"
            className="text-slate-500 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>관리자앱 이동</span>
          </a>
        </div>
      </div>
    </div>
  );
};
