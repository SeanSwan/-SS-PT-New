/**
 * Debate Orchestrator — Multi-Model Recursive Consensus Engine
 * ==============================================================
 * Core engine that runs multi-round AI debates for complex tasks
 * (workout plans, nutrition plans, progress analysis).
 *
 * V3 Features:
 * - Per-participant circuit breakers (3 failures → 60s open)
 * - Per-round timeouts (30s) + total debate timeout (180s)
 * - Cost tracking with emergency brake ($0.50 max)
 * - Fallback strategies: authority | majority | abort
 * - Zod validation on every AI response
 * - State machine: pending → running → partial|complete|failed|timeout
 *
 * Runs in-process (async). Frontend polls via SSE or GET /status.
 * BullMQ upgrade path when Redis is enabled.
 *
 * NO OpenAI. Gemini → Claude (OpenRouter free) → Nemotron (OpenRouter free).
 */
import { randomBytes } from 'crypto';
import logger from '../../../utils/logger.mjs';
import { sendChatMessage } from '../../aiChatService.mjs';
import {
  DEBATE_CONFIGS,
  DEBATE_STATES,
  canDebateParticipant,
  recordDebateSuccess,
  recordDebateFailure,
  DebateRoundResponseSchema,
  NutritionDebateResponseSchema,
} from './debateTypes.mjs';
import {
  buildNASMSpecialistPrompt,
  buildSafetyReviewerPrompt,
  buildPeriodizationExpertPrompt,
  buildFinalIntegrationPrompt,
} from './workoutDebatePrompts.mjs';
import {
  buildNutritionSpecialistPrompt,
  buildNutritionSafetyPrompt,
  buildNutritionFinalPrompt,
} from './nutritionDebatePrompts.mjs';

// ── Debate Job Store (in-memory — Redis upgrade path) ───────────────────────

const activeDebates = new Map();

// Cleanup completed debates after 30 min; reap zombie debates after 60 min
const cleanupTimer = setInterval(() => {
  const completedThreshold = Date.now() - 30 * 60 * 1000;
  const zombieThreshold = Date.now() - 60 * 60 * 1000;

  let cleanedCount = 0;
  let zombieCount = 0;

  for (const [id, debate] of activeDebates.entries()) {
    if (debate.completedAt && debate.completedAt < completedThreshold) {
      activeDebates.delete(id);
      cleanedCount++;
    } else if (!debate.completedAt && debate.startedAt && debate.startedAt < zombieThreshold) {
      logger.error(`[DebateOrchestrator] Reaping zombie debate ${id} (state: ${debate.state})`);
      debate.state = DEBATE_STATES.FAILED;
      debate.error = 'Debate exceeded maximum runtime and was terminated';
      debate.completedAt = Date.now();
      activeDebates.delete(id);
      zombieCount++;
    }
  }

  if (cleanedCount > 0 || zombieCount > 0) {
    logger.info(`[DebateOrchestrator] Cleanup: ${cleanedCount} completed, ${zombieCount} zombies. Active: ${activeDebates.size}`);
  }
}, 60000);
cleanupTimer.unref();

// ── Debate State Management ─────────────────────────────────────────────────

function createDebateJob(debateType, clientContext, userId, options = {}) {
  const config = DEBATE_CONFIGS[debateType];
  if (!config) throw new Error(`Unknown debate type: ${debateType}`);

  const jobId = `debate_${randomBytes(16).toString('hex')}`;

  const job = {
    id: jobId,
    type: debateType,
    state: DEBATE_STATES.PENDING,
    config,
    clientContext,
    userId,
    options,
    rounds: [],
    currentRound: 0,
    totalCostUSD: 0,
    startedAt: null,
    completedAt: null,
    finalPlan: null,
    error: null,
    progress: [],  // SSE-compatible progress events
  };

  activeDebates.set(jobId, job);
  return job;
}

