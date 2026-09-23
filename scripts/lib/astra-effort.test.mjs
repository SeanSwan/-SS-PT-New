/**
 * astra-effort.test.mjs — the gate on the effort level a consult leg runs at.
 *
 * WHY THIS FILE EXISTS
 * ====================
 * Measured 2026-09-19. `buildCodexExecArgs()` passed `--model` and never an effort
 * flag, and the transport also passes `--ephemeral` (which suppresses the rollout
 * log). So the effort a consult actually executed at was decided by whatever
 * `$CODEX_HOME/config.toml` happened to be ambient, and left no record anywhere.
 *
 * The ambient home on this machine sets `model_reasoning_effort = "low"`. A
 * Mega Blueprint run believed to be `high` therefore ran at `low`, and nothing in
 * the run's own receipt could have told anyone. That is the defect this file pins.
 *
 * THE FIX IS AN ARGV FACT, NOT A PROSE RULE. Effort is now passed explicitly as
 * `-c model_reasoning_effort="<level>"`, so it is visible in the invocation and can
 * be recorded in the receipt. A rule written in a docblock is not enforcement; this
 * repo's own history is that prose rules get violated after being written up.
 *
 * THE LEVEL SET IS THE SERVER'S, NOT THE CACHE'S.
 * `~/.codex/models_cache.json` advertises `low, medium, high, xhigh, max, ultra` for
 * `gpt-6-astra`. The server disagrees. Measured 2026-09-19 by passing a deliberately
 * invalid level and reading the 400:
 *
 *   "[ReasoningEffortParam] [reasoning.effort] [invalid_enum_value] Invalid value:
 *    'bogus_level_xyz'. Supported values are: 'none', 'minimal', 'low', 'medium',
 *    'high', 'xhigh', and 'max'."
 *
 * So the cache is wrong in BOTH directions: it offers `ultra` (which the server
 * rejects) and omits `none` / `minimal` (which it accepts). Trusting the local cache
 * would have produced a level that fails a round-trip deep into a paid-for run.
 * The server enum is the authority and is pinned below.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ASTRA_EFFORT_LEVELS,
  DEFAULT_ASTRA_EFFORT,
  SERVER_ENUM_EVIDENCE,
  buildEffortArgs,
  resolveEffort,
} from './astra-effort.mjs';
import { buildCodexExecArgs } from '../mcp/swan-council-subscription.mjs';

test('the level set is the MODEL enum, not the global enum and not the local cache', () => {
  // Exact set AND exact order, copied from the model-specific 400 below. Order is
  // asserted because it is the only way to notice the list being silently re-derived
  // from a different source.
  assert.deepEqual(ASTRA_EFFORT_LEVELS, ['low', 'medium', 'high', 'xhigh', 'max']);

  // The value the local models_cache.json advertises that no server accepts.
  assert.equal(ASTRA_EFFORT_LEVELS.includes('ultra'), false);

  // THE TRAP. `none` and `minimal` are real, globally-valid reasoning efforts, and the
  // GLOBAL enum lists them. `gpt-6-astra` does not support them. A validator built from
  // the global list accepts `minimal` and then dies on a live dispatch — which is
  // exactly what happened on 2026-09-19, to this module, before this assertion existed.
  assert.equal(ASTRA_EFFORT_LEVELS.includes('none'), false);
  assert.equal(ASTRA_EFFORT_LEVELS.includes('minimal'), false);

  // The evidence must carry BOTH 400s, because reading only the first is the trap.
  assert.match(SERVER_ENUM_EVIDENCE, /invalid_enum_value/);
  assert.match(SERVER_ENUM_EVIDENCE, /unsupported_value/);
  assert.match(SERVER_ENUM_EVIDENCE, /gpt-6-astra/);
});

test('an unset level resolves to the recorded default rather than to the ambient config', () => {
  // The whole defect: "unset" used to mean "whatever ~/.codex/config.toml says".
  // Now it means a named constant that the receipt records.
  assert.equal(resolveEffort(undefined), DEFAULT_ASTRA_EFFORT);
  assert.equal(resolveEffort(null), DEFAULT_ASTRA_EFFORT);
  assert.equal(resolveEffort(''), DEFAULT_ASTRA_EFFORT);
  assert.equal(resolveEffort('   '), DEFAULT_ASTRA_EFFORT);
  // Default must itself be a legal level, or the default path is the bug.
  assert.equal(ASTRA_EFFORT_LEVELS.includes(DEFAULT_ASTRA_EFFORT), true);
});

test('a valid level is accepted and normalised', () => {
  assert.equal(resolveEffort('high'), 'high');
  assert.equal(resolveEffort('xhigh'), 'xhigh');
  assert.equal(resolveEffort('MAX'), 'max');
  assert.equal(resolveEffort('  Max  '), 'max');
});

test('an unsupported level is refused here rather than by a 400 mid-run', () => {
  // `ultra` is the sharp case: it is real in models_cache.json and rejected by
  // the server, so accepting it would spend a dispatch to learn nothing.
  assert.throws(() => resolveEffort('ultra'), /ultra/);
  assert.throws(() => resolveEffort('bogus'), /bogus/);
  // `minimal` is the sharper one: it IS a valid reasoning effort globally, so nothing
  // but the model enum rules it out. This is the assertion that would have caught the
  // live failure, where `--effort minimal` reached the API and came back 400.
  assert.throws(() => resolveEffort('minimal'), /minimal/);
  assert.throws(() => resolveEffort('none'), /none/);
  // The refusal must name the legal set, or the operator has to go read the module.
  assert.throws(() => resolveEffort('ultra'), /xhigh/);
});

test('buildEffortArgs emits the -c override Codex forwards as reasoning.effort', () => {
  // Quoted, because `-c` values are TOML-parsed: an unquoted `high` is not a string.
  assert.deepEqual(buildEffortArgs('high'), ['-c', 'model_reasoning_effort="high"']);
  assert.deepEqual(buildEffortArgs('xhigh'), ['-c', 'model_reasoning_effort="xhigh"']);
  // No level → no flag. This is the ONLY case where effort is left to the ambient
  // config, and it is reachable only by explicitly passing null.
  assert.deepEqual(buildEffortArgs(null), []);
  assert.deepEqual(buildEffortArgs(''), []);
});

test('buildCodexExecArgs carries the effort and still ends with the stdin marker', () => {
  const args = buildCodexExecArgs({ root: 'C:\\repo', model: 'gpt-test', effort: 'xhigh' });

  assert.deepEqual(args, [
    'exec', '--json', '--ephemeral', '--sandbox', 'read-only',
    '-C', 'C:\\repo', '--model', 'gpt-test',
    '-c', 'model_reasoning_effort="xhigh"',
    '-',
  ]);

  // The trailing `-` is the stdin marker; the prompt is piped, not interpolated into
  // the shell. A refactor that appends the effort after it would break the call.
  assert.equal(args.at(-1), '-');
  // The override sits immediately before the marker, as the `-c` flag plus its value.
  assert.equal(args.at(-2), 'model_reasoning_effort="xhigh"');
  assert.equal(args.at(-3), '-c');
});

test('buildCodexExecArgs refuses an unsupported effort instead of silently dropping it', () => {
  // Silently dropping is the original bug wearing a new hat: the caller believes a
  // level was applied, and the run quietly executes at something else.
  assert.throws(
    () => buildCodexExecArgs({ root: 'C:\\repo', model: 'gpt-test', effort: 'ultra' }),
    /ultra/,
  );
});

test('buildCodexExecArgs without an effort is unchanged from before this fix', () => {
  // Back-compat, pinned deliberately: every existing caller that passes no effort
  // must produce byte-identical argv to the pre-fix transport.
  assert.deepEqual(buildCodexExecArgs({ root: 'C:\\repo', model: 'gpt-test' }), [
    'exec', '--json', '--ephemeral', '--sandbox', 'read-only',
    '-C', 'C:\\repo', '--model', 'gpt-test', '-',
  ]);
});
