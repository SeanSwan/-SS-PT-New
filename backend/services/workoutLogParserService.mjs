/**
 * Workout Log Parser Service
 * ===========================
 * Parses trainer voice memo transcripts (or text notes) into structured
 * DailyWorkoutForm.formData using AI, enriched with client context.
 *
 * Provider chain (Phase 10 rewrite, 2026-04-14):
 *   1. Gemini — primary. Uses `GOOGLE_API_KEY || GEMINI_API_KEY` via direct
 *      fetch to generativelanguage.googleapis.com, mirroring the pattern
 *      already proven in voiceTranscriptionService.mjs.
 *   2. OpenAI — optional fallback ONLY when OPENAI_API_KEY is also present
 *      AND the Gemini call failed with a retryable error. Never the primary.
 *
 * This inversion from the prior Phase 9 implementation (which hard-required
 * OPENAI_API_KEY) unblocks local transcript intake for users who only have
 * a Google/Gemini key configured.
 *
 * Output contract (unchanged from Phase 9 — consumers depend on this shape):
 *   {
 *     exercises: [{ exerciseName, sets[], formRating?, painLevel?, performanceNotes? }],
 *     sessionNotes?: string,
 *     overallIntensity?: number,
 *     painFlags?: Array<{ bodyRegion, side, mention }>,
 *     confidence: number,
 *     date: string,
 *   }
 */

import { getClientContext } from './clientIntelligenceService.mjs';
import { redactTranscriptPII } from './redactTranscriptPII.mjs';

/**
 * S7 fail-closed privacy gate (JARVIS §6.2): if the redactor errors, NO text
 * may reach the LLM — throw a typed 422-class error instead of parsing raw.
 * Exported for its unit fence.
 */
export function redactOrFailClosed(transcript, nameHints) {
  try {
    const { text } = redactTranscriptPII(transcript, { nameHints });
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error('redactor returned no text');
    }
    return text;
  } catch (err) {
    const failure = new Error('REDACTION_FAILED');
    failure.statusCode = 422;
    failure.cause = err;
    throw failure;
  }
}
import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: System prompt (provider-agnostic)
// PURPOSE: The strict schema contract we enforce on every parser call.
//          Kept identical to the Phase 9 implementation so downstream
//          consumers (parsedWorkoutToLogPayload, CoachMessage review card)
//          continue to work without any shape change.
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(contextBlock) {
  return `You are a fitness workout log parser for SwanStudios, a NASM-protocol personal training platform.

Your job: Parse a trainer's voice memo or session notes into a structured workout log JSON.

CLIENT CONTEXT:
${contextBlock}

GENERAL RULES:
- Extract every exercise mentioned with sets, reps, weight, and any notes
- Detect pain mentions and flag them with body region and side (left/right/bilateral)
- If the trainer mentions RPE, form quality, or difficulty, include it
- If weight isn't mentioned, use null (not 0)
- If reps aren't clear, estimate from context
- Set overallIntensity on a 1-10 scale based on the session description
- Never invent NASM OPT phases, movement compensations, or coaching cues that the trainer did not actually say
- Do not duplicate the same observation across sessionNotes, performanceNotes, and set.notes — place it in exactly ONE appropriate field

NOTES SCOPE — CRITICAL. There are FOUR distinct note channels. Place every observation in the correct one:
  1. set.notes        — a note about ONE specific set only (e.g. "set 3 had tempo breakdown").
                        Attach to the exact set it refers to. Leave other sets' notes empty.
  2. performanceNotes  — a note about the exercise as a whole, across all sets
                        (e.g. "knees caved on goblet squat", "cueing needed for hip hinge").
                        This is the exercise-level coaching observation.
  3. sessionNotes      — session-wide observations that are NOT tied to any one exercise
                        (e.g. "low energy overall", "great focus today", "skipped cool-down").
  4. painFlags         — structured pain mentions. ALSO include the pain in performanceNotes
                        (or set.notes if it was set-specific) so a reader sees it in context.

EXERCISE-SPECIFIC OBSERVATIONS MUST ATTACH TO THE CORRECT EXERCISE. Examples:
  - "left shoulder hurt during dumbbell bench"     → dumbbell bench performanceNotes + painFlag
  - "left arm weaker on seated row"                → seated row performanceNotes
  - "knees caved on goblet squat"                  → goblet squat performanceNotes
  - "tempo broke down on last set of split squat"  → split squat set N notes (N = last set)
  - "needed hip-hinge cue on RDL set 2"            → RDL set 2 notes
  - "good range of motion on overhead press"       → overhead press performanceNotes
  - "low energy today"                             → sessionNotes (no exercise)

COACHING OBSERVATION TYPES to capture when the trainer mentions them (NASM-aligned):
  - tempo deviations (e.g. "eccentric collapsed", "pause lost on set 3")
  - asymmetry (left vs right, unilateral weakness)
  - compensation (knees caving, butt wink, lumbar extension, scapular winging)
  - pain or discomfort (captured in painFlags AND the relevant notes channel)
  - range-of-motion issues (shallow depth, locked out, partial reps)
  - form breakdown (round back, loss of bracing, bar path drift)
  - cueing needed (verbal or tactile cue the trainer gave or should give next time)

Only capture these observations if the trainer actually stated them. Do not infer.

OUTPUT FORMAT (strict JSON, no markdown fences, no commentary):
{
  "exercises": [
    {
      "exerciseName": "Exercise Name",
      "sets": [
        { "setNumber": 1, "weight": 135, "reps": 10, "rpe": 7, "formQuality": 4, "notes": "" }
      ],
      "formRating": 4,
      "painLevel": 0,
      "performanceNotes": ""
    }
  ],
  "sessionNotes": "Overall session observations",
  "overallIntensity": 7,
  "painFlags": [
    { "bodyRegion": "shoulder", "side": "left", "mention": "exact quote from transcript" }
  ]
}`;
}

