import type { CSSProperties } from 'react';

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

const token = {
  base: 'var(--bg-base, #030712)',
  elevated: 'var(--bg-elevated, #141419)',
  surface: 'var(--surface-primary, #003080)',
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  gold: 'var(--accent-gold, #C6A84B)',
  data: 'var(--accent-data, #50A0F0)',
  brand: 'var(--brand-primary, #002060)',
};

const shadowBase =
  `linear-gradient(180deg, ${token.base} 0%, color-mix(in srgb, ${token.brand} 28%, ${token.base}) 48%, ${token.base} 100%)`;

const bg = (
  id: string,
  name: string,
  mood: string,
  art: string,
  preview = art,
  markOpacity = '0.08',
  markPosition = 'center 42%',
  markSize = 'min(68vw, 900px)',
  markBlur = '0px',
): UserDashboardBackgroundRecipe => ({
  id,
  name,
  mood,
  base: shadowBase,
  art,
  preview,
  markOpacity,
  markPosition,
  markSize,
  markBlur,
});

export const USER_DASHBOARD_BACKGROUNDS = [
  bg('ghost-swan', 'Ghost Swan', 'soft logo shadow',
    `radial-gradient(ellipse at 50% 28%, color-mix(in srgb, ${token.primary} 16%, transparent), transparent 48%),
     radial-gradient(circle at 50% 45%, color-mix(in srgb, ${token.secondary} 12%, transparent), transparent 34%),
     ${shadowBase}`),
  bg('crystalline-topography', 'Crystalline Topography', 'quiet cut-glass map',
    `linear-gradient(120deg, transparent 0 28%, color-mix(in srgb, ${token.primary} 8%, transparent) 29% 30%, transparent 31% 58%, color-mix(in srgb, ${token.secondary} 7%, transparent) 59% 60%, transparent 61%),
     radial-gradient(circle at 18% 72%, color-mix(in srgb, ${token.data} 12%, transparent), transparent 42%),
     ${shadowBase}`, undefined, '0.045', '78% 68%', 'min(54vw, 720px)', '1px'),
  bg('deep-ocean-vault', 'Deep Ocean Vault', 'submerged sapphire depth',
    `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${token.primary} 18%, transparent), transparent 56%),
     linear-gradient(180deg, color-mix(in srgb, ${token.surface} 32%, ${token.base}), ${token.base} 78%),
     radial-gradient(circle at 82% 82%, color-mix(in srgb, ${token.secondary} 9%, transparent), transparent 38%)`),
  bg('aurora-canopy', 'Aurora Canopy', 'green-blue forest glow',
    `radial-gradient(ellipse at 20% 5%, color-mix(in srgb, ${token.gold} 13%, transparent), transparent 46%),
     radial-gradient(ellipse at 72% 16%, color-mix(in srgb, ${token.primary} 18%, transparent), transparent 54%),
     linear-gradient(145deg, color-mix(in srgb, ${token.brand} 28%, ${token.base}), ${token.base})`, undefined, '0.07'),
  bg('obsidian-carbon', 'Obsidian Carbon', 'near-black texture',
    `repeating-linear-gradient(135deg, color-mix(in srgb, ${token.elevated} 42%, transparent) 0 1px, transparent 1px 22px),
     radial-gradient(circle at 78% 26%, color-mix(in srgb, ${token.secondary} 11%, transparent), transparent 34%),
     ${shadowBase}`, undefined, '0.055', '50% 52%', 'min(62vw, 820px)', '2px'),
  bg('crown-nebula', 'Crown Nebula', 'gold and violet halo',
    `radial-gradient(circle at 50% 24%, color-mix(in srgb, ${token.gold} 20%, transparent), transparent 28%),
     radial-gradient(circle at 58% 34%, color-mix(in srgb, ${token.secondary} 20%, transparent), transparent 42%),
     ${shadowBase}`, undefined, '0.08'),
  bg('training-pulse-grid', 'Training Pulse Grid', 'subtle data rhythm',
    `linear-gradient(color-mix(in srgb, ${token.primary} 7%, transparent) 1px, transparent 1px),
     linear-gradient(90deg, color-mix(in srgb, ${token.primary} 6%, transparent) 1px, transparent 1px),
     radial-gradient(circle at 28% 32%, color-mix(in srgb, ${token.data} 15%, transparent), transparent 38%),
     ${shadowBase}`, undefined, '0.045', '74% 52%', 'min(48vw, 680px)', '1px'),
  bg('glass-wing-refraction', 'Glass Wing Refraction', 'large feather prisms',
    `linear-gradient(118deg, transparent 0 18%, color-mix(in srgb, ${token.primary} 13%, transparent) 19% 26%, transparent 27% 46%, color-mix(in srgb, ${token.secondary} 10%, transparent) 47% 55%, transparent 56%),
     radial-gradient(circle at 75% 35%, color-mix(in srgb, ${token.primary} 14%, transparent), transparent 42%),
     ${shadowBase}`, undefined, '0.09', '28% 56%', 'min(58vw, 780px)', '0px'),
  bg('forge-ember-shadow', 'Forge Ember Shadow', 'warm bronze edge',
    `radial-gradient(circle at 18% 86%, color-mix(in srgb, ${token.gold} 20%, transparent), transparent 34%),
     radial-gradient(circle at 86% 18%, color-mix(in srgb, ${token.secondary} 10%, transparent), transparent 32%),
     linear-gradient(180deg, ${token.base}, color-mix(in srgb, ${token.gold} 8%, ${token.base}))`, undefined, '0.05'),
  bg('void-crystal', 'Void Crystal', 'black ice facets',
    `conic-gradient(from 210deg at 50% 50%, transparent 0 15%, color-mix(in srgb, ${token.primary} 10%, transparent) 18%, transparent 28%, color-mix(in srgb, ${token.secondary} 12%, transparent) 36%, transparent 52%),
     radial-gradient(circle at 50% 50%, color-mix(in srgb, ${token.primary} 10%, transparent), transparent 54%),
     ${shadowBase}`, undefined, '0.065', 'center', 'min(62vw, 860px)', '1px'),
  bg('sapphire-prism-storm', 'Sapphire Prism Storm', 'electric shard field',
    `linear-gradient(62deg, transparent 0 20%, color-mix(in srgb, ${token.primary} 18%, transparent) 21% 22%, transparent 23% 52%, color-mix(in srgb, ${token.data} 14%, transparent) 53% 55%, transparent 56%),
     radial-gradient(circle at 72% 24%, color-mix(in srgb, ${token.secondary} 16%, transparent), transparent 38%),
     ${shadowBase}`, undefined, '0.055'),
  bg('lunar-ice-chapel', 'Lunar Ice Chapel', 'arched quiet light',
    `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${token.primary} 20%, transparent), transparent 40%),
     linear-gradient(90deg, transparent 0 15%, color-mix(in srgb, ${token.primary} 8%, transparent) 16% 17%, transparent 18% 82%, color-mix(in srgb, ${token.primary} 8%, transparent) 83% 84%, transparent 85%),
     ${shadowBase}`, undefined, '0.075', '50% 30%', 'min(48vw, 660px)', '0px'),
  bg('emerald-circuit-grove', 'Emerald Circuit Grove', 'organic signal lines',
    `linear-gradient(90deg, color-mix(in srgb, ${token.gold} 5%, transparent) 1px, transparent 1px),
     radial-gradient(circle at 22% 22%, color-mix(in srgb, ${token.gold} 12%, transparent), transparent 34%),
     radial-gradient(circle at 76% 70%, color-mix(in srgb, ${token.primary} 14%, transparent), transparent 44%),
     ${shadowBase}`, undefined, '0.05', '70% 58%', 'min(56vw, 740px)', '1px'),
  bg('royal-depth-marble', 'Royal Depth Marble', 'dark liquid veining',
    `radial-gradient(ellipse at 18% 12%, color-mix(in srgb, ${token.secondary} 12%, transparent), transparent 38%),
     radial-gradient(ellipse at 80% 74%, color-mix(in srgb, ${token.primary} 16%, transparent), transparent 46%),
     linear-gradient(127deg, transparent 0 44%, color-mix(in srgb, ${token.gold} 9%, transparent) 45% 46%, transparent 47%),
     ${shadowBase}`, undefined, '0.06'),
  bg('swan-eclipse', 'Swan Eclipse', 'centered shadow ring',
    `radial-gradient(circle at 50% 42%, transparent 0 18%, color-mix(in srgb, ${token.primary} 13%, transparent) 19% 21%, transparent 22% 42%),
     radial-gradient(circle at 50% 42%, color-mix(in srgb, ${token.secondary} 15%, transparent), transparent 52%),
     ${shadowBase}`, undefined, '0.1', 'center 43%', 'min(60vw, 800px)', '0px'),
  bg('neon-rain-window', 'Neon Rain Window', 'vertical light streaks',
    `repeating-linear-gradient(90deg, transparent 0 26px, color-mix(in srgb, ${token.primary} 8%, transparent) 27px 28px, transparent 29px 58px),
     radial-gradient(circle at 78% 18%, color-mix(in srgb, ${token.secondary} 16%, transparent), transparent 38%),
     ${shadowBase}`, undefined, '0.04', '22% 52%', 'min(44vw, 620px)', '2px'),
  bg('gold-feather-dust', 'Gold Feather Dust', 'small luxury sparks',
    `radial-gradient(circle at 18% 20%, color-mix(in srgb, ${token.gold} 18%, transparent) 0 1px, transparent 2px),
     radial-gradient(circle at 74% 32%, color-mix(in srgb, ${token.primary} 14%, transparent) 0 1px, transparent 2px),
     radial-gradient(circle at 44% 78%, color-mix(in srgb, ${token.gold} 12%, transparent), transparent 36%),
     ${shadowBase}`, undefined, '0.055'),
  bg('arctic-data-aurora', 'Arctic Data Aurora', 'analytics glow curtain',
    `linear-gradient(180deg, color-mix(in srgb, ${token.primary} 15%, transparent), transparent 42%),
     repeating-linear-gradient(90deg, color-mix(in srgb, ${token.data} 7%, transparent) 0 2px, transparent 2px 44px),
     radial-gradient(ellipse at 60% 18%, color-mix(in srgb, ${token.secondary} 14%, transparent), transparent 44%),
     ${shadowBase}`, undefined, '0.05'),
  bg('crimson-velvet-vault', 'Crimson Velvet Vault', 'deep rare-theme shadow',
    `radial-gradient(circle at 25% 28%, color-mix(in srgb, var(--accent-error, #EF4444) 12%, transparent), transparent 36%),
     radial-gradient(circle at 82% 70%, color-mix(in srgb, ${token.gold} 13%, transparent), transparent 38%),
     ${shadowBase}`, undefined, '0.045', '75% 48%', 'min(54vw, 700px)', '2px'),
  bg('haloed-deep-space', 'Haloed Deep Space', 'wide orbit glow',
    `radial-gradient(circle at 50% 48%, transparent 0 28%, color-mix(in srgb, ${token.primary} 12%, transparent) 29% 30%, transparent 31% 62%),
     radial-gradient(circle at 50% 48%, color-mix(in srgb, ${token.secondary} 14%, transparent), transparent 54%),
     ${shadowBase}`, undefined, '0.08', 'center', 'min(70vw, 940px)', '1px'),
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
