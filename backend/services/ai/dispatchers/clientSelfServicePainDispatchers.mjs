/**
 * Client self-service pain dispatchers
 * ====================================
 * Lets authenticated clients log pain and receive a private, compact movement
 * safety summary. Freeform notes are written to the health record but never
 * echoed back to the AI command receipt.
 */
import { getAllModels } from '../../../models/index.mjs';
import { createPainEntry } from '../painWriteService.mjs';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const selfUserId = (ctx = {}) => toNumber(ctx.user?.id);

const normalizeRow = (row) => (typeof row?.toJSON === 'function' ? row.toJSON() : row);

const inferMovementPattern = (region) => {
  const normalized = String(region || '').toLowerCase();
  if (/(back|spine|core|lumbar|neck)/.test(normalized)) return 'core_spine';
  if (/(knee|quad|ham|hip|ankle|calf|glute|foot)/.test(normalized)) return 'lower_body';
  if (/(shoulder|elbow|wrist|hand|chest|arm)/.test(normalized)) return 'upper_body';
  return normalized ? 'mixed' : null;
};

export const dispatchTrackMyPain = async (params = {}, ctx = {}) => {
  // Slice 0 (C3): route through painWriteService so the client self-service
  // lane enforces the SAME validation as every other writer. The old inline
  // create accepted any garbage string as bodyRegion and silently clamped
  // non-numeric painLevel to 1/10 instead of erroring.
  const userId = selfUserId(ctx);
  // Chat/voice lane: the LLM emits natural phrasing ("lower back") — we
  // normalize to the canonical snake_case region BEFORE validation instead
  // of erroring at users for speaking like humans.
  const bodyRegion = String(params.bodyRegion || params.bodyPart || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const result = await createPainEntry(
    { bodyRegion, painLevel: params.painLevel, notes: params.notes },
    { clientId: userId, trainerId: userId } // self-service: createdById = self
  );

  return {
    entryId: result.entryId,
    userId,
    bodyRegion: result.bodyRegion,
    painLevel: toNumber(result.painLevel),
    isActive: result.isActive !== false,
  };
};

export const dispatchExercisesToAvoid = async (params = {}, ctx = {}) => {
  const { ClientPainEntry } = getAllModels();
  const userId = selfUserId(ctx);
  const limit = Math.min(20, Math.max(1, Number.parseInt(params.limit, 10) || 5));
  const rows = ClientPainEntry?.findAll ? await ClientPainEntry.findAll({
    where: { userId, isActive: true },
    attributes: ['id', 'bodyRegion', 'painLevel', 'createdAt'],
    order: [['painLevel', 'DESC'], ['createdAt', 'DESC']],
    limit,
  }) : [];
  const entries = rows.map(normalizeRow);
  const primary = entries[0] || null;
  const highestPainLevel = primary ? toNumber(primary.painLevel) : null;

  return {
    userId,
    activePainCount: entries.length,
    highestPainLevel,
    primaryRegion: primary?.bodyRegion ?? null,
    avoidHighImpact: highestPainLevel !== null && highestPainLevel >= 6,
    movementPattern: inferMovementPattern(primary?.bodyRegion),
  };
};