/**
 * Get debate job by ID.
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getDebateJob(jobId) {
  return activeDebates.get(jobId) || null;
}

/**
 * Get debate status for frontend polling.
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getDebateStatus(jobId) {
  const job = activeDebates.get(jobId);
  if (!job) return null;

  return {
    id: job.id,
    type: job.type,
    state: job.state,
    currentRound: job.currentRound,
    maxRounds: job.config.maxRounds,
    totalCostUSD: job.totalCostUSD,
    roundSummaries: job.rounds.map(r => ({
      round: r.roundNumber,
      role: r.role,
      consensus: r.consensus,
      confidence: r.confidence,
      durationMs: r.durationMs,
    })),
    progress: job.progress,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  };
}

/**
 * Get the final result of a completed debate.
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getDebateResult(jobId) {
  const job = activeDebates.get(jobId);
  if (!job) return null;
  if (job.state !== DEBATE_STATES.COMPLETE && job.state !== DEBATE_STATES.PARTIAL) return null;

  return {
    id: job.id,
    type: job.type,
    state: job.state,
    finalPlan: job.finalPlan,
    rounds: job.rounds,
    totalCostUSD: job.totalCostUSD,
    durationMs: job.completedAt ? job.completedAt - job.startedAt : null,
  };
}

// ── Core Debate Engine ──────────────────────────────────────────────────────

/**
 * Start a debate asynchronously. Returns jobId immediately.
 * The debate runs in the background; poll status via getDebateStatus().
 *
 * @param {string} debateType - 'workout_plan' | 'nutrition_plan' | 'progress_analysis'
 * @param {Object} clientContext - De-identified client data
 * @param {number} userId - Requesting user ID
 * @param {Object} [options] - { durationWeeks, daysPerWeek, focus, nasmPhase }
 * @returns {string} jobId
 */
export function startDebate(debateType, clientContext, userId, options = {}) {
  const job = createDebateJob(debateType, clientContext, userId, options);

  // Run debate asynchronously (don't await — returns immediately)
  runDebate(job).catch(err => {
    logger.error('[DebateOrchestrator] Unhandled debate error', {
      jobId: job.id,
      error: err.message,
    });
    job.state = DEBATE_STATES.FAILED;
    job.error = err.message;
    job.completedAt = Date.now();
  });

  return job.id;
}

/**
 * Execute the full debate loop.
 * @param {Object} job - Debate job object
 */
async function runDebate(job) {
  job.state = DEBATE_STATES.RUNNING;
  job.startedAt = Date.now();

  const { config, clientContext } = job;
  const debateStartTime = Date.now();

  emitProgress(job, 'started', `Debate started: ${job.type}`);

  try {
    if (job.type === 'workout_plan') {
      await runWorkoutDebate(job);
    } else if (job.type === 'nutrition_plan') {
      await runNutritionDebate(job);
    } else {
      // Generic 2-round debate for other types
      await runGenericDebate(job);
    }
  } catch (err) {
    // Check if we have any rounds to salvage
    if (job.rounds.length > 0) {
      job.state = DEBATE_STATES.PARTIAL;
      job.finalPlan = extractBestPlan(job);
      emitProgress(job, 'partial', `Debate ended with ${job.rounds.length} rounds (${err.message})`);
    } else {
      job.state = DEBATE_STATES.FAILED;
      job.error = err.message;
      emitProgress(job, 'failed', err.message);
    }
  }

  job.completedAt = Date.now();
  const totalMs = job.completedAt - job.startedAt;

  logger.info('[DebateOrchestrator] Debate finished', {
    jobId: job.id,
    type: job.type,
    state: job.state,
    rounds: job.rounds.length,
    totalMs,
    costUSD: job.totalCostUSD,
  });
}

// ── Workout Debate Flow ─────────────────────────────────────────────────────

