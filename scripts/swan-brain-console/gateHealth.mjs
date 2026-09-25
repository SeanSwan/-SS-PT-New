/**
 * gateHealth — the difference between "not run" and "pass".
 * @module scripts/swan-brain-console/gateHealth
 *
 * WHY THIS MODULE EXISTS
 * From the artifact side, a gate that never ran and a gate that passed are identical:
 * silence. A directory with no result file, a result file nobody updated, and a green
 * result file from six months ago all *look* the same to a reader skimming for good
 * news — and this repo has shipped on that ambiguity more than once. The header of
 * `.github/workflows/three-worlds-fleet.yml` records the same lesson being learned twice:
 * "a guard nobody runs is not a guard."
 *
 * So the only thing this module is allowed to do is be precise about WHY a gate is not
 * green. It reports six states, and exactly one of them is `pass`:
 *
 *   pass          a readable, fresh, real result with zero failures
 *   fail          a readable, fresh, real result with failures
 *   stale         a real result, older than the freshness window — not evidence about now
 *   not_run       no result file at all
 *   unreadable    a result file that cannot be parsed, has no usable summary, or contradicts
 *                 itself (its rows or its population disagree with its own summary)
 *   not_evidence  a result that is fresh and green and still proves nothing: a simulated
 *                 run (`mode: "mock"`), an `--update` run that rewrote its own reference
 *                 instead of comparing against it, or — round 13 — an artifact that does not
 *                 identify itself as this gate's. The most dangerous shape there is.
 *
 * THE INVARIANT: `pass` requires a file that was read, parsed, found fresh, found real, found
 * ADMISSIBLE for the gate whose path supplied it, and found to have zero failures. Nothing
 * else may produce it. `gateHealth.test.mjs` sweeps every other shape and asserts none of
 * them is ever reported as `pass`; `gateHealth.summary.test.mjs` does the same for summaries
 * that are *finite but incoherent*, which is how `failed: -1` and `{passed: 5, total: 500}`
 * once reached `pass`; `gateIdentity.test.mjs` does it for artifacts that belong to another
 * gate or contradict themselves.
 *
 * THIS FILE IS THE REGISTRY AND THE REPORT. What a result MEANS — the six-state judgement,
 * the coherence rule for summaries — lives in `gateClassify.mjs`. Which artifact shape each
 * gate's producer is declared to write — its identity, its rows, its population — lives in
 * `gateIdentity.mjs`, and this file is the only place that joins the two, because it is the
 * only place that knows which gate a path belongs to. Rule 4's 300 lines is what forced both
 * splits, and both were caught by the guard.
 *
 * BOUNDS: reads at most one small JSON file per declared gate, under the repo root.
 * No network, no DB, no writes, no cache. `now` is injectable so freshness is testable.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyEval, classifyWindow } from './gateClassify.mjs';
import { artifactContract } from './gateIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

/**
 * How old a result may be before it stops being evidence about today.
 *
 * Two weeks is chosen to match how often these gates are expected to run in CI; a
 * longer window would let a broken gate stay green-looking for a whole month. It is a
 * parameter, not a constant in the logic, so a caller can reason about a different
 * cadence without editing this file.
 */
export const STALE_AFTER_DAYS = 14;

/** The closed status set. `summary` is keyed by exactly these, plus `total`. */
export const STATUSES = Object.freeze([
  'pass', 'fail', 'stale', 'not_run', 'unreadable', 'not_evidence',
]);

/*
 * Re-exported so a caller that reaches for the shortfall vocabulary does not have to know
 * the classifier moved to its own module.
 */
export { EXCLUSION_COUNTERS, WAIVED_COUNTERS, AWAITING_COUNTERS } from './gateClassify.mjs';

/**
 * The gates this console reports on.
 *
 * Every row names a real declaration, and every row says which one, so the operator can
 * see where the claim comes from rather than trusting this table.
 *
 * THE TWO CI GATES ARE NOT THE SAME CASE, and an earlier version of this comment claimed
 * they were ("the two CI gates have no persisted result file today"). That was wrong for
 * `three-worlds-render`: `shot-diff.mjs --result docs/qa/gate-results/three-worlds-render.json`
 * does persist it, and the workflow uploads it as an artifact. It reads `not_run` only
 * because CI uploads the file without committing it, which is a different fact from
 * "nothing writes it".
 *
 * `engine-contract` IS the no-writer case: the `Contracts (no browser)` job runs the suite
 * and writes nothing, so from the artifact side "did it run?" genuinely has no answer. That
 * is a finding about the workflow, not a gap in this table.
 */
export const GATES = Object.freeze([
  {
    id: 'planning-validation',
    label: 'AI planning validation',
    path: 'docs/qa/AI-PLANNING-VALIDATION-LATEST.json',
    kind: 'eval',
    declaredBy: 'docs/qa/AI-PLANNING-VALIDATION-RESULTS.md',
  },
  {
    id: 'provider-ab',
    label: 'Provider A/B + cost tracker',
    path: 'docs/qa/PROVIDER-AB-RESULTS.json',
    kind: 'eval',
    declaredBy: 'docs/qa/PROVIDER-AB-RESULTS.md',
  },
  {
    id: 'three-worlds-render',
    label: 'Three.js fleet render (gallery-verify)',
    path: 'docs/qa/gate-results/three-worlds-render.json',
    kind: 'eval',
    declaredBy: '.github/workflows/three-worlds-fleet.yml → renders',
  },
  {
    id: 'engine-contract',
    label: 'Console engine contract',
    path: 'docs/qa/gate-results/engine-contract.json',
    kind: 'eval',
    declaredBy: '.github/workflows/three-worlds-fleet.yml → contracts',
  },
  {
    id: 'gate-shadow-window',
    label: 'Gate shadow window',
    path: '.ai-workflow/gate-mode.json',
    kind: 'window',
    declaredBy: '.ai-workflow/gate-mode.json',
  },
]);

