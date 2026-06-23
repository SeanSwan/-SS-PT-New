export type AdminImpersonationRole = 'client' | 'trainer' | 'user';

interface StoredUser {
  id?: string | number;
  role?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

interface StartResponse {
  token: string;
  user: StoredUser & { role: AdminImpersonationRole };
  impersonation: {
    actorId: string;
    actorRole?: string;
    targetUserId: string;
    targetRole: AdminImpersonationRole;
    expiresIn?: string;
  };
}

export interface AdminImpersonationState {
  admin: {
    token: string;
    refreshToken: string | null;
    user: StoredUser;
    tokenTimestamp: string | null;
  };
  target: {
    userId: string;
    role: AdminImpersonationRole;
    displayName: string;
  };
  startedAt: string;
  returnPath: string;
}

export const ADMIN_IMPERSONATION_STORAGE_KEY = 'adminImpersonationState';
export const ADMIN_IMPERSONATION_ALLOWED_ROLES: AdminImpersonationRole[] = ['client', 'trainer', 'user'];

const ADMIN_DASHBOARD_FALLBACK = '/dashboard/admin/overview';

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const isAdminImpersonationRole = (role: unknown): role is AdminImpersonationRole => (
  typeof role === 'string' && ADMIN_IMPERSONATION_ALLOWED_ROLES.includes(role as AdminImpersonationRole)
);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const userDisplayName = (user: StoredUser): string => {
  const first = typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const last = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  return `${first} ${last}`.trim() || user.username || user.email || `User #${user.id}`;
};

const currentPath = () => {
  if (typeof window === 'undefined') return ADMIN_DASHBOARD_FALLBACK;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const safeAdminReturnPath = (path: unknown): string => {
  if (!isNonEmptyString(path)) return ADMIN_DASHBOARD_FALLBACK;
  return path.startsWith('/dashboard/admin') ? path : ADMIN_DASHBOARD_FALLBACK;
};

const activeAdminUser = (): StoredUser | null => {
  const adminUser = safeJsonParse<StoredUser>(localStorage.getItem('user'));
  return adminUser?.role === 'admin' ? adminUser : null;
};

export const getAdminImpersonationState = (): AdminImpersonationState | null => {
  if (!hasStorage()) return null;
  const state = safeJsonParse<AdminImpersonationState>(localStorage.getItem(ADMIN_IMPERSONATION_STORAGE_KEY));
  if (!isNonEmptyString(state?.admin?.token)) return null;
  if (state?.admin?.user?.role !== 'admin') return null;
  if (!isNonEmptyString(state?.target?.userId)) return null;
  if (!isAdminImpersonationRole(state?.target?.role)) return null;
  return {
    ...state,
    returnPath: safeAdminReturnPath(state.returnPath),
  };
};

export const isAdminImpersonationActive = (): boolean => Boolean(getAdminImpersonationState());

export const clearAdminImpersonationState = (): void => {
  if (!hasStorage()) return;
  localStorage.removeItem(ADMIN_IMPERSONATION_STORAGE_KEY);
};

export const getDashboardPathForImpersonatedRole = (role: string): string => {
  if (role === 'trainer') return '/dashboard/trainer/overview';
  return '/user-dashboard';
};

export const startAdminImpersonationSession = (
  response: StartResponse,
  returnPath = currentPath(),
): AdminImpersonationState => {
  if (!hasStorage()) throw new Error('Browser storage is not available.');

  const adminToken = localStorage.getItem('token');
  const adminUser = activeAdminUser();
  if (!isNonEmptyString(adminToken) || !adminUser || !isNonEmptyString(String(adminUser.id ?? ''))) {
    throw new Error('An active admin session is required before testing another account.');
  }

  if (!isNonEmptyString(response?.token) || !response?.user || !response?.impersonation) {
    throw new Error('Account testing response is missing required session data.');
  }
  if (!isAdminImpersonationRole(response.user.role) || !isAdminImpersonationRole(response.impersonation.targetRole)) {
    throw new Error('Account testing response contains an unsupported role.');
  }

  const adminId = String(adminUser.id);
  const targetUserId = String(response.user.id ?? response.impersonation.targetUserId);
  if (String(response.impersonation.actorId) !== adminId || response.impersonation.actorRole !== 'admin') {
    throw new Error('Account testing response does not match the active admin session.');
  }
  if (String(response.impersonation.targetUserId) !== targetUserId || response.impersonation.targetRole !== response.user.role) {
    throw new Error('Account testing response target does not match the selected user.');
  }

  const state: AdminImpersonationState = {
    admin: {
      token: adminToken,
      refreshToken: localStorage.getItem('refreshToken'),
      user: adminUser,
      tokenTimestamp: localStorage.getItem('tokenTimestamp'),
    },
    target: {
      userId: targetUserId,
      role: response.user.role,
      displayName: userDisplayName(response.user),
    },
    startedAt: new Date().toISOString(),
    returnPath: safeAdminReturnPath(returnPath),
  };

  localStorage.setItem(ADMIN_IMPERSONATION_STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem('token', response.token);
  localStorage.setItem('user', JSON.stringify(response.user));
  localStorage.setItem('tokenTimestamp', Date.now().toString());
  localStorage.removeItem('refreshToken');

  return state;
};

export const restoreAdminSessionFromImpersonation = (): (AdminImpersonationState & { redirectPath: string }) | null => {
  if (!hasStorage()) return null;
  const state = getAdminImpersonationState();
  if (!state) return null;

  localStorage.setItem('token', state.admin.token);
  localStorage.setItem('user', JSON.stringify(state.admin.user));
  if (state.admin.refreshToken) {
    localStorage.setItem('refreshToken', state.admin.refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
  if (state.admin.tokenTimestamp) {
    localStorage.setItem('tokenTimestamp', state.admin.tokenTimestamp);
  } else {
    localStorage.setItem('tokenTimestamp', Date.now().toString());
  }
  clearAdminImpersonationState();

  return {
    ...state,
    redirectPath: state.returnPath || ADMIN_DASHBOARD_FALLBACK,
  };
};