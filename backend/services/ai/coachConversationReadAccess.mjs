/** G04.2b-A: request-local read orchestration, not a permission cache or write grant.
 * Canonical checkClientAccess owns relationship policy. Drivers have no supported
 * query AbortSignal here: retirement stops publication/new SQL, not in-flight SQL.
 */
import { Op } from 'sequelize';
import { checkClientAccess, parseContextClientId } from './contextEngine/clientAccess.mjs';

const READ_BUDGET_MS = 3000;
const MAX_ROWS = 50;
const MAX_CONCURRENT_CHECKS = 4;
const MAX_RELATIONSHIP_QUERIES = 100;
const ROLES = ['admin', 'trainer', 'client', 'user'];
const STAFF = new Set(['admin', 'trainer']);
const META_ATTRIBUTES = ['id', 'userId', 'role', 'status', 'targetUserId', 'context'];
export const COACH_SUMMARY_ATTRIBUTES = ['id', 'title', 'context', 'role', 'status', 'messageCount', 'lastMessageAt', 'createdAt', 'targetUserId'];
const DETAIL_ATTRIBUTES = [...META_ATTRIBUTES, 'title', 'messages', 'messageCount', 'metadata', 'lastMessageAt', 'createdAt'];
const FAILURES = {
  INVALID_COACH_READ_REQUEST: [400, 'Invalid Coach read request.'],
  COACH_TARGET_CONFLICT: [400, 'Requested target does not match the conversation.'],
  COACH_READ_FORBIDDEN: [403, 'Coach read is not available for this account.'],
  COACH_TARGET_ACCESS_DENIED: [403, 'Access to this Coach target is denied.'],
  COACH_CONVERSATION_NOT_FOUND: [404, 'Conversation not found.'],
  COACH_TARGET_NOT_FOUND: [404, 'Coach target not found.'],
  COACH_READ_UNAVAILABLE: [503, 'Coach read could not be verified. Please retry.'],
};

class CoachReadFailure extends Error {
  constructor(code) { super(FAILURES[code][1]); this.code = code; this.status = FAILURES[code][0]; }
}
const fail = code => { throw new CoachReadFailure(code); };
const unavailable = () => new CoachReadFailure('COACH_READ_UNAVAILABLE');
const plain = row => row?.get ? row.get({ plain: true }) : row;
const pick = (row, attributes) => Object.fromEntries(attributes.map(key => [key, row[key]]));

/** Each await races a single request deadline/disconnect, and checks admission
 * again before publishing. A losing promise remains observed by Promise.race. */