async function runWorkoutDebate(job) {
  const { config, clientContext } = job;

  // Round 1: NASM Specialist proposes plan
  const round1 = await executeRound(job, 1, {
    role: 'nasm_specialist',
    promptBuilder: () => buildNASMSpecialistPrompt(clientContext),
    schema: DebateRoundResponseSchema,
  });

  if (!round1) return handleFallback(job, 'Round 1 failed');

  // Round 2: Safety Reviewer reviews
  const round2 = await executeRound(job, 2, {
    role: 'safety_reviewer',
    promptBuilder: () => buildSafetyReviewerPrompt(clientContext, JSON.stringify(round1, null, 2)),
    schema: DebateRoundResponseSchema,
  });

  // Round 3: Periodization Expert reviews (optional — skip if circuit breaker trips)
  let round3 = null;
  if (round2 && config.participants.length >= 3) {
    round3 = await executeRound(job, 3, {
      role: 'periodization_expert',
      promptBuilder: () => buildPeriodizationExpertPrompt(clientContext, JSON.stringify(applyModifications(round1, round2), null, 2)),
      schema: DebateRoundResponseSchema,
    });
  }

  // Check for early consensus
  const allAgree = [round2, round3].filter(Boolean).every(r => r.consensus === 'agree');
  if (allAgree && job.rounds.length >= 2) {
    job.finalPlan = applyModifications(round1, round2, round3);
    job.state = DEBATE_STATES.COMPLETE;
    emitProgress(job, 'consensus', 'All participants agree — early consensus reached');
    return;
  }

  // Round 4-5: Authority integrates feedback
  const allRounds = [round1, round2, round3].filter(Boolean);
  const finalRound = await executeRound(job, job.rounds.length + 1, {
    role: 'nasm_specialist',
    promptBuilder: () => buildFinalIntegrationPrompt(clientContext, allRounds),
    schema: DebateRoundResponseSchema,
  });

  if (finalRound) {
    job.finalPlan = finalRound;
    job.state = DEBATE_STATES.COMPLETE;
    emitProgress(job, 'complete', 'Debate complete — final plan generated');
  } else {
    // Fallback to best plan so far
    handleFallback(job, 'Final integration round failed');
  }
}

// ── Nutrition Debate Flow ───────────────────────────────────────────────────

async function runNutritionDebate(job) {
  const { clientContext } = job;

  const round1 = await executeRound(job, 1, {
    role: 'nutrition_specialist',
    promptBuilder: () => buildNutritionSpecialistPrompt(clientContext),
    schema: NutritionDebateResponseSchema,
  });

  if (!round1) return handleFallback(job, 'Round 1 failed');

  const round2 = await executeRound(job, 2, {
    role: 'safety_reviewer',
    promptBuilder: () => buildNutritionSafetyPrompt(clientContext, JSON.stringify(round1, null, 2)),
    schema: NutritionDebateResponseSchema,
  });

  // Final integration
  const allRounds = [round1, round2].filter(Boolean);
  const finalRound = await executeRound(job, 3, {
    role: 'nutrition_specialist',
    promptBuilder: () => buildNutritionFinalPrompt(clientContext, allRounds),
    schema: NutritionDebateResponseSchema,
  });

  if (finalRound) {
    job.finalPlan = finalRound;
    job.state = DEBATE_STATES.COMPLETE;
    // S2.2 (2026-08-04): the debate outcome used to be generated and thrown
    // away — no plan → adherence → outcome loop existed. Persist it as a DRAFT
    // NutritionTarget (the single-writer service forces ai_generated → draft;
    // bounds-validates; only a human can activate). Best-effort: a persistence
    // failure must not fail the debate the trainer is watching.
    await persistNutritionDraftTarget(job).catch((err) => {
      logger.warn(`[DebateOrchestrator] draft target persistence failed: ${err.message}`);
    });
    emitProgress(job, 'complete', job.draftTargetId
      ? `Nutrition plan debate complete — draft target #${job.draftTargetId} saved for review`
      : 'Nutrition plan debate complete');
  } else {
    handleFallback(job, 'Final nutrition round failed');
  }
}

async function persistNutritionDraftTarget(job) {
  const clientId = Number(job.options?.clientId);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) return;
  const plan = job.finalPlan;
  if (!plan?.dailyCalories && !plan?.macroSplit) return;

  const { setNutritionTarget } = await import('../../nutrition/nutritionTargetService.mjs');
  const { getUserLocalToday } = await import('../../nutrition/nutritionAdherenceService.mjs');

  // macroSplit arrives as percentages; convert to grams via 4/4/9.
  const kcal = plan.dailyCalories || null;
  const fields = { dailyCalories: kcal };
  if (kcal && plan.macroSplit) {
    fields.proteinGrams = Math.round((kcal * plan.macroSplit.protein) / 100 / 4);
    fields.carbsGrams = Math.round((kcal * plan.macroSplit.carbs) / 100 / 4);
    fields.fatGrams = Math.round((kcal * plan.macroSplit.fat) / 100 / 9);
  }

  const { todayLocal } = await getUserLocalToday(clientId);
  const result = await setNutritionTarget({
    userId: clientId,
    fields,
    createdBy: job.userId,
    source: 'ai_generated',   // forced draft — the model proposes, a human activates
    effectiveFrom: todayLocal,
  });
  if (result.ok) {
    job.draftTargetId = result.target.id;
  } else {
    logger.warn(`[DebateOrchestrator] draft target rejected by bounds validator: ${result.errors.join('; ')}`);
  }
}

