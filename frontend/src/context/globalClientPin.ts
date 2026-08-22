/**
 * GlobalClientContext — pinned-client persistence helpers
 * =======================================================
 * Extracted from GlobalClientContext.tsx (SWA-192) to keep that file under the
 * 300-line cap (Rule 4). Pure functions only: no React, no module state, so the
 * shared-kiosk behaviour they encode is unit-testable without a DOM harness.
 */
import type { ActiveClient } from './GlobalClientContext';

/**
 * The pre-SWA-192 key: unscoped, and it held the FULL client record including
 * email. Kept only so existing tabs can be purged of it.
 */
export const LEGACY_ACTIVE_CLIENT_KEY = 'ss-active-client';

/**
 * Actor-namespaced storage key for the pinned client.
 *
 * sessionStorage is per-tab and SURVIVES logout in that tab. Trainers share
 * front-desk kiosks and floor tablets, so an unscoped key let the next person
 * to log in on the same tab inherit the previous trainer's pinned client.
 * Returns null for an unusable actor — deliberately, so there is no shared
 * fallback key for "unknown actor" to collide on.
 */
export const activeClientStorageKey = (
  actorId: number | string | null | undefined,
  actorRole: string | null | undefined,
): string | null => {
  const id = typeof actorId === 'number' ? actorId : Number(actorId);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (!actorRole) return null;
  return `${LEGACY_ACTIVE_CLIENT_KEY}:${id}:${actorRole}`;
};

/** Read the pinned client ID for this actor. Anything unparseable means "no pin". */
export const readStoredActiveClientId = (
  storage: Storage,
  actorId: number | string | null | undefined,
  actorRole: string | null | undefined,
): number | null => {
  const key = activeClientStorageKey(actorId, actorRole);
  if (!key) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

/**
 * Persist ONLY the client id. The record itself (name, email, photo) is never
 * written to storage — it is re-derived from the authorised roster on every
 * load, so a pin can never outlive the authorisation that produced it.
 */
export const writeStoredActiveClientId = (
  storage: Storage,
  actorId: number | string | null | undefined,
  actorRole: string | null | undefined,
  clientId: number | null,
): void => {
  const key = activeClientStorageKey(actorId, actorRole);
  if (!key) return;
  try {
    if (clientId === null || clientId === undefined) storage.removeItem(key);
    else storage.setItem(key, String(clientId));
  } catch {
    /* storage unavailable (private mode, quota) — the pin is a convenience, not state we owe */
  }
};

/** Remove the legacy unscoped record so stale client PII cannot linger in a shared tab. */
export const purgeLegacyActiveClient = (storage: Storage): void => {
  try {
    storage.removeItem(LEGACY_ACTIVE_CLIENT_KEY);
  } catch {
    /* nothing to do */
  }
};

/**
 * Resolve a pinned id against the freshly fetched AUTHORISED roster.
 *
 * A pin absent from that roster resolves to null — it is dropped, not kept. The
 * previous effect returned early in exactly this case, which is what let an
 * unassigned client stay pinned. Pure function of (pin, roster); "roster still
 * loading" is provider state and is guarded at the call site.
 */
export const reconcileActiveClient = (
  pinnedClientId: number | null,
  clientList: ActiveClient[],
): ActiveClient | null => {
  if (!pinnedClientId) return null;
  return clientList.find((client) => Number(client.id) === Number(pinnedClientId)) ?? null;
};

