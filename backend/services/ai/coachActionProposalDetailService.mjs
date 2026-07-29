/**
 * coachActionProposalDetailService.mjs
 * ====================================
 * Sanitizes Coach proposal review details before they reach the UI.
 */
import { stampDoctrineVerdictsFromPlan } from './planEditDoctrineService.mjs';
import { decryptPayload } from '../plaudCipherService.mjs';
import { summarizeOnboardingDraftForReview } from '../coachClientOnboardingApprovalService.mjs';
import { COACH_PROPOSAL_TYPE } from './coachActionProposalService.mjs';
import { sanitizeNutritionProposalMeal } from './coachNutritionProposalCareCopy.mjs';
import { sanitizeSplitCandidate } from './coachSplitPlanApprovalService.mjs';

const SAFE_REF_PATTERN = /^[A-Za-z0-9:_./-]{1,80}$/;
const SAFE_FLAG_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

function sanitizeTokenList(value, pattern) {
  if (!Array.isArray(value)) return { tokens: [], redactedCount: 0 };
  return value.slice(0, 20).reduce((acc, item) => {
    const text = String(item || '').trim();
    if (pattern.test(text)) {
      acc.tokens.push(text);
    } else {
      acc.redactedCount += 1;
    }
    return acc;
  }, { tokens: [], redactedCount: 0 });
}

function approvalGateFromProposal(proposal) {
  const meta = proposal?.payload?.proposalMeta || {};
  const evidence = sanitizeTokenList(meta.evidenceRefs, SAFE_REF_PATTERN);
  const flags = sanitizeTokenList(meta.safetyFlags, SAFE_FLAG_PATTERN);
  return {
    confirmationMode: 'trainer_approval_required',
    evidenceRefs: evidence.tokens,
    ...(evidence.redactedCount > 0 ? { redactedEvidenceRefCount: evidence.redactedCount } : {}),
    safetyFlags: flags.tokens,
    ...(flags.redactedCount > 0 ? { redactedSafetyFlagCount: flags.redactedCount } : {}),
    writer: 'deterministic',
  };
}

function withApprovalGate(proposal, detail) {
  return {
    ...detail,
    approvalGate: approvalGateFromProposal(proposal),
  };
}

function firstDetailRecord(...candidates) {
  for (const value of candidates) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return {};
}

function parseDetailClientId(...candidates) {
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value > 0 ? value : null;
    }

    if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
      const id = Number(value);
      return Number.isSafeInteger(id) ? id : null;
    }

    return null;
  }

  return null;
}

export function decryptProposalPayload(row) {
  return decryptPayload({
    cipher: row.proposal_cipher,
    iv: row.proposal_iv,
    tag: row.proposal_tag,
    keyId: row.cipher_key_id,
  });
}

export function sanitizeProposalDetail({ row, proposal, planEditPlan = null }) {
  const payload = proposal.payload || {};
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING) {
    try {
      return withApprovalGate(proposal, summarizeOnboardingDraftForReview(proposal));
    } catch (err) {
      return withApprovalGate(proposal, {
        client: {},
        errorCode: err.code || 'ONBOARDING_DETAIL_UNAVAILABLE',
        error: err.message,
      });
    }
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_PROFILE_COVERAGE_UPDATE) {
    const coverageUpdates = Array.isArray(payload.coverageUpdates)
      ? payload.coverageUpdates
      : payload.coverageItems;
    return withApprovalGate(proposal, {
      profileCoverageUpdate: {
        clientId: parseDetailClientId(payload.clientId, payload.targetUserId, proposal.targetUserId),
        profileFields: firstDetailRecord(payload.profileFields, payload.profileUpdates, payload.profile),
        questionnaireResponses: firstDetailRecord(
          payload.questionnaireResponses,
          payload.responsesJson,
          payload.responses,
        ),
        coverageUpdates: Array.isArray(coverageUpdates) ? coverageUpdates.slice(0, 80) : [],
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.PLAN_EDIT) {
    // Doctrine verdicts are RECOMPUTED here, server-side, on every detail read —
    // a stored (or model-authored) verdict can never reach the trainer's screen.
    // TRUST FIX (2026-07-28): every item is judged against the phase resolved
    // FROM THE SAVED PLAN (planEditPlan, loaded by the async caller), NOT the
    // model-supplied payload.phase — the accused must not pick its own yardstick.
    // `planVerified` tells the UI whether the plan was actually loaded; when it
    // is false the referee returns plan_unavailable (caution) for every item.
    return withApprovalGate(proposal, {
      planEdit: {
        clientId: parseDetailClientId(payload.clientId, proposal.targetUserId),
        planId: payload.planId ?? null,
        planVerified: Boolean(planEditPlan),
        items: stampDoctrineVerdictsFromPlan(
          Array.isArray(payload.items) ? payload.items : [],
          planEditPlan,
        ),
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.WORKOUT_LOG) {
    return withApprovalGate(proposal, {
      workout: {
        clientId: parseDetailClientId(payload.clientId, proposal.targetUserId),
        date: payload.date || null,
        title: payload.title || null,
        notes: payload.notes || null,
        duration: payload.duration || null,
        intensity: payload.intensity || null,
        exercises: Array.isArray(payload.exercises) ? payload.exercises : [],
        scheduledSessionId: payload.scheduledSessionId || null,
        plannedAssignment: payload.plannedAssignment || null,
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.NUTRITION_LOG) {
    // Meal descriptions are food names (not identity PII) and the reviewer owns
    // the proposal — safe to surface for trainer review. Macros are AI estimates.
    const meals = Array.isArray(payload.meals) ? payload.meals : [];
    const totalCalories = meals.reduce((sum, m) => sum + (Number(m?.calories) || 0), 0);
    const round = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);
    return withApprovalGate(proposal, {
      nutrition: {
        clientId: parseDetailClientId(payload.clientId, proposal.targetUserId),
        date: payload.date || null,
        mealCount: meals.length,
        totalCalories: Math.round(totalCalories),
        meals: meals.slice(0, 20).map((m) => {
          const safeMeal = sanitizeNutritionProposalMeal(m, { descriptionMax: 160 });
          return {
            mealType: typeof safeMeal?.mealType === 'string' ? safeMeal.mealType : 'snack',
            description: safeMeal.description,
            calories: round(safeMeal?.calories),
            protein: round(safeMeal?.protein),
            carbs: round(safeMeal?.carbs),
            fat: round(safeMeal?.fat),
            confidence: Number.isFinite(Number(safeMeal?.confidence))
              ? Math.max(0, Math.min(1, Number(safeMeal.confidence)))
              : null,
          };
        }),
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
    return withApprovalGate(proposal, {
      clientDataUpdate: {
        clientId: parseDetailClientId(payload.targetUserId, proposal.targetUserId),
        updateCount: Array.isArray(payload.updates) ? payload.updates.length : 0,
        updates: Array.isArray(payload.updates) ? payload.updates : [],
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLARIFICATION) {
    return withApprovalGate(proposal, {
      clarification: {
        question: payload.question || null,
        options: Array.isArray(payload.options) ? payload.options : [],
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.SPLIT_PLAN) {
    const splits = Array.isArray(payload.splits) ? payload.splits : [];
    return withApprovalGate(proposal, {
      splitPlan: {
        splitCount: splits.length,
        splits: splits.map(sanitizeSplitCandidate),
      },
    });
  }
  return withApprovalGate(proposal, {
    frontendAction: {
      event: payload.event || null,
      payload: payload.payload || {},
    },
  });
}
