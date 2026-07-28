/**
 * Retirement contract for the paid Opus review path.
 * Historical debate code may remain for audit, but operator-facing routes are Kimi-only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(import.meta.dirname, '..', '..', '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

test('Kimi review is dry-run by default and does not require an API key', () => {
  const temp = mkdtempSync(join(tmpdir(), 'swan-kimi-preflight-'));
  try {
    const document = join(temp, 'review.md');
    writeFileSync(document, '# Review target\nOwned design notes only.\n');
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts', 'consult-kimi.mjs'), '--document', document],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /status=preflight/i);
    assert.match(result.stdout, /model_calls=0/i);
    assert.match(result.stdout, /confirm-spend/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('Kimi model override cannot be redirected to Opus', () => {
  const temp = mkdtempSync(join(tmpdir(), 'swan-kimi-model-'));
  try {
    const document = join(temp, 'review.md');
    writeFileSync(document, '# Review target\n');
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts', 'consult-kimi.mjs'), '--document', document],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, SWAN_KIMI_MODEL: 'anthropic/claude-opus-5' },
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Kimi-only policy blocks non-Kimi model override/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
test('Kimi policy refuses a cap above three dollars before any call', () => {
  const temp = mkdtempSync(join(tmpdir(), 'swan-kimi-cap-'));
  try {
    const document = join(temp, 'review.md');
    writeFileSync(document, '# Review target\n');
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts', 'consult-kimi.mjs'), '--document', document, '--cap-usd', '3.01'],
      { cwd: root, encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cap-usd.*at most.*3/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
test('Kimi-only launcher preserves explicit approval and the three-dollar cap', () => {
  const launcher = read('scripts/ai-workflow/run-kimi-review.ps1');
  assert.match(launcher, /Kimi-only/i);
  assert.match(launcher, /CapUsd = 3/);
  assert.match(launcher, /ValidateRange\(0\.01, 3\)/);
  assert.match(launcher, /ConfirmSpend/);
  assert.match(launcher, /consult-kimi\.mjs/);
  assert.doesNotMatch(launcher, /claude-opus|opus-kimi-consensus[\\/]cli\.mjs/i);
});

test('legacy Opus launcher is a zero-spend retirement shim', () => {
  const launcher = read('scripts/ai-workflow/run-opus-kimi-consensus.ps1');
  assert.match(launcher, /RETIRED/i);
  assert.match(launcher, /run-kimi-review\.ps1/i);
  assert.doesNotMatch(launcher, /opus-kimi-consensus[\\/]cli\.mjs/i);
  assert.doesNotMatch(launcher, /confirm-spend|OPENROUTER_API_KEY/i);
});

test('MCP and skill adapters expose no paid Opus review route', () => {
  const mcp = read('.mcp.json');
  assert.doesNotMatch(mcp, /opus-kimi-consensus|opus_kimi_consensus/i);
  const metadata = read('.agents/skills/opus-kimi-debate-brain/agents/openai.yaml');
  assert.match(metadata, /Kimi-Only Review \(Opus Retired\)/);
  assert.doesNotMatch(metadata, /consensus debate/i);

  for (const skillPath of [
    '.agents/skills/opus-kimi-debate-brain/SKILL.md',
    '.claude/skills/opus-kimi-consensus/SKILL.md',
  ]) {
    const skill = read(skillPath);
    assert.match(skill, /RETIRED/i);
    assert.match(skill, /Kimi-only/i);
    assert.doesNotMatch(skill, /opus_kimi_consensus|opus-kimi-consensus[\\/]cli\.mjs/i);
  }
});

test('registry and reference mark Opus inactive and Kimi canonical', () => {
  const registry = read('docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md');
  const reference = read('docs/ai-workflow/references/OPUS-KIMI-CONSENSUS-BRAIN.md');
  assert.match(registry, /Kimi-only Review Brain/);
  assert.match(registry, /Opus Kimi Debate Brain[^|\n]*\|[^|\n]*\|[^|\n]*\| RETIRED/i);
  assert.match(reference, /Status:\*\* RETIRED/i);
  assert.match(reference, /run-kimi-review\.ps1/i);
});
