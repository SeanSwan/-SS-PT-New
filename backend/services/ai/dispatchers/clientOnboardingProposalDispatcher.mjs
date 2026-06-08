/**
 * clientOnboardingProposalDispatcher.mjs
 * =====================================
 * Prepares encrypted Coach approval proposals from legacy create-client
 * commands. Actual client records are created only after proposal approval.
 */
import {
  COACH_PROPOSAL_TYPE,
  createCoachActionProposalDraft,
} from '../coachActionProposalService.mjs';
import { parseClientSource } from '../../sessionBillingPolicy.mjs';

const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external']);
const EXTERNAL_CLIENT_SOURCES = new Set(['move_fitness', 'external']);
const CLIENT_SOURCE_OPTIONS = Object.freeze(['move_fitness', 'swanstudios', 'external']);
const CLIENT_SOURCE_CLARIFICATION_QUESTION = [
  'Which client source should this client use before I prepare the onboarding draft?',
  'SwanStudios deducts paid sessions; Move Fitness and external clients are free-tracking.',
].join(' ');

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function pickSource(value, fallback, allowed = CLIENT_SOURCES) {
  const source = parseClientSource(cleanText(value, 40)) || fallback;
  return allowed.has(source) ? source : fallback;
}

function needsExplicitSourceClarification(value, allowed = CLIENT_SOURCES) {
  const source = parseClientSource(cleanText(value, 40));
  return !source || !allowed.has(source);
}

function buildDraft(params = {}, fallbackSource, allowedSources) {
  const draft = {
    firstName: cleanText(params.firstName, 80),
    lastName: cleanText(params.lastName, 80),
    email: cleanText(params.email, 320),
    phone: cleanText(params.phone, 64),
    clientSource: pickSource(params.clientSource, fallbackSource, allowedSources),
  };
  return Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined));
}

function proposalRoute(ctx, proposal) {
  return `/dashboard/${ctx.user.role === 'trainer' ? 'trainer' : 'admin'}/coach-assistant?proposal=${encodeURIComponent(proposal.id)}`;
}

async function prepareSourceClarificationProposal(ctx) {
  const proposal = await createCoachActionProposalDraft({
    type: COACH_PROPOSAL_TYPE.CLARIFICATION,
    payload: {
      question: CLIENT_SOURCE_CLARIFICATION_QUESTION,
      options: CLIENT_SOURCE_OPTIONS,
    },
    user: ctx.user,
    conversation: {
      id: ctx.options?.conversationId || null,
      targetUserId: null,
    },
    db: ctx.options?.sequelize,
  });

  return {
    proposalId: proposal.id,
    proposalType: proposal.type,
    proposalStatus: proposal.status,
    status: proposal.status,
    hasPreparedDraft: false,
    reviewRequired: false,
    proposalTitle: proposal.title || 'Answer Coach clarification',
    reviewRoute: proposalRoute(ctx, proposal),
    source: 'coach_action_proposals',
    missingFields: ['clientSource'],
    clarificationOptions: CLIENT_SOURCE_OPTIONS,
  };
}

async function prepareOnboardingProposal(params, ctx, fallbackSource, allowedSources, options = {}) {
  if (!['admin', 'trainer'].includes(ctx.user?.role)) {
    throw new Error('Only trainers and admins can prepare client onboarding drafts.');
  }

  if (options.requireExplicitSource && needsExplicitSourceClarification(params?.clientSource, allowedSources)) {
    return prepareSourceClarificationProposal(ctx);
  }

  const proposal = await createCoachActionProposalDraft({
    type: COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING,
    payload: { data: buildDraft(params, fallbackSource, allowedSources) },
    user: ctx.user,
    conversation: {
      id: ctx.options?.conversationId || null,
      targetUserId: null,
    },
    db: ctx.options?.sequelize,
  });

  return {
    proposalId: proposal.id,
    proposalType: proposal.type,
    proposalStatus: proposal.status,
    status: proposal.status,
    hasPreparedDraft: true,
    reviewRequired: true,
    proposalTitle: proposal.title || 'Review client onboarding draft',
    reviewRoute: proposalRoute(ctx, proposal),
    source: 'coach_action_proposals',
  };
}

export function dispatchCreateClientProposal(params, ctx = {}) {
  return prepareOnboardingProposal(params, ctx, 'swanstudios', CLIENT_SOURCES, {
    requireExplicitSource: true,
  });
}

export function dispatchCreateExternalClientProposal(params, ctx = {}) {
  return prepareOnboardingProposal(params, ctx, 'move_fitness', EXTERNAL_CLIENT_SOURCES);
}