/** Read and parse one JSON file. Never throws; failures are returned as values. */
function readJson(file) {
  if (!existsSync(file)) return { ok: false, reason: 'missing' };
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    return { ok: false, reason: 'parse', detail: String(err && err.message) };
  }
}

/**
 * Build the full gate-health report.
 *
 * `now` is injectable because freshness is the one input that would otherwise make this
 * module untestable: a suite that reads the wall clock can only assert "stale" for a
 * date it cannot control, and the staleness rule would then never be exercised.
 */
export function readGateHealth(repoRoot = REPO, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const staleAfterDays = Number.isFinite(options.staleAfterDays)
    ? options.staleAfterDays
    : STALE_AFTER_DAYS;

  const gates = GATES.map((gate) => {
    const file = join(repoRoot, gate.path);
    const read = readJson(file);
    let outcome;
    if (!read.ok && read.reason === 'missing') {
      /*
       * ROUND 15 (Astra K07) — A MISSING FILE IS NOT A FINDING THAT THE GATE DID NOT RUN, AND FOR
       * A GATE WITH NO PRODUCER IT IS NOT EVEN A GAP THAT CAN CLOSE.
       *
       * Two different situations were collapsed into one row. (1) A gate whose producer exists but
       * whose result is not committed here — `three-worlds-render` is exactly this, because CI
       * uploads the artifact and never commits it — so "no result at this path" is a fact about
       * THIS READER's view, not about the run. (2) A gate whose contract declares NO PRODUCER AT
       * ALL — `engine-contract` — where no result can ever appear until a writer is defined.
       *
       * The status stays `not_run` for both, because it is the vocabulary the panel renders and
       * the honest one for "there is no result to read". What changed is that the reader now says
       * WHICH of the two it is, and carries a `producerless` flag so the panel can stop asserting
       * non-execution on its behalf. Astra's own note: this is an unobservable gate AWAITING a
       * producer, not completed observability.
       */
      const contract = artifactContract(gate.id);
      const producerless = Boolean(contract.producerless);
      outcome = {
        status: 'not_run',
        producerless,
        detail: producerless
          ? `no result at ${gate.path}, and NO PRODUCER IS DECLARED for this gate — declared by `
            + `${gate.declaredBy}, but no writer exists, so no result can appear here until one is `
            + 'defined. This is an unobservable gate awaiting a producer, not a gate observed to '
            + 'have failed to run'
          // "No committed result" rather than "nothing is persisted": for `three-worlds-render`
          // CI DOES persist one, as an uploaded artifact, and never commits it. The two facts
          // are different, and only the second one is what this reader can see.
          : `no result at ${gate.path} — declared by ${gate.declaredBy}, but no result is `
            + 'committed, so "did it run?" has no answer here',
        ageDays: null,
      };
    } else if (!read.ok) {
      outcome = { status: 'unreadable', detail: `not valid JSON (${read.detail})`, ageDays: null };
    } else {
      /*
       * ROUND 13 (Astra H02) — THE CONTRACT GOES IN WITH THE PATH.
       *
       * This is the only place in the subsystem that knows which gate a path belongs to, so
       * it is the only place that can say which artifact shape is expected there. Passing the
       * contract into `classifyEval` is what makes "admissible evidence for THIS gate" a
       * property of the classification rather than a separate check a caller might skip.
       */
      outcome = gate.kind === 'window'
        ? classifyWindow(read.value, now)
        : classifyEval(read.value, now, staleAfterDays, artifactContract(gate.id));
    }
    return {
      id: gate.id,
      label: gate.label,
      path: gate.path,
      declaredBy: gate.declaredBy,
      status: outcome.status,
      detail: outcome.detail,
      ageDays: outcome.ageDays ?? null,
      /*
       * ROUND 15 (Astra K07) — carried to the panel so it can say "no producer" instead of
       * "never ran". Only ever true for a gate whose contract declares `producerless`; the panel
       * uses it to qualify the count rather than to change the status.
       */
      producerless: outcome.producerless === true,
    };
  });

  const summary = { total: gates.length };
  for (const s of STATUSES) summary[s] = 0;
  for (const g of gates) summary[g.status] += 1;
  /*
   * A SEPARATE COUNT, NOT A SEPARATE STATUS. These gates are already counted under `not_run`,
   * because that is what the reader has: no result. `producerless` is the qualification the
   * headline needs to stop reading `not_run` as "this gate did not run" — see `headline()` in
   * `app/app-gates.mjs`. It is not a member of STATUSES and the partition test is unaffected.
   */
  summary.producerless = gates.filter((g) => g.producerless === true).length;

  return {
    generatedAt: new Date(now).toISOString(),
    repoRoot,
    staleAfterDays,
    summary,
    gates,
  };
}

export { REPO as GATE_HEALTH_REPO };