export function createCoachReadScope(req, res) {
  const controller = new AbortController();
  const deadline = Date.now() + READ_BUDGET_MS;
  let disconnected = false;
  let queries = 0;
  const stop = () => { if (!controller.signal.aborted) controller.abort(); };
  const disconnect = () => { if (!res.writableFinished) { disconnected = true; stop(); } };
  req.once('aborted', disconnect);
  res.once('close', disconnect);
  const timer = setTimeout(stop, READ_BUDGET_MS);
  const assertCurrent = () => {
    if (req.aborted || res.destroyed) { disconnected = true; stop(); }
    if (Date.now() >= deadline) stop();
    if (controller.signal.aborted) throw unavailable();
  };
  return {
    stop, assertCurrent,
    get disconnected() { return disconnected; },
    get stopped() { return controller.signal.aborted; },
    countRelationshipQuery() {
      assertCurrent();
      if (++queries > MAX_RELATIONSHIP_QUERIES) { stop(); throw unavailable(); }
    },
    async run(work) {
      assertCurrent();
      let onAbort;
      const cancelled = new Promise((_, reject) => {
        onAbort = () => reject(unavailable());
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      try {
        const result = await Promise.race([
          Promise.resolve().then(() => { assertCurrent(); return work(); }), cancelled,
        ]);
        assertCurrent();
        return result;
      } finally { controller.signal.removeEventListener('abort', onAbort); }
    },
    dispose() { clearTimeout(timer); req.removeListener('aborted', disconnect); res.removeListener('close', disconnect); },
  };
}

export function sendCoachReadFailure(res, error, scope) {
  scope.stop();
  if (scope.disconnected || res.destroyed || res.headersSent) return;
  const safe = error instanceof CoachReadFailure ? error : unavailable();
  return res.status(safe.status).json({ success: false, code: safe.code, error: safe.message });
}

/** Read raw query pairs so duplicate values cannot disappear in Express parsing. */
export function parseCoachReadRequest(req, kind, resolveAudience) {
  const actorId = parseContextClientId(req.user?.id);
  const role = req.user?.role;
  if (!actorId || !ROLES.includes(role) || (kind === 'admission' && !STAFF.has(role))) fail('COACH_READ_FORBIDDEN');
  const allowedKeys = kind === 'admission' ? ['targetUserId', 'conversationId', 'audienceRole']
    : kind === 'list' ? ['status', 'limit', 'offset', 'audienceRole'] : ['audienceRole'];
  const params = new URL(req.originalUrl || req.url, 'http://coach.local').searchParams;
  for (const key of params.keys()) {
    if (!allowedKeys.includes(key) || params.getAll(key).length !== 1) fail('INVALID_COACH_READ_REQUEST');
  }
  const audience = params.get('audienceRole');
  if (audience !== null && !ROLES.includes(audience)) fail('INVALID_COACH_READ_REQUEST');
  if (audience !== null && resolveAudience(role, audience) !== audience) fail('COACH_READ_FORBIDDEN');
  const audiences = audience === null ? ROLES.filter(candidate => resolveAudience(role, candidate) === candidate) : [audience];
  if (!audiences.length) fail('COACH_READ_FORBIDDEN');
  const optionalId = key => {
    if (!params.has(key)) return null;
    const id = parseContextClientId(params.get(key));
    if (!id) fail('INVALID_COACH_READ_REQUEST');
    return id;
  };
  const input = { actor: { id: actorId, role }, audiences };
  if (kind === 'admission') return { ...input, targetUserId: optionalId('targetUserId'), conversationId: optionalId('conversationId') };
  if (kind === 'detail') {
    const conversationId = parseContextClientId(req.params.id);
    if (!conversationId) fail('INVALID_COACH_READ_REQUEST');
    return { ...input, conversationId };
  }
  const limit = params.has('limit') ? optionalId('limit') : 20;
  const rawOffset = params.get('offset');
  if (rawOffset !== null && !/^(0|[1-9][0-9]*)$/.test(rawOffset)) fail('INVALID_COACH_READ_REQUEST');
  const offset = rawOffset === null ? 0 : Number(rawOffset);
  if (limit > MAX_ROWS || !Number.isSafeInteger(offset) || offset > 10000) fail('INVALID_COACH_READ_REQUEST');
  const allowedStatuses = ['active', 'archived'];
  const status = allowedStatuses.includes(params.get('status')) ? params.get('status') : 'active';
  return { ...input, limit, offset, status };
}

function metadata(row, input) {
  const value = plain(row);
  if (!value || parseContextClientId(value.userId) !== input.actor.id || !parseContextClientId(value.id)
    || !['active', 'archived'].includes(value.status) || !input.audiences.includes(value.role)) return null;
  const targetUserId = value.targetUserId === null ? null : parseContextClientId(value.targetUserId);
  if (targetUserId === null && value.targetUserId !== null) return null;
  if (!STAFF.has(input.actor.role) && targetUserId !== input.actor.id) return null;
  return { ...pick(value, META_ATTRIBUTES), id: parseContextClientId(value.id), userId: input.actor.id, targetUserId };
}

async function currentTargetAccess(scope, input, targetUserId, db) {
  scope.assertCurrent();
  if (targetUserId === null) return STAFF.has(input.actor.role);
  let verificationFailed = false;
  const accessDb = {
    QueryTypes: db.QueryTypes,
    async query(...args) {
      // Keep raw SQL/driver errors out of the legacy gate's detailed error log.
      // Empty rows are NEVER accepted as verification after an adapter failure:
      // the separate flag below discards the policy result and fails the request.
      if (verificationFailed || scope.stopped) { verificationFailed = true; return []; }
      try {
        scope.countRelationshipQuery();
        const rows = await scope.run(() => db.query(...args));
        if (!Array.isArray(rows)) throw unavailable();
        return rows;
      } catch { verificationFailed = true; scope.stop(); return []; }
    },
  };
  const decision = await scope.run(() => checkClientAccess(input.actor, targetUserId, accessDb));
  if (verificationFailed || decision.reason === 'verification_error') { scope.stop(); throw unavailable(); }
  scope.assertCurrent();
  return decision.allowed === true;
}

async function ownedMetadata(scope, input, Conversation) {
  const found = await scope.run(() => Conversation.findOne({
    where: { id: input.conversationId, userId: input.actor.id, status: { [Op.in]: ['active', 'archived'] }, role: { [Op.in]: input.audiences } },
    attributes: META_ATTRIBUTES,
  }));
  const result = metadata(found, input);
  if (!result) fail('COACH_CONVERSATION_NOT_FOUND');
  return result;
}

export async function readCoachTargetAdmission(scope, input, { Conversation, db, getUser }) {
  let targetUserId = input.targetUserId;
  if (input.conversationId !== null) {
    const meta = await ownedMetadata(scope, input, Conversation);
    if (targetUserId !== null && targetUserId !== meta.targetUserId) fail('COACH_TARGET_CONFLICT');
    targetUserId = meta.targetUserId;
  }
  if (!await currentTargetAccess(scope, input, targetUserId, db)) fail('COACH_TARGET_ACCESS_DENIED');
  if (input.conversationId === null && targetUserId !== null) {
    const target = await scope.run(() => getUser().findByPk(targetUserId, { attributes: ['id'] }));
    if (!target || parseContextClientId(target.id) !== targetUserId) fail('COACH_TARGET_NOT_FOUND');
  }
  scope.assertCurrent();
  return { success: true, access: { scope: 'coach_target_read', actorUserId: input.actor.id, actorRole: input.actor.role,
    targetUserId, conversationId: input.conversationId } };
}

export async function readCoachConversationList(scope, input, { Conversation, db }) {
  const rows = await scope.run(() => Conversation.findAll({
    where: { userId: input.actor.id, status: input.status, role: { [Op.in]: input.audiences } },
    attributes: [...COACH_SUMMARY_ATTRIBUTES, 'userId'],
    order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC'], ['id', 'DESC']],
    limit: input.limit, offset: input.offset,
  }));
  if (!Array.isArray(rows) || rows.length > input.limit) throw unavailable();
  const candidates = rows.map(row => ({ row: plain(row), meta: metadata(row, input) }));
  const targets = [...new Set(candidates.filter(item => item.meta).map(item => item.meta.targetUserId))];
  const decisions = new Map();
  let next = 0;
  const worker = async () => {
    while (next < targets.length) {
      scope.assertCurrent();
      const target = targets[next++];
      try { decisions.set(target, await currentTargetAccess(scope, input, target, db)); }
      catch (error) { scope.stop(); throw error; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_CHECKS, targets.length) }, worker));
  scope.assertCurrent();
  const conversations = candidates.filter(item => item.meta && decisions.get(item.meta.targetUserId) === true)
    .map(item => pick({ ...item.row, targetUserId: item.meta.targetUserId }, COACH_SUMMARY_ATTRIBUTES));
  const full = rows.length === input.limit;
  return { success: true, conversations, total: null, totalIsExact: false,
    nextOffset: full && input.offset + input.limit <= 10000 ? input.offset + input.limit : null,
    hasMore: full ? null : false };
}

export async function readCoachConversationDetail(scope, input, { Conversation, db, sanitizeMetadata }) {
  const meta = await ownedMetadata(scope, input, Conversation);
  if (!await currentTargetAccess(scope, input, meta.targetUserId, db)) fail('COACH_TARGET_ACCESS_DENIED');
  const found = plain(await scope.run(() => Conversation.findOne({
    where: pick(meta, META_ATTRIBUTES), attributes: DETAIL_ATTRIBUTES,
  })));
  const current = metadata(found, input);
  if (!current || META_ATTRIBUTES.some(key => current[key] !== meta[key])) fail('COACH_CONVERSATION_NOT_FOUND');
  // A previous receipt/memo is not a lease. Recheck after the payload read.
  if (!await currentTargetAccess(scope, input, meta.targetUserId, db)) fail('COACH_TARGET_ACCESS_DENIED');
  scope.assertCurrent();
  return { success: true, conversation: { ...pick(found, COACH_SUMMARY_ATTRIBUTES), targetUserId: meta.targetUserId,
    messages: found.messages, metadata: sanitizeMetadata(found.metadata) } };
}
