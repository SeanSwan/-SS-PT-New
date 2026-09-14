/**
 * Paid-review token ceiling contract.
 *
 * A stale 16K launcher override truncated an Opus 5 review after charging for
 * the call. Every operator-facing long-form review path must therefore expose
 * a 60K output ceiling. Lower task-specific budgets in production AI services
 * are intentionally outside this review-tooling contract — that carve-out is
 * why hermes-village.mjs per-call caps (4096/8192, many brains per paid run)
 * and scripts/lib/cost-gate.mjs (its cost ESTIMATOR, not a caller) carry no
 * row here, and why the retired run-opus-kimi-consensus.ps1 (exit-2 stub since
 * 2026-07-25) and the CLI-wrapper consult-codex.mjs (codex subscription path,
 * no API token knob) have no row. Brought to green 2026-09-14: ceilings raised
 * across the consult fleet and the council registry (codex 8192,
 * kimi/fable/grok 16000 → 60_000), and the two stale regex rows (fable, sol)
 * now match their scripts' env-default form.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const REVIEW_CEILING_CONTRACTS = [
  ['scripts/consult-terra-pro.mjs', /SWAN_TERRA_PRO_MAX_TOKENS\) \|\| 60_000/],
  ['scripts/consult-kimi.mjs', /SWAN_KIMI_MAX_TOKENS\) \|\| 60_000/],
  ['scripts/consult-hy3-design.mjs', /SWAN_HY3_MAX_TOKENS\) \|\| 60_000/],
  ['scripts/consult-sol.mjs', /SWAN_SOL_MAX_TOKENS \|\| '60000'/],
  ['scripts/consult-fable.mjs', /SWAN_FABLE_MAX_TOKENS\) \|\| 60_000/],
  ['scripts/consult-gemini.mjs', /maxOutputTokens:\s*60_000/],
  ['scripts/consult-codex-via-openrouter.mjs', /max_tokens:\s*60_000/],
  ['scripts/consult-codex-v1-1-review.mjs', /max_tokens:\s*60_000/],
  ['scripts/consult-codex-v1-2-review.mjs', /max_tokens:\s*60_000/],
  ['scripts/consult-codex-impl-review.mjs', /max_tokens:\s*60_000/],
  ['scripts/consult-openrouter-panel.mjs', /PANEL_MAX_TOKENS\) \|\| 60000/],
  ['scripts/ai-workflow/run-kimi-review.ps1', /\$MaxTokens = 60000/],
  ['scripts/ai-workflow/opus-kimi-consensus/constants.mjs', /DEFAULT_MAX_TOKENS_PER_TURN = 60_000/],
  ['scripts/validation-orchestrator.mjs', /maxTokens = 60_000/],
  ['scripts/validation-orchestrator.mjs', /maxOutputTokens:\s*60_000/],
];

test('all long-form paid-review entrypoints default to a 60K output ceiling', () => {
  for (const [relativePath, expected] of REVIEW_CEILING_CONTRACTS) {
    assert.match(read(relativePath), expected, `${relativePath} must default to 60K`);
  }
});

test('the shared council never lowers a review brain below 60K', () => {
  const source = read('scripts/mcp/swan-council-brains.mjs');
  const values = [...source.matchAll(/maxTokens:\s*([\d_]+)/g)]
    .map((match) => Number(match[1].replaceAll('_', '')));
  assert.ok(values.length > 0, 'expected registered review-brain ceilings');
  values.forEach((value) => assert.ok(value >= 60_000, `review ceiling ${value} is below 60K`));
});

test('review launchers and client help text do not advertise the retired 16K ceiling', () => {
  const paths = REVIEW_CEILING_CONTRACTS.map(([relativePath]) => relativePath);
  for (const relativePath of paths) {
    assert.doesNotMatch(
      read(relativePath),
      /(?:16_000|16000|16,000|16_384|16384)/,
      `${relativePath} still contains a retired 16K-class review ceiling`,
    );
  }
});
