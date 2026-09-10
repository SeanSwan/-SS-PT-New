/** Bounded durable receipt reads. No model/provider calls or domain mutations.
 * Queries actor scope or an explicitly authorized client, then checks fresh
 * assignment batches. A capped empty page retains opaque continuation.
 * Full pages anchor before readable lookahead; exhaustion alone clears cursor.
 */
import { Op } from 'sequelize';
import { encodeCoachIntentCursor, decodeCoachIntentCursor } from './coachIntentCursor.mjs';
import { toPublicCoachIntent } from './coachIntentService.mjs';
const ROLES = new Set(['admin', 'trainer', 'client', 'user']);
const BATCH_SIZE = 50;
const MAX_BATCHES = 10;
const positive = value => (typeof value === 'string' || typeof value === 'number')
  && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
export const isCoachReceiptReader = user => positive(user?.id) && ROLES.has(user?.role);
export class CoachIntentListError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const unavailable = () => new CoachIntentListError(503, 'Coach intent history is unavailable.');
const cursorWhere = cursor => ({ [Op.or]: [
  { createdAt: { [Op.lt]: cursor.createdAt } },
  { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
] });

async function allowedTargets(user, targets, readAssignedClientIds) {
  if (user.role === 'admin') return new Set(targets);
  if (user.role === 'client' || user.role === 'user')
    return new Set(targets.filter(id => id === Number(user.id)));
  if (!targets.length) return new Set();
  try {
    const allowed = await readAssignedClientIds(Number(user.id), targets);
    if (!Array.isArray(allowed)) throw unavailable();
    const candidates = new Set(targets);
    return new Set(allowed.filter(positive).map(Number).filter(id => candidates.has(id)));
  } catch { throw unavailable(); }
}

export async function listCoachIntents({ model, user, targetClientId = null, limit = 20,
  cursor: token, readAssignedClientIds }) {
  if (!isCoachReceiptReader(user)) throw new CoachIntentListError(404, 'Intent not found or unavailable.');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new CoachIntentListError(400, 'limit must be an integer from 1 to 50.');
  if (targetClientId !== null && !positive(targetClientId))
    throw new CoachIntentListError(400, 'targetClientId must be a positive integer.');
  const target = targetClientId === null ? null : Number(targetClientId);
  const scope = { actorId: Number(user.id), role: user.role, targetClientId: target };
  let cursor = token === undefined ? null : decodeCoachIntentCursor(token, scope);
  if (token !== undefined && !cursor) throw new CoachIntentListError(400, 'cursor is invalid.');
  if (target !== null && !(await allowedTargets(user, [target], readAssignedClientIds)).has(target))
    throw new CoachIntentListError(404, 'Intent not found or unavailable.');
  const baseWhere = target === null ? { actorId: Number(user.id) } : { targetClientId: target };
  const visible = [];
  let exhausted = false;
  let tail = null;
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const rows = await model.findAll({ where: cursor ? { ...baseWhere, ...cursorWhere(cursor) } : baseWhere,
      order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: BATCH_SIZE });
    if (!Array.isArray(rows) || rows.length > BATCH_SIZE) throw unavailable();
    if (!rows.length) { exhausted = true; break; }
    const targets = [...new Set(rows.map(row => row.targetClientId).filter(positive).map(Number))];
    const allowed = target === null ? await allowedTargets(user, targets, readAssignedClientIds) : new Set([target]);
    for (const row of rows) {
      const inScope = target === null ? Number(row.actorId) === Number(user.id) : Number(row.targetClientId) === target;
      const canRead = row.targetClientId === null ? Number(row.actorId) === Number(user.id)
        : positive(row.targetClientId) && allowed.has(Number(row.targetClientId));
      if (inScope && canRead) visible.push(row);
    }
    tail = rows.at(-1);
    const next = { createdAt: new Date(tail.createdAt), id: String(tail.id) };
    if (cursor && (next.createdAt > cursor.createdAt
      || (+next.createdAt === +cursor.createdAt && next.id >= cursor.id))) throw unavailable();
    cursor = next;
    if (visible.length > limit) break;
    if (rows.length < BATCH_SIZE) { exhausted = true; break; }
  }
  const page = visible.slice(0, limit);
  const anchor = visible.length > limit ? page.at(-1) : exhausted ? null : tail;
  return { intents: page.map(toPublicCoachIntent),
    nextCursor: anchor ? encodeCoachIntentCursor(anchor, scope) : null };
}
