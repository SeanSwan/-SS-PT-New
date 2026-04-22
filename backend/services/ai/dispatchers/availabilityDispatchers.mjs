/**
 * ============================================================================
 * FILE: dispatchers/availabilityDispatchers.mjs
 * PURPOSE: Dispatcher handlers for availability-domain AI commands
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Implements availability-domain command handlers.
 * Extracted into dispatchers/ to keep commandDispatcher.mjs under 300 lines.
 *
 * COMMANDS:
 *   A01: dispatchViewTrainerAvailability   (v13)
 *        Calls availabilityService.getAvailabilityForTrainer directly.
 *        Flattens nested recurring/overrides arrays to flat card-safe scalars.
 *        Graceful on missing table — returns honest empty result, no crash.
 *   A02: dispatchCreateAvailabilityOverride (v14)
 *        Calls availabilityService.createOverride (single-row additive write).
 *        Command-local real calendar-date validation + endTime > startTime guard.
 *        'available' type excluded — additive overrides only block/vacation time.
 *   A03: dispatchViewAvailableSlots        (v15)
 *        Calls availabilityService.getAvailableSlots for one date + duration.
 *        Shares the trainer/admin defaulting contract with A01/A02.
 *        Validates real calendar dates locally to avoid YYYY-MM-DD UTC drift.
 *
 * RBAC / DEFAULTING CONTRACT (voice-lane safety rule, shared by both handlers):
 *   - trainer, no trainerId supplied   => default to ctx.user.id (self-query)
 *   - trainer, other trainer's ID      => honest RBAC error before service call
 *   - admin,   explicit trainerId      => allowed
 *   - admin,   no trainerId            => honest error (admin must be explicit)
 *
 * WHY admin does NOT default to self:
 *   An admin saying "show my availability" may mean their admin user ID, which
 *   likely has no TrainerAvailability rows. Returning empty data silently is
 *   more confusing than an honest "please specify a trainer ID" prompt.
 *
 * WHY 'available' is excluded from override type:
 *   availabilityService.isTrainerAvailable treats overrides with type !== 'available'
 *   as blockers. A type:'available' override does NOT add open time via the recurring
 *   slots logic — it simply passes through unused and is misleading.
 */

import availabilityService from '../../../services/availabilityService.mjs';

// Day index → short name, matching JS Date.getDay() and TrainerAvailability.dayOfWeek
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Shared helper — resolve and assert trainerId for both A01 + A02 ──────────

/**
 * Resolves trainerId from params + ctx under the shared RBAC/defaulting contract.
 * Throws an honest error rather than silently defaulting to the wrong trainer.
 *
 * @param {number|null} rawTrainerId - params.trainerId (already null if not supplied)
 * @param {{ id: number, role: string }} user
 * @returns {number}
 */
function resolveTrainerId(rawTrainerId, user) {
  const isTrainer = user.role === 'trainer';
  const trainerId = rawTrainerId != null ? Number(rawTrainerId) : null;

  if (trainerId == null) {
    if (isTrainer) {
      return user.id;  // trainer self-query: default to own ID
    }
    // Admin without explicit trainerId — require it
    throw new Error(
      'Please specify a trainerId. ' +
      'Example: "block availability for trainer 42".'
    );
  }
  if (isTrainer && trainerId !== Number(user.id)) {
    throw new Error(
      'Trainers can only manage their own availability. ' +
      'Omit the trainer ID to act on your own schedule.'
    );
  }
  // Admin with explicit trainerId passes through unchanged
  return trainerId;
}

/**
 * Parse a YYYY-MM-DD string as a local calendar date without UTC drift.
 * Throws on impossible dates like 2026-02-31 instead of letting Date normalize.
 *
 * @param {string} date
 * @returns {Date}
 */
function parseDateOnlyLocal(date) {
  const [year, month, day] = String(date).split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    throw new Error(
      `"${date}" is not a valid calendar date. Please provide a real date in YYYY-MM-DD format.`
    );
  }
  return parsed;
}

// ── A01: view_trainer_availability ───────────────────────────────────────────

/**
 * Dispatcher for view_trainer_availability.
 * Returns a flat scalar summary of a trainer's recurring weekly availability.
 *
 * @param {{ trainerId?: number }} params
 * @param {{ user: { id: number, role: string } }} ctx
 * @returns {Promise<{
 *   trainerId, recurringSlotCount, daysWithAvailability, days,
 *   earliestStart, latestEnd, overrideCount
 * }>}
 */
