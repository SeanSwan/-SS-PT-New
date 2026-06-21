/**
 * jsonLlmParser
 * =============
 * Generic, prompt-agnostic "strict-JSON from an LLM" plumbing, extracted so
 * multiple structured parsers (workout log, nutrition transcript, …) can share
 * one battle-tested provider chain + JSON extractor instead of duplicating it.
 *
 * Provider chain (mirrors the proven workoutLogParserService Phase-10 pattern):
 *   1. Gemini — primary (GOOGLE_API_KEY || GEMINI_API_KEY, direct fetch,
 *      responseMimeType: application/json). NO OpenAI unless explicitly keyed.
 *   2. OpenAI — optional fallback ONLY when OPENAI_API_KEY is present AND Gemini
 *      failed with a retryable error. Never primary. No Grok/X-AI ever (Rule 12).
 *
 * RULE 8 boundary: this module does NOT redact — callers MUST redact PII from
 * `userText` (e.g. via redactTranscriptPII) BEFORE handing it here. This module
 * only transports already-safe text to the provider and returns parsed JSON.
 */

import logger from '../../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// Robust JSON extraction — strict parse, then fenced-block, then
// first balanced { … } object (depth counter, string-aware).
// ─────────────────────────────────────────────────────────────
export function extractJson(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('AI returned empty response');
  }

  try {
    return JSON.parse(rawText);
  } catch {
    /* fall through to defensive extraction */
  }

  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      /* fall through */
    }
  }

  const firstBrace = rawText.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < rawText.length; i++) {
      const ch = rawText[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
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

function getGeminiApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

async function callGemini({ systemPrompt, userText, model, maxOutputTokens, temperature, label }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userText}` }] }],
    generationConfig: {
      maxOutputTokens: maxOutputTokens || 4096,
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new Error(`${label} request timed out`);
    throw new Error(`${label} network error: ${err?.message || 'unknown'}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    logger.error(`[${label}:Gemini] API error`, { status: response.status, error: errText.slice(0, 500), model });
    throw new Error(`${label} failed (${response.status})`);
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map?.((p) => p.text).join('') ||
    '';
  if (!rawText) throw new Error(`${label} returned empty response`);
  return extractJson(rawText);
}

async function callOpenAI({ systemPrompt, userText, label }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new Error(`${label} fallback request timed out`);
    throw new Error(`${label} fallback network error: ${err?.message || 'unknown'}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    logger.error(`[${label}:OpenAI] API error`, { status: response.status, error: errText.slice(0, 500) });
    throw new Error(`${label} fallback failed (${response.status})`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${label} fallback returned empty response`);
  return extractJson(content);
}

/**
 * Run the Gemini-first JSON provider chain.
 * @param {{ systemPrompt: string, userText: string, model?: string, maxOutputTokens?: number, temperature?: number, label?: string }} opts
 * @returns {Promise<object>} parsed JSON
 */
export async function runJsonLlmChain({ systemPrompt, userText, model, maxOutputTokens, temperature, label = 'JsonLlm' }) {
  const resolvedModel = model || process.env.AI_GEMINI_PARSER_MODEL || 'gemini-2.5-flash';
  const hasGemini = Boolean(getGeminiApiKey());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasGemini && !hasOpenAI) {
    throw new Error('No AI parser provider configured — set GOOGLE_API_KEY / GEMINI_API_KEY (preferred) or OPENAI_API_KEY');
  }

  if (hasGemini) {
    try {
      return await callGemini({ systemPrompt, userText, model: resolvedModel, maxOutputTokens, temperature, label });
    } catch (err) {
      logger.warn(`[${label}] Gemini parse failed`, { error: err?.message || 'unknown', willFallback: hasOpenAI });
      if (!hasOpenAI) throw err;
    }
  }

  return await callOpenAI({ systemPrompt, userText, label });
}

export const __test__ = { extractJson, getGeminiApiKey };
