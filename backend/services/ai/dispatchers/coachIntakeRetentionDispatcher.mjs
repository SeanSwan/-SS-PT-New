/**
 * coachIntakeRetentionDispatcher.mjs
 * ==================================
 * Read-only Swan Coach command handler for raw artifact retention visibility.
 * It returns flat scalar fields only so command cards cannot expose payloads.
 */
import { getCoachIntakeRetentionReport } from '../../coachIntakeRetentionPolicyService.mjs';
import { purgeCoachIntakeRawArtifacts } from '../../coachIntakeRetentionPurgeService.mjs';

function resolveUserId(ctx) {
  const userId = Number(ctx?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Authenticated user is required for Coach intake commands.');
  }
  return userId;
}

function resolveRole(ctx) {
  const role = String(ctx?.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'trainer') return role;
  throw new Error('Access requires an admin or trainer role for Coach intake commands.');
}

function coachWorkspaceRoute(ctx) {
  return `/dashboard/${resolveRole(ctx)}/coach-assistant`;
}

function retentionCommandSummary(retention, ctx) {
  const summary = retention?.summary || {};
  const policy = retention?.policy || {};
  const action = retention?.nextOperatorAction || {};
  const route = coachWorkspaceRoute(ctx);
  return {
    retentionStatus: retention?.status || 'unavailable',
    schemaReady: retention?.schemaReady !== false,
    totalWithRawArtifacts: Number(summary.totalWithRawArtifacts || 0),
    purgeReady: Number(summary.purgeReady || 0),
    reviewRequired: Number(summary.reviewRequired || 0),
    retained: Number(summary.retained || 0),
    appliedRawArtifactGraceHours: Number(policy.appliedRawArtifactGraceHours || 0),
    failedRawArtifactGraceDays: Number(policy.failedRawArtifactGraceDays || 0),
    staleReviewQueueDays: Number(policy.staleReviewQueueDays || 0),
    nextActionKey: action.key || 'unknown',
    nextActionLabel: action.label || 'Review Coach intake retention',
    retentionRoute: route,
    queueRoute: route,
    commandHint: 'Open the Swan Coach workspace to review retention candidates before any purge job is enabled.',
  };
}

function purgePlanCommandSummary(plan, ctx) {
  const summary = plan?.summary || {};
  const route = coachWorkspaceRoute(ctx);
  return {
    cleanupEnabled: plan?.enabled === true,
    cleanupDryRun: true,
    schemaReady: plan?.schemaReady === true,
    totalWithRawArtifacts: Number(summary.totalWithRawArtifacts || 0),
    purgeReady: Number(plan?.purgeReady ?? summary.purgeReady ?? 0),
    reviewRequired: Number(summary.reviewRequired || 0),
    retained: Number(summary.retained || 0),
    purged: 0,
    skippedReason: plan?.skippedReason || 'none',
    cleanupRoute: route,
    queueRoute: route,
    commandHint: 'This is a dry-run cleanup plan. No raw artifacts are purged from a Swan Coach command.',
  };
}

export async function dispatchViewCoachIntakeRetention(_params = {}, ctx = {}) {
  const userId = resolveUserId(ctx);
  resolveRole(ctx);
  const retention = await getCoachIntakeRetentionReport({
    userId,
    sequelizeOverride: ctx?.options?.sequelize || ctx?.sequelize || null,
  });
  return retentionCommandSummary(retention, ctx);
}

export async function dispatchViewCoachIntakeRetentionPurgePlan(_params = {}, ctx = {}) {
  const userId = resolveUserId(ctx);
  resolveRole(ctx);
  const plan = await purgeCoachIntakeRawArtifacts({
    userId,
    dryRun: true,
    sequelizeOverride: ctx?.options?.sequelize || ctx?.sequelize || null,
  });
  return purgePlanCommandSummary(plan, ctx);
}

export const _internal = { purgePlanCommandSummary, retentionCommandSummary };

export default { dispatchViewCoachIntakeRetention, dispatchViewCoachIntakeRetentionPurgePlan };
