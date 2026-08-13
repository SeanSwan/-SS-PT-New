/**
 * ============================================================================
 * FILE: sessionBlockAuthorization.mjs
 * PURPOSE: Single source of truth for WHOSE calendar a blocked-time request may
 *          write to. Imported by both the route boundary and the service.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S1 · F7)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE
 * The F7 defect existed because two copies of this decision disagreed. The
 * retired `routes/sessionRoutes.mjs` bound the actor first and was correct; the
 * live `UnifiedSessionService` reversed the operands and was not:
 *
 *     trainerId || (user.role === 'trainer' ? user.id : null)   // submitted wins
 *
 * A submitted id short-circuits the `||`, so the authenticated identity is never
 * consulted. One module, imported by every enforcement point, removes the class
 * of bug rather than this one instance of it. It deliberately imports nothing —
 * no database, no models, no logger — so every caller can enforce the policy
 * without dragging in infrastructure, and so it is testable in isolation.
 */

/**
 * Parse an optional id into a positive integer, or null when absent.
 * Mirrors `normalizeOptionalPositiveInteger` in session.service.mjs; kept local
 * so this module stays dependency-free.
 */
const parseOptionalId = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  // Only numbers and numeric strings are ids. `Number()` is far too forgiving to
  // be a validator on untrusted JSON: Number(true) === 1 and Number([5]) === 5,
  // so a boolean or a one-element array would sail through as a real trainer id.
  // A JSON body can carry either trivially.
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error('Invalid trainerId for blocked time: must be a positive integer');
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid trainerId for blocked time: must be a positive integer');
  }

  return parsed;
};

/**
 * Resolve the trainer whose calendar a blocked-time request may write to.
 *
 * Refuses rather than silently clamping. A request naming someone else's calendar
 * is a misuse; quietly rewriting it to the caller's own would hide both an attack
 * and an integration bug. Comparison is by numeric VALUE, because the live UI
 * posts `String(user.id)` from a select element — an identity check would reject
 * the normal path and turn a security fix into an outage.
 *
 * @param {{ requestedTrainerId: unknown, user: { id: number|string, role: string } }} input
 * @returns {number|null} trainer id to persist, or null for unassigned studio time
 * @throws {Error} 'Admin or trainer …' when the role may not block time at all
 * @throws {Error} 'Invalid trainerId …' when the target is malformed
 * @throws {Error} 'Not authorized …' when a trainer targets someone else
 */
export const resolveBlockedTimeSubject = ({ requestedTrainerId, user }) => {
  if (!user || !['admin', 'trainer'].includes(user.role)) {
    throw new Error('Admin or trainer privileges required to block time');
  }

  const requested = parseOptionalId(requestedTrainerId);

  if (user.role === 'admin') {
    return requested;
  }

  const self = Number(user.id);
  if (!Number.isInteger(self) || self <= 0) {
    // An authenticated trainer with no usable id must not fall through to a null
    // subject — that would silently create unassigned studio blocks instead.
    throw new Error('Not authorized to block time: authenticated trainer id is unusable');
  }

  if (requested !== null && requested !== self) {
    throw new Error('Not authorized to block time on another trainer\'s calendar');
  }

  return self;
};

export default resolveBlockedTimeSubject;
