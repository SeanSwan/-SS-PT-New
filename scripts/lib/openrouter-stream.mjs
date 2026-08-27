/**
 * openrouter-stream.mjs — one streaming POST for every OpenRouter consult seat.
 * ============================================================================
 * WHY THIS EXISTS (2026-08-21): three sibling consult scripts each did a
 * non-streaming POST behind a 600s AbortSignal.timeout (or Node's default
 * ~300s header timeout). A model that reasons longer than that is aborted while
 * we are still waiting for response HEADERS, and its ENTIRE paid reply is lost.
 * consult-glm.mjs documented this failure class and its fix on 2026-08-16; the
 * fix did not sweep sideways (Rule 20) and a Grok 4.6 run lost ~25 minutes of
 * paid reasoning for nothing. Streaming returns headers immediately, so the
 * header clock never starts; the only remaining hang is a stalled STREAM, guarded
 * here by an IDLE watchdog that resets on every byte.
 *
 * Also fixes the ceiling class: reasoning models spend output budget on hidden
 * thinking, so a 16k max_tokens sized for the ANSWER can be consumed entirely
 * before a single visible token (DeepSeek V4 Flash: $0.10 for an empty reply).
 *
 * Returns { text, finish, usage, truncated, wallSec }. Never prints the API key.
 */

import { fetchForEgress } from './redact-egress.mjs';

export async function streamChatCompletion({
  apiKey,
  model,
  prompt,
  maxTokens = 48_000,
  temperature = 0.2,
  effort = 'high',
  title = 'SwanStudios Consult',
  idleMs = 300_000,
  label = 'consult',
  log = console.log,
}) {
  const controller = new AbortController();
  let idleTimer = null;
  const armIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => controller.abort(new Error(`stream idle >${idleMs / 1000}s with no bytes`)),
      idleMs,
    );
  };
  armIdle();
  const t0 = Date.now();

  const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': title,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
      stream: true,
      usage: { include: true }, // OpenRouter: final SSE chunk carries usage + authoritative cost
      reasoning: { effort },
    }),
    signal: controller.signal,
  });

  if (!res.ok) {
    clearTimeout(idleTimer);
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 1500)}`);
  }

  let text = '';
  let finish = null;
  let usage = {};
  let buffer = '';
  let lastTick = Date.now();
  const decoder = new TextDecoder();

  try {
    for await (const chunk of res.body) {
      armIdle();
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const j = JSON.parse(payload);
          if (j.error) log(`[${label}] API error mid-stream: ${JSON.stringify(j.error).slice(0, 500)}`);
          const choice = j.choices?.[0];
          if (choice?.delta?.content) text += choice.delta.content;
          if (choice?.finish_reason) finish = choice.finish_reason;
          if (j.usage) usage = j.usage;
        } catch { /* partial SSE frame — completed by the next chunk */ }
      }
      if (Date.now() - lastTick > 20_000) {
        log(`[${label}] streaming... ${text.length} chars`);
        lastTick = Date.now();
      }
    }
  } finally {
    clearTimeout(idleTimer);
  }

  return {
    text,
    finish,
    usage,
    truncated: finish === 'length' || finish === 'max_tokens',
    wallSec: ((Date.now() - t0) / 1000).toFixed(1),
  };
}
