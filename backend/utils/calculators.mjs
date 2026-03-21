/**
 * calculators.mjs
 * ─────────────────────────────────────────────────────────────
 * NASM-aligned fitness calculators for the SwanStudios platform.
 *
 * Provides:
 *   - calculateBMR(weight, height, age, sex)  → Mifflin-St Jeor BMR
 *   - calculateTDEE(bmr, activityLevel)       → Total Daily Energy Expenditure
 *   - calculateBodyFat(measurements, unit, sex) → Navy Method body fat %
 *   - calculateBMI(weight, height, unit)       → Body Mass Index
 *   - calculate1RM_Brzycki(weight, reps)       → Brzycki formula 1RM
 *   - calculateTargetWeight(oneRM, intensity)  → Backend weight calc (CEO ruling)
 *
 * CEO Ruling V2.0: AI NEVER does math. Backend is sole authority on
 * weight calculations. AI outputs targetIntensity % only.
 *
 * Body fat supports both imperial (inches) and metric (cm) per CEO ruling.
 * Default to imperial (app is American-based per CLAUDE.md feedback).
 */

// ─── BMR: Mifflin-St Jeor (gold standard for NASM) ─────────

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
 *
 * Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
 * Female: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
 *
 * @param {number} weightLbs - Body weight in pounds
 * @param {number} heightIn  - Height in inches
 * @param {number} age       - Age in years
 * @param {'male'|'female'} sex
 * @returns {number} BMR in calories/day
 */
export function calculateBMR(weightLbs, heightIn, age, sex) {
  if (weightLbs <= 0 || heightIn <= 0 || age <= 0) {
    throw new Error('INVALID_INPUT: weight, height, and age must be positive');
  }

  // Convert imperial to metric for the formula
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightIn * 2.54;

  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Calculate BMR from metric inputs directly.
 *
 * @param {number} weightKg - Body weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @param {number} age      - Age in years
 * @param {'male'|'female'} sex
 * @returns {number} BMR in calories/day
 */
export function calculateBMR_Metric(weightKg, heightCm, age, sex) {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw new Error('INVALID_INPUT: weight, height, and age must be positive');
  }

  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// ─── TDEE: Activity Multiplier ──────────────────────────────

/**
 * NASM activity level multipliers (Harris-Benedict scale).
 * Matches NASM.org calorie calculator categories.
 */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,       // Little/no exercise, desk job
  light: 1.375,         // Light exercise 1-3 days/week
  moderate: 1.55,       // Moderate exercise 3-5 days/week
  active: 1.725,        // Hard exercise 6-7 days/week
  very_active: 1.9,     // Very hard exercise, physical job, 2x/day training
};

/**
 * Calculate Total Daily Energy Expenditure.
 *
 * @param {number} bmr - Basal Metabolic Rate
 * @param {'sedentary'|'light'|'moderate'|'active'|'very_active'} activityLevel
 * @returns {number} TDEE in calories/day
 */
export function calculateTDEE(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (!multiplier) {
    throw new Error(`INVALID_ACTIVITY_LEVEL: must be one of ${Object.keys(ACTIVITY_MULTIPLIERS).join(', ')}`);
  }
  return Math.round(bmr * multiplier);
}

/**
 * Calculate macro split based on TDEE and goal.
 *
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {'lose'|'maintain'|'gain'} goal
 * @returns {{ calories: number, protein: number, carbs: number, fat: number }}
 */
export function calculateMacros(tdee, goal) {
  // Calorie adjustments per goal
  const adjustments = { lose: -500, maintain: 0, gain: 500 };
  const adjustment = adjustments[goal];
  if (adjustment === undefined) {
    throw new Error('INVALID_GOAL: must be lose, maintain, or gain');
  }

  const targetCals = Math.round(tdee + adjustment);

  // Standard NASM-aligned macro split:
  // Lose: 40% protein, 30% carbs, 30% fat (higher protein for muscle preservation)
  // Maintain: 30% protein, 40% carbs, 30% fat
  // Gain: 30% protein, 45% carbs, 25% fat (higher carbs for energy/growth)
  const splits = {
    lose: { protein: 0.40, carbs: 0.30, fat: 0.30 },
    maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
    gain: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  };

  const split = splits[goal];
  return {
    calories: targetCals,
    protein: Math.round((targetCals * split.protein) / 4),   // 4 cal/g protein
    carbs: Math.round((targetCals * split.carbs) / 4),       // 4 cal/g carbs
    fat: Math.round((targetCals * split.fat) / 9),           // 9 cal/g fat
  };
}

// ─── Body Fat: U.S. Navy Method ─────────────────────────────

/**
 * Calculate body fat percentage using the U.S. Navy Method.
 * Supports both imperial (inches) and metric (cm) per CEO ruling V2.0.
 *
 * Imperial (default — app is American-based):
 *   Male:   %BF = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
 *   Female: %BF = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387
 *
 * Metric:
 *   Male:   %BF = 495 / (1.0324 - 0.19077 × log10(waist - neck) + 0.15456 × log10(height)) - 450
 *   Female: %BF = 495 / (1.29579 - 0.35004 × log10(waist + hip - neck) + 0.22100 × log10(height)) - 450
 *
 * @param {{ waist: number, neck: number, height: number, hip?: number }} m - Measurements
 * @param {'in'|'cm'} unit - Measurement unit system
 * @param {'male'|'female'} sex
 * @returns {number} Body fat percentage (rounded to 1 decimal)
 */
