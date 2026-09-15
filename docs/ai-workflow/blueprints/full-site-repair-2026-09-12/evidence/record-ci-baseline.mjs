/**
 * Record the AI-HANDOFF ledger baseline from the CI observation.
 *
 * CI failed on ledger growth of exactly one link (577 -> 578). Diffing CI's
 * uploaded receipt against the local one names it precisely:
 *
 *   dead in CI, not locally:
 *     https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label
 *     docs/ai-workflow/AI-HANDOFF/NUTRITION-DECISION-LOGGER-FABLE-READY-BRIEF-2026-07-09.md
 *   dead locally, not in CI:
 *     https://fitnessnav.com/global-digital-nutrition-report-2026      (x2 transcripts)
 *     https://scribd.com/digital-transformation-vr                     (x2 transcripts)
 *
 * So external-host reachability differs by vantage point, and a ledger recorded
 * on one platform then enforced on another can fail on links nobody changed. The
 * baseline is therefore recorded from CI, which is where it is enforced, and the
 * row is annotated so a reader is not left guessing why local and CI disagree.
 */
import fs from 'node:fs';

const p = 'scripts/ci/docs-link-scope.json';
const m = JSON.parse(fs.readFileSync(p, 'utf8'));

const e = m.excludedPaths.find((x) => x.path === 'docs/ai-workflow/AI-HANDOFF/');
if (!e) throw new Error('AI-HANDOFF entry not found');

e.deadLinks = 578;
e.files = 895;
e.unreadable = 0;
e.baselineNote =
  'Recorded from the CI runner (GitHub Actions, ubuntu-latest), which is where this row is enforced. ' +
  'External-host reachability differs by vantage point: CI reports this FDA URL dead while a Windows dev ' +
  'box reports it alive, and the dev box reports fitnessnav.com and scribd.com dead while CI reports them ' +
  'alive. Recording the higher, CI-observed value keeps both environments passing without raising a ' +
  'tolerance: any NEW dead link beyond this count still fails the run.';

fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('AI-HANDOFF baseline set to', e.deadLinks, 'with a recorded provenance note');
