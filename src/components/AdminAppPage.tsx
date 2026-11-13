import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  Building2,
  Phone,
  Mail,
  Laptop,
  Smartphone,
  Search,
  Copy,
  Check,
  Edit3,
  Trash2,
  Ban,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  LogOut,
  ExternalLink,
  Settings,
  ArrowUpCircle,
  Lock,
  Calendar,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { LicenseUser } from '../types/sermon';

const ADMIN_TOKEN_KEY = 'sermon_admin_session_token_v1';

const getDatePlusMonths = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

export const AdminAppPage: React.FC<{ onGoToStudio?: () => void }> = ({ onGoToStudio }) => {
  const [adminToken, setAdminToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'users' | 'release' | 'settings'>('users');
  const [users, setUsers] = useState<LicenseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 신규 사용자 등록 폼 상태
  const [pastorName, setPastorName] = useState('');
  const [titleRole, setTitleRole] = useState('담임목사');
  const [churchName, setChurchName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [maxDevices, setMaxDevices] = useState<number>(2);
  const [expiresAt, setExpiresAt] = useState<string>(() => getDatePlusMonths(12));
  const [customKey, setCustomKey] = useState('');
  const [memo, setMemo] = useState('');

  // 방금 생성된 사용자 하이라이트 안내
  const [justCreatedUser, setJustCreatedUser] = useState<LicenseUser | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 검색 및 필터
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');

  // 회원 정보 수정 모달 상태
  const [editingUser, setEditingUser] = useState<LicenseUser | null>(null);

  // 원격 버전 배포 상태
  const [releaseVersion, setReleaseVersion] = useState('v2.6.0');
  const [releaseTitle, setReleaseTitle] = useState('설교 시작점 정밀 재생 및 도서 자료 통합 업그레이드');
  const [releaseNotes, setReleaseNotes] = useState(
    '1. 유튜브 예배 실황 설교 시작 구간 자동 점프 재생 강화\n2. 도서 집필 시 업로드 문서(PDF/PPTX/DOCX/TXT) 본문 통합 반영\n3. 목회자 정식 라이선스 중앙 인증 연동'
  );

  // 시스템 설정 상태
  const [hasAiKey, setHasAiKey] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchUsers = async (tokenToUse = adminToken) => {
    if (!tokenToUse) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-token': tokenToUse },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminToken('');
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        setHasAiKey(Boolean(data.hasAiKey));
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchUsers(adminToken);
    }
  }, [adminToken]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, data.adminToken);
        setAdminToken(data.adminToken);
        setHasAiKey(Boolean(data.hasAiKey));
        setLoginPassword('');
      } else {
        setLoginError(data.message || '비밀번호가 일치하지 않습니다.');
      }
    } catch {
      setLoginError('서버와 통신할 수 없습니다.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken('');
  };

  // 신규 사용자 등록
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastorName.trim() || !churchName.trim()) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          licenseKey: customKey.trim() || undefined,
          pastorName: pastorName.trim(),
          titleRole,
          churchName: churchName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          maxDevices,
          expiresAt,
          memo: memo.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
        setJustCreatedUser(data.user || null);
        setPastorName('');
        setChurchName('');
        setPhone('');
        setEmail('');
        setCustomKey('');
        setMemo('');
        showToast(`✅ ${data.user?.pastorName} (${data.user?.churchName}) 등록 및 라이선스 발급 완료!`);
      } else {
        alert(data.message || '사용자 등록 실패');
      }
    } catch {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  // 카톡 초대 안내문 생성 및 복사 (원클릭 자동입력 매직 링크 포함!)
  const buildInviteMessage = (u: LicenseUser): string => {
    const baseOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'https://sermon-coaching.onrender.com';
    const magicUrl = `${baseOrigin}/?key=${encodeURIComponent(u.licenseKey)}`;
    return `[AI 설교 코칭 & 도서집필 스튜디오 정식 등록 안내]

안녕하세요, ${u.churchName} ${u.pastorName}님!
목사님 전용 AI 설교 코칭 및 도서 집필 스튜디오 계정이 발급되었습니다.

▶ 1클릭 자동 인증 접속 링크 (PC / 태블릿 겸용):
${magicUrl}

▶ 발급 정보:
• 등록 성함/교회: ${u.pastorName} (${u.churchName})
• 전용 라이선스 키: ${u.licenseKey}
• 허용 기기 대수: 최대 ${u.maxDevices}대 (PC + 아이패드/갤럭시탭 동시 등록 가능)
• 이용 유효기간: ${u.expiresAt === '2099-12-31' ? '영구 라이선스' : `${u.expiresAt}까지`}

※ 위 링크를 클릭하시면 라이선스 키와 성함·교회가 자동으로 입력됩니다. 태블릿에서는 브라우저 메뉴의 [홈 화면에 추가]를 누르시면 앱 아이콘으로 설치해 사용하실 수 있습니다.`;
  };

  const handleCopyInvite = (u: LicenseUser) => {
    navigator.clipboard.writeText(buildInviteMessage(u));
    setCopiedKey(u.licenseKey);
    showToast(`📋 ${u.pastorName}님 카카오톡 초대 안내문이 복사되었습니다!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 사용자 정보 수정 저장
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(editingUser.licenseKey)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
        setEditingUser(null);
        showToast('✅ 회원 정보가 수정되었습니다.');
      } else {
        alert(data.message || '수정 실패');
      }
    } catch {
      alert('서버 통신 오류');
    }
  };

  // 이용 차단 / 허용 토글
  const handleToggleStatus = async (u: LicenseUser) => {
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(u.licenseKey)}/toggle-status`,
        {
          method: 'POST',
          headers: { 'x-admin-token': adminToken },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
        showToast(
          data.user?.status === 'active'
            ? `✅ ${u.pastorName}님의 이용이 정상 허용되었습니다.`
            : `⛔ ${u.pastorName}님의 이용이 일시 차단되었습니다.`
        );
      }
    } catch {
      alert('상태 변경 오류');
    }
  };

  // 기기 해제
  const handleRemoveDevice = async (licenseKey: string, deviceId: string) => {
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(licenseKey)}/remove-device`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ deviceId }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
        showToast(deviceId === 'ALL' ? '등록된 모든 기기가 초기화되었습니다.' : '선택한 기기가 해제되었습니다.');
      }
    } catch {
      alert('기기 해제 오류');
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (u: LicenseUser) => {
    if (!window.confirm(`정말 [${u.pastorName} (${u.churchName})] 사용자를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.licenseKey)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
        showToast(`🗑️ ${u.pastorName} 사용자가 삭제되었습니다.`);
      } else {
        alert(data.message || '삭제 불가');
      }
    } catch {
      alert('삭제 중 오류 발생');
    }
  };

  // 엑셀(CSV) 다운로드
  const handleExportCsv = () => {
    const header = ['라이선스키', '성함', '직분', '교회명', '연락처', '이메일', '상태', '등록기기수', '허용기기수', '만료일', '등록일', '메모'];
    const rows = users.map((u) => [
      u.licenseKey,
      u.pastorName,
      u.titleRole || '',
      u.churchName,
      u.phone || '',
      u.email || '',
      u.status === 'active' ? '정상' : '차단',
      String(u.registeredDevices.length),
      String(u.maxDevices),
      u.expiresAt,
      u.createdAt,
      (u.memo || '').replace(/,/g, ' '),
    ]);
    const csvContent = '\uFEFF' + [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `목회자회원명단_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 백업 JSON 다운로드
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), users }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SermonCoaching_Users_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 백업 JSON 복원
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        const list = Array.isArray(parsed) ? parsed : parsed.users;
        if (!Array.isArray(list)) {
          alert('올바른 회원 백업 JSON 파일이 아닙니다.');
          return;
        }
        const res = await fetch('/api/admin/users/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ users: list }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setUsers(data.users || []);
          showToast(`✅ 총 ${data.count}명의 사용자 명단이 성공적으로 복원·병합되었습니다!`);
        }
      } catch {
        alert('JSON 파일 읽기에 실패했습니다.');
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  // 공지/버전 배포
  const handlePublishRelease = async () => {
    const notes = releaseNotes
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const res = await fetch('/api/release/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: releaseVersion,
          buildNumber: Date.now() % 10000,
          releaseTitle,
          releaseNotes: notes,
          mandatory: false,
        }),
      });
      if (res.ok) {
        showToast(`🚀 [${releaseVersion}] 새 버전 공지가 전체 목사님 앱에 실시간 배포되었습니다!`);
      }
    } catch {
      alert('배포 중 오류 발생');
    }
  };

  // AI 키 & 관리자 비밀번호 저장
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          geminiApiKey: geminiApiKeyInput.trim() ? geminiApiKeyInput.trim() : undefined,
          newAdminPassword: newAdminPassword.trim() ? newAdminPassword.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHasAiKey(Boolean(data.hasAiKey));
        if (newAdminPassword.trim()) {
          sessionStorage.setItem(ADMIN_TOKEN_KEY, data.adminToken);
          setAdminToken(data.adminToken);
        }
        setGeminiApiKeyInput('');
        setNewAdminPassword('');
        showToast('✅ 시스템 및 보안 설정이 저장되었습니다!');
      }
    } catch {
      alert('설정 저장 실패');
    }
  };

  // ─── 로그인 전 관리자 인증 게이트 ───
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Admin Management App
            </span>
            <h1 className="text-xl font-extrabold text-white mt-2">
              관리자앱 로그인
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              목회자 사용자 등록, 라이선스 발급 및 접속 기기 통합 관리 콘솔
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>관리자 비밀번호 (초기 기본값: admin1234)</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="관리자 비밀번호 또는 마스터 키 입력"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-emerald-400"
                required
              />
            </div>

            <button
              type="submit"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#020617' }}
              className="w-full py-3 rounded-xl font-extrabold text-xs shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>관리자앱 접속하기</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <a
              href="/"
              onClick={(e) => {
                if (onGoToStudio) {
                  e.preventDefault();
                  onGoToStudio();
                }
              }}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>목회자 설교 코칭 스튜디오 화면으로 돌아가기</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 통계 계산
  const todayStr = new Date().toISOString().split('T')[0];
  const pastorUsers = users.filter((u) => u.role !== 'admin');
  const activeCount = pastorUsers.filter((u) => u.status === 'active' && u.expiresAt >= todayStr).length;
  const blockedOrExpiredCount = pastorUsers.length - activeCount;
  const totalDevicesCount = users.reduce((acc, u) => acc + (u.registeredDevices?.length || 0), 0);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      u.pastorName.toLowerCase().includes(q) ||
      u.churchName.toLowerCase().includes(q) ||
      u.licenseKey.toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q);

    if (!matchQuery) return false;
    if (statusFilter === 'active') return u.status === 'active' && u.expiresAt >= todayStr;
    if (statusFilter === 'revoked') return u.status === 'revoked';
    if (statusFilter === 'expired') return u.expiresAt < todayStr;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 상단 관리자앱 전용 헤더 */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                관리자 전용 앱
              </span>
              <span className="text-xs text-slate-400">회원 등록 · 라이선스 · 기기 통제 센터</span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-white">
              AI 설교 코칭 스튜디오 통합 관리 시스템
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchUsers()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>

          <a
            href="/"
            onClick={(e) => {
              if (onGoToStudio) {
                e.preventDefault();
                onGoToStudio();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>스튜디오 앱 열기</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-xs text-slate-300 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      {/* 토스트 메시지 */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* 4대 핵심 현황 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
              <span>전체 등록 목회자</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5 font-mono">
              {pastorUsers.length}명
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">관리자 계정 제외</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
              <span>정상 이용 중</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1.5 font-mono">
              {activeCount}명
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">실시간 접속 인가 활성</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
              <span>차단 / 기간만료</span>
              <Ban className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400 mt-1.5 font-mono">
              {blockedOrExpiredCount}명
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">접속 제한 상태</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
              <span>등록된 PC·태블릿 기기</span>
              <Laptop className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-300 mt-1.5 font-mono">
              {totalDevicesCount}대
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">누적 인가 단말기</div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          {[
            { id: 'users', label: '목회자 사용자 등록 & 관리', icon: Users },
            { id: 'release', label: '전체 공지 & 원격 업데이트 배포', icon: ArrowUpCircle },
            { id: 'settings', label: 'AI 키 & 관리자 보안 설정', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isAct
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            탭 1: 목회자 사용자 등록 & 회원 목록 관리
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 좌측: 신규 사용자 등록 폼 (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>신규 목회자 사용자 등록</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  사용자를 등록하면 전용 라이선스 키와 1클릭 카톡 초대 링크가 즉시 발급됩니다.
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      목회자 성함 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pastorName}
                      onChange={(e) => setPastorName(e.target.value)}
                      placeholder="예: 박은총 목사"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">직분</label>
                    <select
                      value={titleRole}
                      onChange={(e) => setTitleRole(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-400"
                    >
                      <option value="담임목사">담임목사</option>
                      <option value="부목사">부목사</option>
                      <option value="강도사">강도사</option>
                      <option value="전도사">전도사</option>
                      <option value="선교사">선교사</option>
                      <option value="교수/사역자">교수/사역자</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    소속 교회 / 사역 기관명 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="예: 온누리비전교회"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">연락처 (선택)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">허용 기기 대수</label>
                    <select
                      value={maxDevices}
                      onChange={(e) => setMaxDevices(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-400"
                    >
                      <option value={1}>1대 (PC 전용)</option>
                      <option value={2}>2대 (PC + 태블릿)</option>
                      <option value={3}>3대 (VIP 다중기기)</option>
                      <option value={5}>5대 (교역자실 공용)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>이용 만료일</span>
                    <span className="flex gap-1">
                      {[
                        { label: '1개월', val: getDatePlusMonths(1) },
                        { label: '1년', val: getDatePlusMonths(12) },
                        { label: '영구', val: '2099-12-31' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setExpiresAt(p.val)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 border border-slate-700 cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </span>
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    지정 라이선스 키 (비워두면 자동 생성)
                  </label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                    placeholder="자동 생성 (예: SERMON-AB12-8490)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-mono uppercase focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">관리자 메모</label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="예: 봄 노회 세미나 신청자 / 후원 교회"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#020617' }}
                  className="w-full py-3 rounded-xl font-extrabold text-xs shadow-lg cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>신규 사용자 등록 &amp; 라이선스 키 발급</span>
                </button>
              </form>

              {/* 방금 등록된 사용자 초대장 즉시 복사 카드 */}
              {justCreatedUser && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-300">
                      🎉 {justCreatedUser.pastorName}님 발급 완료!
                    </span>
                    <button
                      type="button"
                      onClick={() => setJustCreatedUser(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-mono bg-slate-950 px-3 py-2 rounded-xl border border-emerald-500/30 text-amber-300 font-bold text-center">
                    {justCreatedUser.licenseKey}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(justCreatedUser)}
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>카카오톡/문자 초대 안내문 1클릭 복사</span>
                  </button>
                </div>
              )}
            </div>

            {/* 우측: 등록 사용자 목록 & 검색/필터/기기 제어 (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* 상단 검색·필터 & 백업 바 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="목회자 성함, 교회명, 라이선스 키, 연락처 검색..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>엑셀(CSV) 저장</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>백업(JSON)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>명단 복원</span>
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportJson}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* 상태별 필터 칩 */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {[
                    { id: 'all', label: `전체 (${users.length})` },
                    { id: 'active', label: `정상 이용중 (${activeCount})` },
                    { id: 'revoked', label: `이용 차단됨` },
                    { id: 'expired', label: `기간 만료됨` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id as any)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                        statusFilter === f.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 등록 회원 카드 리스트 */}
              <div className="space-y-3">
                {filteredUsers.map((u) => {
                  const isExpired = u.expiresAt < todayStr;
                  const isActive = u.status === 'active' && !isExpired;
                  const isAdmin = u.role === 'admin';

                  return (
                    <div
                      key={u.licenseKey}
                      className={`p-4 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          : 'bg-rose-950/15 border-rose-500/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-white">
                              {u.pastorName}
                            </span>
                            {u.titleRole && (
                              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                                {u.titleRole}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-indigo-300">
                              • {u.churchName}
                            </span>
                            {isAdmin ? (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                                관리자 마스터
                              </span>
                            ) : isActive ? (
                              <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                정상 이용중
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full">
                                {isExpired ? '기간 만료' : '이용 차단됨'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400 pt-0.5">
                            <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {u.licenseKey}
                            </span>
                            <span>
                              기기: <strong className="text-white">{u.registeredDevices.length}</strong> / {u.maxDevices}대
                            </span>
                            <span>
                              만료일: {u.expiresAt === '2099-12-31' ? '영구' : u.expiresAt}
                            </span>
                            {u.phone && <span>📞 {u.phone}</span>}
                            {u.lastLoginAt && <span>최근인증: {u.lastLoginAt}</span>}
                          </div>

                          {u.memo && (
                            <p className="text-[11px] text-slate-400 pt-0.5">📝 {u.memo}</p>
                          )}
                        </div>

                        {/* 우측 액션 버튼들 */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyInvite(u)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === u.licenseKey ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === u.licenseKey ? '복사됨!' : '초대장 복사'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingUser({ ...u })}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>수정</span>
                          </button>

                          {!isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-slate-800 hover:bg-rose-950/60 border-slate-700 text-rose-300'
                                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                                }`}
                              >
                                {u.status === 'active' ? '이용 차단' : '차단 해제'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 border border-slate-700 text-slate-400 hover:text-rose-300 cursor-pointer"
                                title="사용자 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 등록된 단말기(PC / 태블릿) 상세 표시 및 개별 해제 */}
                      {u.registeredDevices && u.registeredDevices.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold">등록된 접속 기기 ({u.registeredDevices.length}/{u.maxDevices}대)</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDevice(u.licenseKey, 'ALL')}
                              className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                            >
                              전체 기기 초기화
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {u.registeredDevices.map((dev) => (
                              <div
                                key={dev.deviceId}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {dev.deviceLabel.includes('태블릿') || dev.deviceLabel.includes('iPad') || dev.deviceLabel.includes('모바일') ? (
                                    <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  ) : (
                                    <Laptop className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  )}
                                  <div className="truncate">
                                    <span className="text-slate-200 font-semibold">{dev.deviceLabel}</span>
                                    <span className="text-slate-500 ml-1.5 text-[10px]">({dev.lastActiveAt})</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDevice(u.licenseKey, dev.deviceId)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/30 shrink-0 cursor-pointer"
                                >
                                  해제
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            탭 2: 공지 및 원격 업데이트 배포
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'release' && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-amber-400" />
                <span>전체 목회자 앱 실시간 업데이트 알림 배포</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                새 기능을 배포한 뒤 아래 버튼을 누르면 접속 중인 모든 목사님 스튜디오 상단에 업데이트 알림이 표시됩니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">배포 버전명</label>
                <input
                  type="text"
                  value={releaseVersion}
                  onChange={(e) => setReleaseVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">공지 제목</label>
                <input
                  type="text"
                  value={releaseTitle}
                  onChange={(e) => setReleaseTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-400 font-semibold mb-1">주요 업데이트 내역 (줄바꿈 구분)</label>
              <textarea
                rows={4}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <button
              type="button"
              onClick={handlePublishRelease}
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
              className="px-5 py-3 rounded-xl font-extrabold text-xs cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>전체 사용자에게 업데이트 알림 즉시 발송</span>
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            탭 3: AI 키 & 관리자 보안 설정
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs"
          >
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                <span>중앙 AI 엔진 &amp; 관리자 비밀번호 설정</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Google AI Studio에서 발급받은 무료 Gemini API 키를 등록하거나 관리자앱 접속 비밀번호를 변경합니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Google Gemini API 연결 상태</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    hasAiKey
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hasAiKey ? '● Gemini 2.5 Flash 활성됨' : '● 기본 내장 무료 분석엔진 동작 중'}
                </span>
              </div>
              <input
                type="password"
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                placeholder="새 GEMINI_API_KEY 입력 (변경 시에만 입력하세요)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block font-bold text-slate-200">
                관리자앱 접속 비밀번호 변경 (현재 기본값: admin1234)
              </label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="새 관리자 비밀번호 입력 (4자 이상, 변경 시에만 입력)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />
            </div>

            <button
              type="submit"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#020617' }}
              className="px-5 py-3 rounded-xl font-extrabold text-xs cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>설정 저장하기</span>
            </button>
          </form>
        )}
      </main>

      {/* 회원 정보 수정 모달 */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditUser}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">
                사용자 정보 수정 ({editingUser.licenseKey})
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">목회자 성함</label>
                <input
                  type="text"
                  value={editingUser.pastorName}
                  onChange={(e) => setEditingUser({ ...editingUser, pastorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">직분</label>
                <input
                  type="text"
                  value={editingUser.titleRole || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, titleRole: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">소속 교회명</label>
              <input
                type="text"
                value={editingUser.churchName}
                onChange={(e) => setEditingUser({ ...editingUser, churchName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">연락처</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">허용 기기 대수</label>
                <select
                  value={editingUser.maxDevices}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, maxDevices: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value={1}>1대</option>
                  <option value={2}>2대 (PC+태블릿)</option>
                  <option value={3}>3대 (VIP)</option>
                  <option value={5}>5대</option>
                  <option value={10}>10대</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">이용 만료일</label>
              <input
                type="date"
                value={editingUser.expiresAt}
                onChange={(e) => setEditingUser({ ...editingUser, expiresAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">메모</label>
              <input
                type="text"
                value={editingUser.memo || ''}
                onChange={(e) => setEditingUser({ ...editingUser, memo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#020617' }}
                className="px-5 py-2 rounded-xl font-extrabold cursor-pointer"
              >
                변경사항 저장
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
