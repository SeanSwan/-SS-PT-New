/**
 * ============================================================================
 * FILE: dispatchers/setAvailabilityDispatcher.mjs
 * PURPOSE: Weekly availability write dispatcher for Swan Coach commands
 * OWNER: Codex | CREATED: 2026-05-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Handles set_availability as a merge-then-replace command. The availability
 *   service's weekly update API replaces the whole recurring schedule, so this
 *   dispatcher preserves existing active days before writing the dictated day.
 */

import availabilityService from '../../../services/availabilityService.mjs';
import {
  DAY_NAMES,
  resolveTrainerId,
  timeToMinutes,
  trimTime,
} from './availabilityDispatchers.mjs';

const DAY_NAME_TO_INDEX = new Map([
  ['sunday', 0],
  ['monday', 1],
  ['tuesday', 2],
  ['wednesday', 3],
  ['thursday', 4],
  ['friday', 5],
  ['saturday', 6],
]);

/**
 * Updates one recurring availability day without wiping other weekly slots.
 *
 * @param {{
 *   trainerId?: number,
 *   dayOfWeek: string,
 *   startTime: string,
 *   endTime: string
 * }} params
 * @param {{ user: { id: number, role: string } }} ctx
 * @returns {Promise<{
 *   trainerId: number,
 *   dayOfWeek: number,
 *   day: string,
 *   startTime: string,
 *   endTime: string,
 *   recurringSlotCount: number,
 *   preservedOtherDays: number
 * }>}
 */
export async function dispatchSetAvailability(params, ctx) {
  const trainerId = resolveTrainerId(params.trainerId ?? null, ctx.user);
  const dayKey = String(params.dayOfWeek || '').toLowerCase();
  const dayOfWeek = DAY_NAME_TO_INDEX.get(dayKey);
  const startTime = trimTime(params.startTime);
  const endTime = trimTime(params.endTime);

  if (!Number.isInteger(dayOfWeek)) {
    throw new Error(`"${params.dayOfWeek}" is not a supported day of week.`);
  }

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new Error(
      `End time (${endTime}) must be after start time (${startTime}). ` +
      'Overnight blocks are not supported.',
    );
  }

  const existing = await availabilityService.getAvailabilityForTrainer(trainerId);
  const recurring = Array.isArray(existing.recurring) ? existing.recurring : [];
  const preserved = recurring
    .filter((entry) => Number(entry.dayOfWeek) !== dayOfWeek)
    .filter((entry) => entry.isActive !== false)
    .map((entry) => ({
      dayOfWeek: Number(entry.dayOfWeek),
      startTime: trimTime(entry.startTime),
      endTime: trimTime(entry.endTime),
      type: entry.type || 'available',
    }));

  const nextSchedule = [
    ...preserved,
    {
      dayOfWeek,
      startTime,
      endTime,
      type: 'available',
    },
  ];

  const updated = await availabilityService.updateWeeklyAvailability(
    trainerId,
    nextSchedule,
  );

  return {
    trainerId,
    dayOfWeek,
    day: DAY_NAMES[dayOfWeek],
    startTime,
    endTime,
    recurringSlotCount: Array.isArray(updated) ? updated.length : nextSchedule.length,
    preservedOtherDays: preserved.length,
  };
}
