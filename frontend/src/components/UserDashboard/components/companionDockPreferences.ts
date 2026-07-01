const STORAGE_PREFIX = 'swanstudios:companion-dock';

export const isCompanionDockEnabled = (flag: unknown): boolean => {
  if (flag === false) return false;
  if (typeof flag !== 'string') return true;
  const normalized = flag.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'off';
};

export const getCompanionDockStorageKey = (userIdSegment: string): string =>
  `${STORAGE_PREFIX}:${userIdSegment}:collapsed`;

const getBrowserStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readCompanionDockCollapsed = (
  userIdSegment: string,
  storage: Storage | null = getBrowserStorage(),
): boolean => {
  if (!storage || !userIdSegment) return false;
  try {
    return storage.getItem(getCompanionDockStorageKey(userIdSegment)) === 'true';
  } catch {
    return false;
  }
};

export const writeCompanionDockCollapsed = (
  userIdSegment: string,
  collapsed: boolean,
  storage: Storage | null = getBrowserStorage(),
): void => {
  if (!storage || !userIdSegment) return;
  try {
    storage.setItem(getCompanionDockStorageKey(userIdSegment), collapsed ? 'true' : 'false');
  } catch {
    // Persistence is a progressive enhancement only.
  }
};
