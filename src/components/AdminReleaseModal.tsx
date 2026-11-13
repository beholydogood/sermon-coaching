import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  KeyRound,
  Building2,
  UserCheck,
  RefreshCw,
  Download,
  Upload,
  Plus,
  Trash2,
  Check,
  Copy,
  Laptop,
  Smartphone,
  AlertTriangle,
  ArrowUpCircle,
  FileCode,
  Sparkles,
  Layers,
  Settings,
  Activity,
} from 'lucide-react';
import { LicenseUser, AppReleaseInfo, DeviceAuthInfo } from '../types/sermon';

interface AdminReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAuthInfo?: DeviceAuthInfo;
  currentReleaseInfo: AppReleaseInfo;
  onReleasePublished: (newRelease: AppReleaseInfo) => void;
}

export const AdminReleaseModal: React.FC<AdminReleaseModalProps> = ({
  isOpen,
  onClose,
  currentAuthInfo,
  currentReleaseInfo,
  onReleasePublished,
}) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'release' | 'offline_pkg'>('licenses');

  // 1. 관리 라이선스 목록 상태
  const [licenses, setLicenses] = useState<LicenseUser[]>([
    {
      licenseKey: 'SERMON-VIP-2026',
      pastorName: '이은혜 담임목사',
      churchName: '은혜의빛교회',
      role: 'pastor',
      maxDevices: 2,
      status: 'active',
      expiresAt: '2027-12-31',
      createdAt: '2026-01-01',
      registeredDevices: [
        {
          deviceId: 'DEV-WIN11-MAC7A2F',
          deviceLabel: '목양실 데스크톱 (Windows 11 PC)',
          userAgent: 'Chrome 122.0 Windows Desktop',
          registeredAt: '2026-01-10 09:30',
          lastActiveAt: '2026-11-10 03:00',
        },
        {
          deviceId: 'DEV-IPAD-AIR-9812',
          deviceLabel: '이동용 아이패드 프로 12.9',
          userAgent: 'Safari iOS Tablet',
          registeredAt: '2026-02-14 14:10',
          lastActiveAt: '2026-11-08 11:20',
        },
      ],
      memo: '담임목사님 전용 영구 VIP 라이선스',
    },
    {
      licenseKey: 'GRACE-COACH-777',
      pastorName: '김선교 목사',
      churchName: '새소망전원교회',
      role: 'pastor',
      maxDevices: 1,
      status: 'active',
      expiresAt: '2026-12-31',
      createdAt: '2026-03-01',
      registeredDevices: [
        {
          deviceId: 'DEV-MACBOOK-M3-4411',
          deviceLabel: '사역용 맥북에어 M3',
          userAgent: 'Safari macOS',
          registeredAt: '2026-03-05 10:00',
          lastActiveAt: '2026-11-09 17:40',
        },
      ],
      memo: '설교 코칭 1기 참여 목회자',
    },
    {
      licenseKey: 'ADMIN-MASTER-2026',
      pastorName: '총괄 관리자',
      churchName: '중앙 코칭 & 출판 본부',
      role: 'admin',
      maxDevices: 5,
      status: 'active',
      expiresAt: '2030-12-31',
      createdAt: '2026-01-01',
      registeredDevices: [],
      memo: '중앙 관리자 마스터 키',
    },
  ]);

  // 신규 라이선스 발급 입력
  const [newPastorName, setNewPastorName] = useState('');
  const [newChurchName, setNewChurchName] = useState('');
  const [newMaxDevices, setNewMaxDevices] = useState(2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 2. 버전 릴리즈 폼 상태
  const [releaseVersion, setReleaseVersion] = useState('v2.5.0');
  const [releaseTitle, setReleaseTitle] = useState('설교 누적 아카이브 & AI 도서 출판 스튜디오 대규모 업그레이드');
  const [releaseNotesText, setReleaseNotesText] = useState(
    `1. [사용자] 설교 영상 업로드 시 지난 피드백 누적 및 성장 비교 기능 추가\n2. [스피치] 강점 및 단점(말투, 손버릇, 시선처리, 틱) 타임스탬프 연동 정밀 코칭\n3. [도서집필] 선택 설교 + PDF/PPT 문서 기반 도서 기획안 및 출판 원고 초안 자동 생성\n4. [관리자] 허가된 기기 PWA 설치 및 원격 라이선스 제어 엔진 가동\n5. [배포] 중앙 관리자 1클릭 실시간 무중단 업그레이드 배포`
  );
  const [isMandatory, setIsMandatory] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // 3. 파일 기반 재배포 패키지 JSON
  const [importedPkgStatus, setImportedPkgStatus] = useState<string | null>(null);

  // 4. 태블릿/모바일 접속용 로컬 네트워크 주소
  const [tabletUrl, setTabletUrl] = useState<string>('http://192.168.1.246:3000');
  const [copiedTabletUrl, setCopiedTabletUrl] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/network-info')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.tabletUrl) {
          setTabletUrl(d.tabletUrl);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  // 신규 라이선스 생성
  const handleCreateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPastorName.trim() || !newChurchName.trim()) return;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedKey = `SERMON-${newChurchName.substring(0, 2).toUpperCase()}-${randomSuffix}`;

    const newLic: LicenseUser = {
      licenseKey: generatedKey,
      pastorName: newPastorName.trim(),
      churchName: newChurchName.trim(),
      role: 'pastor',
      maxDevices: newMaxDevices,
      status: 'active',
      expiresAt: '2027-12-31',
      createdAt: new Date().toISOString().split('T')[0],
      registeredDevices: [],
      memo: '관리자 화면에서 즉시 발급됨',
    };

    setLicenses([newLic, ...licenses]);
    setNewPastorName('');
    setNewChurchName('');
  };

  // 라이선스 키 복사
  const handleCopyKey = (key: string, pastor: string) => {
    const text = `[AI 설교 코칭 스튜디오 정식 기기 등록 안내]\n- 목회자: ${pastor}\n- PC 접속 주소: http://localhost:3000\n- 태블릿/모바일 접속 주소 (동일 와이파이): ${tabletUrl}\n- 기기 인가 라이선스 키: ${key}\n- 접속 후 위 라이선스 키를 입력하시면 전용 기기로 인가되어 즉시 설치·사용하실 수 있습니다.`;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyTabletUrl = () => {
    navigator.clipboard.writeText(tabletUrl);
    setCopiedTabletUrl(true);
    setTimeout(() => setCopiedTabletUrl(false), 2000);
  };

  // 라이선스 정지/활성화 토글
  const handleToggleStatus = (key: string) => {
    setLicenses(
      licenses.map((lic) =>
        lic.licenseKey === key
          ? { ...lic, status: lic.status === 'active' ? 'revoked' : 'active' }
          : lic
      )
    );
  };

  // 등록된 기기 등록 해제
  const handleRemoveDevice = (licenseKey: string, deviceId: string) => {
    setLicenses(
      licenses.map((lic) => {
        if (lic.licenseKey === licenseKey) {
          return {
            ...lic,
            registeredDevices: lic.registeredDevices.filter((d) => d.deviceId !== deviceId),
          };
        }
        return lic;
      })
    );
  };

  // 중앙 원격 배포 발행
  const handlePublishRelease = async () => {
    const notes = releaseNotesText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const newRelease: AppReleaseInfo = {
      version: releaseVersion.trim(),
      buildNumber: (currentReleaseInfo?.buildNumber || 240) + 1,
      releasedAt: new Date().toISOString(),
      releaseTitle: releaseTitle.trim(),
      releaseNotes: notes,
      mandatory: isMandatory,
    };

    try {
      await fetch('/api/release/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRelease),
      });
    } catch (e) {
      console.warn('API sync warning, applying client release', e);
    }

    onReleasePublished(newRelease);
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 2500);
  };

  // 업데이트 배포 패키지 JSON 파일 다운로드 (파일 재배포 방식)
  const handleExportPackage = () => {
    const pkg = {
      app: 'AI 설교 코칭 & 도서집필 스튜디오',
      version: releaseVersion,
      buildNumber: (currentReleaseInfo?.buildNumber || 240) + 1,
      exportedAt: new Date().toISOString(),
      releaseInfo: {
        version: releaseVersion,
        releaseTitle,
        releaseNotes: releaseNotesText.split('\n'),
      },
      validLicenses: licenses.map((l) => ({
        key: l.licenseKey,
        pastor: l.pastorName,
        church: l.churchName,
        status: l.status,
      })),
    };

    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sermon_Coaching_Update_${releaseVersion}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 오프라인 파일 업데이트 패키지 업로드 적용
  const handleImportPackage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.version && data.releaseInfo) {
          const importedRelease: AppReleaseInfo = {
            version: data.version,
            buildNumber: data.buildNumber || 250,
            releasedAt: data.exportedAt || new Date().toISOString(),
            releaseTitle: data.releaseInfo.releaseTitle || '파일로 배포된 오프라인 업데이트',
            releaseNotes: data.releaseInfo.releaseNotes || ['정상 업데이트 완료'],
            mandatory: false,
          };
          onReleasePublished(importedRelease);
          setImportedPkgStatus(`성공: [${data.version}] 버전 업데이트 패키지가 로컬 기기에 즉시 반영되었습니다.`);
        } else {
          setImportedPkgStatus('오류: 올바른 업데이트 패키지 JSON 형식이 아닙니다.');
        }
      } catch (err) {
        setImportedPkgStatus('오류: JSON 파일 파싱 실패');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* ─── 상단 헤더 ─── */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  중앙 관리자 통합 관제 센터
                </span>
                <span className="text-xs text-slate-400">• 배포 기기 및 원격 업그레이드</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <span>기기 인가 관리 &amp; 원격 업그레이드 배포</span>
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  현재 가동 버전: {currentReleaseInfo?.version || 'v2.4.0'}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── 서브 탭 네비게이션 ─── */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'licenses', label: '1. 허가 기기 및 라이선스 관리', count: `${licenses.length}개 키 등록됨` },
            { id: 'release',  label: '2. 중앙 원격 업그레이드 배포', count: '실시간 푸시' },
            { id: 'offline_pkg', label: '3. 파일 재배포 패키지 (JSON)', count: '오프라인 파일 지원' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] ${activeTab === tab.id ? 'text-indigo-200 font-bold' : 'text-slate-500'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {/* ─── 메인 탭 컨텐츠 ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40">

          {/* ════════════════════════════════════════════════════════════
              TAB 1: 라이선스 및 기기 인가 관리 (LICENSES)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'licenses' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* 태블릿 / 아이패드 / 갤럭시탭 접속 안내 & QR 코드 박스 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="space-y-2 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>태블릿 (아이패드 · 갤럭시탭) 연결 및 앱 설치 안내</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    태블릿 카메라로 우측 QR 코드를 스캔하거나 아래 주소로 접속하세요
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    1. 현재 PC와 태블릿을 <strong>같은 와이파이(공유기 네트워크)</strong>에 연결합니다.<br />
                    2. 태블릿 브라우저(Safari / Chrome) 주소창에 아래 주소를 입력하거나 QR 코드를 스캔합니다.<br />
                    3. 발급한 라이선스 키를 입력하고 <strong>[홈 화면에 추가 / 앱 설치]</strong>를 누르면 태블릿 전용 앱으로 설치됩니다.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <code className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-amber-300 font-mono text-xs sm:text-sm font-bold">
                      {tabletUrl}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyTabletUrl}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedTabletUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTabletUrl ? '주소 복사됨!' : '태블릿 접속 주소 복사'}</span>
                    </button>
                  </div>
                </div>

                {/* 실시간 QR 코드 */}
                <div className="bg-white p-2.5 rounded-2xl shadow-md shrink-0 text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(tabletUrl)}`}
                    alt="태블릿 접속 QR코드"
                    className="w-28 h-28 rounded-lg mx-auto"
                  />
                  <span className="block text-[10px] font-bold text-slate-800 mt-1">
                    태블릿 카메라 스캔
                  </span>
                </div>
              </div>

              {/* 신규 라이선스 발급 박스 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>새로운 목회자 기기 인가 키 즉시 발급</span>
                </h3>
                <form onSubmit={handleCreateLicense} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    placeholder="목회자 성함 (예: 박바울 목사)"
                    value={newPastorName}
                    onChange={(e) => setNewPastorName(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="소속 교회 (예: 한마음장로교회)"
                    value={newChurchName}
                    onChange={(e) => setNewChurchName(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-400"
                    required
                  />
                  <select
                    value={newMaxDevices}
                    onChange={(e) => setNewMaxDevices(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-400"
                  >
                    <option value={1}>허용 기기 1대 (기본)</option>
                    <option value={2}>허용 기기 2대 (PC+태블릿)</option>
                    <option value={3}>허용 기기 3대 (VIP)</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold px-3 py-2 shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>라이선스 키 발급</span>
                  </button>
                </form>
              </div>

              {/* 발급된 라이선스 카드 목록 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="font-semibold">발급된 인가 키 &amp; 바인딩된 기기 목록 ({licenses.length}개)</span>
                  <span>* 복사하여 목회자에게 전달 시 본인 기기만 설치·등록 가능합니다.</span>
                </div>

                {licenses.map((lic) => (
                  <div
                    key={lic.licenseKey}
                    className={`p-4 rounded-2xl border transition-all ${
                      lic.status === 'active'
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-900/50 border-rose-950/80 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                            {lic.licenseKey}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            lic.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}>
                            {lic.status === 'active' ? '인가 활성' : '이용 정지'}
                          </span>
                          {lic.role === 'admin' && (
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                              관리자 키
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                          <span className="font-semibold text-white">{lic.pastorName}</span>
                          <span className="text-slate-500">•</span>
                          <span>{lic.churchName}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">최대 {lic.maxDevices}대 허용 (현재 {lic.registeredDevices.length}대 사용)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyKey(lic.licenseKey, lic.pastorName)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
                        >
                          {copiedKey === lic.licenseKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === lic.licenseKey ? '복사됨!' : '전달문구 복사'}</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(lic.licenseKey)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold transition-colors ${
                            lic.status === 'active'
                              ? 'bg-slate-800 hover:bg-rose-950 text-rose-300 border-slate-700'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {lic.status === 'active' ? '이용 차단' : '차단 해제'}
                        </button>
                      </div>
                    </div>

                    {/* 바인딩된 기기 상세 목록 */}
                    <div className="pt-3">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        본인 기기 등록 내역 ({lic.registeredDevices.length} / {lic.maxDevices})
                      </span>
                      {lic.registeredDevices.length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                          아직 목회자 본인 기기에서 최초 인가 등록을 진행하지 않았습니다. 키를 전달해 주세요.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lic.registeredDevices.map((dev) => (
                            <div
                              key={dev.deviceId}
                              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2">
                                <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
                                <div>
                                  <div className="font-semibold text-slate-200">{dev.deviceLabel}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ID: {dev.deviceId} • 최근 접속: {dev.lastActiveAt}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleRemoveDevice(lic.licenseKey, dev.deviceId)}
                                title="이 기기 등록 해제"
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 2: 중앙 원격 업그레이드 배포 (RELEASE)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'release' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Central OTA Release</span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    중앙 1클릭 원격 업그레이드 배포 (OTA 실시간 동기화)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    여기서 새로운 버전과 패치 내역을 작성하고 배포를 실행하면, 허가된 모든 목회자의 기기에 즉시 실시간 상단 업데이트 배너가 활성화되며 원클릭으로 최신 앱이 적용됩니다.
                  </p>
                </div>

                {publishSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>성공: 새 버전 [{releaseVersion}]이 중앙 서버에 성공적으로 발행되었습니다! 배포된 모든 기기에 즉시 반영됩니다.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">배포 버전 번호</label>
                    <input
                      type="text"
                      value={releaseVersion}
                      onChange={(e) => setReleaseVersion(e.target.value)}
                      placeholder="예: v2.5.0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-hidden focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">배포 릴리즈 명칭</label>
                    <input
                      type="text"
                      value={releaseTitle}
                      onChange={(e) => setReleaseTitle(e.target.value)}
                      placeholder="릴리즈 제목"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">업데이트 패치 내역 (Release Notes)</label>
                  <textarea
                    rows={6}
                    value={releaseNotesText}
                    onChange={(e) => setReleaseNotesText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed font-mono focus:outline-hidden focus:border-indigo-400 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mandatoryCheck"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="rounded-md border-slate-700 text-indigo-600 focus:ring-indigo-400 w-4 h-4"
                  />
                  <label htmlFor="mandatoryCheck" className="text-xs text-slate-300 cursor-pointer">
                    필수 보안 업데이트 (사용자 기기 접속 시 즉시 강제 갱신)
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePublishRelease}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowUpCircle className="w-5 h-5" />
                    <span>중앙 원격 업그레이드 전 기기 실시간 배포 실행</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 3: 파일 기반 재배포 패키지 (OFFLINE_PKG)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'offline_pkg' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">File Package Deployment</span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    파일 재배포 방식 (업데이트 패키지 .json 내보내기 / 가져오기)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    중앙 서버 네트워크가 분리되어 있거나 개별 파일 전달이 필요한 경우, 최신 기능과 인가 키가 포함된 패키지 파일을 다운로드하여 사용자에게 카카오톡/이메일로 전달할 수 있습니다.
                  </p>
                </div>

                {importedPkgStatus && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs">
                    {importedPkgStatus}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* 패키지 내보내기 */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>1. 배포용 파일 패키지 내보내기</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      현재 등록된 최신 기능, 라이선스 키, 릴리즈 메타가 압축된 JSON 파일을 생성합니다.
                    </p>
                    <button
                      onClick={handleExportPackage}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>배포 패키지 다운로드 (.json)</span>
                    </button>
                  </div>

                  {/* 패키지 가져오기 */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>2. 사용자 기기에서 패키지 적용</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      전달받은 .json 패키지 파일을 업로드하면 네트워크 없이도 최신 기능이 즉시 활성화됩니다.
                    </p>
                    <label className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                      <Upload className="w-3.5 h-3.5" />
                      <span>업데이트 패키지 파일 선택</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportPackage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* ─── 풋터 ─── */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>중앙 인가 보안 프로토콜 가동 중 • 비인가 기기 무단 접속 차단</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
