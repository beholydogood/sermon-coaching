import fs from 'fs';
import path from 'path';
import { LicenseUser, RegisteredDevice } from '../types/sermon';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const DELETED_KEYS_FILE = path.resolve(DATA_DIR, 'deleted_keys.json');

const DEFAULT_USERS: LicenseUser[] = [
  {
    licenseKey: 'ADMIN-MASTER-2026',
    pastorName: '총괄 관리자',
    titleRole: '시스템 총괄',
    churchName: '중앙 코칭 & 출판 본부',
    phone: '010-0000-0000',
    email: 'admin@sermoncoaching.kr',
    role: 'admin',
    maxDevices: 10,
    status: 'active',
    expiresAt: '2099-12-31',
    createdAt: '2026-01-01',
    registeredDevices: [],
    memo: '관리자앱 및 마스터 권한 키',
  },
  {
    licenseKey: 'SERMON-BIJ-2026',
    pastorName: '고휘찬',
    titleRole: '담임목사',
    churchName: 'BIje교회',
    phone: '',
    email: '',
    role: 'pastor',
    maxDevices: 2,
    status: 'active',
    expiresAt: '2027-12-31',
    createdAt: '2026-11-10',
    registeredDevices: [],
    memo: '정식 등록 목회자 (BIje교회 고휘찬)',
  },
  {
    licenseKey: 'SERMON-ONN-2026',
    pastorName: '박은총',
    titleRole: '담임목사',
    churchName: '온누리비전교회',
    phone: '',
    email: '',
    role: 'pastor',
    maxDevices: 2,
    status: 'active',
    expiresAt: '2027-12-31',
    createdAt: '2026-11-10',
    registeredDevices: [],
    memo: '정식 등록 목회자 (온누리비전교회 박은총)',
  },
  {
    licenseKey: 'SERMON-VIP-2026',
    pastorName: '이은혜 목사',
    titleRole: '담임목사',
    churchName: '은혜의빛교회',
    phone: '010-1234-5678',
    email: 'grace@church.kr',
    role: 'pastor',
    maxDevices: 2,
    status: 'active',
    expiresAt: '2027-12-31',
    createdAt: '2026-01-01',
    registeredDevices: [],
    memo: '기본 테스트 및 시연용 VIP 라이선스 (PC + 태블릿 2대)',
  },
  {
    licenseKey: 'GRACE-COACH-777',
    pastorName: '김선교 목사',
    titleRole: '담임목사',
    churchName: '새소망교회',
    phone: '010-9876-5432',
    email: 'hope@church.kr',
    role: 'pastor',
    maxDevices: 2,
    status: 'active',
    expiresAt: '2027-12-31',
    createdAt: '2026-03-01',
    registeredDevices: [],
    memo: '설교 코칭 1기 참여 목회자',
  },
];

