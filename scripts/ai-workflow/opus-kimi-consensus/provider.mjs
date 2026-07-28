/** Metered OpenRouter adapter. Calls are sequential and fail closed on spend. */
import { DEFAULT_REASONING_TOKENS_PER_TURN, MODEL_CONFIG } from './constants.mjs';

function cost(brain, inputTokens, outputTokens) {
  const cfg = MODEL_CONFIG[brain];
  return (inputTokens / 1_000_000) * cfg.priceIn + (outputTokens / 1_000_000) * cfg.priceOut;
}

function redact(text, apiKey) {
  let value = String(text ?? '');
  if (apiKey) value = value.split(apiKey).join('<REDACTED_KEY>');
  return value
    .replace(/sk-or-[A-Za-z0-9_-]{8,}/g, '<REDACTED_KEY>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <REDACTED_KEY>');
}

export function createOpenRouterCaller({
  apiKey,
  capUsd,
  maxTokens,
  reasoningTokens = DEFAULT_REASONING_TOKENS_PER_TURN,
  fetchImpl = fetch,
  timeoutMs = 600_000,
} = {}) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for a confirmed run');
  if (!Number.isFinite(capUsd) || capUsd <= 0) throw new Error('capUsd must be positive');
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) throw new Error('maxTokens must be a positive integer');
  if (!Number.isInteger(reasoningTokens) || reasoningTokens < 1024) {
    throw new Error('reasoningTokens must be an integer of at least 1024');
  }

  let spentUsd = 0;
  const calls = [];

  async function call(brain, prompt) {
    if (brain === 'opus') {
      const error = new Error('Opus paid calls are retired by owner decision; use the Kimi-only review path.');
      error.code = 'OPUS_RETIRED';
      throw error;
    }
    const cfg = MODEL_CONFIG[brain];
    if (!cfg) throw new Error(`unknown brain: ${brain}`);
    // A UTF-8 byte ceiling is deliberately conservative: at most one token per byte.
    const estimatedInput = Buffer.byteLength(String(prompt), 'utf8');
    const completionBudget = maxTokens + reasoningTokens;
    const worstCase = cost(brain, estimatedInput, completionBudget);
    if (spentUsd + worstCase > capUsd) {
      throw new Error(`spend cap $${capUsd.toFixed(2)} blocks ${brain}: worst-case $${worstCase.toFixed(4)} with $${(capUsd - spentUsd).toFixed(4)} remaining`);
    }

    let response;
    try {
      response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://sswanstudios.com',
          'X-Title': 'SwanStudios Opus Kimi Debate Brain',
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: prompt }],
          // OpenRouter counts reasoning inside max_tokens. Reserve both budgets so
          // private reasoning cannot consume the visible consensus packet allowance.
          max_tokens: completionBudget,
          temperature: 0.2,
          reasoning: { max_tokens: reasoningTokens, exclude: true },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new Error(redact(`OpenRouter request failed: ${error.message}`, apiKey));
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(redact(`OpenRouter ${response.status}: ${body.slice(0, 800)}`, apiKey));
    }
    const data = await response.json();
    if (data.error) throw new Error(redact(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`, apiKey));
    const choice = data.choices?.[0];
    const content = typeof choice?.message?.content === 'string' ? choice.message.content : '';
    const inputTokens = Number(data.usage?.prompt_tokens) || 0;
    const outputTokens = Number(data.usage?.completion_tokens) || 0;
    const usedReasoningTokens = Number(data.usage?.completion_tokens_details?.reasoning_tokens)
      || Number(data.usage?.reasoning_tokens)
      || 0;
    const finishReason = choice?.finish_reason || null;
    const callUsd = cost(brain, inputTokens, outputTokens);
    spentUsd = Number((spentUsd + callUsd).toFixed(6));
    calls.push({
      brain,
      model: data.model || cfg.model,
      inputTokens,
      outputTokens,
      reasoningTokens: usedReasoningTokens,
      contentChars: content.length,
      finishReason,
      costUsd: Number(callUsd.toFixed(6)),
    });
    if (finishReason === 'length') {
      const error = new Error(
        `OpenRouter truncated ${brain} completion at max_tokens: `
        + `finish_reason=length, reasoning_tokens=${usedReasoningTokens}, `
        + `completion_tokens=${outputTokens}. Paid partial content was preserved in the transcript.`,
      );
      error.code = 'PROVIDER_OUTPUT_TRUNCATED';
      error.partialContent = content;
      throw error;
    }
    if (!content.trim()) {
      throw new Error(
        `OpenRouter returned empty visible content for ${brain}: `
        + `finish_reason=${finishReason || 'unknown'}, reasoning_tokens=${usedReasoningTokens}, `
        + `completion_tokens=${outputTokens}. Paid call was preserved in the receipt.`,
      );
    }
    return content;
  }

  return {
    call,
    receipt: () => ({ capUsd, spentUsd, calls: structuredClone(calls) }),
  };
}

