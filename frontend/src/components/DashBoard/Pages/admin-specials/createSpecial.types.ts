/**
 * createSpecial.types.ts — options + types for the admin Create Special form.
 * Mirrors the backend contract (POST /api/custom-packages) and BASE_PACKAGES.
 */

export interface BasePackageOption {
  key: string;
  label: string;
  paidSessions: number;
}

/** Must match backend BASE_PACKAGES keys (customPackageRoutes.mjs). */
export const BASE_PACKAGES: BasePackageOption[] = [
  { key: '10-pack', label: '10 Sessions', paidSessions: 10 },
  { key: '24-pack', label: '24 Sessions', paidSessions: 24 },
  { key: '3-month', label: '3-Month · 52 Sessions', paidSessions: 52 },
  { key: '6-month', label: '6-Month · 108 Sessions', paidSessions: 108 },
  { key: '12-month', label: '12-Month · 208 Sessions', paidSessions: 208 },
  { key: 'express', label: 'Express · 10 × 30-min', paidSessions: 10 },
];

/** Effective $/session quick-pick presets (Sean's stated tiers), high → generous. */
export const PRESET_TIERS: number[] = [100, 90, 80, 70, 60];

export type ValidityType = 'one_time' | 'n_times' | 'time_window' | 'ongoing';

export interface ValidityOption {
  key: ValidityType;
  label: string;
  hint: string;
}

export const VALIDITY_OPTIONS: ValidityOption[] = [
  { key: 'one_time', label: 'One-time', hint: 'Single purchase, then it closes' },
  { key: 'n_times', label: 'A few times', hint: 'Re-buyable 2–4 times' },
  { key: 'time_window', label: 'Time window', hint: 'Re-buyable until an end date' },
  { key: 'ongoing', label: 'Ongoing', hint: 'Stays open until you turn it off' },
];

/** Request body for POST /api/custom-packages. */
export interface CreateSpecialPayload {
  clientId: number;
  basePackageType: string;
  targetEffectiveRate?: number;
  bonusSessions?: number;
  validityType: ValidityType;
  maxRedemptions?: number;
  expiresAt?: string | null;
  belowThresholdApproved?: boolean;
  overrideReason?: string | null;
  name?: string;
  description?: string;
  adminNote?: string;
}
