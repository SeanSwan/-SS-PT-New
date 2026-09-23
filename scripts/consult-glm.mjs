#!/usr/bin/env node
/**
 * Direct Z.ai coding-plan transport. Existing egress and consumption guards
 * remain authoritative. A complete report requires provider completion evidence.
 */
import { closeSync, existsSync, ftruncateSync, fsyncSync, mkdirSync, openSync, writeSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { readForEgress, fetchForEgress } from './lib/redact-egress.mjs';
import {
  appendGlmLedger,
  beginGlmCall,
  GLM_MAX_OUTPUT_TOKENS,
  GLM_TOKEN_POLICY_PROVIDER_DEFAULT,
} from './lib/glm-consumption-guard.mjs';

const ENDPOINT = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MAX_TIMEOUT_MS = 600_000;
const MAX_STREAM_BYTES = 16 * 1024 * 1024;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const safeName = (value) => typeof value === 'string' && /^[A-Za-z0-9._:/-]{1,100}$/.test(value) ? value : null;

function parseArgs(argv) {
  const flags = new Set(['--document', '--out', '--remit', '--model', '--max-tokens', '--timeout-ms']);
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i], value = argv[i + 1];
    if (!flags.has(name) || typeof value !== 'string' || value.startsWith('--') || name in args) {
      throw new Error('invalid-arguments');
    }
    args[name] = value;
  }
  const result = {
    document: args['--document'],
    out: args['--out'] || 'docs/ai-workflow/AI-HANDOFF/GLM-CONSULT.md',
    remit: args['--remit'] || '',
    model: args['--model'] || 'glm-5.3',
    tokenPolicy: args['--max-tokens'] === GLM_TOKEN_POLICY_PROVIDER_DEFAULT
      ? GLM_TOKEN_POLICY_PROVIDER_DEFAULT : 'numeric',
    maxTokens: args['--max-tokens'] === GLM_TOKEN_POLICY_PROVIDER_DEFAULT
      ? null : Number(args['--max-tokens'] ?? GLM_MAX_OUTPUT_TOKENS),
    timeoutMs: Number(args['--timeout-ms'] ?? MAX_TIMEOUT_MS),
  };
  if (!result.document || !safeName(result.model)
    || (result.tokenPolicy === 'numeric' && (!Number.isInteger(result.maxTokens)
      || result.maxTokens < 1 || result.maxTokens > GLM_MAX_OUTPUT_TOKENS))
    || !Number.isInteger(result.timeoutMs) || result.timeoutMs < 1 || result.timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error('invalid-arguments');
  }
  return result;
}

