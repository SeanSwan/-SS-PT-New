#!/usr/bin/env node
/**
 * gates-together.test.mjs — the two gates as a PAIR, in both hook orders.
 * ============================================================================
 * WHY THIS EXISTS. Both gates fire on the same Bash command and each was only ever
 * tested alone. Codex hostile review 2026-08-31 asked for them to be tested together,
 * and the reason is the one this workstream keeps relearning: **a list of points cannot
 * find a composition.** Round 7's two blockers were both crosses of shapes the corpus
 * already held separately; round 13 found that nobody had ever compared the two gates
 * at all, and the comparison immediately showed Fable riding through the panel ungated.
 *
 * The harness runs every registered PreToolUse hook and the first non-zero exit blocks,
 * so ORDER is observable behaviour, not an implementation detail. Both orders are
 * asserted because `.claude/settings.json` lists them in one order today and nothing
 * guarantees that tomorrow.
 *
 * WHAT MUST BE TRUE OF THE PAIR
 *   - A Fable call is refused whichever gate sees it first.
 *   - Neither gate's approval satisfies the other. They answer different questions:
 *     price and purpose. A cheap Fable call is still build work; an expensive review
 *     is still a review. Collapsing them would quietly drop half the protection.
 *   - An ordinary command passes both.
 *
 * Run: node --test scripts/hooks/gates-together.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEND = join(HERE, 'spend-guard-gate.mjs');
const FABLE = join(HERE, 'fable-remit-gate.mjs');
const FABLE_CALL = 'node scripts/consult-fable.mjs --document plan.md';

function hook(gate, command, dir) {
  const r = spawnSync(process.execPath, [gate], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf-8',
    env: { ...process.env, SWAN_SPEND_DIR: dir },
  });
  return { code: r.status, err: r.stderr || '' };
}

/** Run both hooks in `order`; the first non-zero blocks, as the harness does. */
function bothGates(command, dir, order) {
  for (const g of order) {
    const r = hook(g, command, dir);
    if (r.code !== 0) return { blockedBy: g === SPEND ? 'spend' : 'fable', ...r };
  }
  return { blockedBy: null, code: 0, err: '' };
}

const spendToken = (dir) => {
  const p = join(dir, 'PENDING-SPEND-APPROVAL.txt');
  return existsSync(p) ? (readFileSync(p, 'utf-8').match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1] : undefined;
};

for (const [label, order] of [
  ['spend first', [SPEND, FABLE]],
  ['fable first', [FABLE, SPEND]],
]) {
  test(`PAIR (${label}): a Fable call is refused whichever gate sees it first`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'swan-pair-'));
    const r = bothGates(FABLE_CALL, dir, order);
    assert.ok(r.blockedBy, 'a bare Fable call must not pass both gates');
    assert.equal(r.code, 2);
    rmSync(dir, { recursive: true, force: true });
  });

  test(`PAIR (${label}): clearing the SPEND gate does not clear the FABLE gate`, () => {
    // The two answer different questions, so one approval must never satisfy both.
    // If it ever did, the cheaper gate would silently become the only gate.
    const dir = mkdtempSync(join(tmpdir(), 'swan-pair-2-'));
    assert.equal(hook(SPEND, FABLE_CALL, dir).code, 2, 'control: the price gate refuses first');
    const tok = spendToken(dir);
    assert.ok(tok, 'control: the price gate minted a token');

    const approved = `SWAN_SPEND_APPROVE=${tok} ${FABLE_CALL}`;
    assert.equal(hook(SPEND, approved, dir).code, 0, 'the price gate accepts its own token');
    assert.equal(hook(FABLE, approved, dir).code, 2,
      'the PURPOSE gate must still refuse — a price approval is not a purpose approval');
    rmSync(dir, { recursive: true, force: true });
  });

  test(`PAIR (${label}): an ordinary command passes both`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'swan-pair-3-'));
    for (const cmd of [
      'npm run build',
      'git status --short',
      `cat scripts/consult-fable.mjs`,
      'node scripts/spend-report.mjs',
    ]) {
      assert.equal(bothGates(cmd, dir, order).blockedBy, null, `cry-wolf on ordinary work: ${cmd}`);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test(`PAIR (${label}): a confirmed Fable PANEL is refused by both`, () => {
    // The composition that was ungated until 2026-08-31: the Fable gate's panel arm
    // named a script that does not exist, so `--seats fable` reached Fable with no
    // purpose gate at all, while the price gate saw only a fan-out.
    const dir = mkdtempSync(join(tmpdir(), 'swan-pair-4-'));
    const panel = 'node scripts/consult-openrouter-panel.mjs --seats "fable,sol" --document x --confirm-spend';
    assert.equal(hook(FABLE, panel, dir).code, 2, 'the purpose gate must see Fable in the fan-out');
    assert.ok(bothGates(panel, dir, order).blockedBy, 'and the pair must refuse it');
    rmSync(dir, { recursive: true, force: true });
  });
}
