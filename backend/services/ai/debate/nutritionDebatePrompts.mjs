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
  return `You are a PhD-level sports nutritionist specializing in body composition and athletic performance nutrition. Design a nutrition plan.

CLIENT PROFILE (de-identified):
- Alias: ${clientContext.clientAlias}
- Age: ${clientContext.age || 'unknown'}, Gender: ${clientContext.gender || 'unknown'}
- Goals: ${(clientContext.fitnessGoals || []).join(', ') || 'general fitness'}
- NASM Phase: ${clientContext.nasmPhase || 1}
- Current Macros (7-day avg): ${formatMacros(clientContext.macroAverages)}
- Measurement Trend: ${clientContext.measurementTrends || 'unknown'}
- Training Experience: ${clientContext.trainingExperience || 'beginner'}

GUIDELINES:
1. Calculate TDEE based on available data (Harris-Benedict or Mifflin-St Jeor)
2. Set appropriate caloric target based on goals
3. Calculate macro split (protein 0.8-1.2g/lb, adjust carbs/fats by phase)
4. Suggest a sample meal plan with 4-5 meals
5. Flag any FDA warnings for common allergens or sodium
6. Consider NASM phase — Phase 1 recovery needs vs Phase 4 energy demands

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
  return `You are a registered dietitian and food safety specialist. Review this nutrition plan for health risks and suitability.

CLIENT: ${clientContext.clientAlias}
Age: ${clientContext.age || 'unknown'}, Gender: ${clientContext.gender || 'unknown'}
Goals: ${(clientContext.fitnessGoals || []).join(', ') || 'general fitness'}

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