export function calculateBodyFat(m, unit, sex) {
  const { waist, neck, height, hip } = m;

  if (waist <= 0 || neck <= 0 || height <= 0) {
    throw new Error('INVALID_INPUT: waist, neck, and height must be positive');
  }
  if (waist <= neck) {
    throw new Error('INVALID_INPUT: waist must be greater than neck');
  }
  if (sex === 'female' && (!hip || hip <= 0)) {
    throw new Error('INVALID_INPUT: hip measurement required for female calculation');
  }

  let bf;

  if (unit === 'cm') {
    // Metric formula
    if (sex === 'male') {
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }
  } else {
    // Imperial formula (default)
    if (sex === 'male') {
      bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
    } else {
      bf = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
    }
  }

  return Math.round(bf * 10) / 10;
}

// ─── BMI ────────────────────────────────────────────────────

/**
 * Calculate Body Mass Index.
 *
 * Imperial: BMI = (weight_lbs × 703) / (height_in²)
 * Metric:   BMI = weight_kg / (height_m²)
 *
 * @param {number} weight - Body weight
 * @param {number} height - Height
 * @param {'imperial'|'metric'} unit
 * @returns {{ bmi: number, category: string }}
 */
export function calculateBMI(weight, height, unit = 'imperial') {
  if (weight <= 0 || height <= 0) {
    throw new Error('INVALID_INPUT: weight and height must be positive');
  }

  let bmi;
  if (unit === 'metric') {
    // weight in kg, height in cm → convert to meters
    const heightM = height / 100;
    bmi = weight / (heightM * heightM);
  } else {
    // weight in lbs, height in inches
    bmi = (weight * 703) / (height * height);
  }

  bmi = Math.round(bmi * 10) / 10;

  let category;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';

  return { bmi, category };
}

// ─── 1RM: Brzycki Formula (client-facing calculator) ────────

/**
 * Calculate estimated 1-rep max using the Brzycki formula.
 * More accurate than Epley at moderate rep ranges (2-10).
 *
 * IMPORTANT: This function is for ASSESSMENT data only (reps 1-10).
 * Regular workout logging (Phase 1: 12-20 reps) does NOT call this function.
 * 1RM is assessed separately during scheduled reassessment sessions.
 *
 * Formula: 1RM = weight / (1.0278 - 0.0278 × reps)
 *
 * @param {number} weight - Weight lifted
 * @param {number} reps   - Reps completed (1-10)
 * @returns {number} Estimated 1RM rounded to nearest 5 lbs
 */
export function calculate1RM_Brzycki(weight, reps) {
  if (typeof weight !== 'number' || typeof reps !== 'number') {
    throw new Error('INVALID_INPUT: weight and reps must be numbers');
  }
  if (weight <= 0 || reps < 1) {
    throw new Error('INVALID_INPUT: weight must be positive, reps must be >= 1');
  }
  if (reps === 1) return weight;

  if (reps > 10) {
    throw new Error('1RM_REQUIRES_LOW_REP_DATA');
  }

  const raw1RM = weight / (1.0278 - 0.0278 * reps);
  return Math.round(raw1RM / 5) * 5;
}

// ─── Target Weight Calculator (CEO Ruling: backend-only) ────

/**
 * Calculate target weight from 1RM and intensity percentage.
 * CEO Ruling V2.0 Issue #3: AI outputs targetIntensity %, backend calculates weight.
 * This function is the SOLE authority on weight calculations.
 *
 * @param {number|'UNKNOWN_REQUIRE_TESTING'} user1RM - Client's estimated 1RM
 * @param {number} targetIntensity - Percentage as integer (30-100)
 * @returns {number|null} Target weight rounded to nearest 5 lbs, or null if 1RM unknown
 */
export function calculateTargetWeight(user1RM, targetIntensity) {
  if (user1RM === 'UNKNOWN_REQUIRE_TESTING') return null;
  if (typeof user1RM !== 'number' || user1RM <= 0) return null;
  if (typeof targetIntensity !== 'number' || targetIntensity < 1 || targetIntensity > 100) return null;

  const rawWeight = user1RM * (targetIntensity / 100);
  return Math.round(rawWeight / 5) * 5;
}

// ─── 1RM Conversion Chart (Appendix) ────────────────────────

/**
 * Generate a 1RM conversion chart for a given weight.
 * Shows estimated max reps at each percentage bracket.
 *
 * @param {number} oneRM - Estimated 1-rep max
 * @returns {Array<{ pct: number, weight: number, estReps: string }>}
 */
export function generate1RMChart(oneRM) {
  if (typeof oneRM !== 'number' || oneRM <= 0) return [];

  const brackets = [
    { pct: 100, reps: '1' },
    { pct: 95, reps: '2' },
    { pct: 93, reps: '3' },
    { pct: 90, reps: '4' },
    { pct: 87, reps: '5' },
    { pct: 85, reps: '6' },
    { pct: 83, reps: '7' },
    { pct: 80, reps: '8' },
    { pct: 77, reps: '9' },
    { pct: 75, reps: '10' },
    { pct: 70, reps: '11-12' },
    { pct: 67, reps: '13-15' },
    { pct: 65, reps: '16-20' },
  ];

  return brackets.map(({ pct, reps }) => ({
    pct,
    weight: Math.round((oneRM * pct / 100) / 5) * 5,
    estReps: reps,
  }));
}
