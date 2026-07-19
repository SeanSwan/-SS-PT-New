/**
 * Dashboards v2 — authHeaders. The backend `protect` middleware reads the JWT ONLY from the
 * `Authorization: Bearer <token>` header (no cookie fallback), so every authenticated v2 call must
 * attach it. Token source is the app-canonical ProductionTokenManager (same source the shared axios
 * interceptor uses) — we keep the raw fetch (correct absolute /api path + abort/poll already built)
 * and add just the missing header. Public endpoints (e.g. /api/config/public-flags) don't use this.
 */
import { ProductionTokenManager } from '../../../services/api.service';

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = ProductionTokenManager.getToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
