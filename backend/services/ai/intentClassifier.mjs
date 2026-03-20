/**
 * Intent Classifier — Structured JSON Output via Gemini Flash
 * ============================================================
 * Classifies natural language input into structured command intents.
 * Uses Gemini Flash for speed. Falls back to Llama 3.3 70B (free on OpenRouter).
 *
 * NO OpenAI. Provider chain: Gemini → Anthropic → free OpenRouter models.
 *
 * Pipeline position: InputSanitizer → PhiScanner → **IntentClassifier** → ZodValidator → ...
 *
 * Output: { intent, clientRef, params, confidence }
 * If confidence < 0.7, returns 'clarification_needed' intent.
 */
import { z } from 'zod';
import logger from '../../utils/logger.mjs';
import { sendChatMessage } from '../aiChatService.mjs';
import { scanForPHI } from './phiScanner.mjs';
import { buildCommandSummaryForClassifier } from './commandRegistry/index.mjs';
import { ClassifiedIntentSchema } from './commandRegistry/baseSchemas.mjs';

// ── Confidence Threshold ────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.7;
const MAX_CLASSIFICATION_TIMEOUT_MS = 10000; // 10s — fast model

// ── System Prompt for Intent Classification ─────────────────────────────────

function buildClassificationPrompt(userRole) {
  const commandList = buildCommandSummaryForClassifier(userRole);

  return `You are an intent classifier for a personal training management system. Your job is to classify natural language commands into structured JSON.

RULES:
1. Output ONLY valid JSON. No explanations, no markdown, no code fences.
2. Match the user's message to ONE of the available commands listed below.
3. Extract any referenced client names, dates, times, or parameters.
4. Set confidence 0.0-1.0 based on how certain you are of the match.
5. If unsure (< 0.7 confidence), set intent to "clarification_needed" and include a suggested question in params.
6. If the message is conversational (not a command), set intent to "chat" with confidence 1.0.
7. For client references, extract the name exactly as spoken (the system will fuzzy-match later).
8. Parse dates naturally: "tomorrow" = next day, "Tuesday" = next Tuesday, "3/19" = 2026-03-19.
9. Parse times naturally: "3pm" = "15:00", "10:30 in the morning" = "10:30".

AVAILABLE COMMANDS:
${commandList}

OUTPUT FORMAT (strict JSON, no wrapping):
{"intent":"command_type","clientRef":"client name or null","params":{"key":"value"},"confidence":0.95}

EXAMPLES:
User: "Add Jackie from Move Fitness"
{"intent":"create_external_client","clientRef":"Jackie","params":{"firstName":"Jackie","clientSource":"move_fitness"},"confidence":0.95}

User: "Schedule her for Tuesday at 3pm"
{"intent":"schedule_session","clientRef":null,"params":{"date":"next_tuesday","time":"15:00"},"confidence":0.85}

User: "How's the weather?"
{"intent":"chat","clientRef":null,"params":{},"confidence":1.0}

User: "Show me something about clients maybe"
{"intent":"clarification_needed","clientRef":null,"params":{"suggestion":"Did you mean: list active clients, view a specific client's profile, or check at-risk clients?"},"confidence":0.4}`;
}

// ── Classify Intent ─────────────────────────────────────────────────────────

/**
 * Classify a natural language message into a structured command intent.
 *
 * @param {string} message - Sanitized user message
 * @param {string} userRole - 'admin' | 'trainer' | 'client'
 * @param {Object} [options]
 * @param {string} [options.previousContext] - Last few messages for context
 * @param {string} [options.selectedClientName] - Currently selected client in UI
 * @returns {Promise<{ intent: string, clientRef: string|null, params: Object, confidence: number }>}
 */
