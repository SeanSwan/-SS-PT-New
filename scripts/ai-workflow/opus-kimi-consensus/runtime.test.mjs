/** Runtime boundary tests. No network and no paid model calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOpenRouterCaller } from './provider.mjs';
import { writeRunArtifacts } from './artifacts.mjs';
import { executeConsensusRun } from './run.mjs';

test('provider sends the selected model, keeps API key out of the body, and meters actual usage', async () => {
  let request;
  const key = 'sk-or-v1-test-secret-123456';
  const fetchImpl = async (_url, options) => {
    request = options;
    return {
      ok: true,
      json: async () => ({
        model: 'moonshotai/kimi-k3',
        choices: [{ message: { content: 'answer' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 100 },
      }),
    };
  };
  const caller = createOpenRouterCaller({ apiKey: key, capUsd: 3, maxTokens: 500, fetchImpl });
  const text = await caller.call('kimi', 'hello');
  const body = JSON.parse(request.body);
  assert.equal(text, 'answer');
  assert.equal(body.model, 'moonshotai/kimi-k3');
  assert.equal(body.max_tokens, 4_500);
  assert.equal(body.reasoning.max_tokens, 4_000);
  assert.equal(body.reasoning.exclude, true);
  assert.ok(!request.body.includes(key));
  assert.equal(request.headers.Authorization, `Bearer ${key}`);
  assert.ok(caller.receipt().spentUsd > 0);
  assert.equal(caller.receipt().calls.length, 1);
});

test('provider rejects retired Opus before fetch', async () => {
  let fetched = false;
  const caller = createOpenRouterCaller({
    apiKey: 'sk-or-v1-test-secret-123456',
    capUsd: 3,
    maxTokens: 500,
    fetchImpl: async () => { fetched = true; throw new Error('must not run'); },
  });
  await assert.rejects(
    () => caller.call('opus', 'legacy request'),
    (error) => error.code === 'OPUS_RETIRED' && /retired/i.test(error.message),
  );
  assert.equal(fetched, false);
  assert.equal(caller.receipt().spentUsd, 0);
});
test('provider records and preserves a paid completion truncated at the token ceiling', async () => {
  const caller = createOpenRouterCaller({
    apiKey: 'sk-or-v1-test-secret-123456',
    capUsd: 3,
    maxTokens: 500,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        model: 'moonshotai/kimi-k3',
        choices: [{ finish_reason: 'length', message: { content: 'partial envelope', reasoning: 'private reasoning' } }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 4000,
          completion_tokens_details: { reasoning_tokens: 4000 },
        },
      }),
    }),
  });
  await assert.rejects(() => caller.call('kimi', 'hello'), (error) => {
    assert.match(error.message, /truncated kimi completion.*finish_reason=length.*reasoning_tokens=4000.*completion_tokens=4000/i);
    assert.equal(error.code, 'PROVIDER_OUTPUT_TRUNCATED');
    assert.equal(error.partialContent, 'partial envelope');
    return true;
  });
  const [record] = caller.receipt().calls;
  assert.equal(record.finishReason, 'length');
  assert.equal(record.reasoningTokens, 4000);
  assert.equal(record.contentChars, 'partial envelope'.length);
});
test('provider refuses before fetch when worst-case reservation exceeds cap', async () => {
  let fetched = false;
  const caller = createOpenRouterCaller({
    apiKey: 'sk-or-v1-test-secret-123456',
    // .05 would allow the 100 visible tokens, but not the separate 4,000-token reasoning reserve.
    capUsd: 0.05,
    maxTokens: 100,
    fetchImpl: async () => { fetched = true; throw new Error('must not run'); },
  });
  await assert.rejects(() => caller.call('kimi', 'expensive'), /spend cap/);
  assert.equal(fetched, false);
  assert.equal(caller.receipt().spentUsd, 0);
});

test('provider redacts API keys from HTTP errors', async () => {
  const key = 'sk-or-v1-test-secret-123456';
  const caller = createOpenRouterCaller({
    apiKey: key,
    capUsd: 3,
    maxTokens: 100,
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => `bad ${key}` }),
  });
  await assert.rejects(
    () => caller.call('kimi', 'hello'),
    (error) => !error.message.includes(key) && /REDACTED/.test(error.message),
  );
});

test('artifact writer emits packet, transcript, source manifest, and machine receipt', () => {
  const root = mkdtempSync(join(tmpdir(), 'opus-kimi-artifacts-'));
  try {
    const output = writeRunArtifacts({
      outputDir: root,
      runId: 'test-run',
      task: 'Build exact thing',
      mode: 'build',
      context: { sources: [{ path: 'AGENTS.md', sha256: 'a'.repeat(64) }], rejectedFiles: [], truncated: false },
      result: {
        status: 'consensus', rounds: 2, digest: 'b'.repeat(64), builderPacket: '# Packet',
        turns: [{ round: 1, brain: 'opus', raw: 'turn one' }],
      },
      spend: { capUsd: 3, spentUsd: 0.5, calls: [] },
    });
    for (const path of Object.values(output.paths)) assert.equal(existsSync(path), true, path);
    assert.match(readFileSync(output.paths.packet, 'utf8'), /# Packet/);
    const receipt = JSON.parse(readFileSync(output.paths.receipt, 'utf8'));
    assert.equal(receipt.status, 'consensus');
    assert.equal(receipt.model_calls, 0);
    assert.equal(receipt.source_manifest[0].path, 'AGENTS.md');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('confirmed execution refuses missing requested context before any provider call', async () => {
  const root = mkdtempSync(join(tmpdir(), 'opus-kimi-missing-live-'));
  try {
    await assert.rejects(
      () => executeConsensusRun({
        root,
        task: 'Review the exact requested surface',
        mode: 'review',
        files: ['frontend/src/REAL-FILE.tsx'],
        maxRounds: 1,
        maxContextChars: 10_000,
        maxTokensPerTurn: 500,
        capUsd: 3,
        confirmSpend: true,
        out: '',
      }),
      /requested context files do not exist.*REAL-FILE\.tsx/i,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('confirmed execution refuses policy-blocked requested context before any provider call', async () => {
  const root = mkdtempSync(join(tmpdir(), 'opus-kimi-blocked-live-'));
  try {
    await assert.rejects(
      () => executeConsensusRun({
        root,
        task: 'Review the exact requested surface',
        mode: 'review',
        files: ['.env'],
        maxRounds: 1,
        maxContextChars: 10_000,
        maxTokensPerTurn: 500,
        capUsd: 3,
        confirmSpend: true,
        out: '',
      }),
      /requested context files are blocked by policy.*\.env/i,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