// ── Generic Debate Flow ─────────────────────────────────────────────────────

async function runGenericDebate(job) {
  // 2-round simple debate for progress analysis etc.
  const { clientContext } = job;

  const round1 = await executeRound(job, 1, {
    role: 'analyst',
    promptBuilder: () => `Analyze this client's progress:\n${JSON.stringify(clientContext, null, 2)}\n\nOutput JSON with: role, recommendation, confidence, reasoning`,
    schema: DebateRoundResponseSchema,
  });

  if (round1) {
    job.finalPlan = round1;
    job.state = DEBATE_STATES.COMPLETE;
  } else {
    job.state = DEBATE_STATES.FAILED;
    job.error = 'Analysis failed';
  }
}

// ── Round Execution ─────────────────────────────────────────────────────────

/**
 * Execute a single debate round with timeout and circuit breaker.
 *
 * @param {Object} job - Debate job
 * @param {number} roundNumber
 * @param {Object} params - { role, promptBuilder, schema }
 * @returns {Object|null} - Parsed + validated response, or null on failure
 */
async function executeRound(job, roundNumber, { role, promptBuilder, schema }) {
  const { config } = job;
  const roundStart = Date.now();

  // Check total timeout
  if (job.startedAt && (Date.now() - job.startedAt) > config.maxTotalTimeMs) {
    emitProgress(job, 'timeout', `Total debate timeout (${config.maxTotalTimeMs}ms) exceeded`);
    throw new Error('Total debate timeout exceeded');
  }

  // Check cost budget
  if (job.totalCostUSD > config.maxCostUSD) {
    emitProgress(job, 'cost_limit', `Cost limit ($${config.maxCostUSD}) exceeded`);
    throw new Error(`Cost limit exceeded: $${job.totalCostUSD.toFixed(4)}`);
  }

  // Check circuit breaker for this participant role
  const cbKey = `debate_${role}`;
  if (!canDebateParticipant(cbKey)) {
    logger.warn('[DebateOrchestrator] Circuit breaker open, skipping round', { role, roundNumber });
    emitProgress(job, 'skipped', `Skipping ${role} — circuit breaker open`);
    return null;
  }

  emitProgress(job, 'round_start', `Round ${roundNumber}: ${role}`, {
    round: roundNumber,
    total: config.maxRounds,
    currentModel: role,
  });

  try {
    const prompt = promptBuilder();

    // Execute with per-round timeout
    // TODO (TECH-DEBT-001): Implement provider-aware AbortController to cancel HTTP requests on timeout.
    // Currently, timed-out requests continue consuming sockets until the network layer drops them.
    const result = await Promise.race([
      sendChatMessage(
        [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Generate the plan now. Output ONLY valid JSON, no markdown.' },
        ],
        { maxTokens: 2000, temperature: 0.3 }
      ),
      timeout(config.timeoutMs, `Round ${roundNumber} timeout (${config.timeoutMs}ms)`),
    ]);

    if (!result.ok) {
      recordDebateFailure(cbKey);
      emitProgress(job, 'round_failed', `Round ${roundNumber} provider error`);
      return null;
    }

    // Parse response JSON
    const parsed = parseDebateResponse(result.content || '');
    if (!parsed) {
      recordDebateFailure(cbKey);
      emitProgress(job, 'round_failed', `Round ${roundNumber} invalid JSON`);
      return null;
    }

    // Validate with Zod
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      logger.warn('[DebateOrchestrator] Zod validation failed', {
        roundNumber,
        role,
        errors: validated.error.issues.slice(0, 3),
      });
      // Try to salvage — use raw parsed if it has the basic fields
      if (parsed.recommendation && parsed.role) {
        recordDebateSuccess(cbKey);
        const roundData = {
          ...parsed,
          roundNumber,
          role,
          durationMs: Date.now() - roundStart,
          validated: false,
        };
        job.rounds.push(roundData);
        job.currentRound = roundNumber;
        emitProgress(job, 'round_complete', `Round ${roundNumber}: ${role} (partial validation)`, {
          round: roundNumber,
          consensus: parsed.consensus,
        });
        return parsed;
      }
      recordDebateFailure(cbKey);
      return null;
    }

    // Success
    recordDebateSuccess(cbKey);
    const roundData = {
      ...validated.data,
      roundNumber,
      durationMs: Date.now() - roundStart,
      validated: true,
    };
    job.rounds.push(roundData);
    job.currentRound = roundNumber;

    // Estimate cost (~$0.002 per round for free models, ~$0.01 for Gemini Pro)
    job.totalCostUSD += 0.005;

    emitProgress(job, 'round_complete', `Round ${roundNumber}: ${role} complete`, {
      round: roundNumber,
      consensus: validated.data.consensus,
      confidence: validated.data.confidence,
    });

    return validated.data;
  } catch (err) {
    recordDebateFailure(cbKey);
    logger.warn('[DebateOrchestrator] Round failed', {
      roundNumber, role, error: err.message,
    });
    emitProgress(job, 'round_failed', `Round ${roundNumber}: ${err.message}`);
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeout(ms, message) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    // Allow Node to exit even if timer is pending
    if (timer.unref) timer.unref();
  });
}

