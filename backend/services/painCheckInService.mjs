/**
 * PainCheckInService — post-workout pain check-in (the closed loop)
 * =================================================================
 * Pain-Chart Slice 5 (C6, PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04): the
 * workout log was the single highest-frequency client touchpoint and it
 * collected NOTHING about pain. A check-in is framed as performance data
 * ("how did the shoulder respond under load today?"), not injury confession
 * (F8 — the system must not punish honesty).
 *
 * Gate direction is asymmetric ON PURPOSE (mirrors the F2 trainer gate):
 *  - WORSE than the active entry → severity raised immediately (the safe
 *    direction; flows through the model hooks → revision + trend point).
 *  - SAME or BETTER → recorded as an acknowledgment only; improvements are
 *    confirmed WITH the trainer, never silently self-cleared.
 *  - No active entry + level >= 4 → a NEW entry via the validated write
 *    path (episode hook links it to any recent same-region episode).
 *  - No active entry + level 1-3 → acknowledged, no entry (noise floor).
 */
import { getModel } from '../models/index.mjs';
import { PAIN_INTAKE_REGION_SET } from './training-cortex/ontology/regionMuscleMap.mjs';
import logger from '../utils/logger.mjs';

const NEW_ENTRY_THRESHOLD = 4;

/**
 * Process one post-workout check-in item for a client.
 *
 * @param {{ userId: number, actorId: number, bodyRegion: string, side?: string, painLevel: number }} input
 * @returns {Promise<{ outcome: 'raised'|'acknowledged'|'created'|'noted_mild', entryId: number|null, message: string }>}
 * @throws {Error} on validation failure (invalid region / level)
 */
export async function processPainCheckIn({ userId, actorId, bodyRegion, side, painLevel }) {
  if (!PAIN_INTAKE_REGION_SET.has(bodyRegion)) {
    throw new Error(`Invalid bodyRegion: "${bodyRegion}".`);
  }
  const level = Number(painLevel);
  if (!Number.isInteger(level) || level < 0 || level > 10) {
    throw new Error(`painLevel must be an integer between 0 and 10. Got: ${painLevel}`);
  }
  const resolvedSide = side || 'center';
  const ClientPainEntry = getModel('ClientPainEntry');

  const activeEntry = await ClientPainEntry.findOne({
    where: { userId, bodyRegion, side: resolvedSide, isActive: true },
    order: [['painLevel', 'DESC']],
  });

  if (activeEntry) {
    if (level > Number(activeEntry.painLevel)) {
      await activeEntry.update({ painLevel: level, lastConfirmedAt: new Date() }, { revisionActorId: actorId });
      logger.info('[PainCheckIn] severity raised from check-in', { userId, bodyRegion, from: activeEntry.previous?.('painLevel'), to: level });
      return {
        outcome: 'raised',
        entryId: activeEntry.id,
        message: `Noted — ${bodyRegion} updated to ${level}/10. Your trainer will see this before your next plan.`,
      };
    }
    // Same or better: acknowledged, trainer confirms improvements (F2/F8).
    return {
      outcome: 'acknowledged',
      entryId: activeEntry.id,
      message: level < Number(activeEntry.painLevel)
        ? 'Great sign — improvements are confirmed together with your trainer at the next review.'
        : 'Noted — thanks for checking in.',
    };
  }

  if (level >= NEW_ENTRY_THRESHOLD) {
    const entry = await ClientPainEntry.create({
      userId,
      createdById: actorId,
      bodyRegion,
      side: resolvedSide,
      painLevel: level,
      painContext: 'loaded_movement',
      description: 'Reported during post-workout check-in',
      lastConfirmedAt: new Date(),
      isActive: true,
    });
    return {
      outcome: 'created',
      entryId: entry.id,
      message: `Logged ${bodyRegion} at ${level}/10 from today's session — your trainer will review it.`,
    };
  }

  return {
    outcome: 'noted_mild',
    entryId: null,
    message: 'Noted — mild and not tracked as an issue. Mention it to your trainer if it comes back.',
  };
}

export default { processPainCheckIn };
