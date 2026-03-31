/**
 * Nutrition Debate Prompts
 * =========================
 * Role-specific prompts for nutrition plan debates.
 * Uses de-identified client data. PhD-level nutrition science.
 */

/**
 * Build the Nutrition Specialist prompt (Round 1 proposer).
 * @param {Object} clientContext - De-identified client data
 * @returns {string}
 */
export function buildNutritionSpecialistPrompt(clientContext) {
  const conditions = clientContext.healthConditions || [];
  const conditionText = conditions.length > 0
    ? `\n- ⚕️ HEALTH CONDITIONS: ${conditions.join(', ')} — YOU MUST apply condition-specific dietary protocols`
    : '';

  return `You are a PhD-level sports nutritionist specializing in body composition and athletic performance nutrition. Design a nutrition plan.

CLIENT PROFILE (de-identified):
- Alias: ${clientContext.clientAlias}
- Age: ${clientContext.age || 'unknown'}, Gender: ${clientContext.gender || 'unknown'}
- Goals: ${(clientContext.fitnessGoals || []).join(', ') || 'general fitness'}
- NASM Phase: ${clientContext.nasmPhase || 1}
- Current Macros (7-day avg): ${formatMacros(clientContext.macroAverages)}
- Measurement Trend: ${clientContext.measurementTrends || 'unknown'}
- Training Experience: ${clientContext.trainingExperience || 'beginner'}
- Health Concerns: ${clientContext.healthConcerns || 'None noted'}${conditionText}

GUIDELINES:
1. Calculate TDEE based on available data (Harris-Benedict or Mifflin-St Jeor)
2. Set appropriate caloric target based on goals
3. Calculate macro split (protein 0.8-1.2g/lb, adjust carbs/fats by phase)
4. Suggest a sample meal plan with 4-5 meals
5. Flag any FDA warnings for common allergens or sodium
6. Consider NASM phase — Phase 1 recovery needs vs Phase 4 energy demands
${conditions.includes('HYPERTENSION') ? '7. HYPERTENSION: Apply DASH diet — sodium <1,500mg/day, emphasize potassium-rich foods, avoid processed meats\n' : ''}${conditions.includes('DIABETES') ? '8. DIABETES: Low-GI carbs only, pair carbs with protein/fat, limit added sugar <25g/day, steady meal timing\n' : ''}${conditions.includes('HIGH_CHOLESTEROL') ? '9. HIGH CHOLESTEROL: Saturated fat <7% calories, cholesterol <200mg/day, emphasize soluble fiber, omega-3\n' : ''}${conditions.includes('FIBROMYALGIA') ? '10. FIBROMYALGIA: Anti-inflammatory focus — omega-3, turmeric, avoid aspartame/MSG, small frequent meals for energy\n' : ''}

OUTPUT FORMAT (JSON only):
{
  "role": "nutrition_specialist",
  "recommendation": "Plan overview",
  "confidence": 0.85,
  "reasoning": "Rationale for caloric target and macro split",
  "dailyCalories": 2200,
  "macroSplit": {"protein": 35, "carbs": 40, "fat": 25},
  "mealPlan": [
    {"meal": "Breakfast", "foods": ["3 eggs scrambled", "2 slices whole wheat toast", "1 banana"], "calories": 550}
  ],
  "warnings": ["High sodium if client adds salt to meals"]
}`;
}

/**
 * Build the Safety Reviewer prompt for nutrition (Round 2).
 * @param {Object} clientContext
 * @param {string} previousPlan
 * @returns {string}
 */
