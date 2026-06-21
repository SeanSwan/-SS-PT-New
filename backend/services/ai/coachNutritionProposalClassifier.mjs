import { z } from 'zod';

const NutritionMealDraftSchema = z.object({
  description: z.string().trim().min(1),
}).passthrough();

const NutritionLogActionSchema = z.object({
  action: z.literal('import_nutrition_log'),
  date: z.string().trim().min(4).optional(),
  meals: z.array(NutritionMealDraftSchema).min(1).max(20),
}).passthrough();

export function classifyNutritionLogPayload({
  payload,
  conversation,
  proposalTypes,
  meta = null,
}) {
  const parsed = NutritionLogActionSchema.safeParse(payload);
  if (!parsed.success) return null;
  return {
    type: proposalTypes.NUTRITION_LOG,
    payload: {
      ...parsed.data,
      clientId: conversation?.targetUserId || null,
      ...(meta ? { proposalMeta: meta } : {}),
    },
  };
}
