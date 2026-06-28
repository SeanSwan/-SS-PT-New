import { randomUUID } from 'node:crypto';
import { recordCommandAudit } from '../ai/commandAudit.mjs';
import { routeScheduleAiTurn } from './scheduleAiProviderRouter.mjs';
import { buildScheduleRecoveryAdvisory } from './scheduleAiRecoveryAdvisor.mjs';
import { buildRecurringOptimizationProposals } from './scheduleAiRecurringOptimizer.mjs';
import { getScheduleAiToolSchema } from './scheduleAiToolSchemas.mjs';

const WRITE_RISKS = new Set(['schedule_write', 'attendance_write']);
const ROLE_PERMISSIONS = Object.freeze({
  show_attention_queue: new Set(['admin']),
  find_availability: new Set(['admin', 'trainer', 'client']),
  draft_booking: new Set(['admin', 'trainer']),
  draft_move: new Set(['admin', 'trainer']),
  draft_cancel: new Set(['admin', 'trainer']),
  mark_attendance: new Set(['admin', 'trainer']),
  open_payment_review: new Set(['admin']),
  draft_recurring_repair: new Set(['admin', 'trainer']),
  recovery_safety_advisory: new Set(['admin', 'trainer']),
  manual_schedule_review: new Set(['admin', 'trainer']),
});

