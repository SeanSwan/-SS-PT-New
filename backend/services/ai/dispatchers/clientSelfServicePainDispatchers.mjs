/**
 * Client self-service pain dispatchers
 * ====================================
 * Lets authenticated clients log pain and receive a private, compact movement
 * safety summary. Freeform notes are written to the health record but never
 * echoed back to the AI command receipt.
 */
import { getAllModels } from '../../../models/index.mjs';

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
  const { ClientPainEntry } = getAllModels();
  const userId = selfUserId(ctx);
  const bodyRegion = String(params.bodyRegion || params.bodyPart || '').trim();
  const painLevel = Math.min(10, Math.max(1, toNumber(params.painLevel)));

  const entry = await ClientPainEntry.create({
    userId,
    createdById: userId,
    bodyRegion,
    painLevel,
    description: params.notes || null,
    isActive: true,
  });
  const row = normalizeRow(entry) || {};

  return {
    entryId: row.id ?? null,
    userId,
    bodyRegion: row.bodyRegion ?? bodyRegion,
    painLevel: toNumber(row.painLevel || painLevel),
    isActive: row.isActive !== false,
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
