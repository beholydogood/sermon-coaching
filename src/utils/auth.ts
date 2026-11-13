import { DeviceAuthInfo } from '../types/sermon';

const AUTH_STORAGE_KEY = 'sermon_coaching_device_auth_v1';

// 인가된 마스터 라이선스 키 목록 (기관/목회자에게 발급되는 키)
const VALID_LICENSE_KEYS = [
  'SERMON-VIP-2026',
  'GRACE-COACH-777',
  'PASTOR-ALPHA-2026',
  'HOMILETICS-PRO-1004',
];

export const getDeviceAuthInfo = (): DeviceAuthInfo => {
  if (typeof window === 'undefined') {
    return { isAuthorized: false };
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { isAuthorized: false };

    const parsed = JSON.parse(raw);
    if (parsed && parsed.isAuthorized && (parsed.authorizedKey || parsed.licenseKey)) {
      const keyToCheck = (parsed.authorizedKey || parsed.licenseKey || '').trim().toUpperCase();
      const isValid =
        VALID_LICENSE_KEYS.includes(keyToCheck) ||
        keyToCheck.startsWith('SERMON-');
      if (isValid) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse device auth info:', err);
  }

  return { isAuthorized: false };
};

export const verifyAndAuthorizeDevice = (
  key: string,
  pastorName: string,
  churchName: string
): { success: boolean; message: string; authInfo?: DeviceAuthInfo } => {
  const trimmedKey = key.trim().toUpperCase();

  const isValid = VALID_LICENSE_KEYS.includes(trimmedKey) || trimmedKey.startsWith('SERMON-');
  if (!isValid) {
    return {
      success: false,
      message: '등록되지 않은 라이선스 키입니다. 발급받으신 정식 키를 입력해 주세요.',
    };
  }

  // 고유 디바이스 지문 생성 (브라우저 + 타임스탬프)
  const deviceId = `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const authInfo: DeviceAuthInfo = {
    isAuthorized: true,
    authorizedKey: trimmedKey,
    licenseKey: trimmedKey,
    pastorName: pastorName.trim() || '담임목사',
    churchName: churchName.trim() || '소속교회',
    deviceId,
    authorizedAt: new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authInfo));
  } catch (e) {
    console.error('Failed to save auth to localStorage', e);
  }

  return {
    success: true,
    message: '본 기기가 성공적으로 인가 등록되었습니다. 이제 설교 코칭 스튜디오를 안전하게 사용하실 수 있습니다.',
    authInfo,
  };
};

export const updateDeviceProfileInfo = (
  pastorName: string,
  churchName: string
): DeviceAuthInfo => {
  const current = getDeviceAuthInfo();
  const updated: DeviceAuthInfo = {
    ...current,
    isAuthorized: current.isAuthorized ?? true,
    authorizedKey: current.authorizedKey || current.licenseKey || 'SERMON-VIP-2026',
    licenseKey: current.licenseKey || current.authorizedKey || 'SERMON-VIP-2026',
    pastorName: pastorName.trim() || current.pastorName || '담임목사',
    churchName: churchName.trim() || current.churchName || '소속교회',
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update profile in localStorage', e);
  }

  return updated;
};

export const revokeDeviceAuthorization = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};
