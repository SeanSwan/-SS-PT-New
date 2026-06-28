import type { CSSProperties } from 'react';
import { USER_DASHBOARD_BACKGROUND_TOKENS as token, USER_DASHBOARD_BACKGROUNDS } from './UserDashboardBackgroundRecipes';
export { USER_DASHBOARD_BACKGROUNDS };

export type UserDashboardBackgroundMode = 'fixed' | 'rotate';

type DashboardBackgroundStyle = CSSProperties & Record<`--${string}`, string | number>;

export interface UserDashboardBackgroundRecipe {
  id: string;
  name: string;
  mood: string;
  preview: string;
  base: string;
  art: string;
  markOpacity: string;
  markPosition: string;
  markSize: string;
  markBlur: string;
}

export interface UserDashboardBackgroundPreference {
  mode: UserDashboardBackgroundMode;
  selectedId: string;
  intervalMinutes: number;
  customImageUrl: string | null;
}

export const USER_DASHBOARD_BACKGROUND_STORAGE_KEY = 'swanstudios.userDashboard.background.v1';
export const DEFAULT_USER_DASHBOARD_BACKGROUND_ID = 'ghost-swan';
export const DEFAULT_USER_DASHBOARD_ROTATION_MINUTES = 30;
export const CUSTOM_USER_DASHBOARD_BACKGROUND_ID = 'custom-photo';

export const USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS = [
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
  { minutes: 1440, label: 'Daily' },
] as const;



export type UserDashboardBackgroundId = (typeof USER_DASHBOARD_BACKGROUNDS)[number]['id'];

export const USER_DASHBOARD_BACKGROUND_IDS = USER_DASHBOARD_BACKGROUNDS.map((background) => background.id);

export function isUserDashboardBackgroundId(value: unknown): value is UserDashboardBackgroundId {
  return typeof value === 'string' && USER_DASHBOARD_BACKGROUND_IDS.includes(value as UserDashboardBackgroundId);
}

export function getUserDashboardBackground(id: unknown): UserDashboardBackgroundRecipe {
  return USER_DASHBOARD_BACKGROUNDS.find((background) => background.id === id)
    ?? USER_DASHBOARD_BACKGROUNDS[0];
}

export function isSafeCustomBackgroundUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return value.startsWith('data:image/');
}

export function normalizeRotationMinutes(value: unknown): number {
  const minutes = Number(value);
  const option = USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS.find((item) => item.minutes === minutes);
  return option?.minutes ?? DEFAULT_USER_DASHBOARD_ROTATION_MINUTES;
}

export function normalizeBackgroundPreference(value: unknown): UserDashboardBackgroundPreference {
  if (!value || typeof value !== 'object') {
    return {
      mode: 'fixed',
      selectedId: DEFAULT_USER_DASHBOARD_BACKGROUND_ID,
      intervalMinutes: DEFAULT_USER_DASHBOARD_ROTATION_MINUTES,
      customImageUrl: null,
    };
  }
  const raw = value as Partial<UserDashboardBackgroundPreference>;
  const customImageUrl = isSafeCustomBackgroundUrl(raw.customImageUrl) ? raw.customImageUrl : null;
  const selectedId = raw.selectedId === CUSTOM_USER_DASHBOARD_BACKGROUND_ID && customImageUrl
    ? CUSTOM_USER_DASHBOARD_BACKGROUND_ID
    : isUserDashboardBackgroundId(raw.selectedId)
      ? raw.selectedId
      : DEFAULT_USER_DASHBOARD_BACKGROUND_ID;

  return {
    mode: raw.mode === 'rotate' ? 'rotate' : 'fixed',
    selectedId,
    intervalMinutes: normalizeRotationMinutes(raw.intervalMinutes),
    customImageUrl,
  };
}

export function getNextUserDashboardBackgroundId(currentId: string): UserDashboardBackgroundId {
  const index = USER_DASHBOARD_BACKGROUNDS.findIndex((background) => background.id === currentId);
  const nextIndex = index < 0 ? 0 : (index + 1) % USER_DASHBOARD_BACKGROUNDS.length;
  return USER_DASHBOARD_BACKGROUNDS[nextIndex].id;
}

export function getRotationIntervalMs(minutes: number): number {
  return normalizeRotationMinutes(minutes) * 60 * 1000;
}

const escapeCssUrl = (url: string) => url.replace(/["\\]/g, '\\$&');

export function buildUserDashboardBackgroundStyle(
  id: string,
  logoUrl: string,
  customImageUrl: string | null = null,
): DashboardBackgroundStyle {
  if (id === CUSTOM_USER_DASHBOARD_BACKGROUND_ID && customImageUrl) {
    return buildCustomUserDashboardBackgroundStyle(customImageUrl, logoUrl);
  }
  const background = getUserDashboardBackground(id);
  const escapedLogo = escapeCssUrl(logoUrl);
  return {
    '--user-dashboard-bg-base': background.base,
    '--user-dashboard-bg-base-size': 'auto',
    '--user-dashboard-bg-base-position': 'center',
    '--user-dashboard-bg-base-repeat': 'no-repeat',
    '--user-dashboard-bg-art': background.art,
    '--user-dashboard-bg-mark-image': `url("${escapedLogo}")`,
    '--user-dashboard-bg-mark-opacity': background.markOpacity,
    '--user-dashboard-bg-mark-position': background.markPosition,
    '--user-dashboard-bg-mark-size': background.markSize,
    '--user-dashboard-bg-mark-blur': background.markBlur,
  };
}

export function buildCustomUserDashboardBackgroundStyle(imageUrl: string, logoUrl: string): DashboardBackgroundStyle {
  const escapedImage = escapeCssUrl(imageUrl);
  const escapedLogo = escapeCssUrl(logoUrl);
  return {
    '--user-dashboard-bg-base': `linear-gradient(180deg, color-mix(in srgb, ${token.base} 72%, transparent), ${token.base}), url("${escapedImage}")`,
    '--user-dashboard-bg-base-size': 'auto, cover',
    '--user-dashboard-bg-base-position': 'center, center',
    '--user-dashboard-bg-base-repeat': 'no-repeat, no-repeat',
    '--user-dashboard-bg-art': `radial-gradient(circle at 20% 20%, color-mix(in srgb, ${token.primary} 12%, transparent), transparent 36%),
      radial-gradient(circle at 78% 72%, color-mix(in srgb, ${token.secondary} 11%, transparent), transparent 42%),
      linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${token.base} 72%, transparent) 86%)`,
    '--user-dashboard-bg-mark-image': `url("${escapedLogo}")`,
    '--user-dashboard-bg-mark-opacity': '0.035',
    '--user-dashboard-bg-mark-position': '82% 82%',
    '--user-dashboard-bg-mark-size': 'min(32vw, 420px)',
    '--user-dashboard-bg-mark-blur': '2px',
  };
}
