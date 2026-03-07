/**
 * Workout Log Parser Service
 * ===========================
 * Parses trainer voice memo transcripts (or text notes) into structured
 * DailyWorkoutForm.formData using AI, enriched with client context.
 */

import { getClientContext } from './clientIntelligenceService.mjs';
import logger from '../utils/logger.mjs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured — cannot parse workout');
  }

  // Get client context for AI enrichment
  let clientContext = null;
  try {
    clientContext = await getClientContext(clientId, trainerId);
  } catch (err) {
    logger.warn('[WorkoutLogParser] Could not load client context, proceeding without it', { clientId, error: err.message });
  }

  const contextBlock = clientContext ? buildContextBlock(clientContext) : 'No client context available.';

  const systemPrompt = `You are a fitness workout log parser for SwanStudios, a NASM-certified personal training platform.

Your job: Parse a trainer's voice memo or session notes into a structured workout log JSON.

CLIENT CONTEXT:
${contextBlock}

RULES:
- Extract every exercise mentioned with sets, reps, weight, and any notes
- Detect pain mentions and flag them with body region and side (left/right/bilateral)
- If the trainer mentions RPE, form quality, or difficulty, include it
- If weight isn't mentioned, use null (not 0)
- If reps aren't clear, estimate from context
- Set overallIntensity on a 1-10 scale based on the session description
- Include any session notes or trainer observations

OUTPUT FORMAT (strict JSON, no markdown):
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    logger.error('[WorkoutLogParser] OpenAI API error', { status: response.status, error: errText });
    throw new Error(`Workout parsing failed (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned empty response');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    logger.error('[WorkoutLogParser] Failed to parse AI JSON response', { content: content.slice(0, 500) });
    throw new Error('AI returned invalid JSON');
  }

  // Validate structure
  if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
    throw new Error('Parsed workout missing exercises array');
  }

  // Calculate confidence based on transcript clarity
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

function buildContextBlock(ctx) {
  const parts = [];

  if (ctx.clientName) {
    parts.push(`Client: ${ctx.clientName}`);
  }

  if (ctx.pain?.exclusions?.length > 0) {
    parts.push(`Active pain exclusions: ${ctx.pain.exclusions.map(e => `${e.bodyRegion} (${e.painLevel}/10)`).join(', ')}`);
  }
  if (ctx.pain?.warnings?.length > 0) {
    parts.push(`Pain warnings: ${ctx.pain.warnings.map(e => `${e.bodyRegion} (${e.painLevel}/10)`).join(', ')}`);
  }

  if (ctx.constraints?.nasmPhase) {
    parts.push(`Current NASM OPT Phase: ${ctx.constraints.nasmPhase}`);
  }

  if (ctx.workouts?.sessionsLast2Weeks) {
    parts.push(`Sessions in last 2 weeks: ${ctx.workouts.sessionsLast2Weeks}`);
  }

  if (ctx.movement?.compensations?.length > 0) {
    parts.push(`Known compensations: ${ctx.movement.compensations.map(c => c.type).join(', ')}`);
  }

  return parts.join('\n') || 'No additional context.';
}

function calculateConfidence(transcript, parsed) {
  let score = 0.5; // base

  // Longer transcripts tend to be clearer
  if (transcript.length > 200) score += 0.1;
  if (transcript.length > 500) score += 0.1;

  // More exercises = more detailed
  if (parsed.exercises?.length >= 3) score += 0.1;
  if (parsed.exercises?.length >= 5) score += 0.05;

  // Sets with weight data = high confidence
  const setsWithWeight = parsed.exercises?.flatMap(e => e.sets || []).filter(s => s.weight != null).length || 0;
  if (setsWithWeight > 3) score += 0.1;

  // Session notes present
  if (parsed.sessionNotes?.length > 20) score += 0.05;

  return Math.min(0.99, Math.round(score * 100) / 100);
}