function parseDebateResponse(raw) {
  if (!raw) return null;
  let cleaned = raw.trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

function applyModifications(basePlan, ...reviewRounds) {
  // Merge modifications from review rounds into the base plan
  const result = { ...basePlan };
  const allMods = [];

  for (const round of reviewRounds) {
    if (!round) continue;
    // Defensive type-checks: salvaged data may not match expected shape
    if (round.modifications && Array.isArray(round.modifications)) {
      allMods.push(...round.modifications);
    }
    if (round.contraindications && Array.isArray(round.contraindications)) {
      result.contraindications = [
        ...(result.contraindications || []),
        ...round.contraindications,
      ];
    }
  }

  result.modifications = allMods;

  // Apply exercise substitutions to workout days
  if (result.workoutDays && allMods.length > 0) {
    for (const day of result.workoutDays) {
      if (!day.exercises) continue;
      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i];
        const mod = allMods.find(m =>
          m.original && ex.name &&
          m.original.toLowerCase().includes(ex.name.toLowerCase())
        );
        if (mod) {
          day.exercises[i] = {
            ...ex,
            name: mod.replacement,
            notes: `${ex.notes || ''} [Modified: ${mod.reason}]`.trim(),
            contraindicated: false,
          };
        }
      }
    }
  }

  return result;
}

function extractBestPlan(job) {
  // Get the best round response (highest confidence from authority)
  const authority = job.rounds.find(r => r.role === 'nasm_specialist' || r.role === 'nutrition_specialist');
  if (authority) return authority;
  // Otherwise return the last successful round
  return job.rounds[job.rounds.length - 1] || null;
}

function handleFallback(job, reason) {
  const bestPlan = extractBestPlan(job);
  if (bestPlan) {
    job.finalPlan = { ...bestPlan, isDraft: true, fallbackReason: reason };
    job.state = DEBATE_STATES.PARTIAL;
    emitProgress(job, 'fallback', `Using best available plan: ${reason}`);
  } else {
    job.state = DEBATE_STATES.FAILED;
    job.error = reason;
    emitProgress(job, 'failed', reason);
  }
}

function emitProgress(job, type, message, data = {}) {
  const event = {
    type,
    message,
    timestamp: Date.now(),
    ...data,
  };
  job.progress.push(event);

  // Keep progress array bounded (last 50 events)
  if (job.progress.length > 50) {
    job.progress = job.progress.slice(-50);
  }
}
