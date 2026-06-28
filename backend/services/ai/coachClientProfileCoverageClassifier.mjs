/**
 * coachClientProfileCoverageClassifier.mjs
 * ========================================
 * Parses existing-client profile and onboarding coverage proposal payloads.
 */
import { z } from 'zod';
import { normalizeOnboardingCoverageUpdates } from './coachOnboardingCoveragePayloadNormalizer.mjs';

const ClientProfileCoverageUpdateSchema = z.object({
  clientId: z.union([z.number(), z.string()]).optional(),
  targetUserId: z.union([z.number(), z.string()]).optional(),
  profileFields: z.record(z.unknown()).optional().default({}),
  questionnaireResponses: z.record(z.unknown()).optional().default({}),
  coverageUpdates: z.array(z.unknown()).optional().default([]),
}).passthrough().refine((payload) => (
  Object.keys(payload.profileFields || {}).length > 0
  || Object.keys(payload.questionnaireResponses || {}).length > 0
  || (Array.isArray(payload.coverageUpdates) && payload.coverageUpdates.length > 0)
));

function safeParseProfileCoveragePayload(payload) {
  const parsed = ClientProfileCoverageUpdateSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function selectClientId(payload, conversation) {
  return payload.clientId || payload.targetUserId || conversation?.targetUserId || null;
}

function clientSelectionClarification(meta) {
  const payload = {
    question: 'Select an existing client before preparing profile coverage updates.',
    options: [],
  };
  return meta ? { ...payload, proposalMeta: meta } : payload;
}

export function classifyClientProfileCoveragePayload({ payload, conversation, proposalTypes, meta = null }) {
  const parsed = safeParseProfileCoveragePayload(payload);
  if (!parsed) return null;

  const clientId = selectClientId(parsed, conversation);
  if (!clientId) {
    return {
      type: proposalTypes.CLARIFICATION,
      payload: clientSelectionClarification(meta),
    };
  }

  const normalizedPayload = normalizeOnboardingCoverageUpdates({ ...parsed, clientId });
  return {
    type: proposalTypes.CLIENT_PROFILE_COVERAGE_UPDATE,
    payload: meta ? { ...normalizedPayload, proposalMeta: meta } : normalizedPayload,
  };
}