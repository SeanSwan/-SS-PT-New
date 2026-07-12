import {
  DEFAULT_APPEARANCE_PROFILE,
  PROFILE_SCHEMA_VERSION,
} from './constants';
import type { AppearanceProfile } from './types';

export const APPEARANCE_STORAGE_KEY = 'style-lens-os:appearance-profile';
export const MAX_APPEARANCE_ENVELOPE_CHARS = 8_192;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface PersistenceEnvelope {
  sourceId: string;
  profile: unknown;
}

interface LegacyProfileV0 {
  profileSchemaVersion: 0;
  themeId: string;
  lensId: string;
  reducedMotion?: boolean;
  compact?: boolean;
  updatedAt: string;
}

export interface PersistenceReceipt {
  code: 'profile_reset';
  message: string;
}

export interface PersistenceLoadResult {
  profile: AppearanceProfile;
  receipt?: PersistenceReceipt;
}

export interface PersistenceOptions {
  storage: StorageLike;
  sourceId: string;
}

const resetResult = (): PersistenceLoadResult => ({
  profile: DEFAULT_APPEARANCE_PROFILE,
  receipt: {
    code: 'profile_reset',
    message: 'Saved appearance was invalid and Default was restored.',
  },
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isCurrentProfile = (value: unknown): value is AppearanceProfile => {
  if (!isObject(value)) return false;
  return (
    value.profileSchemaVersion === PROFILE_SCHEMA_VERSION &&
    typeof value.paletteThemeId === 'string' &&
    typeof value.styleLensId === 'string' &&
    ['auto', 'reduced', 'off'].includes(String(value.motionMode)) &&
    ['comfortable', 'compact'].includes(String(value.density)) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
};

const isLegacyProfileV0 = (value: unknown): value is LegacyProfileV0 =>
  isObject(value) &&
  value.profileSchemaVersion === 0 &&
  typeof value.themeId === 'string' &&
  typeof value.lensId === 'string' &&
  typeof value.updatedAt === 'string';

const migrateProfile = (value: unknown): AppearanceProfile | null => {
  if (isCurrentProfile(value)) return value;
  if (!isLegacyProfileV0(value)) return null;

  return {
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    paletteThemeId: value.themeId,
    styleLensId: value.lensId,
    motionMode: value.reducedMotion ? 'reduced' : 'auto',
    density: value.compact ? 'compact' : 'comfortable',
    updatedAt: value.updatedAt,
  };
};

const parseEnvelope = (value: string | null): PersistenceEnvelope | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isObject(parsed) ||
      typeof parsed.sourceId !== 'string' ||
      !('profile' in parsed)
    ) {
      return null;
    }
    return parsed as unknown as PersistenceEnvelope;
  } catch {
    return null;
  }
};

export const createAppearancePersistence = ({
  storage,
  sourceId,
}: PersistenceOptions) => ({
  load: (): PersistenceLoadResult => {
    const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw === null) return { profile: DEFAULT_APPEARANCE_PROFILE };
    if (raw.length > MAX_APPEARANCE_ENVELOPE_CHARS) return resetResult();

    const envelope = parseEnvelope(raw);
    const migrated = envelope ? migrateProfile(envelope.profile) : null;
    return migrated ? { profile: migrated } : resetResult();
  },

  save: (
    profile: AppearanceProfile,
    { suppressed }: { suppressed: boolean },
  ): boolean => {
    if (suppressed || !isCurrentProfile(profile)) return false;
    try {
      const serialized = JSON.stringify({ sourceId, profile });
      if (serialized.length > MAX_APPEARANCE_ENVELOPE_CHARS) return false;
      storage.setItem(
        APPEARANCE_STORAGE_KEY,
        serialized,
      );
      return true;
    } catch {
      return false;
    }
  },

  readExternal: (
    raw: string | null,
    current: AppearanceProfile,
    { suppressed = false }: { suppressed?: boolean } = {},
  ): AppearanceProfile | null => {
    if (suppressed || (raw?.length ?? 0) > MAX_APPEARANCE_ENVELOPE_CHARS) return null;
    const envelope = parseEnvelope(raw);
    if (!envelope || envelope.sourceId === sourceId) return null;
    const external = migrateProfile(envelope.profile);
    if (!external) return null;
    return Date.parse(external.updatedAt) > Date.parse(current.updatedAt)
      ? external
      : null;
  },
});
