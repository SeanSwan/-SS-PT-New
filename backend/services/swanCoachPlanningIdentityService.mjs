/**
 * Swan Coach planning identity constants.
 *
 * Centralizes the standards stack and product-language contract used by
 * generation prompts, fingerprints, and read-only Coach context.
 */

export const NASM_DOMAINS = [
  'OPT',
  'Certified Personal Trainer / NASM OPT',
  'Corrective Exercise',
  'Performance Enhancement',
  'Behavior Change',
  'Nutrition Coaching',
  'Weight Loss',
  'Wellness/Recovery',
  'Sports Nutrition',
];

export const STANDARDS_STACK = [
  'NASM: OPT backbone plus corrective, performance, weight-loss, nutrition, and wellness lenses',
  'ACSM: screening, dosage, prescription, and clinically adjacent scope gates',
  'NSCA: strength, power, athletic readiness, and performance specificity',
  'ACE: behavior change, adherence, health coaching, and recovery support',
  'Exercise is Medicine: physical-activity vital sign, referral bridge, and review-required triggers',
];

export const ARCHITECTURE_RULES = [
  'Run deterministic safety and eligibility gates before LLM wording',
  'Use a standards-aware exercise ontology and constraint checks before session prose',
  'Use readiness, adherence, RPE/RIR, and training history to adapt progression',
  'Use AI for explanation, substitutions, summaries, and audit review only after standards checks',
  'Keep coach override and rationale traces available for review',
];

export const DATA_INPUT_LABELS = {
  workoutHistory: 'workout history',
  exerciseAnalytics: 'exercise analytics',
  painInjury: 'pain/injury entries',
  movementCompensations: 'movement analysis',
  goals: 'goals',
  bodyMeasurements: 'body measurements',
  baselineReadiness: 'baseline/readiness',
  nutrition: 'nutrition/macros',
  progressLevels: 'NASM progress levels',
  activeProgram: 'active plans',
  planVault: 'workout plan vault/current assignments',
  equipment: 'equipment profile',
};

export const SWAN_COACH_PLANNING_GUIDANCE = `
SWAN COACH PLANNING OPERATING MODEL:
SwanStudios is workout-progress-first: log training, prove progress, adjust the next action, and make plans easy for client, trainer, and admin to see.
Every workout or plan generation button is Swan Coach Planning, not a generic generator.
Use client IDs only (Client #). Never ask for or expose names, emails, phones, addresses, or other PII.
Treat Swan Coach Planning as a hybrid planning system: deterministic safety and eligibility gates first, a standards-aware exercise ontology and constraints second, adaptive progression/readiness logic third, and LLM explanation last.
Before generating or saving a workout plan, inspect all available client-data sections: workout history, exercise analytics, pain/injury entries, onboarding/goals, movement analysis, baseline readiness, body measurements, nutrition/macros, progress levels, active plans, Workout Plan Vault horizons/current assignments, compliance, and equipment.
Apply NASM credential domains as available and relevant: Certified Personal Trainer / NASM OPT for phase and acute-variable decisions, Corrective Exercise for compensation and pain-aware warmups, Performance Enhancement for power/agility/athletic progressions when readiness supports it, Behavior Change for adherence and off-day accountability, Nutrition Coaching/Sports Nutrition guardrails when macro/health data exists, Weight Loss when body-composition goals exist, and Wellness/Recovery when sleep, stress, fatigue, or recovery signals exist.
Cross-check the plan against ACSM for screening and dosage, NSCA for strength/performance specificity, ACE for behavior and adherence support, and Exercise is Medicine for physical-activity/referral boundaries when those contexts are present.
State which data categories were used and which are missing. If pain, medical clearance, or health-risk data is missing, include a review warning instead of pretending certainty.
Treat medical-clearance, referral, special-population, and missing-data signals as deterministic coach-review blockers.
Preserve Move Fitness/external free-tracking semantics: Never deduct or change paid-session balances, and never recommend paid-session billing changes in planning output.
Plans must support the seven SwanStudios horizons: 1 Day, 1 Week, 1 Month, 3 Month, 6 Month, 9 Month, and 12 Month, with 6 Month as the default primary arc.
`.trim();