function normalizeId(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

function getContextVersion(context = {}) {
  const expected = context.expectedScheduleVersion
    ?? context.contextVersion
    ?? context.snapshotVersion
    ?? context.snapshot?.version
    ?? null;
  const current = context.currentScheduleVersion
    ?? context.latestScheduleVersion
    ?? context.freshScheduleVersion
    ?? context.snapshot?.currentVersion
    ?? expected;
  return {
    expected: expected == null ? null : String(expected),
    current: current == null ? null : String(current),
    isStale: expected != null && current != null && String(expected) !== String(current),
  };
}

function riskLevel(category) {
  if (category === 'billing_review') return 'high';
  if (WRITE_RISKS.has(category)) return 'medium';
  return 'low';
}

function confirmationForTool(tool) {
  if (tool.executionPolicy === 'read_only') {
    return {
      required: false,
      state: 'none',
      canExecute: false,
      mode: 'read_only',
      reason: 'READ_ONLY_RESPONSE',
    };
  }
  const paymentReview = tool.type === 'open_payment_review';
  return {
    required: true,
    state: 'pending',
    canExecute: false,
    mode: 'manual_review',
    reason: paymentReview ? 'MANUAL_PAYMENT_REVIEW_REQUIRED' : 'SCHEDULE_REVIEW_REQUIRED',
  };
}

function resolveTool(providerResult) {
  const candidate = providerResult?.toolCalls?.find((tool) => tool?.type);
  if (candidate?.description) return candidate;
  if (candidate?.type) return getScheduleAiToolSchema(candidate.type);
  return getScheduleAiToolSchema('show_attention_queue');
}

function hasPermission(actor, tool) {
  const allowed = ROLE_PERMISSIONS[tool.type];
  return Boolean(allowed?.has(actor?.role));
}

function extractTargets(context = {}) {
  return {
    targetClientId: normalizeId(context.clientId ?? context.session?.clientId ?? context.session?.userId ?? context.plannedSession?.clientId ?? context.plannedSession?.userId),
    targetTrainerId: normalizeId(context.trainerId ?? context.session?.trainerId ?? context.plannedSession?.trainerId),
    targetSessionId: normalizeId(context.sessionId ?? context.session?.id ?? context.plannedSession?.id),
  };
}

function buildProposal({ actor, message, context, tool, providerResult, recurringRepair, recoveryAdvisory, now }) {
  const confirmation = confirmationForTool(tool);
  const targets = extractTargets(context);
  const contextVersion = getContextVersion(context);
  return {
    id: randomUUID(),
    type: 'schedule_ai_proposal',
    action: tool.type,
    status: confirmation.required ? 'pending_review' : 'read_only',
    executionPolicy: tool.executionPolicy,
    manualOnly: tool.executionPolicy === 'manual_only',
    createdAt: now.toISOString(),
    createdByUserId: normalizeId(actor?.id),
    source: {
      provider: providerResult?.provider || 'unknown',
      model: providerResult?.model || 'unknown',
      messageLength: String(message || '').length,
      contextVersion,
    },
    ...targets,
    risk: {
      category: tool.riskLevel,
      level: riskLevel(tool.riskLevel),
      mutatesData: Boolean(tool.mutatesData),
    },
    confirmation,
    content: providerResult?.content || null,
    ...(recurringRepair ? { recurringRepair } : {}),
    ...(recoveryAdvisory ? { recoveryAdvisory } : {}),
  };
}

async function writeProposalAudit({ auditWriter, actor, proposal = null, outcome, commandType, errorCode = null, message, context, durationMs }) {
  const targets = proposal || extractTargets(context);
  const writer = auditWriter || recordCommandAudit;
  return writer({
    userId: normalizeId(actor?.id),
    userRole: actor?.role || 'unknown',
    commandType,
    targetClientId: targets.targetClientId ?? null,
    destructive: false,
    requiresConfirmation: Boolean(proposal?.confirmation?.required),
    confirmationState: proposal?.confirmation?.state || 'none',
    operationId: proposal?.id || null,
    outcome,
    errorCode,
    params: {
      action: proposal?.action || null,
      riskCategory: proposal?.risk?.category || null,
      messageLength: String(message || '').length,
      surface: context?.surface || null,
      contextVersion: getContextVersion(context),
      recurringIssueCount: proposal?.recurringRepair?.summary?.issueCount ?? null,
      recurringProposalCount: proposal?.recurringRepair?.summary?.proposalCount ?? null,
      recoveryRiskLevel: proposal?.recoveryAdvisory?.risk?.level ?? null,
      recoveryDataCompleteness: proposal?.recoveryAdvisory?.dataCompleteness?.level ?? null,
    },
    durationMs,
  });
}

export async function generateScheduleAiProposal({
  actor,
  message,
  context = {},
  config = {},
  routeTurn = routeScheduleAiTurn,
  auditWriter = null,
  recurringOptimizer = buildRecurringOptimizationProposals,
  recoveryAdvisor = buildScheduleRecoveryAdvisory,
  now = new Date(),
} = {}) {
  const startedAt = Date.now();
  const contextVersion = getContextVersion(context);

  if (contextVersion.isStale) {
    await writeProposalAudit({
      auditWriter,
      actor,
      outcome: 'failed',
      commandType: 'schedule_ai:stale_context',
      errorCode: 'SCHEDULE_AI_STALE_CONTEXT',
      message,
      context,
      durationMs: Date.now() - startedAt,
    });
    return {
      ok: false,
      type: 'stale_context',
      code: 'SCHEDULE_AI_STALE_CONTEXT',
      contextVersion,
      message: 'The schedule changed since this AI context was built. Refresh the schedule before creating a proposal.',
    };
  }

  const routed = await routeTurn({ actor, message, context, config });
  if (!routed?.ok) {
    await writeProposalAudit({
      auditWriter,
      actor,
      outcome: 'failed',
      commandType: 'schedule_ai:provider_degraded',
      errorCode: 'SCHEDULE_AI_PROVIDER_DEGRADED',
      message,
      context,
      durationMs: Date.now() - startedAt,
    });
    return {
      ok: false,
      type: 'degraded',
      code: 'SCHEDULE_AI_PROVIDER_DEGRADED',
      errors: routed?.errors || [],
      failoverTrace: routed?.failoverTrace || [],
    };
  }

  const tool = resolveTool(routed.result);
  if (!tool || !hasPermission(actor, tool)) {
    await writeProposalAudit({
      auditWriter,
      actor,
      outcome: 'denied',
      commandType: `schedule_ai:${tool?.type || 'unknown'}`,
      errorCode: 'SCHEDULE_AI_PROPOSAL_DENIED',
      message,
      context,
      durationMs: Date.now() - startedAt,
    });
    return {
      ok: false,
      type: 'denied',
      code: 'SCHEDULE_AI_PROPOSAL_DENIED',
      proposal: null,
      toolType: tool?.type || null,
    };
  }

  const recurringRepair = tool.type === 'draft_recurring_repair'
    ? recurringOptimizer({
      actor,
      recurringGroupId: context.recurringGroupId,
      seriesSessions: context.recurringSeries || context.seriesSessions || [],
      comparisonSessions: context.comparisonSessions || context.nearbySessions || [],
      candidateSlots: context.candidateSlots || [],
      clientPreferences: context.clientPreferences || {},
      trainerLoad: context.trainerLoad || [],
      now,
    })
    : null;

  const recoveryAdvisory = tool.type === 'recovery_safety_advisory'
    ? recoveryAdvisor({
      actor,
      plannedSession: context.plannedSession || context.session || {},
      recentSessions: context.recentSessions || context.workoutSessions || [],
      painEntries: context.painEntries || context.activePainEntries || [],
      now,
    })
    : null;

  const proposal = buildProposal({
    actor,
    message,
    context,
    tool,
    providerResult: routed.result,
    recurringRepair,
    recoveryAdvisory,
    now,
  });
  await writeProposalAudit({
    auditWriter,
    actor,
    proposal,
    outcome: proposal.confirmation.required ? 'confirmation_required' : 'success',
    commandType: `schedule_ai:${proposal.action}`,
    message,
    context,
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    type: 'proposal_generated',
    proposal,
    provider: {
      name: routed.result?.provider || 'unknown',
      model: routed.result?.model || 'unknown',
      failoverTrace: routed.failoverTrace || [],
    },
  };
}
