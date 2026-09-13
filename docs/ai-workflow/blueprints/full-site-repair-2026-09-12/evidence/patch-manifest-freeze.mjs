/**
 * One-off manifest patch: replace the commit-based freeze with an explicit file
 * list, after round-3 hostile review showed a pinned commit is unresolvable in a
 * depth-1 CI checkout.
 */
import fs from 'node:fs';

const p = 'scripts/ci/docs-link-scope.json';
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
const e = m.excludedPaths.find((x) => x.path === 'docs/ai-workflow/AI-HANDOFF/');

delete e.frozenAsOf;
e.freezeMode = 'files';
e.reason =
  'Historical receipts, frozen as an EXPLICIT FILE LIST. This directory is an ACTIVE write target: ' +
  'CLAUDE.md rule 48 (lines 212 and 251) requires audit records to be landed here, and 216 files were ' +
  'added in the 30 days before this slice. A whole-directory exclusion would make every future audit ' +
  'record invisible to the link check, so only the files listed in frozenFiles are treated as debt; ' +
  'anything written here afterwards is checked like any other documentation. The list is stored here ' +
  'rather than derived from a pinned commit because actions/checkout fetches a single commit by default, ' +
  'which would make a commit-based freeze unresolvable in CI.';
e.evidence = 'frozenFiles below; regenerate with --record';

m.classes['archive-only historical record'] =
  'Retained as a historical record. Its content describes a past state and must not be rewritten. Where a ' +
  'directory is still an active write target, the entry additionally sets freezeMode "files" and records ' +
  'frozenFiles, so that only pre-existing files are debt.';

fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('AI-HANDOFF entry keys:', Object.keys(e).join(', '));
