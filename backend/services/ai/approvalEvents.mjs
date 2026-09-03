/**
 * approvalEvents.mjs — countable lifecycle events for the destructive-approval lane
 * =================================================================================
 * Blueprint v2 card 1.0. Every later card in Phase 1 changes approval UX; without
 * counters, "did it get better?" is a matter of opinion. This makes the lane's
 * lifecycle observable BEFORE the UX moves.
 *
 * WHY NO NEW COLUMN. `AiCommandAuditLog` has no `approvalEvent` field, and adding
 * one is a migration — Sean-gated (blast-radius) and disproportionate for a
 * counter. Events ride the EXISTING `outcome` column under an `approval:` prefix
 * (30-char cap respected: the longest is `approval:already_confirmed` at 26).
 * The prefix is the namespace, so:
 *   - existing SUCCESS/FAILURE_OUTCOMES sets in coachCommandMetricsSummary are
 *     untouched — an approval row matches none of them and cannot skew
 *     successRate (asserted in the tests);
 *   - the read side filters by the prefix alone, no schema knowledge needed.
 *
 * PRIVACY: an approval event carries ids, a command type and an enum. Never
 * params, never description text (that is the field a human reads and it can
 * carry a client's name via free text upstream).
 */
import { recordCommandAudit } from './commandAudit.mjs';

export const APPROVAL_EVENT_PREFIX = 'approval:';

/**
 * The closed set. Adding a member is a deliberate act — approvalEvents.test.mjs
 * asserts the set matches the events the lane actually emits, so a new event
 * that nobody counted fails the build rather than vanishing.
 */
export const APPROVAL_EVENTS = Object.freeze({
  MINTED: 'minted',
  READ_BACK: 'read_back',
  CONFIRMED: 'confirmed',
  CONSUMED: 'consumed',
  ALREADY_CONFIRMED: 'already_confirmed',
  RENDER_MISMATCH: 'render_mismatch',
  BURNED: 'burned',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  TIER_SPOOF: 'tier_spoof',
});

const VALID = new Set(Object.values(APPROVAL_EVENTS));

/** Where each event leaves the operation, for the audit row's own column. */
const CONFIRMATION_STATE_BY_EVENT = Object.freeze({
  [APPROVAL_EVENTS.MINTED]: 'pending',
  [APPROVAL_EVENTS.READ_BACK]: 'pending',
  [APPROVAL_EVENTS.CONFIRMED]: 'confirmed',
  [APPROVAL_EVENTS.CONSUMED]: 'confirmed',
  [APPROVAL_EVENTS.ALREADY_CONFIRMED]: 'confirmed',
  [APPROVAL_EVENTS.RENDER_MISMATCH]: 'rejected',
  [APPROVAL_EVENTS.TIER_SPOOF]: 'rejected',
  [APPROVAL_EVENTS.BURNED]: 'confirmed',
  [APPROVAL_EVENTS.CANCELLED]: 'cancelled',
  [APPROVAL_EVENTS.EXPIRED]: 'expired',
});

export function isApprovalEvent(name) {
  return VALID.has(name);
}

/** `minted` → `approval:minted`. Pure; used by both the writer and the reader. */
export function approvalOutcomeToken(event) {
  return `${APPROVAL_EVENT_PREFIX}${event}`;
}

/**
 * Record one approval lifecycle event. Best-effort by inheritance: this delegates
 * to recordCommandAudit, whose contract is that an audit failure never blocks a
 * user's command. An unknown event name is dropped with no write — a typo must
 * not silently create a new metric bucket.
 *
 * @returns {Promise<boolean>} whether a row was written
 */
export async function recordApprovalEvent({
  event,
  userId,
  userRole,
  commandType = null,
  operationId = null,
  targetClientId = null,
  destructive = false,
  errorCode = null,
  durationMs = null,
}) {
  if (!isApprovalEvent(event)) return false;
  return recordCommandAudit({
    userId,
    userRole,
    commandType,
    targetClientId,
    destructive,
    requiresConfirmation: true,
    // F-10 (GLM 5.3 round 1): this was hardcoded 'pending' for EVERY event, so
    // consumed/burned/expired/cancelled rows all claimed to be awaiting a
    // decision. An audit row that lies is worse than an absent one — any later
    // query on the column returns garbage with full confidence.
    confirmationState: CONFIRMATION_STATE_BY_EVENT[event] ?? 'pending',
    operationId,
    outcome: approvalOutcomeToken(event),
    errorCode,
    durationMs,
    // params deliberately omitted — see PRIVACY above.
  });
}

/** Read side: turn grouped audit rows into `{ [event]: count }`. Pure. */
export function shapeApprovalCounts(rows) {
  const counts = Object.fromEntries(Object.values(APPROVAL_EVENTS).map((e) => [e, 0]));
  for (const row of rows || []) {
    const outcome = row?.outcome;
    if (typeof outcome !== 'string' || !outcome.startsWith(APPROVAL_EVENT_PREFIX)) continue;
    const event = outcome.slice(APPROVAL_EVENT_PREFIX.length);
    if (!VALID.has(event)) continue;           // forward-compatible: ignore unknown
    counts[event] += Number(row.count) || 0;
  }
  return counts;
}