// Preserve only numeric usage metadata. Never serialize a provider error object.
function usageOf(value) {
  const usage = {};
  for (const name of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
    if (Number.isSafeInteger(value?.[name]) && value[name] >= 0) usage[name] = value[name];
  }
  const reasoning = value?.completion_tokens_details?.reasoning_tokens;
  if (Number.isSafeInteger(reasoning) && reasoning >= 0) {
    usage.completion_tokens_details = { reasoning_tokens: reasoning };
  }
  return usage;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch {
    console.error('[consult-glm] invalid-arguments; document required, --max-tokens must be a positive integer <=34000 or provider-default, deadline <=600000ms.');
    return 2;
  }
  const { document, out, remit, model, maxTokens, tokenPolicy, timeoutMs } = args;
  const key = process.env.ZAI_API_KEY;
  if (!key) { console.error('[consult-glm] credential-missing: ZAI_API_KEY not set.'); return 2; }
  if (existsSync(out) || existsSync(out + '.receipt.json')) {
    console.error('[consult-glm] artifact-exists; choose a new output path. No request sent.');
    return 2;
  }
  let prompt;
  try {
    const body = readForEgress(document, { label: 'document' });
    prompt = remit ? remit + '\n\n---\n\n' + body : body;
  } catch {
    console.error('[consult-glm] document-or-egress-preflight-failed; no request sent.');
    return 2;
  }

  const reviewRoundId = process.env.SWAN_GLM_REVIEW_ROUND_ID || 'call_' + randomUUID();
  const receipt = {
    schemaVersion: 1, requestedModel: model, servedModel: null, reviewRoundId,
    endpoint: ENDPOINT, billing: 'coding-plan', maxTokens, tokenPolicy, timeoutMs,
    status: 'not-sent', reason: 'preflight', stage: 'preflight', dispatched: false,
    terminal: false, sawDone: false, finishReason: null, usage: {},
    requestSha256: null, contentSha256: null,
  };
  let reportFd, receiptFd, guard, timer;
  let content = '', protocolError = false, modelMismatch = false;
  let terminal = false, dispatched = false, stopped = false;
  const started = Date.now();
  const abort = new AbortController();
  const stop = () => { stopped = true; abort.abort(); };
  const writeOwned = (fd, text) => {
    ftruncateSync(fd, 0);
    writeSync(fd, text, 0, 'utf8');
    fsyncSync(fd);
  };
  const persist = () => {
    receipt.wallMs = Date.now() - started;
    writeOwned(receiptFd, JSON.stringify(receipt, null, 2) + '\n');
  };
  try {
    mkdirSync(dirname(out), { recursive: true });
    // Reserve both artifacts before admission. wx never overwrites earlier evidence.
    reportFd = openSync(out, 'wx');
    writeOwned(reportFd, '# GLM Consult\n\nPENDING — no completion evidence yet.\n');
    receiptFd = openSync(out + '.receipt.json', 'wx');
    persist();
    try {
      guard = beginGlmCall({ model, maxTokens, tokenPolicy, promptChars: prompt.length, reviewRoundId });
    } catch (error) {
      receipt.status = 'blocked';
      receipt.reason = /checkpoint/.test(error.message) ? 'quota-checkpoint'
        : /unresolved|reconciliation/.test(error.message) ? 'unresolved-lock'
          : /already active/.test(error.message) ? 'active-lock' : 'guard-denied';
      persist();
      writeOwned(reportFd, '# GLM Consult\n\nBLOCKED: ' + receipt.reason + '. No request sent.\n');
      console.error('[consult-glm] BLOCKED: ' + receipt.reason);
      return 2;
    }

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    timer = setTimeout(() => abort.abort(), timeoutMs);
    console.log('[consult-glm] requested=' + model + ' max_tokens=' + (maxTokens ?? tokenPolicy) + ' timeout_ms=' + timeoutMs);
    try {
      const request = { model, stream: true, messages: [{ role: 'user', content: prompt }] };
      if (tokenPolicy !== GLM_TOKEN_POLICY_PROVIDER_DEFAULT) request.max_tokens = maxTokens;
      const response = await fetchForEgress(ENDPOINT, {
        method: 'POST', redirect: 'error', signal: abort.signal,
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }, {
        fetchImpl: (url, init) => {
          // This runs only after the existing transport egress checks pass.
          guard.lock.markUnresolved();
          receipt.requestSha256 = sha256(init.body);
          receipt.status = 'unknown'; receipt.stage = 'transport'; receipt.reason = 'in-flight';
          receipt.dispatched = true;
          persist();
          dispatched = true;
          return globalThis.fetch(url, init);
        },
      });
      receipt.httpStatus = response.status;
      if (!response.ok) {
        terminal = true;
        receipt.reason = 'http-error';
        // Error text can echo credentials or private request material. Do not read/print it.
        await response.body?.cancel();
      } else {
        receipt.stage = 'stream';
        const decoder = new TextDecoder('utf-8', { fatal: true });
        let buffer = '', bytes = 0;
        const line = (raw) => {
          const text = raw.trim();
          if (!text.startsWith('data:')) return;
          const data = text.slice(5).trim();
          if (data === '[DONE]') { receipt.sawDone = true; terminal = true; return; }
          if (receipt.sawDone) { protocolError = true; return; }
          let j;
          try { j = JSON.parse(data); } catch { protocolError = true; return; }
          if (!j || typeof j !== 'object' || Array.isArray(j)) { protocolError = true; return; }
          if (j.error) { receipt.reason = 'provider-stream-error'; terminal = true; }
          if (typeof j.model === 'string' && j.model) {
            receipt.servedModel = safeName(j.model);
            if (j.model !== model) modelMismatch = true;
          }
          if (j.usage) receipt.usage = { ...receipt.usage, ...usageOf(j.usage) };
          const choice = j.choices?.[0];
          const delta = choice?.delta?.content;
          if (typeof delta === 'string') content += delta;
          else if (delta != null) protocolError = true;
          if (choice?.finish_reason != null) {
            receipt.finishReason = safeName(choice.finish_reason);
            terminal = true;
          }
        };
        for await (const chunk of response.body) {
          bytes += chunk.byteLength;
          if (bytes > MAX_STREAM_BYTES) { receipt.reason = 'stream-size-limit'; abort.abort(); break; }
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const value of lines) line(value);
          if (receipt.sawDone) break;
        }
        buffer += decoder.decode();
        if (buffer.trim()) line(buffer); // preserve a final SSE line without newline
        if (receipt.reason !== 'provider-stream-error' && receipt.reason !== 'stream-size-limit') {
          const completionTokens = receipt.usage.completion_tokens;
          const usageReported = tokenPolicy === GLM_TOKEN_POLICY_PROVIDER_DEFAULT
            ? Number.isSafeInteger(completionTokens) && completionTokens > 0
            : Number.isSafeInteger(completionTokens);
          receipt.reason = protocolError ? 'malformed-stream'
            : modelMismatch ? 'model-mismatch'
              : !receipt.servedModel ? 'model-unreported'
                : !content.trim() ? 'empty-content'
                  : !receipt.sawDone ? 'missing-done'
                    : receipt.finishReason !== 'stop' ? 'finish-not-stop'
                      : !usageReported ? 'usage-unreported'
                        : tokenPolicy === GLM_TOKEN_POLICY_PROVIDER_DEFAULT ? 'complete'
                          : completionTokens > maxTokens ? 'usage-over-cap' : 'complete';
        }
      }
    } catch {
      // Never print raw exception/cause text: it can contain request headers or provider bodies.
      receipt.reason = abort.signal.aborted ? (stopped ? 'interrupted' : 'deadline')
        : dispatched ? 'network-or-stream-error' : 'egress-or-artifact-preflight-failed';
    }

    receipt.dispatched = dispatched;
    receipt.terminal = terminal;
    receipt.status = receipt.reason === 'complete' ? 'complete'
      : !dispatched ? 'not-sent' : terminal ? 'incomplete' : 'unknown';
    receipt.contentSha256 = sha256(content);
    persist();
    const usage = receipt.usage;
    const substituted = modelMismatch ? ' SUBSTITUTED' : '';
    writeOwned(reportFd, '# GLM Consult\n\n'
      + '**Requested:** `' + model + '`\n**Served:** `' + (receipt.servedModel || 'unreported') + '`' + substituted
      + '\n**Status:** ' + receipt.status + ' (' + receipt.reason + ')'
      + '\n**Tokens:** ' + (usage.prompt_tokens ?? 'unreported') + ' in / '
      + (usage.completion_tokens ?? 'unreported') + ' out (reasoning: '
      + (usage.completion_tokens_details?.reasoning_tokens ?? 'unreported') + ') | total ' + (usage.total_tokens ?? 'unreported')
      + '\n**Wall:** ' + receipt.wallMs + 'ms\n\n---\n\n' + (content || '(empty)') + '\n');
    appendGlmLedger(guard.ledgerPath, {
      event: 'finished', model, maxTokens, tokenPolicy, reviewRoundId,
      httpStatus: receipt.httpStatus, promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens,
      result: receipt.status, reason: receipt.reason,
    });
    console.log('[consult-glm] status=' + receipt.status + ' reason=' + receipt.reason
      + ' served=' + (receipt.servedModel || 'unreported')
      + ' completion_tokens=' + (usage.completion_tokens ?? 'unreported')
      + (receipt.httpStatus ? ' http=' + receipt.httpStatus : ''));
    return receipt.status === 'complete' ? 0 : 2;
  } finally {
    clearTimeout(timer);
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    // No exit handler may delete an ambiguous in-flight lock.
    if (guard && (!dispatched || terminal)) guard.lock.release();
    if (reportFd !== undefined) closeSync(reportFd);
    if (receiptFd !== undefined) closeSync(receiptFd);
  }
}

try { process.exitCode = await main(); } catch {
  console.error('[consult-glm] local-runner-failure; inspect the retained receipt. No automatic retry.');
  process.exitCode = 2;
}
