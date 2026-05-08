/**
 * coachIntakeProposalDispatcher.mjs
 * =================================
 * Read-only command summaries for prepared Coach intake proposals.
 */
import { listUnifiedCoachIntakeItems } from '../../coachIntakeItemService.mjs';
import { pickNextCoachIntakeItem } from '../../coachIntakeQueueOrdering.mjs';

const DEFAULT_LIMIT = 20;

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

function normalizeIntakeId(raw) {
  const value = String(raw || '').trim();
  return value || null;
}

function itemIdCandidates(item) {
  const candidates = new Set();
  for (const raw of [item?.id, item?.entityId]) {
    const value = normalizeIntakeId(raw);
    if (!value) continue;
    candidates.add(value);
    const colonIndex = value.indexOf(':');
    if (colonIndex >= 0 && colonIndex + 1 < value.length) {
      candidates.add(value.slice(colonIndex + 1));
    }
  }
  return candidates;
}

function matchesIntakeId(item, targetIntakeId) {
  if (!targetIntakeId) return true;
  return itemIdCandidates(item).has(targetIntakeId);
}

function coachReviewRoute(item, role, proposalId = null) {
  const entityId = normalizeIntakeId(item?.entityId || item?.id);
  const baseRoute = `/dashboard/${role}/coach-assistant`;
  const proposalParam = normalizeIntakeId(proposalId);
  if (!entityId) return baseRoute;
  return `${baseRoute}?intake=${encodeURIComponent(entityId)}${
    proposalParam ? `&proposal=${encodeURIComponent(proposalParam)}` : ''
  }`;
}

function latestProposalFor(item) {
  const id = item?.latestProposalId || item?.latestProposal?.id || null;
  if (!id) return null;
  return {
    id,
    type: item?.latestProposal?.type || null,
    status: item?.latestProposal?.status || null,
    title: item?.latestProposal?.title || 'Review Coach proposal',
    createdAt: item?.latestProposal?.createdAt || null,
  };
}

function pickPreparedDraftTarget(items, targetIntakeId) {
  if (targetIntakeId) {
    return items.find((item) => matchesIntakeId(item, targetIntakeId)) || null;
  }
  return items.find((item) => latestProposalFor(item)) || pickNextCoachIntakeItem(items);
}

function commandSummary({ item, targetIntakeId, targetMatched, role }) {
  const proposal = latestProposalFor(item);
  const entityId = normalizeIntakeId(item?.entityId || item?.id);
  const hasPreparedDraft = Boolean(proposal);
  return {
    hasPreparedDraft,
    targetMatched,
    targetIntakeId: targetIntakeId || entityId || null,
    intakeKind: item?.kind || null,
    intakeQueueStatus: item?.queueStatus || null,
    proposalId: proposal?.id || null,
    proposalType: proposal?.type || null,
    proposalStatus: proposal?.status || null,
    proposalTitle: proposal?.title || null,
    proposalCreatedAt: proposal?.createdAt || null,
    nextActionKey: hasPreparedDraft ? 'review_prepared_draft' : 'prepare_draft_review',
    nextActionLabel: hasPreparedDraft ? 'Review prepared draft' : 'Prepare draft review',
    reviewRoute: item ? coachReviewRoute(item, role, proposal?.id) : `/dashboard/${role}/coach-assistant`,
    commandHint: hasPreparedDraft
      ? 'Open the active Coach intake dossier and choose Review prepared draft. Final writes still require approval.'
      : 'Ask Swan Coach to prepare a structured draft review for this intake before any final write.',
  };
}

export async function dispatchViewCoachIntakePreparedDraft(params = {}, ctx = {}) {
  const userId = resolveUserId(ctx);
  const role = resolveRole(ctx);
  const targetIntakeId = normalizeIntakeId(params?.intakeId);
  const result = await listUnifiedCoachIntakeItems({
    userId,
    scope: 'all',
    limit: DEFAULT_LIMIT,
    sequelizeOverride: ctx?.options?.sequelize || ctx?.sequelize || null,
  });
  const items = Array.isArray(result?.items) ? result.items : [];
  const item = pickPreparedDraftTarget(items, targetIntakeId);
  const targetMatched = targetIntakeId ? Boolean(item) : null;
  return commandSummary({ item, targetIntakeId, targetMatched, role });
}

export const _internal = {
  commandSummary,
  latestProposalFor,
  matchesIntakeId,
  pickPreparedDraftTarget,
};

export default {
  dispatchViewCoachIntakePreparedDraft,
};
