/**
 * ============================================================================
 * FILE: serverAppearanceSync.ts — FUSION F1 (lens-world-fusion blueprint §6)
 * PURPOSE: The ONLY transport between the Smart Lens appearance profile and
 * the server (/api/appearance/profile). Never throws — transport failure
 * resolves null/false so the UI keeps the honest offline story.
 * ============================================================================
 */
import apiService from '../../services/api.service';
import type { AppearanceProfile } from '../../core/style-lens-os';

export interface RemoteAppearance {
  profile: AppearanceProfile | null;
  /** F4 UserStyleOverlay — always null until the Style Studio ships. */
  overlay: unknown | null;
  updatedAt: string | null;
}

/** GET the stored appearance. First visit resolves {nulls}; failure resolves null. */
export const fetchProfile = async (): Promise<RemoteAppearance | null> => {
  try {
    const response = await apiService.get('/api/appearance/profile');
    const data = response?.data;
    if (!data?.success) return null;
    return {
      profile: data.profile ?? null,
      overlay: data.overlay ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch {
    return null;
  }
};

/** PUT the committed appearance. Resolves false on any failure (offline story). */
export const pushProfile = async (profile: AppearanceProfile): Promise<boolean> => {
  try {
    const response = await apiService.put('/api/appearance/profile', { profile });
    return response?.data?.success === true;
  } catch {
    return false;
  }
};
