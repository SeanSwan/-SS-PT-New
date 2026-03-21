/**
 * Debate Types & Configuration
 * =============================
 * Configs, circuit breaker state, and Zod schemas for the recursive
 * multi-AI debate engine. V3 build-ready with per-round timeouts,
 * cost tracking, and explicit state machine.
 *
 * NO OpenAI. Models: Gemini 3.1 Pro, Claude Sonnet (OpenRouter free),
 * Nemotron 120B (OpenRouter free).
 */
import { z } from 'zod';

// ── Debate Configs ──────────────────────────────────────────────────────────

export const DEBATE_CONFIGS = {
  workout_plan: {
    maxRounds: 5,
    timeoutMs: 30000,           // 30s per round
    maxTotalTimeMs: 180000,     // 3min total
    maxCostUSD: 0.50,
    fallbackStrategy: 'authority',
    participants: [
      { role: 'nasm_specialist', provider: 'gemini', model: 'gemini-2.5-flash', isAuthority: true },
      { role: 'safety_reviewer', provider: 'openrouter', model: 'anthropic/claude-4.5-sonnet', isAuthority: false },
      { role: 'periodization_expert', provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free', isAuthority: false },
    ],
  },
  nutrition_plan: {
    maxRounds: 3,
    timeoutMs: 20000,
    maxTotalTimeMs: 90000,
    maxCostUSD: 0.25,
    fallbackStrategy: 'authority',
    participants: [
      { role: 'nutrition_specialist', provider: 'gemini', model: 'gemini-2.5-flash', isAuthority: true },
      { role: 'safety_reviewer', provider: 'openrouter', model: 'anthropic/claude-4.5-sonnet', isAuthority: false },
    ],
  },
  progress_analysis: {
    maxRounds: 2,
    timeoutMs: 20000,
    maxTotalTimeMs: 60000,
    maxCostUSD: 0.15,
    fallbackStrategy: 'authority',
    participants: [
      { role: 'progress_analyst', provider: 'gemini', model: 'gemini-2.5-flash', isAuthority: true },
      { role: 'trend_reviewer', provider: 'openrouter', model: 'anthropic/claude-4.5-sonnet', isAuthority: false },
    ],
  },
};

// ── Circuit Breaker State (per-participant) ─────────────────────────────────

const circuitBreakers = new Map();

/**
 * Get or create a circuit breaker for a participant.
 * @param {string} key - Provider+model key
 * @returns {{ state: string, failureCount: number, lastFailure: number }}
 */
export function getCircuitBreaker(key) {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      state: 'closed',       // closed | open | half-open
      failureCount: 0,
      lastFailure: 0,
      failureThreshold: 3,
      resetTimeMs: 60000,
    });
  }
  return circuitBreakers.get(key);
}

/**
 * Check if a participant's circuit breaker allows requests.
 * @param {string} key
 * @returns {boolean}
 */
export function canDebateParticipant(key) {
  const cb = getCircuitBreaker(key);

  if (cb.state === 'closed') return true;

  if (cb.state === 'open') {
    // Check if reset time has passed → transition to half-open
    if (Date.now() - cb.lastFailure > cb.resetTimeMs) {
      cb.state = 'half-open';
      return true;
    }
    return false;
  }

  // half-open — allow one probe request
  return true;
}

/**
 * Record a successful debate round for a participant.
 * @param {string} key
 */
export function recordDebateSuccess(key) {
  const cb = getCircuitBreaker(key);
  cb.state = 'closed';
  cb.failureCount = 0;
}

/**
 * Record a failed debate round for a participant.
 * @param {string} key
 */
export function recordDebateFailure(key) {
  const cb = getCircuitBreaker(key);
  cb.failureCount++;
  cb.lastFailure = Date.now();

  if (cb.failureCount >= cb.failureThreshold) {
    cb.state = 'open';
  }
}

// ── Zod Schemas for Debate Responses ────────────────────────────────────────

export const ExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1),         // "8-12" or "30s" for timed
  weight: z.string().optional(),     // "135 lbs" or "bodyweight"
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(500).optional(),
  nasmPhase: z.number().int().min(1).max(5).optional(),
  contraindicated: z.boolean().optional(),
  alternative: z.string().optional(), // Alt exercise if contraindicated
});

export const WorkoutDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  focus: z.string(),                 // "Upper Body Push", "Full Body", etc.
  warmup: z.array(ExerciseSchema).optional(),
  exercises: z.array(ExerciseSchema).min(1),
  cooldown: z.array(ExerciseSchema).optional(),
  totalVolume: z.string().optional(), // "24 working sets"
});

export const DebateRoundResponseSchema = z.object({
  role: z.string(),
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  contraindications: z.array(z.string()).optional().default([]),
  modifications: z.array(z.object({
    original: z.string(),
    replacement: z.string(),
    reason: z.string(),
  })).optional().default([]),
  exercises: z.array(ExerciseSchema).optional(),
  workoutDays: z.array(WorkoutDaySchema).optional(),
  consensus: z.enum(['agree', 'disagree', 'partial']).optional(),
});

export const NutritionDebateResponseSchema = z.object({
  role: z.string(),
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  dailyCalories: z.number().int().min(800).max(6000).optional(),
  macroSplit: z.object({
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fat: z.number().min(0).max(100),
  }).optional(),
  mealPlan: z.array(z.object({
    meal: z.string(),
    foods: z.array(z.string()),
    calories: z.number().optional(),
  })).optional(),
  warnings: z.array(z.string()).optional().default([]),
  consensus: z.enum(['agree', 'disagree', 'partial']).optional(),
});

// ── Debate State ────────────────────────────────────────────────────────────

export const DEBATE_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  PARTIAL: 'partial',     // Some rounds complete, some failed
  COMPLETE: 'complete',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
};
