import { z } from 'zod';
import { isRealCalendarDate } from '../nutrition/displayDate.mjs';
import { sanitizeNutritionProposalMeal } from './coachNutritionProposalCareCopy.mjs';

const NutritionMealDraftSchema = z.object({
  description: z.string().trim().min(1),
}).passthrough();

const NutritionProposalDateSchema = z.string().trim().refine(isRealCalendarDate);

const NutritionLogActionSchema = z.object({
  action: z.literal('import_nutrition_log'),
  date: NutritionProposalDateSchema.optional(),
  meals: z.array(NutritionMealDraftSchema).min(1).max(20),
}).passthrough();

const sanitizeMealDraft = (meal) => sanitizeNutritionProposalMeal(meal, { descriptionMax: 500 });

export function classifyNutritionLogPayload({
  payload,
  conversation,
  proposalTypes,
  meta = null,
}) {
  const parsed = NutritionLogActionSchema.safeParse(payload);
  if (!parsed.success) return null;
  const meals = parsed.data.meals.map(sanitizeMealDraft);
  return {
    type: proposalTypes.NUTRITION_LOG,
    payload: {
      ...parsed.data,
      meals,
      clientId: conversation?.targetUserId || null,
      ...(meta ? { proposalMeta: meta } : {}),
    },
  };
}
