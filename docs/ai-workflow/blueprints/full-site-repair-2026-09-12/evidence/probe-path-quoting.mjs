/**
 * S17 path-integrity probe.
 *
 * Raised by hostile review: `git ls-files` C-quotes paths containing non-ASCII
 * characters (e.g. emoji filenames become "\"archive/.../\\342\\232\\241-....md\"").
 * If the gate's enumeration inherited that quoting, an excluded prefix match
 * would silently FAIL for those paths and frozen files would leak into the
 * checked scope. Verify, do not assume.
 */
import fs from 'node:fs';
import { listTrackedMarkdown, partition } from '../../../scripts/ci/check-docs-links.mjs';

const files = listTrackedMarkdown(process.cwd());
console.log(`tracked total: ${files.length}`);

const quoted = files.filter((f) => f.startsWith('"'));
console.log(`paths returned still C-quoted by git: ${quoted.length}`);
if (quoted.length) quoted.slice(0, 3).forEach((f) => console.log(`   QUOTED ${f}`));

const nonAscii = files.filter((f) => /[^\u0000-\u007F]/.test(f));
console.log(`paths containing non-ASCII characters: ${nonAscii.length}`);
nonAscii.slice(0, 3).forEach((f) => console.log(`   e.g. ${f}`));

const manifest = JSON.parse(fs.readFileSync('scripts/ci/docs-link-scope.json', 'utf8'));
const { inScope, excluded } = partition(files, manifest);

const leaks = inScope.filter(
  (f) => f.startsWith('archive/') || f.startsWith('docs/ai-workflow/AI-HANDOFF/') || f.startsWith('docs/ai-workflow/archive/'),
);
console.log(`frozen paths that LEAKED into the checked scope: ${leaks.length}`);
leaks.slice(0, 5).forEach((f) => console.log(`   LEAK ${f}`));

const excludedNonAscii = excluded.filter((x) => /[^\u0000-\u007F]/.test(x.file));
console.log(`non-ASCII files correctly classified as excluded: ${excludedNonAscii.length}`);

console.log(`\nin-scope ${inScope.length}, excluded ${excluded.length}, sum ${inScope.length + excluded.length}`);
process.exit(leaks.length === 0 && quoted.length === 0 ? 0 : 1);