export async function dispatchViewTrainerAvailability(params, ctx) {
  const trainerId = resolveTrainerId(params.trainerId ?? null, ctx.user);

  // ── Service call ───────────────────────────────────────────────────────────
  // availabilityService has graceful catch: if trainer_availability table doesn't
  // exist it returns { recurring: [], overrides: [] } and logs a warning.

  const data = await availabilityService.getAvailabilityForTrainer(trainerId);
  const recurring = Array.isArray(data.recurring) ? data.recurring : [];
  const overrides = Array.isArray(data.overrides) ? data.overrides : [];

  // ── Flatten to card-safe scalars ───────────────────────────────────────────

  const recurringSlotCount   = recurring.length;
  const daysWithAvailability = new Set(recurring.map(r => r.dayOfWeek)).size;

  // Build a sorted unique day abbreviation string (Sun, Mon, ...)
  const daySet = [...new Set(recurring.map(r => r.dayOfWeek))].sort();
  const days = daySet.length > 0
    ? daySet.map(d => DAY_NAMES[d] ?? String(d)).join(', ')
    : null;

  // Earliest start and latest end across all recurring blocks
  const startTimes = recurring.map(r => r.startTime).filter(Boolean).sort();
  const endTimes   = recurring.map(r => r.endTime).filter(Boolean).sort();
  const earliestStart = startTimes.length > 0 ? String(startTimes[0]).slice(0, 5) : null;
  const latestEnd     = endTimes.length   > 0 ? String(endTimes[endTimes.length - 1]).slice(0, 5) : null;

  return {
    trainerId,
    recurringSlotCount,
    daysWithAvailability,
    days,
    earliestStart,
    latestEnd,
    overrideCount: overrides.length,
  };
}

// ── A02: create_availability_override ────────────────────────────────────────

/**
 * Dispatcher for create_availability_override.
 * Creates a single-day non-recurring block on a trainer's schedule.
 * Confirmation-gated (requiresConfirmation: true, destructive: false).
 *
 * Validation performed here (beyond Zod DateSchema/TimeSchema shape checks):
 *   1. Real calendar-date: re-parses the date with Date constructor and verifies
 *      the reconstituted ISO string matches — catches JS normalization of invalid
 *      dates like "2026-02-31" which Date silently promotes to March 3.
 *   2. Time-range guard: endTime must be strictly after startTime (same-day only,
 *      no overnight blocks).
 *
 * @param {{
 *   trainerId?: number,
 *   date: string,       // YYYY-MM-DD
 *   startTime: string,  // HH:MM
 *   endTime: string,    // HH:MM
 *   type?: 'blocked' | 'vacation',
 *   reason?: string
 * }} params
 * @param {{ user: { id: number, role: string } }} ctx
 * @returns {Promise<{ overrideId, trainerId, date, startTime, endTime, type, reason }>}
 */
export async function dispatchCreateAvailabilityOverride(params, ctx) {
  const trainerId = resolveTrainerId(params.trainerId ?? null, ctx.user);
  const { date, startTime, endTime, type = 'blocked', reason = null } = params;

  // ── Real calendar-date validation ──────────────────────────────────────────
  // DateSchema validates YYYY-MM-DD shape but JS Date normalizes invalid dates:
  //   new Date('2026-02-31') → 2026-03-03. Catch that here.
  parseDateOnlyLocal(date);

  // ── Time-range guard ───────────────────────────────────────────────────────
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  if (toMin(endTime) <= toMin(startTime)) {
    throw new Error(
      `End time (${endTime}) must be after start time (${startTime}). ` +
      'Overnight blocks are not supported.'
    );
  }

  // ── Service call ───────────────────────────────────────────────────────────
  const created = await availabilityService.createOverride(trainerId, {
    date,
    startTime,
    endTime,
    type,
    reason: reason || null,
  });

  return {
    overrideId: created.id,
    trainerId,
    date:      created.effectiveFrom ?? date,
    startTime: created.startTime,
    endTime:   created.endTime,
    type:      created.type,
    reason:    created.reason ?? null,
  };
}

/**
 * Dispatcher for view_available_slots.
 * Returns a flat scalar summary of one trainer's open slots for a specific day.
 *
 * @param {{
 *   trainerId?: number,
 *   date: string,
 *   duration?: number
 * }} params
 * @param {{ user: { id: number, role: string } }} ctx
 * @returns {Promise<{
 *   trainerId: number,
 *   date: string,
 *   durationMinutes: number,
 *   availableSlotCount: number,
 *   firstSlotStartUtc: string|null,
 *   lastSlotEndUtc: string|null
 * }>}
 */
export async function dispatchViewAvailableSlots(params, ctx) {
  const trainerId = resolveTrainerId(params.trainerId ?? null, ctx.user);
  const date = String(params.date);
  const durationMinutes = Number(params.duration ?? 60);
  const targetDate = parseDateOnlyLocal(date);

  const slots = await availabilityService.getAvailableSlots(trainerId, targetDate, durationMinutes);
  const firstSlot = slots[0] ?? null;
  const lastSlot = slots[slots.length - 1] ?? null;

  return {
    trainerId,
    date,
    durationMinutes,
    availableSlotCount: slots.length,
    firstSlotStartUtc: firstSlot?.startTime?.slice(11, 16) ?? null,
    lastSlotEndUtc: lastSlot?.endTime?.slice(11, 16) ?? null,
  };
}
