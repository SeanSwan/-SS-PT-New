import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { sanitizeNutritionProposalMeal } from './coachNutritionProposalCareCopy.mjs';
import { COACH_PROPOSAL_STATUS } from './coachActionProposalService.mjs';

const displayTimeZone = () => process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles';

const formatDisplayDate = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: displayTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (values.year && values.month && values.day) return `${values.year}-${values.month}-${values.day}`;
  } catch {
    // Fall back to UTC when SWAN_DISPLAY_TZ is invalid or unavailable.
  }
  return date.toISOString().slice(0, 10);
};

const sanitizeMealForMacroWrite = (meal) => ({
  ...sanitizeNutritionProposalMeal(meal, { descriptionMax: 500 }),
  verified: false,
});

export async function approveNutritionLogProposal({
  id,
  req,
  proposal,
  db,
  parseProposalClientId,
  invalidProposalClientId,
  claimPendingProposal,
  proposalNotPending,
  updateProposalStatus,
}) {
  const payload = proposal.payload || {};
  const clientId = parseProposalClientId(payload.clientId, proposal.targetUserId);
  if (!clientId) return invalidProposalClientId();
  const access = await ensureClientAccess(req, clientId);
  if (!access.allowed) {
    return { status: access.status, body: { success: false, code: 'CLIENT_ACCESS_DENIED', error: access.message } };
  }
  const meals = Array.isArray(payload.meals) ? payload.meals : [];
  if (meals.length === 0) {
    if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
    const updated = await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.FAILED,
      result: { nutrition: { mealsLogged: 0, errors: ['No meals supplied.'] } },
      errorCode: 'NUTRITION_LOG_EMPTY',
      db,
    });
    return {
      status: 400,
      body: {
        success: false,
        code: 'NUTRITION_LOG_EMPTY',
        error: 'Nutrition log proposal has no meals to apply.',
        proposal: updated,
      },
    };
  }
  if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
  // Lazy import keeps the DailyMacroLog model out of module-load so proposal
  // tests that run without a live DB don't break (mirrors sibling write services).
  const { createMacroEntries } = await import('../nutrition/macroLogService.mjs');
  // FORCE verified:false on the AI write path so a model/prompt-injected meal
  // carrying verified:true cannot persist as a coach-verified macro. AI macros
  // stay honest estimates until a coach/USDA verifies (care-first; Decision #5).
  // createMacroEntries also pins source:'ai_chat'. [Hostile-review PRIV-2/TEST-6]
  const safeMeals = meals.map(sanitizeMealForMacroWrite);
  let result;
  try {
    result = await createMacroEntries(safeMeals, { clientId: access.clientId, date: payload.date || formatDisplayDate() });
  } catch (err) {
    await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.FAILED,
      errorCode: 'NUTRITION_APPLY_FAILED',
      db,
    }).catch(() => {});
    return {
      status: 400,
      body: {
        success: false,
        code: 'NUTRITION_APPLY_FAILED',
        error: 'Could not apply the nutrition log. Prepare a new draft review.',
      },
    };
  }
  // Macros ARE committed. A post-write status-flip failure must NOT be reported as
  // a write failure (COR-1) - that would tell the trainer the log failed while it
  // actually saved. Report success with a degraded status-sync signal instead.
  let updated = null;
  try {
    updated = await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.APPLIED,
      result: { nutrition: result },
      db,
    });
  } catch {
    /* write committed; only the proposal status sync degraded */
  }
  return {
    status: 200,
    body: { success: true, proposal: updated, applied: true, nutrition: result, statusSync: updated ? 'ok' : 'degraded' },
  };
}