function loadDeletedKeys(): Set<string> {
  try {
    if (fs.existsSync(DELETED_KEYS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(DELETED_KEYS_FILE, 'utf8'));
      if (Array.isArray(arr)) {
        return new Set(arr.map((k: string) => String(k).toUpperCase()));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveDeletedKeys(keys: Set<string>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DELETED_KEYS_FILE, JSON.stringify([...keys], null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function ensureStoreLoaded(): LicenseUser[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const deletedKeys = loadDeletedKeys();

    if (!fs.existsSync(USERS_FILE)) {
      const initial = DEFAULT_USERS.filter((u) => !deletedKeys.has(u.licenseKey.toUpperCase()));
      fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return [...initial];
    }

    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed: LicenseUser[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // DEFAULT_USERS 중 아직 users.json에 없고 관리자가 삭제한 적도 없는 기본 계정은 자동 병합 (고휘찬, 박은총 등 누락 방지)
      let changed = false;
      const existingKeys = new Set(parsed.map((u) => u.licenseKey.toUpperCase()));
      for (const defUser of DEFAULT_USERS) {
        const k = defUser.licenseKey.toUpperCase();
        if (!existingKeys.has(k) && !deletedKeys.has(k)) {
          parsed.splice(1, 0, defUser);
          existingKeys.add(k);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to read users.json, initializing defaults:', err);
  }
  return [...DEFAULT_USERS];
}

function saveStore(users: LicenseUser[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save users.json:', err);
  }
}

export function detectReadableDeviceLabel(userAgent: string = ''): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('ipad')) return 'iPad 태블릿 (iOS)';
  if (ua.includes('iphone')) return 'iPhone 모바일 (iOS)';
  if (ua.includes('android') && (ua.includes('sm-x') || ua.includes('sm-t') || !ua.includes('mobile'))) {
    return '갤럭시탭 / Android 태블릿';
  }
  if (ua.includes('android')) return 'Android 스마트폰';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac 데스크톱/맥북';
  if (ua.includes('windows')) return 'Windows PC 데스크톱/노트북';
  return '웹 브라우저 기기';
}

export function getAllLicenseUsers(): LicenseUser[] {
  return ensureStoreLoaded();
}

export function findUserByKey(rawKey: string): LicenseUser | undefined {
  const key = (rawKey || '').trim().toUpperCase();
  if (!key) return undefined;
  const users = ensureStoreLoaded();
  return users.find((u) => u.licenseKey.toUpperCase() === key);
}

export function generateLicenseKey(churchName: string = ''): string {
  const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  const numCode = Math.floor(1000 + Math.random() * 9000);
  const cleanPrefix = churchName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
  return cleanPrefix ? `SERMON-${cleanPrefix}-${numCode}` : `SERMON-${randCode}-${numCode}`;
}

export function createLicenseUser(input: {
  licenseKey?: string;
  pastorName: string;
  titleRole?: string;
  churchName: string;
  phone?: string;
  email?: string;
  role?: 'pastor' | 'admin';
  maxDevices?: number;
  expiresAt?: string;
  memo?: string;
}): { success: boolean; message: string; user?: LicenseUser } {
  const users = ensureStoreLoaded();
  const key = input.licenseKey?.trim().toUpperCase() || generateLicenseKey(input.churchName);

  if (users.some((u) => u.licenseKey.toUpperCase() === key)) {
    return { success: false, message: `이미 존재하는 라이선스 키(${key})입니다.` };
  }

  const deletedKeys = loadDeletedKeys();
  if (deletedKeys.has(key)) {
    deletedKeys.delete(key);
    saveDeletedKeys(deletedKeys);
  }

  const nowDate = new Date().toISOString().split('T')[0];
  const newUser: LicenseUser = {
    licenseKey: key,
    pastorName: input.pastorName.trim(),
    titleRole: input.titleRole?.trim() || '담임목사',
    churchName: input.churchName.trim(),
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    role: input.role || 'pastor',
    maxDevices: Number(input.maxDevices) || 2,
    status: 'active',
    expiresAt: input.expiresAt || '2027-12-31',
    createdAt: nowDate,
    registeredDevices: [],
    memo: input.memo?.trim() || '',
  };

  users.unshift(newUser);
  saveStore(users);
  return { success: true, message: '신규 목회자 사용자가 등록되었습니다.', user: newUser };
}

export function updateLicenseUser(
  targetKey: string,
  updates: Partial<LicenseUser>
): { success: boolean; message: string; user?: LicenseUser } {
  const users = ensureStoreLoaded();
  const idx = users.findIndex((u) => u.licenseKey.toUpperCase() === targetKey.trim().toUpperCase());
  if (idx === -1) {
    return { success: false, message: '해당 사용자를 찾을 수 없습니다.' };
  }

  const current = users[idx];
  const updated: LicenseUser = {
    ...current,
    pastorName: updates.pastorName !== undefined ? updates.pastorName.trim() : current.pastorName,
    titleRole: updates.titleRole !== undefined ? updates.titleRole.trim() : current.titleRole,
    churchName: updates.churchName !== undefined ? updates.churchName.trim() : current.churchName,
    phone: updates.phone !== undefined ? updates.phone.trim() : current.phone,
    email: updates.email !== undefined ? updates.email.trim() : current.email,
    maxDevices: updates.maxDevices !== undefined ? Number(updates.maxDevices) : current.maxDevices,
    status: updates.status !== undefined ? updates.status : current.status,
    expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : current.expiresAt,
    memo: updates.memo !== undefined ? updates.memo : current.memo,
  };

  users[idx] = updated;
  saveStore(users);
  return { success: true, message: '사용자 정보가 수정되었습니다.', user: updated };
}

export function deleteLicenseUser(targetKey: string): { success: boolean; message: string } {
  const key = targetKey.trim().toUpperCase();
  if (key === 'ADMIN-MASTER-2026') {
    return { success: false, message: '최고 관리자 마스터 계정은 삭제할 수 없습니다.' };
  }
  const users = ensureStoreLoaded();
  const filtered = users.filter((u) => u.licenseKey.toUpperCase() !== key);
  if (filtered.length === users.length) {
    return { success: false, message: '삭제할 사용자를 찾을 수 없습니다.' };
  }

  const deletedKeys = loadDeletedKeys();
  deletedKeys.add(key);
  saveDeletedKeys(deletedKeys);

  saveStore(filtered);
  return { success: true, message: '사용자가 삭제되었으며 해당 사용자의 기기 접속 권한이 즉시 해제되었습니다.' };
}

export function toggleLicenseStatus(targetKey: string): { success: boolean; user?: LicenseUser } {
  const users = ensureStoreLoaded();
  const idx = users.findIndex((u) => u.licenseKey.toUpperCase() === targetKey.trim().toUpperCase());
  if (idx === -1) return { success: false };

  users[idx].status = users[idx].status === 'active' ? 'revoked' : 'active';
  saveStore(users);
  return { success: true, user: users[idx] };
}

export function removeRegisteredDevice(
  targetKey: string,
  deviceIdOrAll: string
): { success: boolean; user?: LicenseUser } {
  const users = ensureStoreLoaded();
  const idx = users.findIndex((u) => u.licenseKey.toUpperCase() === targetKey.trim().toUpperCase());
  if (idx === -1) return { success: false };

  if (deviceIdOrAll === 'ALL') {
    users[idx].registeredDevices = [];
  } else {
    users[idx].registeredDevices = users[idx].registeredDevices.filter(
      (d) => d.deviceId !== deviceIdOrAll
    );
  }
  saveStore(users);
  return { success: true, user: users[idx] };
}

export function importLicenseUsers(incoming: LicenseUser[]): { success: boolean; count: number } {
  if (!Array.isArray(incoming)) return { success: false, count: 0 };
  const existing = ensureStoreLoaded();
  const map = new Map<string, LicenseUser>();
  for (const u of existing) map.set(u.licenseKey.toUpperCase(), u);
  for (const u of incoming) {
    if (u && u.licenseKey) {
      map.set(u.licenseKey.toUpperCase(), u);
    }
  }
  const merged = Array.from(map.values());
  saveStore(merged);
  return { success: true, count: merged.length };
}

const normalizeName = (s: string = '') =>
  s.replace(/(담임목사|목사님|목사|전도사|강도사|선교사|\s+)/g, '').toLowerCase();

const normalizeChurch = (s: string = '') =>
  s.replace(/\s+/g, '').toLowerCase();

/**
 * 스튜디오 접속 시 현재 브라우저의 로컬 인증 세션이 관리자앱(users.json)에 실제로 등록·활성화되어 있는지 실시간 검증!
 * - 관리자앱에 없는 사용자이거나 삭제/차단된 경우 즉시 false 반환 -> 브라우저에서 자동 로그아웃(잠금)
 * - 이전 버전에서 공통키(SERMON-VIP-2026)로 접속했던 '고휘찬(BIje교회)' / '박은총(온누리비전교회)' 등 등록 사용자는
 *   본인 전용 라이선스 계정으로 자동 매칭 및 기기 등록 동기화!
 */
export function verifyActiveSessionOnServer(params: {
  licenseKey?: string;
  pastorName?: string;
  churchName?: string;
  deviceId?: string;
  deviceLabel?: string;
  userAgent?: string;
}): {
  valid: boolean;
  reason?: string;
  message?: string;
  authInfo?: {
    isAuthorized: boolean;
    authorizedKey: string;
    licenseKey: string;
    pastorName: string;
    churchName: string;
    deviceId: string;
    role: 'pastor' | 'admin';
    authorizedAt: string;
  };
} {
  const users = ensureStoreLoaded();
  const rawKey = (params.licenseKey || '').trim().toUpperCase();
  const reqPastorNorm = normalizeName(params.pastorName || '');
  const reqChurchNorm = normalizeChurch(params.churchName || '');

  // 1순위: 성함 + 교회명이 정확히 일치하는 관리자앱 등록 사용자 찾기 (예: 고휘찬/BIje교회, 박은총/온누리비전교회)
  let matchedIdx = -1;
  if (reqPastorNorm) {
    matchedIdx = users.findIndex((u) => {
      const uPastor = normalizeName(u.pastorName);
      const uChurch = normalizeChurch(u.churchName);
      return (
        uPastor &&
        uPastor === reqPastorNorm &&
        (!reqChurchNorm || !uChurch || uChurch === reqChurchNorm)
      );
    });
  }

  // 2순위: 라이선스 키로 찾기 (단, 브라우저에 저장된 성함/교회가 관리자앱의 해당 키 소유자와 다르면 미등록 사용자로 간주하여 차단!)
  if (matchedIdx === -1 && rawKey) {
    const keyIdx = users.findIndex((u) => u.licenseKey.toUpperCase() === rawKey);
    if (keyIdx !== -1) {
      const keyUser = users[keyIdx];
      const keyPastorNorm = normalizeName(keyUser.pastorName);
      const keyChurchNorm = normalizeChurch(keyUser.churchName);

      // 브라우저 세션의 이름/교회가 관리자앱에 등록된 해당 키 소유자 이름/교회와 일치하는지 확인
      const nameMatches = !reqPastorNorm || keyPastorNorm === reqPastorNorm;
      const churchMatches = !reqChurchNorm || keyChurchNorm === reqChurchNorm;

      if (nameMatches && churchMatches) {
        matchedIdx = keyIdx;
      } else {
        return {
          valid: false,
          reason: 'unregistered_profile',
          message: `관리자앱에 등록되지 않은 사용자(${params.churchName || ''} ${params.pastorName || ''})입니다. 관리자앱에 등록된 계정으로 다시 인증해 주세요.`,
        };
      }
    }
  }

  if (matchedIdx === -1) {
    return {
      valid: false,
      reason: 'not_found',
      message: '관리자앱에 등록되지 않았거나 삭제된 계정입니다. 정식 라이선스 키로 다시 인증해 주세요.',
    };
  }

  const user = users[matchedIdx];

  if (user.status === 'revoked') {
    return {
      valid: false,
      reason: 'revoked',
      message: '관리자에 의해 이용이 일시 중지(차단)된 계정입니다.',
    };
  }

  const today = new Date().toISOString().split('T')[0];
  if (user.expiresAt && user.expiresAt < today) {
    return {
      valid: false,
      reason: 'expired',
      message: `이용 기간(${user.expiresAt})이 만료된 라이선스입니다.`,
    };
  }

  const devId =
    params.deviceId?.trim() ||
    `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const nowStr = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const existingDevIdx = user.registeredDevices.findIndex((d) => d.deviceId === devId);
  if (existingDevIdx >= 0) {
    user.registeredDevices[existingDevIdx].lastActiveAt = nowStr;
    if (params.deviceLabel) {
      user.registeredDevices[existingDevIdx].deviceLabel = params.deviceLabel;
    }
  } else if (!user.lastLoginAt && user.registeredDevices.length < user.maxDevices) {
    // 기존 브라우저에서 이미 사용 중이던 정식 등록 계정(고휘찬, 박은총 등)의 최초 기기 자동 연결
    user.registeredDevices.push({
      deviceId: devId,
      deviceLabel: params.deviceLabel || detectReadableDeviceLabel(params.userAgent),
      userAgent: (params.userAgent || '').slice(0, 120),
      registeredAt: nowStr,
      lastActiveAt: nowStr,
    });
  } else {
    return {
      valid: false,
      reason: 'device_unregistered',
      message: '관리자앱에서 기기 등록이 해제되었거나 미등록 기기입니다. 라이선스 키로 다시 인증해 주세요.',
    };
  }

  // 만약 이 기기(devId)가 이전에 다른 공통 키(예: SERMON-VIP-2026)에 잘못 물려 있었다면 거기서는 제거
  users.forEach((u, idx) => {
    if (idx !== matchedIdx && u.registeredDevices?.some((d) => d.deviceId === devId)) {
      u.registeredDevices = u.registeredDevices.filter((d) => d.deviceId !== devId);
    }
  });

  user.lastLoginAt = nowStr;
  users[matchedIdx] = user;
  saveStore(users);

  return {
    valid: true,
    authInfo: {
      isAuthorized: true,
      authorizedKey: user.licenseKey,
      licenseKey: user.licenseKey,
      pastorName: user.pastorName,
      churchName: user.churchName,
      deviceId: devId,
      role: user.role,
      authorizedAt: nowStr,
    },
  };
}

export function verifyAndRegisterDeviceOnServer(params: {
  licenseKey: string;
  pastorName?: string;
  churchName?: string;
  deviceId?: string;
  deviceLabel?: string;
  userAgent?: string;
}): {
  success: boolean;
  message: string;
  authInfo?: {
    isAuthorized: boolean;
    authorizedKey: string;
    licenseKey: string;
    pastorName: string;
    churchName: string;
    deviceId: string;
    role: 'pastor' | 'admin';
    authorizedAt: string;
  };
} {
  const key = (params.licenseKey || '').trim().toUpperCase();
  if (!key) {
    return { success: false, message: '라이선스 키를 입력해 주세요.' };
  }

  const users = ensureStoreLoaded();
  const idx = users.findIndex((u) => u.licenseKey.toUpperCase() === key);

  if (idx === -1) {
    return {
      success: false,
      message: '관리자 시스템에 등록되지 않은 라이선스 키입니다. 발급받은 정식 키를 확인해 주세요.',
    };
  }

  const user = users[idx];

  // 1. 차단 여부 확인
  if (user.status === 'revoked') {
    return {
      success: false,
      message: '현재 이용이 일시 중지(차단)된 라이선스 키입니다. 관리자에게 문의해 주세요.',
    };
  }

  // 2. 만료일 확인
  const today = new Date().toISOString().split('T')[0];
  if (user.expiresAt && user.expiresAt < today) {
    return {
      success: false,
      message: `이용 기간(${user.expiresAt})이 만료된 라이선스입니다. 관리자에게 연장 요청해 주세요.`,
    };
  }

  // 3. 기기 대수 제한 확인 및 기기 등록
  const devId =
    params.deviceId?.trim() ||
    `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const nowStr = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const existingDevIdx = user.registeredDevices.findIndex((d) => d.deviceId === devId);
  if (existingDevIdx >= 0) {
    user.registeredDevices[existingDevIdx].lastActiveAt = nowStr;
    if (params.deviceLabel) {
      user.registeredDevices[existingDevIdx].deviceLabel = params.deviceLabel;
    }
  } else {
    if (user.registeredDevices.length >= user.maxDevices) {
      return {
        success: false,
        message: `허용된 최대 등록 기기 대수(${user.maxDevices}대)를 초과했습니다. 기존 기기를 해제하거나 관리자에게 기기 추가를 요청해 주세요.`,
      };
    }
    const newDev: RegisteredDevice = {
      deviceId: devId,
      deviceLabel: params.deviceLabel || detectReadableDeviceLabel(params.userAgent),
      userAgent: (params.userAgent || '').slice(0, 120),
      registeredAt: nowStr,
      lastActiveAt: nowStr,
    };
    user.registeredDevices.push(newDev);
  }

  // 관리자앱에 등록된 성함/교회명을 기준 정보로 유지 (단, 마스터키가 아니고 초기 비어있는 경우에만 입력값 반영)
  const finalPastor = user.pastorName || params.pastorName?.trim() || '담임목사';
  const finalChurch = user.churchName || params.churchName?.trim() || '소속교회';
  user.lastLoginAt = nowStr;

  users[idx] = user;
  saveStore(users);

  return {
    success: true,
    message: `${finalPastor} (${finalChurch}) 정식 인가 완료! (${user.registeredDevices.length}/${user.maxDevices}대 등록됨)`,
    authInfo: {
      isAuthorized: true,
      authorizedKey: user.licenseKey,
      licenseKey: user.licenseKey,
      pastorName: finalPastor,
      churchName: finalChurch,
      deviceId: devId,
      role: user.role,
      authorizedAt: nowStr,
    },
  };
}
