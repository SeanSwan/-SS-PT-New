/**
 * evaluate.mjs — benchmark harness scoring the compiler against the Phase 0 release gates.
 * =========================================================================================
 * For every retrieval case: compile the question dry-run, then check each required matcher
 * (case-insensitive substring / `|`-alternation) against the packet's evidence paths.
 *   surface recall = matched required / total required   (gate ≥ 0.90)
 *   test recall    = matched requiredTests / total       (gate ≥ 0.85)
 * A matcher with NO tracked file matching it at all marks the case INVALID (fixture drift)
 * and is excluded from gate math — reported loudly, never silently scored or dropped.
 * Policy cases assert behavior (authority win) or report their deferral phase.
 *
 * Pure local computation. No network. $0.
 *
 * @module context-gateway/evaluate
 */
import { compileContext } from './compile.mjs';

const matcherToRe = (m) => new RegExp(m.replaceAll('.', '\\.').replaceAll('\\.mjs', '\\.mjs').split('|').map((s) => s.trim()).join('|'), 'i');
const anyTracked = (tracked, re) => { for (const t of tracked) if (re.test(t)) return true; return false; };

function scoreMatchers(matchers, evidencePaths, tracked) {
  const hit = [], missed = [], invalid = [];
  for (const m of matchers) {
    const re = matcherToRe(m);
    if (!anyTracked(tracked, re)) { invalid.push(m); continue; }
    (evidencePaths.some((p) => re.test(p)) ? hit : missed).push(m);
  }
  return { hit, missed, invalid };
}

/** Run one case. Returns a result row; never throws on a scoring miss. */
export function runCase(kase, { root, tracked, originatingModel = 'claude-fable-5', budgetChars }) {
  if (kase.kind === 'policy' && (kase.deferred || kase.policy === 'unitCovered')) {
    return { id: kase.id, name: kase.name, status: 'DEFERRED', detail: kase.deferred };
  }
  const { manifest } = compileContext({ root, question: kase.question, tracked, originatingModel, budgetChars });
  const paths = manifest.evidence.map((e) => e.path);

  if (kase.kind === 'policy' && kase.policy === 'authorityWin') {
    const incl = kase.mustInclude.every((m) => paths.some((p) => matcherToRe(m).test(p)));
    const loserRe = matcherToRe(kase.mustRankBelowOrExclude.join('|'));
    const winnerIdx = paths.findIndex((p) => matcherToRe(kase.mustInclude.join('|')).test(p));
    const loserIdx = paths.findIndex((p) => loserRe.test(p));
    const ok = incl && (loserIdx === -1 || winnerIdx < loserIdx);
    return { id: kase.id, name: kase.name, status: ok ? 'PASS' : 'FAIL', detail: `winnerIdx=${winnerIdx} loserIdx=${loserIdx}`, evidenceCount: manifest.evidenceCount };
  }

  const surf = scoreMatchers(kase.required, paths, tracked);
  const tests = scoreMatchers(kase.requiredTests ?? [], paths, tracked);
  const invalid = [...surf.invalid, ...tests.invalid];
  return {
    id: kase.id, name: kase.name,
    status: invalid.length ? 'INVALID' : (surf.missed.length + tests.missed.length === 0 ? 'PASS' : 'MISS'),
    surface: { hit: surf.hit.length, total: surf.hit.length + surf.missed.length, missed: surf.missed },
    tests: { hit: tests.hit.length, total: tests.hit.length + tests.missed.length, missed: tests.missed },
    invalid, evidenceCount: manifest.evidenceCount,
  };
}

/** Run the whole benchmark. Returns { results, metrics } with gate verdicts. */
export function runBenchmark(cases, gates, opts) {
  const results = cases.map((k) => runCase(k, opts));
  const scored = results.filter((r) => r.surface);
  const sum = (sel) => scored.reduce((n, r) => n + sel(r), 0);
  const surfaceRecall = sum((r) => r.surface.hit) / Math.max(1, sum((r) => r.surface.total));
  const testRecall = sum((r) => r.tests.hit) / Math.max(1, sum((r) => r.tests.total));
  return {
    results,
    metrics: {
      cases: results.length,
      scored: scored.length,
      deferred: results.filter((r) => r.status === 'DEFERRED').length,
      invalid: results.filter((r) => r.status === 'INVALID').length,
      surfaceRecall: Number(surfaceRecall.toFixed(3)),
      testRecall: Number(testRecall.toFixed(3)),
      surfaceGate: surfaceRecall >= gates.surfaceRecall ? 'PASS' : 'FAIL',
      testGate: testRecall >= gates.testRecall ? 'PASS' : 'FAIL',
    },
  };
}
