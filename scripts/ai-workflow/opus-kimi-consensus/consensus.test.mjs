/**
 * Contract tests for the Opus 5 x Kimi K3 consensus brain.
 * Zero network calls and zero paid model spend.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  MAX_ROUNDS,
  DEFAULT_RUN_CAP_USD,
  MAX_CONSENSUS_CONTRACT_CHARS,
  REQUIRED_PACKET_SECTIONS,
  OPUS_MODEL,
  KIMI_MODEL,
} from './constants.mjs';
import {
  parseConsensusEnvelope,
  runConsensusDebate,
  validateBuilderPacket,
} from './protocol.mjs';
import {
  buildSwanContext,
  isAllowedContextPath,
  sanitizeOutboundText,
} from './context.mjs';
import { estimateWorstCaseRun, parseCliArgs } from './cli-core.mjs';

const section = (name) => `## ${name}\nConcrete, binding content for ${name}.`;
const packet = [
  '# Builder-Exact Consensus Packet',
  ...REQUIRED_PACKET_SECTIONS.map(section),
  '```mermaid\nflowchart LR\nA[Input] --> B[Build]\n```',
  '```text\n+----------------------+\n| Desktop wireframe    |\n+----------------------+\n```',
].join('\n\n');

function answer({ status, contract = packet, issues = [], digest } = {}) {
  return `Review body\n<<<CONSENSUS_JSON>>>\n${JSON.stringify({
    status,
    consensus_contract: contract,
    ...(digest ? { consensus_digest: digest } : {}),
    open_issues: issues,
  })}\n<<<END_CONSENSUS_JSON>>>`;
}

test('hard ceiling is exactly 7 rounds, default cap is $3, and models are current requested slugs', () => {
  assert.equal(MAX_ROUNDS, 7);
  assert.equal(DEFAULT_RUN_CAP_USD, 3);
  assert.equal(OPUS_MODEL, 'anthropic/claude-opus-5');
  assert.equal(KIMI_MODEL, 'moonshotai/kimi-k3');
});

test('legacy skill adapters fail closed and route to Kimi-only review', () => {
  const adapters = [
    join(import.meta.dirname, '..', '..', '..', '.agents', 'skills', 'opus-kimi-debate-brain', 'SKILL.md'),
    join(import.meta.dirname, '..', '..', '..', '.claude', 'skills', 'opus-kimi-consensus', 'SKILL.md'),
  ];
  for (const path of adapters) {
    const skill = readFileSync(path, 'utf8');
    assert.match(skill, /RETIRED/i);
    assert.match(skill, /Kimi-only/i);
    assert.doesNotMatch(skill, /opus_kimi_consensus|opus-kimi-consensus[\\/]cli\.mjs/i);
  }
});

test('operator-facing launcher and reference mark the debate brain retired', () => {
  const root = join(import.meta.dirname, '..', '..', '..');
  for (const relativePath of [
    'scripts/ai-workflow/run-opus-kimi-consensus.ps1',
    'docs/ai-workflow/references/OPUS-KIMI-CONSENSUS-BRAIN.md',
  ]) {
    const content = readFileSync(join(root, relativePath), 'utf8');
    assert.match(content, /RETIRED/i);
    assert.match(content, /Kimi-only/i);
  }
});
test('parseConsensusEnvelope rejects missing or malformed envelopes', () => {
  assert.throws(() => parseConsensusEnvelope('plain prose'), /CONSENSUS_JSON/);
  assert.throws(
    () => parseConsensusEnvelope('<<<CONSENSUS_JSON>>>{bad}<<<END_CONSENSUS_JSON>>>'),
    /valid JSON/,
  );
  assert.throws(
    () => parseConsensusEnvelope(answer({ status: 'maybe' })),
    /status must be/,
  );
});

test('builder packet validator requires all sections, Mermaid, wireframe, and zero unresolved tokens', () => {
  assert.deepEqual(validateBuilderPacket(packet), { ok: true, missing: [] });
  const broken = packet
    .replace(section('Testing and verification matrix'), '')
    .replace('```mermaid', '```text')
    .concat('\nTBD by builder');
  const result = validateBuilderPacket(broken);
  assert.equal(result.ok, false);
  assert.ok(result.missing.some((x) => x.includes('Testing and verification matrix')));
  assert.ok(result.missing.includes('Mermaid diagram'));
  assert.ok(result.missing.includes('unresolved placeholder'));
});

test('builder packet validator enforces the consensus character ceiling', () => {
  const oversized = `${packet}\n${'x'.repeat(MAX_CONSENSUS_CONTRACT_CHARS)}`;
  assert.ok(validateBuilderPacket(oversized).missing.includes(`maximum ${MAX_CONSENSUS_CONTRACT_CHARS} characters`));
});

test('debate alternates Opus then Kimi and converges only on mutual identical packet agreement', async () => {
  const calls = [];
  const responses = [
    answer({ status: 'revise', issues: ['clarify rollback'] }),
    answer({ status: 'agree' }),
    answer({ status: 'agree' }),
  ];
  const result = await runConsensusDebate({
    task: 'Upgrade the target surface',
    swanContext: 'bounded doctrine',
    callBrain: async (brain, prompt) => {
      calls.push({ brain, prompt });
      return responses.shift();
    },
  });

  assert.equal(result.status, 'consensus');
  assert.equal(result.turns.length, 3);
  assert.deepEqual(calls.map((c) => c.brain), ['opus', 'kimi', 'opus']);
  assert.equal(result.builderPacket, packet);
  assert.match(calls[0].prompt, /ROUND: 1\/7/);
  assert.match(calls[1].prompt, /Opus 5/);
  assert.match(calls[2].prompt, /Kimi K3/);
  assert.match(calls[0].prompt, /Output ONLY the consensus envelope/);
  assert.match(calls[0].prompt, /40,000 characters/);
});

test('a complete proposal plus the other brain digest approval converges without a full-packet echo', async () => {
  const calls = [];
  const responses = [
    answer({ status: 'revise', issues: [] }),
    answer({ status: 'agree', contract: '', digest: packetDigest, issues: [] }),
  ];
  const result = await runConsensusDebate({
    task: 'Produce a complete packet efficiently',
    swanContext: 'bounded doctrine',
    callBrain: async (brain, prompt) => {
      calls.push({ brain, prompt });
      return responses.shift();
    },
  });

  assert.equal(result.status, 'consensus');
  assert.equal(result.turns.length, 2);
  assert.equal(result.builderPacket, packet);
  assert.match(calls[1].prompt, new RegExp(packetDigest));
  assert.match(calls[1].prompt, /do not echo the full packet/i);
});

test('digest approval fails closed when it does not match the current packet', async () => {
  const responses = [
    answer({ status: 'revise', issues: [] }),
    answer({ status: 'agree', contract: '', digest: '0'.repeat(64), issues: [] }),
  ];
  const result = await runConsensusDebate({
    task: 'Reject a false digest approval',
    swanContext: 'bounded doctrine',
    maxRounds: 1,
    callBrain: async () => responses.shift(),
  });

  assert.equal(result.status, 'max_rounds');
  assert.equal(result.builderPacket, null);
  assert.ok(result.turns[1].packetCheck.missing.includes('matching current candidate digest'));
});

test('provider truncation remains fail-closed and preserves paid partial content', async () => {
  const partial = '<<<CONSENSUS_JSON>>>{"status":"revise","consensus_contract":"cut off';
  const result = await runConsensusDebate({
    task: 'Produce a complete packet',
    swanContext: 'bounded doctrine',
    callBrain: async () => {
      const error = new Error('OpenRouter truncated opus completion at max_tokens');
      error.code = 'PROVIDER_OUTPUT_TRUNCATED';
      error.partialContent = partial;
      throw error;
    },
  });

  assert.equal(result.status, 'provider_error');
  assert.equal(result.builderPacket, null);
  assert.equal(result.turns.length, 1);
  assert.equal(result.turns[0].raw, partial);
  assert.deepEqual(result.turns[0].packetCheck, { ok: false, missing: ['complete provider response'] });
});

test('one-sided agreement does not converge and loop stops after 7 two-brain rounds', async () => {
  let callCount = 0;
  const result = await runConsensusDebate({
    task: 'Analyze only',
    swanContext: 'doctrine',
    callBrain: async (brain) => {
      callCount += 1;
      return brain === 'opus'
        ? answer({ status: 'agree', contract: packet })
        : answer({ status: 'revise', contract: `${packet}\n\nKimi revision ${callCount}`, issues: ['still open'] });
    },
  });
  assert.equal(result.status, 'max_rounds');
  assert.equal(result.rounds, 7);
  assert.equal(callCount, 14);
  assert.equal(result.builderPacket, null);
});

test('outbound sanitizer removes secrets and direct PII while preserving engineering text', () => {
  const dirty = 'email sean@example.com phone +1 (555) 222-9876 key sk-or-v1-abcdefghijklmnop JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature route /api/workouts';
  const clean = sanitizeOutboundText(dirty);
  assert.doesNotMatch(clean, /sean@example\.com/);
  assert.doesNotMatch(clean, /555/);
  assert.doesNotMatch(clean, /sk-or-/);
  assert.doesNotMatch(clean, /eyJhbGci/);
  assert.match(clean, /\/api\/workouts/);
  assert.match(clean, /<REDACTED_EMAIL>/);
});

test('context path policy blocks secret/data surfaces and traversal', () => {
  for (const bad of ['.env', 'backend/.env', '../outside.txt', 'exports/clients.csv', 'backup.sql', 'secrets/token.txt']) {
    assert.equal(isAllowedContextPath(bad), false, bad);
  }
  for (const good of ['frontend/src/App.tsx', 'docs/plan.md', 'backend/routes/workout.mjs']) {
    assert.equal(isAllowedContextPath(good), true, good);
  }
});

test('Swan context loads canonical doctrine with hashes and respects a hard character budget', () => {
  const root = mkdtempSync(join(tmpdir(), 'opus-kimi-swan-'));
  try {
    const files = {
      'AGENTS.md': '# Rules\nNo secrets.\n',
      'docs/ai-workflow/design-brain/index.md': '# Design Index\nCanonical router.\n',
      'docs/ai-workflow/design-brain/design.md': '# Design\nCrystalline Swan.\n'.repeat(20),
      'docs/ai-workflow/design-brain/qa-gates.md': '# QA\nResponsive checks.\n',
      'docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md': '# Strategy\nWorkout progress first.\n',
    };
    for (const [rel, body] of Object.entries(files)) {
      const full = join(root, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, body);
    }
    const result = buildSwanContext({ root, mode: 'design', maxChars: 700 });
    assert.ok(result.text.length <= 700);
    assert.ok(result.sources.length >= 3);
    assert.ok(result.sources.every((s) => /^[a-f0-9]{64}$/.test(s.sha256)));
    assert.match(result.text, /Crystalline Swan/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI is dry-run by default and requires explicit spend confirmation', () => {
  const dry = parseCliArgs(['--task', 'Review this', '--mode', 'review']);
  assert.equal(dry.confirmSpend, false);
  assert.equal(dry.maxRounds, 7);
  assert.equal(dry.capUsd, 3);
  const live = parseCliArgs(['--task', 'Review this', '--confirm-spend', '--max-rounds', '3']);
  assert.equal(live.confirmSpend, true);
  assert.equal(live.maxRounds, 3);
  assert.throws(() => parseCliArgs(['--task', 'x', '--max-rounds', '8']), /1 and 7/);
});

test('worst-case estimate reserves visible plus reasoning output for both brains', () => {
  const estimate = estimateWorstCaseRun({ promptChars: 40_000, maxRounds: 7, maxTokensPerTurn: 4_000 });
  assert.equal(estimate.calls, 14);
  assert.equal(estimate.usd, 4.48);
  assert.ok(Number.isFinite(estimate.usd));
});

test('Swan context reports nonexistent requested files instead of silently ignoring them', () => {
  const root = mkdtempSync(join(tmpdir(), 'opus-kimi-missing-context-'));
  try {
    const result = buildSwanContext({
      root,
      mode: 'review',
      files: ['frontend/src/REAL-FILE.tsx'],
    });
    assert.deepEqual(result.missingFiles, ['frontend/src/REAL-FILE.tsx']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


const packetDigest = createHash('sha256').update(packet).digest('hex');