export async function classifyIntent(message, userRole, options = {}) {
  const { previousContext, selectedClientName } = options;

  // Build contextual message
  let contextualMessage = message;
  if (selectedClientName) {
    contextualMessage += `\n[Context: Currently selected client is "${selectedClientName}"]`;
  }
  if (previousContext) {
    contextualMessage = `[Recent context: ${previousContext}]\n\nCurrent message: ${contextualMessage}`;
  }

  const systemPrompt = buildClassificationPrompt(userRole);

  let classificationTimer;
  try {
    const result = await Promise.race([
      sendChatMessage(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextualMessage },
        ],
        { maxTokens: 1000, temperature: 0.1 }
      ),
      new Promise((_, reject) => {
        classificationTimer = setTimeout(() => reject(new Error('Classification timed out')), MAX_CLASSIFICATION_TIMEOUT_MS);
      }),
    ]);

    if (!result.ok) {
      logger.warn('[IntentClassifier] All providers failed, falling back to chat');
      return { intent: 'chat', clientRef: null, params: {}, confidence: 1.0 };
    }

    // Parse the JSON response
    const responseText = result.content || '';
    const parsed = parseClassificationResponse(responseText);

    // Apply confidence threshold
    if (parsed.confidence < CONFIDENCE_THRESHOLD && parsed.intent !== 'chat') {
      logger.info('[IntentClassifier] Low confidence, requesting clarification', {
        intent: parsed.intent,
        confidence: parsed.confidence,
      });
      return {
        intent: 'clarification_needed',
        clientRef: parsed.clientRef,
        params: {
          originalIntent: parsed.intent,
          originalConfidence: parsed.confidence,
          suggestion: parsed.params?.suggestion || `I'm not sure what you mean. Could you rephrase that?`,
        },
        confidence: parsed.confidence,
      };
    }

    return parsed;
  } catch (err) {
    logger.error('[IntentClassifier] Classification failed', { error: err.message });

    // AI Village consensus: Re-check for PHI before falling back to chat
    // If PHI is present, block rather than sending raw input to cloud AI
    const phiResult = scanForPHI(message);
    if (phiResult.hasPHI) {
      logger.warn('[IntentClassifier] PHI detected in failed classification, blocking chat fallback');
      return {
        intent: 'clarification_needed',
        clientRef: null,
        params: { suggestion: 'I need to process your request securely. Please rephrase without sensitive health information.' },
        confidence: 0.0,
      };
    }

    // Safe to fall back to conversational chat
    return { intent: 'chat', clientRef: null, params: {}, confidence: 1.0 };
  } finally {
    clearTimeout(classificationTimer);
  }
}

/**
 * Parse the raw AI response into a structured intent.
 * Handles malformed JSON gracefully.
 *
 * @param {string} responseText
 * @returns {{ intent: string, clientRef: string|null, params: Object, confidence: number }}
 */
function parseClassificationResponse(responseText) {
  const fallback = { intent: 'chat', clientRef: null, params: {}, confidence: 1.0 };

  if (!responseText) return fallback;

  try {
    // Strip markdown code fences if model wrapped output
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    const validated = ClassifiedIntentSchema.safeParse(parsed);

    if (!validated.success) {
      logger.warn('[IntentClassifier] Zod validation failed on AI response', {
        errors: validated.error.issues,
        raw: cleaned.slice(0, 200),
      });
      return fallback;
    }

    return {
      intent: validated.data.intent,
      clientRef: validated.data.clientRef || null,
      params: validated.data.params || {},
      confidence: validated.data.confidence,
    };
  } catch (err) {
    // Fallback: regex extraction for JSON embedded in prose
    const jsonMatch = responseText.match(/\{[\s\S]*"intent"\s*:[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const extracted = JSON.parse(jsonMatch[0]);
        const validated = ClassifiedIntentSchema.safeParse(extracted);
        if (validated.success) {
          logger.info('[IntentClassifier] Recovered JSON via regex extraction');
          return {
            intent: validated.data.intent,
            clientRef: validated.data.clientRef || null,
            params: validated.data.params || {},
            confidence: validated.data.confidence,
          };
        }
      } catch { /* regex extraction also failed, use fallback */ }
    }

    logger.warn('[IntentClassifier] JSON parse failed on AI response', {
      error: err.message,
      raw: responseText.slice(0, 200),
    });
    return fallback;
  }
}