function buildContextBlock(ctx) {
  const parts = [];
  // RULE 8: the client's NAME is deliberately NOT sent to the parser LLM (zero PII
  // to LLMs). It has no parsing value, and it is redacted from the transcript too
  // (see redactTranscriptPII at the parse boundary). Do NOT re-add the name here.
  if (ctx?.pain?.exclusions?.length > 0) {
    parts.push(
      `Active pain exclusions: ${ctx.pain.exclusions
        .map((e) => `${e.bodyRegion} (${e.painLevel}/10)`)
        .join(', ')}`,
    );
  }
  if (ctx?.pain?.warnings?.length > 0) {
    parts.push(
      `Pain warnings: ${ctx.pain.warnings
        .map((e) => `${e.bodyRegion} (${e.painLevel}/10)`)
        .join(', ')}`,
    );
  }
  if (ctx?.constraints?.nasmPhase) {
    parts.push(`Current NASM OPT Phase: ${ctx.constraints.nasmPhase}`);
  }
  if (ctx?.workouts?.sessionsLast2Weeks) {
    parts.push(`Sessions in last 2 weeks: ${ctx.workouts.sessionsLast2Weeks}`);
  }
  if (ctx?.movement?.compensations?.length > 0) {
    parts.push(
      `Known compensations: ${ctx.movement.compensations.map((c) => c.type).join(', ')}`,
    );
  }
  return parts.join('\n') || 'No additional context.';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Robust JSON extraction
// PURPOSE: Gemini's responseMimeType: 'application/json' enforces JSON
//          most of the time, but real-world responses still occasionally
//          come back wrapped in markdown fences or with leading/trailing
//          commentary. This helper tries strict JSON.parse first, then
//          falls back to extracting the first JSON object it can find.
// ─────────────────────────────────────────────────────────────
function extractJson(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('AI returned empty response');
  }

  // 1. Strict parse — works when the provider honored json mode.
  try {
    return JSON.parse(rawText);
  } catch {
    // Fall through to defensive extraction.
  }

  // 2. Strip fenced markdown blocks: ```json ... ``` or ``` ... ```
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      /* fall through */
    }
  }

  // 3. Last resort: find the first balanced { ... } object. Uses a
  //    depth counter to respect nested braces.
  const firstBrace = rawText.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < rawText.length; i++) {
      const ch = rawText[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = rawText.slice(firstBrace, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error('AI returned invalid JSON');
}

// ─────────────────────────────────────────────────────────────
// SECTION: Gemini provider call
// PURPOSE: Direct fetch to generativelanguage.googleapis.com, mirroring
//          the proven pattern in voiceTranscriptionService.mjs. Uses
//          responseMimeType: 'application/json' to ask Gemini for strict
//          JSON output. Temperature 0.2 for deterministic parsing.
// ─────────────────────────────────────────────────────────────
function getGeminiApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

async function parseWithGemini({ systemPrompt, transcript }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  const model = process.env.AI_GEMINI_PARSER_MODEL || 'gemini-2.5-flash';

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemPrompt}\n\nParse this trainer session transcript:\n\n${transcript}` },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000); // 30s

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('Gemini parser request timed out');
    }
    throw new Error(`Gemini parser network error: ${err?.message || 'unknown'}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    logger.error('[WorkoutLogParser:Gemini] API error', {
      status: response.status,
      error: errText.slice(0, 500),
      model,
    });
    throw new Error(`Gemini parser failed (${response.status})`);
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map?.((p) => p.text).join('') ||
    '';

  if (!rawText) {
    throw new Error('Gemini returned empty response');
  }

  const parsed = extractJson(rawText);

  logger.info('[WorkoutLogParser:Gemini] Parse complete', {
    model,
    exercises: Array.isArray(parsed?.exercises) ? parsed.exercises.length : 0,
    inputTokens: data?.usageMetadata?.promptTokenCount,
    outputTokens: data?.usageMetadata?.candidatesTokenCount,
  });

  return parsed;
}

// ─────────────────────────────────────────────────────────────
// SECTION: OpenAI fallback (optional)
// PURPOSE: Legacy provider. Only called when Gemini fails AND
//          OPENAI_API_KEY is explicitly configured. Never the primary.
//          Preserved so existing-environment users who already had
//          OpenAI set up still have a safety net on Gemini outage.
// ─────────────────────────────────────────────────────────────
async function parseWithOpenAI({ systemPrompt, transcript }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this trainer session transcript:\n\n${transcript}` },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    logger.error('[WorkoutLogParser:OpenAI] API error', {
      status: response.status,
      error: errText.slice(0, 500),
    });
    throw new Error(`OpenAI parser failed (${response.status})`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  const parsed = extractJson(content);

  logger.info('[WorkoutLogParser:OpenAI] Parse complete (fallback path)', {
    exercises: Array.isArray(parsed?.exercises) ? parsed.exercises.length : 0,
  });

  return parsed;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Provider chain — Gemini-first with optional OpenAI fallback
// ─────────────────────────────────────────────────────────────
async function runProviderChain({ systemPrompt, transcript }) {
  const hasGemini = Boolean(getGeminiApiKey());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasGemini && !hasOpenAI) {
    throw new Error(
      'No AI parser provider configured — set GOOGLE_API_KEY / GEMINI_API_KEY (preferred) or OPENAI_API_KEY',
    );
  }

  // Try Gemini first when available.
  if (hasGemini) {
    try {
      return await parseWithGemini({ systemPrompt, transcript });
    } catch (err) {
      logger.warn('[WorkoutLogParser] Gemini parse failed', {
        error: err?.message || 'unknown',
        willFallback: hasOpenAI,
      });
      // If OpenAI is also available, fall through to the legacy provider.
      if (!hasOpenAI) throw err;
    }
  }

  // Fallback path — only reachable when Gemini failed or isn't configured
  // and OPENAI_API_KEY is present.
  return await parseWithOpenAI({ systemPrompt, transcript });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Public entry point
// ─────────────────────────────────────────────────────────────

/**
 * Parse a raw transcript into a structured workout log.
 *
 * @param {Object} params
 * @param {string} params.transcript - Raw text from voice memo or file
 * @param {number} params.clientId - Client to log workout for
 * @param {number} params.trainerId - Trainer performing the log
 * @param {string} [params.date] - Workout date (ISO string, defaults to today)
 * @returns {Promise<Object>} Parsed workout with painFlags and confidence
 */
export async function parseWorkoutTranscript({ transcript, clientId, trainerId, date }) {
  if (!transcript || transcript.trim().length < 10) {
    throw new Error('Transcript is too short to parse');
  }

  // Load client context for AI enrichment (best-effort, non-blocking).
  let clientContext = null;
  try {
    clientContext = await getClientContext(clientId, trainerId);
  } catch (err) {
    logger.warn('[WorkoutLogParser] Could not load client context, proceeding without it', {
      clientId,
      error: err?.message,
    });
  }

  const contextBlock = clientContext ? buildContextBlock(clientContext) : 'No client context available.';
  const systemPrompt = buildSystemPrompt(contextBlock);

  // RULE 8 (zero PII to LLMs): redact the transcript BEFORE it reaches the parser.
  // The known client name is the highest-value identifier to mask; the deterministic
  // redactor also strips emails/phones/SSN while preserving injury/movement language.
  // The ORIGINAL transcript is untouched (confidence + any human-review copy use it).
  const nameHints = clientContext?.clientName ? [clientContext.clientName] : [];
  const redactedTranscript = redactOrFailClosed(transcript, nameHints);

  const parsed = await runProviderChain({ systemPrompt, transcript: redactedTranscript });

  // Validate structure — same defensive check as Phase 9.
  if (!parsed || !Array.isArray(parsed.exercises)) {
    throw new Error('Parsed workout missing exercises array');
  }

  // Calculate confidence based on transcript clarity.
  const confidence = calculateConfidence(transcript, parsed);

  logger.info('[WorkoutLogParser] Parse complete', {
    clientId,
    exercises: parsed.exercises.length,
    painFlags: parsed.painFlags?.length || 0,
    confidence,
  });

  return {
    ...parsed,
    confidence,
    date: date || new Date().toISOString().split('T')[0],
  };
}

function calculateConfidence(transcript, parsed) {
  let score = 0.5; // base

  if (transcript.length > 200) score += 0.1;
  if (transcript.length > 500) score += 0.1;

  if (parsed.exercises?.length >= 3) score += 0.1;
  if (parsed.exercises?.length >= 5) score += 0.05;

  const setsWithWeight =
    parsed.exercises?.flatMap((e) => e.sets || []).filter((s) => s.weight != null).length || 0;
  if (setsWithWeight > 3) score += 0.1;

  if (parsed.sessionNotes?.length > 20) score += 0.05;

  return Math.min(0.99, Math.round(score * 100) / 100);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Test-only exports
// Named helpers exposed for regression locks in
// backend/tests/unit/workoutLogParserService.test.mjs — not part of the
// public parser API.
// ─────────────────────────────────────────────────────────────
export const __test__ = {
  extractJson,
  buildSystemPrompt,
  buildContextBlock,
  calculateConfidence,
  getGeminiApiKey,
};
