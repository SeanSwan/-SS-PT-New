import React from 'react';
import {
  CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
  USER_DASHBOARD_BACKGROUND_STORAGE_KEY,
  buildUserDashboardBackgroundStyle,
  getNextUserDashboardBackgroundId,
  getRotationIntervalMs,
  getUserDashboardBackground,
  normalizeBackgroundPreference,
  normalizeRotationMinutes,
  type UserDashboardBackgroundMode,
  type UserDashboardBackgroundPreference,
} from './UserDashboardBackgrounds';

const CUSTOM_BACKGROUND_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CUSTOM_BACKGROUND_MAX_FILE_SIZE = 8 * 1024 * 1024;
const CUSTOM_BACKGROUND_MAX_WIDTH = 1920;
const CUSTOM_BACKGROUND_MAX_HEIGHT = 1200;

function readStoredPreference(): UserDashboardBackgroundPreference {
  if (typeof window === 'undefined') return normalizeBackgroundPreference(null);
  try {
    const stored = window.localStorage.getItem(USER_DASHBOARD_BACKGROUND_STORAGE_KEY);
    return normalizeBackgroundPreference(stored ? JSON.parse(stored) : null);
  } catch {
    return normalizeBackgroundPreference(null);
  }
}

function persistPreference(preference: UserDashboardBackgroundPreference) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_DASHBOARD_BACKGROUND_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Visual preference only; failing closed to defaults is acceptable.
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read image'));
    image.src = src;
  });
}

export async function fileToCustomDashboardBackground(file: File): Promise<string> {
  if (!CUSTOM_BACKGROUND_ALLOWED_TYPES.includes(file.type) || file.size > CUSTOM_BACKGROUND_MAX_FILE_SIZE) {
    throw new Error('Unsupported background image');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(
      1,
      CUSTOM_BACKGROUND_MAX_WIDTH / Math.max(image.naturalWidth, 1),
      CUSTOM_BACKGROUND_MAX_HEIGHT / Math.max(image.naturalHeight, 1),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#030712';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useUserDashboardBackgroundPreference(logoUrl: string) {
  const [preference, setPreference] = React.useState<UserDashboardBackgroundPreference>(() => readStoredPreference());
  const [customUploadError, setCustomUploadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    persistPreference(preference);
  }, [preference]);

  React.useEffect(() => {
    if (preference.mode !== 'rotate') return undefined;
    const timer = window.setInterval(() => {
      setPreference((current) => ({
        ...current,
        selectedId: getNextUserDashboardBackgroundId(current.selectedId),
      }));
    }, getRotationIntervalMs(preference.intervalMinutes));
    return () => window.clearInterval(timer);
  }, [preference.mode, preference.intervalMinutes]);

  const setMode = React.useCallback((mode: UserDashboardBackgroundMode) => {
    setPreference((current) => ({ ...current, mode }));
  }, []);

  const setSelectedId = React.useCallback((selectedId: string) => {
    setPreference((current) => normalizeBackgroundPreference({ ...current, selectedId }));
  }, []);

  const setIntervalMinutes = React.useCallback((intervalMinutes: number) => {
    setPreference((current) => ({
      ...current,
      intervalMinutes: normalizeRotationMinutes(intervalMinutes),
    }));
  }, []);

  const setCustomImageFile = React.useCallback(async (file: File) => {
    try {
      setCustomUploadError(null);
      const customImageUrl = await fileToCustomDashboardBackground(file);
      setPreference((current) => normalizeBackgroundPreference({
        ...current,
        mode: 'fixed',
        selectedId: CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
        customImageUrl,
      }));
    } catch {
      setCustomUploadError('Use a JPG, PNG, or WebP under 8 MB.');
    }
  }, []);

  const activeBackground = React.useMemo(
    () => getUserDashboardBackground(preference.selectedId),
    [preference.selectedId],
  );

  const backgroundStyle = React.useMemo(
    () => buildUserDashboardBackgroundStyle(
      preference.selectedId,
      logoUrl,
      preference.customImageUrl,
    ),
    [logoUrl, preference.customImageUrl, preference.selectedId],
  );

  return {
    preference,
    activeBackground,
    backgroundStyle,
    customUploadError,
    setMode,
    setSelectedId,
    setIntervalMinutes,
    setCustomImageFile,
  };
}

export default useUserDashboardBackgroundPreference;