export function buildNutritionSafetyPrompt(clientContext, previousPlan) {
  const conditions = clientContext.healthConditions || [];
  const conditionChecks = [];
  if (conditions.includes('HYPERTENSION')) conditionChecks.push(
    '8. HYPERTENSION CHECK: Verify total daily sodium <1,500mg. Flag any meal >500mg. Verify potassium intake 3,500-4,700mg. Check for DASH diet compliance.',
    '9. If on ACE inhibitors/ARBs: warn about potassium over-supplementation. If on beta-blockers: note hypoglycemia masking risk.'
  );
  if (conditions.includes('DIABETES')) conditionChecks.push(
    '10. DIABETES CHECK: Verify carbs are low-GI (<55). Total added sugar <25g/day. Verify carbs paired with protein/fat. Check meal spacing (3-4hr intervals).',
    '11. If on Metformin: ensure B12 supplementation noted. If on insulin: verify carb timing coordinates with injection schedule.'
  );
  if (conditions.includes('HIGH_CHOLESTEROL')) conditionChecks.push(
    '12. CHOLESTEROL CHECK: Verify saturated fat <7% total calories. Trans fat = ZERO. Dietary cholesterol <200mg/day. Verify soluble fiber intake (oats, beans, psyllium).',
    '13. If on statins: flag grapefruit in meal plan. Recommend CoQ10 supplementation.'
  );
  if (conditions.includes('FIBROMYALGIA')) conditionChecks.push(
    '14. FIBROMYALGIA CHECK: Verify anti-inflammatory food focus. Flag aspartame, MSG, nitrates. Verify omega-3 intake 3-4g/day. Check vitamin D and magnesium levels addressed.',
    '15. Verify small frequent meals (5-6x/day) for energy management. Flag any ultra-processed foods (NOVA Group 4).'
  );

  return `You are a registered dietitian and food safety specialist. Review this nutrition plan for health risks and suitability.

CLIENT: ${clientContext.clientAlias}
Age: ${clientContext.age || 'unknown'}, Gender: ${clientContext.gender || 'unknown'}
Goals: ${(clientContext.fitnessGoals || []).join(', ') || 'general fitness'}
${conditions.length > 0 ? `⚕️ HEALTH CONDITIONS: ${conditions.join(', ')} — CRITICAL: Verify the plan addresses ALL condition-specific requirements\n` : ''}
PROPOSED NUTRITION PLAN:
${previousPlan}

REVIEW CRITERIA:
1. Verify caloric target is safe (not below 1200 for women / 1500 for men without supervision)
2. Check protein intake isn't excessive for kidney health
3. Verify micronutrient adequacy (iron, calcium, vitamin D, B12)
4. Flag common allergens in meal plan
5. Check sodium levels against FDA daily guidelines (2300mg)
6. Verify meal timing supports training schedule
7. Flag any food interactions with common medications
${conditionChecks.join('\n')}

OUTPUT FORMAT (JSON only):
{
  "role": "safety_reviewer",
  "recommendation": "Safety assessment",
  "confidence": 0.9,
  "reasoning": "Key observations",
  "warnings": ["Protein at 2g/lb may stress kidneys in older adults"],
  "modifications": [
    {"original": "2g/lb protein", "replacement": "1.2g/lb protein", "reason": "Client age warrants conservative protein target"}
  ],
  "consensus": "agree|disagree|partial"
}`;
}

/**
 * Build the nutrition authority's final prompt.
 * @param {Object} clientContext
 * @param {Array} previousRounds
 * @returns {string}
 */
export function buildNutritionFinalPrompt(clientContext, previousRounds) {
  const roundsSummary = previousRounds.map((r, i) =>
    `Round ${i + 1} (${r.role}): ${r.recommendation}\nModifications: ${JSON.stringify(r.modifications || [])}`
  ).join('\n\n');

  return `You are the lead nutritionist making the final nutrition plan decision. Incorporate all safety feedback.

CLIENT: ${clientContext.clientAlias}
Goals: ${(clientContext.fitnessGoals || []).join(', ') || 'general fitness'}

DEBATE HISTORY:
${roundsSummary}

OUTPUT the FINAL nutrition plan incorporating all safety modifications. JSON only:
{
  "role": "nutrition_specialist",
  "recommendation": "Final integrated nutrition plan",
  "confidence": 0.9,
  "reasoning": "How safety feedback was incorporated",
  "dailyCalories": 2200,
  "macroSplit": {"protein": 30, "carbs": 45, "fat": 25},
  "mealPlan": [...],
  "warnings": [],
  "consensus": "agree"
}`;
}

function formatMacros(macros) {
  if (!macros) return 'No data';
  return `${macros.calories} cal, ${macros.protein}g P, ${macros.carbs}g C, ${macros.fat}g F (${macros.sampleDays}-day avg)`;
}
