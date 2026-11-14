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
        message: data.message || '관리자앱에 등록되지 않은 라이선스 키입니다. 관리자에게 문의해 주세요.',
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
  } catch {
    return {
      success: false,
      message: '서버 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }
};

/**
 * 스튜디오 실행 시 브라우저에 저장된 인증 정보가 관리자앱(서버 DB)에 실제로 등록·활성화되어 있는지 검증
 * 관리자앱에 없거나 삭제/차단된 계정이면 즉시 로컬 세션을 파기하고 인증 모달을 띄웁니다.
 */
export const verifyCurrentSessionWithServer = async (): Promise<{
  valid: boolean;
  message?: string;
  authInfo?: DeviceAuthInfo;
}> => {
  const localAuth = getDeviceAuthInfo();
  if (!localAuth.isAuthorized) {
    return { valid: false };
  }

  const deviceId = localAuth.deviceId || getOrCreateDeviceId();
  const deviceLabel = getReadableClientDeviceLabel();

  try {
    const res = await fetch('/api/auth/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: localAuth.licenseKey || localAuth.authorizedKey || '',
        pastorName: localAuth.pastorName || '',
        churchName: localAuth.churchName || '',
        deviceId,
        deviceLabel,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.valid) {
      revokeDeviceAuthorization();
      return {
        valid: false,
        message: data.message || '관리자앱에 등록되지 않은 계정입니다.',
      };
    }

    if (data.authInfo) {
      const synced: DeviceAuthInfo = {
        isAuthorized: true,
        authorizedKey: data.authInfo.licenseKey,
        licenseKey: data.authInfo.licenseKey,
        pastorName: data.authInfo.pastorName,
        churchName: data.authInfo.churchName,
        role: data.authInfo.role || 'pastor',
        deviceId: data.authInfo.deviceId || deviceId,
        authorizedAt: data.authInfo.authorizedAt,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(synced));
      return { valid: true, authInfo: synced };
    }

    return { valid: true, authInfo: localAuth };
  } catch {
    // 일시적 오프라인 시에는 기존 상태 유지
    return { valid: true, authInfo: localAuth };
  }
};

export const updateDeviceProfileInfo = (
  pastorName: string,
  churchName: string
): DeviceAuthInfo => {
  const current = getDeviceAuthInfo();
  const key = current.licenseKey || current.authorizedKey || '';
  const updated: DeviceAuthInfo = {
    ...current,
    isAuthorized: current.isAuthorized ?? true,
    authorizedKey: key,
    licenseKey: key,
    pastorName: pastorName.trim() || current.pastorName || '담임목사',
    churchName: churchName.trim() || current.churchName || '소속교회',
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    if (key) {
      fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          pastorName: updated.pastorName,
          churchName: updated.churchName,
        }),
      }).catch(() => {});
    }
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

// ==========================================
// 방식 B: 목회자 개인별 Gemini API 키 (본인 브라우저·기기에만 독립 저장)
// ==========================================
const PERSONAL_GEMINI_KEY_STORAGE = 'sermon_coaching_personal_gemini_key_v1';

export const getPersonalGeminiApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(PERSONAL_GEMINI_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
};

export const setPersonalGeminiApiKey = (apiKey: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = (apiKey || '').trim();
    if (trimmed) {
      localStorage.setItem(PERSONAL_GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(PERSONAL_GEMINI_KEY_STORAGE);
    }
    window.dispatchEvent(new Event('personal-gemini-key-updated'));
  } catch (e) {
    console.error('Failed to save personal Gemini API key:', e);
  }
};

export const hasPersonalGeminiApiKey = (): boolean => {
  return getPersonalGeminiApiKey().length >= 15;
};

