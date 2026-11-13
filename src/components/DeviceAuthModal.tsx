import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Building2,
  UserCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { verifyAndAuthorizeDevice } from '../utils/auth';
import { DeviceAuthInfo } from '../types/sermon';

interface DeviceAuthModalProps {
  isOpen: boolean;
  onAuthorized: (info: DeviceAuthInfo) => void;
}

export const DeviceAuthModal: React.FC<DeviceAuthModalProps> = ({
  isOpen,
  onAuthorized,
}) => {
  const [licenseKey, setLicenseKey] = useState('SERMON-VIP-2026');
  const [pastorName, setPastorName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!licenseKey.trim()) {
      setErrorMsg('발급받으신 기기 인가 라이선스 키를 입력해 주세요.');
      return;
    }

    if (!pastorName.trim() || !churchName.trim()) {
      setErrorMsg('목회자 성함과 소속 교회명을 입력해 주세요.');
      return;
    }

    const res = verifyAndAuthorizeDevice(licenseKey, pastorName, churchName);
    if (res.success && res.authInfo) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        onAuthorized(res.authInfo!);
      }, 600);
    } else {
      setErrorMsg(res.message);
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
            인가된 기기 전용 보안 인증
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            AI 설교 코칭 스튜디오는 허가된 목회자 및 사역자의 기기에 한하여 안전하게 등록 및 사용하실 수 있습니다.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
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
              <span>정식 기기 인가 라이선스 키</span>
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="예: SERMON-VIP-2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-amber-400 transition-colors uppercase tracking-wider"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>인가 목회자 성함</span>
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
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs border border-amber-300 shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>본 기기 인가 등록 및 스튜디오 실행</span>
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            등록 후에는 상단 헤더의 [이름·교회 수정] 버튼에서 언제든 변경하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
