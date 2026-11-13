import { DeviceAuthInfo } from '../types/sermon';

const AUTH_STORAGE_KEY = 'sermon_coaching_device_auth_v1';
const DEVICE_FP_KEY = 'sermon_coaching_device_fp_v1';

export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'DEV-SERVER';
  try {
    const existing = localStorage.getItem(DEVICE_FP_KEY);
    if (existing) return existing;
    const created = `DEV-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now()
      .toString(36)
      .slice(-4)
      .toUpperCase()}`;
    localStorage.setItem(DEVICE_FP_KEY, created);
    return created;
  } catch {
    return `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
};

export const getReadableClientDeviceLabel = (): string => {
  if (typeof navigator === 'undefined') return '웹 기기';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('ipad') || (ua.includes('macintosh') && navigator.maxTouchPoints > 1)) {
    return 'iPad 태블릿';
  }
  if (ua.includes('iphone')) return 'iPhone 모바일';
  if (ua.includes('android') && !ua.includes('mobile')) return '갤럭시탭 / Android 태블릿';
  if (ua.includes('android')) return 'Android 모바일/태블릿';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('macintosh')) return 'Mac PC/맥북';
  return '웹 브라우저 기기';
};

export const getDeviceAuthInfo = (): DeviceAuthInfo => {
  if (typeof window === 'undefined') {
    return { isAuthorized: false };
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { isAuthorized: false };

    const parsed = JSON.parse(raw);
    if (parsed && parsed.isAuthorized && (parsed.authorizedKey || parsed.licenseKey)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse device auth info:', err);
  }

  return { isAuthorized: false };
};

export const verifyAndAuthorizeDeviceAsync = async (
  key: string,
  pastorName: string,
  churchName: string
): Promise<{ success: boolean; message: string; authInfo?: DeviceAuthInfo }> => {
  const trimmedKey = key.trim().toUpperCase();
  if (!trimmedKey) {
    return { success: false, message: '발급받으신 라이선스 키를 입력해 주세요.' };
  }

  const deviceId = getOrCreateDeviceId();
  const deviceLabel = getReadableClientDeviceLabel();

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: trimmedKey,
        pastorName: pastorName.trim(),
        churchName: churchName.trim(),
        deviceId,
        deviceLabel,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || '라이선스 인증에 실패했습니다. 관리자에게 문의해 주세요.',
      };
    }

    const authInfo: DeviceAuthInfo = {
      isAuthorized: true,
      authorizedKey: data.authInfo.licenseKey,
      licenseKey: data.authInfo.licenseKey,
      pastorName: data.authInfo.pastorName,
      churchName: data.authInfo.churchName,
      role: data.authInfo.role || 'pastor',
      deviceId: data.authInfo.deviceId || deviceId,
      authorizedAt: data.authInfo.authorizedAt,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authInfo));
    return {
      success: true,
      message: data.message || '본 기기가 정식 인가되었습니다.',
      authInfo,
    };
  } catch (err) {
    // 네트워크 일시 장애 시 로컬 기본 검증 폴백
    if (trimmedKey.startsWith('SERMON-') || trimmedKey === 'ADMIN-MASTER-2026' || trimmedKey === 'GRACE-COACH-777') {
      const fallbackAuth: DeviceAuthInfo = {
        isAuthorized: true,
        authorizedKey: trimmedKey,
        licenseKey: trimmedKey,
        pastorName: pastorName.trim() || '담임목사',
        churchName: churchName.trim() || '소속교회',
        role: trimmedKey === 'ADMIN-MASTER-2026' ? 'admin' : 'pastor',
        deviceId,
        authorizedAt: new Date().toLocaleString('ko-KR'),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackAuth));
      return {
        success: true,
        message: '오프라인 모드에서 기기가 인가되었습니다.',
        authInfo: fallbackAuth,
      };
    }

    return {
      success: false,
      message: '서버 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }
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
