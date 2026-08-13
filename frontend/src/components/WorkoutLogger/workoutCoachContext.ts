/**
 * MODULE: workoutCoachContext
 * Parent: WorkoutLoggerCoachTerminal (Swan Coach V3 · S3 · F3).
 * PURPOSE: Choose an AI conversation context the caller's role is actually
 * allowed to open.
 *
 * WHY THIS EXISTS
 * The Logger's Coach terminal hardcoded `context="workout_generation"` and
 * rendered with `defaultOpen`. `/log-workout` sits in the CLIENT route group,
 * and the server's allowlist (aiChatRoutes.mjs ROLE_CONTEXTS) does not grant
 * `workout_generation` to clients — so every client opening the Logger Coach got
 * a deterministic 403 from a panel that opened itself.
 *
 * WHY workout_suggestions AND NOT coach_assistant
 * Both are client-allowed. The Logger Coach needs equipment awareness (safe
 * swaps) and workout-date awareness (today's session); `workout_suggestions`
 * is in AI_CHAT_EQUIPMENT_CONTEXTS and AI_CHAT_WORKOUT_DATE_CONTEXTS and is in
 * neither AI_CHAT_SCHEDULE_CONTEXTS nor AI_CHAT_COVERAGE_CONTEXTS.
 * `coach_assistant` is in all four. Scheduling and client-coverage are trainer
 * concerns, so choosing `coach_assistant` would hand a client capabilities the
 * Logger does not need — a privilege expansion, which the V3 contract forbids
 * as a way of making the 403 go away.
 *
 * Trainers and admins keep `workout_generation`: they are allowed it, and it is
 * the richer context for authoring on a client's behalf.
 */

/** Contexts this surface may open, mirrored from the server allowlist. */
export const WORKOUT_COACH_CONTEXT = {
  /** Trainer/admin authoring for a client. */
  GENERATION: 'workout_generation',
  /** Least-privilege client-allowed context with equipment + workout-date scope. */
  SUGGESTIONS: 'workout_suggestions',
} as const;

export type WorkoutCoachContext =
  (typeof WORKOUT_COACH_CONTEXT)[keyof typeof WORKOUT_COACH_CONTEXT];

/** Roles the server grants `workout_generation` (aiChatRoutes.mjs ROLE_CONTEXTS). */
const GENERATION_ROLES = new Set(['trainer', 'admin']);

/**
 * Pick the richest context this role can actually open.
 *
 * Fails CLOSED: an unknown, missing, or unexpected role gets the client-safe
 * context. Guessing upward here would only reproduce the 403 this exists to fix.
 */
export const resolveWorkoutCoachContext = (role?: string | null): WorkoutCoachContext =>
  typeof role === 'string' && GENERATION_ROLES.has(role.toLowerCase())
    ? WORKOUT_COACH_CONTEXT.GENERATION
    : WORKOUT_COACH_CONTEXT.SUGGESTIONS;
