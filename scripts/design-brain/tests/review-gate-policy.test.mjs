/**
 * Review-gate policy regression contract.
 *
 * Sean retired Fable as the routine final-decider/commit gate on 2026-07-26.
 * Kimi is the standard external hostile-review gate for substantial changes;
 * Fable is explicit opt-in only.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('active policy uses Kimi, reuses matching reviews, and makes Fable opt-in', async () => {
  const claude = await read('CLAUDE.md');

  assert.match(claude, /Kimi K3 is the standard Final Reviewer and commit gate/);
  assert.match(claude, /matching completed Kimi review satisfies the gate/);
  assert.match(claude, /Fable is explicit opt-in only/);

  assert.doesNotMatch(claude, /Fable \(claude-fable-5\) is the FINAL DECIDER on EVERYTHING/);
  assert.doesNotMatch(claude, /Fable is the gate\./);
});

test('Codex mirror exposes the same Kimi gate policy', async () => {
  const agents = await read('AGENTS.md');

  assert.match(agents, /Kimi K3 is the standard Final Reviewer and commit gate/);
  assert.match(agents, /Fable is explicit opt-in only/);
});
