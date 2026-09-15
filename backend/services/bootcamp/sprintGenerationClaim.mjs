import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import { getBootcampSprint } from '../../models/index.mjs';

export function sprintError(message, status = 409) {
  return Object.assign(new Error(message), { status });
}
export function sprintActor(actor) {
  if (!actor || !['admin', 'trainer'].includes(actor.role)
    || !Number.isSafeInteger(Number(actor.userId)) || Number(actor.userId) <= 0) {
    throw sprintError('Sprint actor required', 403);
  }
  return { userId: Number(actor.userId), role: actor.role };
}
export async function withLockedSprint(sprintId, actor, action) {
  actor = sprintActor(actor);
  return sequelize.transaction(async transaction => {
    const sprint = await getBootcampSprint().findOne({
      where: { id: sprintId, ...(actor.role === 'admin' ? {} : { trainerId: actor.userId }) },
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!sprint) throw sprintError('Sprint not found', 404);
    const [clock] = await sequelize.query('SELECT clock_timestamp() AS now', { type: QueryTypes.SELECT, transaction });
    const now = new Date(clock.now).getTime();
    if (!Number.isFinite(now)) throw sprintError('Sprint clock unavailable', 503);
    return action(sprint, transaction, now);
  });
}
/**
 * A claim is LIVE only while its lease has not expired. The lease exists so an
 * interrupted generation can be reclaimed; anything that treats the bare
 * `status === 'generating'` as busy never honours that and deadlocks instead.
 */
export function sprintClaimIsLive(sprint, nowMs) {
  if (sprint.status !== 'generating') return false;
  const expiresAt = Date.parse(sprint.metadata?.generationClaimV1?.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > nowMs;
}
/**
 * All five production call sites pass the DB `now` they already receive from
 * withLockedSprint, so the lease is judged against the same clock that wrote it.
 * The process-clock default is kept deliberately as a fail-safe: a call site
 * that forgot to thread `now` would otherwise compare against `undefined`, which
 * is false for every lease, silently admitting a competitor to a LIVE claim.
 */
export function assertSprintIdle(sprint, nowMs = Date.now()) {
  if (sprint.status === 'archived') throw sprintError('Sprint is archived');
  // 2026-09-14: the lease is now honoured here too. Rejecting every
  // 'generating' sprint unconditionally meant that after an interrupted
  // generation (runner died, claim never released) updateSprint, updateWeek,
  // updateSlot, confirm and archive all threw 409 forever, while claimSprint
  // would happily have reclaimed the same expired claim.
  if (sprintClaimIsLive(sprint, nowMs)) throw sprintError('Sprint generation in progress');
}
/**
 * F06: the 428/400 shape checks, extracted so the SSE route can answer them
 * with real HTTP status codes BEFORE it commits to `writeHead(200)`. `claimSprint`
 * runs the same validation again under the row lock — this pre-check is the
 * client-facing contract, not a replacement for the locked check.
 */
export function validateGenerationRequest(request = {}) {
  if (request.expectedGenerationVersion == null) {
    return sprintError('Refresh Sprint: generation version required', 428);
  }
  if (!Number.isSafeInteger(request.expectedGenerationVersion)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.operationId ?? '')) {
    return sprintError('Invalid Sprint generation request', 400);
  }
  return null;
}

/**
 * U3 ledger helpers. Every claim lands in generation_runs; finish() closes
 * it; a cleanup failure or a superseded claim is marked 'orphaned' instead
 * of vanishing (D-Q3: the ops gap that made cleanup failures silent).
 * Raw SQL on purpose: this is an ops ledger, not a domain model.
 */
async function ledgerRun(sequelize, transaction, sql, replacements) {
  await sequelize.query(sql, { type: QueryTypes.UPDATE, transaction, replacements });
}

export async function claimSprint(sprintId, actor, request = {}) {
  const invalid = validateGenerationRequest(request);
  if (invalid) throw invalid;
  return withLockedSprint(sprintId, actor, async (sprint, transaction, now) => {
    // Same predicate as assertSprintIdle: only a LIVE claim blocks a reclaim.
    // A 'generating' row whose claim metadata is missing or unparseable is a
    // dead generation — withSprintClaim can never match it, so reclaiming is
    // the only recovery and must not be refused.
    if (sprint.status === 'archived' || sprintClaimIsLive(sprint, now)) {
      throw sprintError('Sprint generation claim conflict');
    }
    // U3: a dead/superseded claim is being reclaimed — its ledger rows must
    // not stay 'running' forever.
    await ledgerRun(sequelize, transaction,
      `UPDATE generation_runs SET status = 'orphaned', finished_at = :finishedAt
       WHERE sprint_id = :sprintId AND status = 'running'`,
      { sprintId, finishedAt: new Date(now) });
    if (Number(sprint.generationVersion) !== request.expectedGenerationVersion) throw sprintError('Sprint version conflict; refresh');
    const claim = { operationId: request.operationId, version: Number(sprint.generationVersion) + 1,
      expiresAt: new Date(now + 120000).toISOString() };
    await sprint.update({ status: 'generating', generationVersion: claim.version,
      metadata: { ...sprint.metadata, generationClaimV1: claim } }, { transaction });
    await ledgerRun(sequelize, transaction,
      `INSERT INTO generation_runs (sprint_id, operation_id, version, status, claimed_at)
       SELECT :sprintId, :operationId, :version, 'running', :claimedAt
       WHERE NOT EXISTS (SELECT 1 FROM generation_runs WHERE sprint_id = :sprintId AND operation_id = :operationId)`,
      { sprintId, operationId: claim.operationId, version: claim.version, claimedAt: new Date(now) });
    await ledgerRun(sequelize, transaction,
      `UPDATE generation_runs SET status = 'running', version = :version, claimed_at = :claimedAt
       WHERE sprint_id = :sprintId AND operation_id = :operationId`,
      { sprintId, operationId: claim.operationId, version: claim.version, claimedAt: new Date(now) });
    return claim;
  });
}
/**
 * U3: close the ledger row. `errorMessage` lands verbatim on 'failed' rows.
 */
export async function closeGenerationRun(sequelize, sprintId, claim, status, errorMessage = null) {
  await sequelize.query(
    `UPDATE generation_runs SET status = :status, finished_at = NOW(), error_message = :errorMessage
     WHERE sprint_id = :sprintId AND operation_id = :operationId AND status IN ('running', 'orphaned')`,
    { type: QueryTypes.UPDATE, replacements: { status, sprintId, operationId: claim.operationId, errorMessage } },
  );
}

export async function withSprintClaim(sprintId, actor, claim, action) {
  return withLockedSprint(sprintId, actor, (sprint, transaction, now) => {
    const owned = sprint.metadata?.generationClaimV1;
    if (sprint.status !== 'generating' || Number(sprint.generationVersion) !== claim.version
      || owned?.operationId !== claim.operationId || owned?.version !== claim.version
      || !(Date.parse(owned?.expiresAt) > now)) throw sprintError('Sprint generation claim lost');
    return action(sprint, transaction, now);
  });
}
export function renewSprintClaim(sprintId, actor, claim) {
  return withSprintClaim(sprintId, actor, claim, (sprint, transaction, now) => sprint.update({
    metadata: { ...sprint.metadata, generationClaimV1: { ...claim, expiresAt: new Date(now + 120000).toISOString() } },
  }, { transaction }));
}
