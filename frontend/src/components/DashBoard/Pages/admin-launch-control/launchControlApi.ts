/**
 * Launch Control — typed admin API layer. Routes every call through the shared authed axios client
 * (apiService, injects the Bearer token) — the repo convention (see admin-gallery/adminGalleryApi.ts).
 * Backend: /api/admin/flags (protect + authorize(['admin'])).
 */
import apiService from '../../../../services/api.service';

export interface FlagRow {
  flag: string;
  label: string;
  grp: string;
  parent_flag: string | null;
  health_threshold: number;
  value: boolean | null;
  mode: string | null;
  roles: string[] | null;
  pct: number | null;
  starts_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  fail24h: number;
  fail7d: number;
  envBase: boolean;
  hasOverride: boolean;
  resolved: boolean;
}

export interface VerifyResult {
  success: boolean;
  purged: boolean;
  reason?: string;
  hint?: string;
  purgedAt?: string;
}

export interface AuditEntry {
  flag: string;
  old_state: unknown;
  new_state: unknown;
  actor: string;
  source: string;
  created_at: string;
}

const BASE = '/api/admin/flags';

function messageFrom(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

export async function getBoard(): Promise<FlagRow[]> {
  try {
    const res = await apiService.get(BASE);
    return res.data?.flags ?? [];
  } catch (err) {
    throw new Error(messageFrom(err, 'Failed to load flags'));
  }
}

/** Set a force override to `value` (P0 = force only; affects everyone). Health is advisory, never a gate. */
export async function setFlag(flag: string, value: boolean): Promise<void> {
  try {
    await apiService.put(`${BASE}/${encodeURIComponent(flag)}`, { value, mode: 'force' });
  } catch (err) {
    throw new Error(messageFrom(err, 'Failed to update flag'));
  }
}

/** Clear the override → the feature returns to its environment baseline. */
export async function clearOverride(flag: string): Promise<void> {
  try {
    await apiService.delete(`${BASE}/${encodeURIComponent(flag)}/override`);
  } catch (err) {
    throw new Error(messageFrom(err, 'Failed to clear override'));
  }
}

export async function verify(): Promise<VerifyResult> {
  try {
    const res = await apiService.post(`${BASE}/verify`, {});
    return res.data;
  } catch (err) {
    throw new Error(messageFrom(err, 'Verify failed'));
  }
}

export async function getAudit(flag = '*', limit = 50): Promise<AuditEntry[]> {
  try {
    const res = await apiService.get(`${BASE}/${encodeURIComponent(flag)}/audit?limit=${limit}`);
    return res.data?.audit ?? [];
  } catch (err) {
    throw new Error(messageFrom(err, 'Failed to load audit'));
  }
}
