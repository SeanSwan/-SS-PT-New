/**
 * ============================================================================
 * FILE: dispatchers/workoutSessionCommandDispatchers.mjs
 * PURPOSE: Workout-session write dispatchers for Swan Coach command execution
 * OWNER: Codex | CREATED: 2026-06-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Creates planned workout session shells from the AI command lane using the
 *   authoritative Sequelize WorkoutSession fields.
 */

import { getAllModels } from '../../../models/index.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toIsoDateString = (value) => {
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
    return value;
  }
  throw new Error('create_workout_session requires date in YYYY-MM-DD format');
};

/**
 * Dispatcher for create_workout_session.
 *
 * @param {{ clientId: number, date: string, notes?: string }} params
 * @param {{ user?: { id?: number|string, role?: string }, resolvedClient?: { id?: number|string } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchCreateWorkoutSession(params = {}, ctx = {}) {
  const { WorkoutSession } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const actorId = Number(ctx.user?.id) || null;
  const date = toIsoDateString(params.date);
  const sessionType = ['admin', 'trainer'].includes(ctx.user?.role) ? 'trainer-led' : 'solo';
  const trainerId = sessionType === 'trainer-led' ? actorId : null;
  const notes = typeof params.notes === 'string' ? params.notes : '';

  const session = await WorkoutSession.create({
    userId: clientId,
    title: `Planned workout - ${date}`,
    date: new Date(`${date}T00:00:00.000Z`),
    duration: 0,
    intensity: null,
    notes,
    status: 'planned',
    sessionType,
    sessionId: null,
    trainerId,
    isActive: false,
  });

  return {
    sessionId: session?.id ?? null,
    clientId,
    created: true,
    status: session?.status ?? 'planned',
    sessionType: session?.sessionType ?? sessionType,
    trainerId: session?.trainerId ?? trainerId,
    date,
    notesStored: Boolean(notes),
  };
}
