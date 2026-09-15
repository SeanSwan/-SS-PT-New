/**
 * S17 — the check that matters most: does every same-document anchor in the
 * repaired files resolve under GITHUB's slugger, not just under
 * markdown-link-check's "simple text comparison"?
 *
 * The gate only proves the checker is satisfied. A link that passes the gate but
 * does not jump in a browser is exactly the "green check, broken for the reader"
 * outcome this slice exists to avoid.
 *
 * Run from the worktree root:
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/github-slug-crosscheck.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/s17-slugcheck/');
const GithubSlugger = require('github-slugger').default;

const FILES = [
  'AI-Village-Documentation/SWANSTUDIOS-SOCIAL-STYLING-REFERENCE.md',
  'docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md',
  'docs/ai-workflow/VIDEO-LIBRARY-PHASE-2-BLUEPRINT.md',
  'docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md',
  'docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md',
  'docs/ai-workflow/blueprints/ENHANCED-CHART-ANALYTICS-AND-AI-INTEGRATION-MASTER-PROMPT.md',
  'docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md',
  'docs/ai-workflow/personal-training/UNIFIED-TRAINING-INTERFACE-DESIGN.md',
];

let totalAnchors = 0;
let unresolved = 0;

for (const rel of FILES) {
  const text = fs.readFileSync(rel, 'utf8');
  // GitHub renders headings and, for the slug, ignores code fences.
  const slugger = new GithubSlugger();
  const slugs = new Set();
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (m) slugs.add(slugger.slug(m[1].trim()));
  }

  const anchors = [...text.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
  const bad = [...new Set(anchors)].filter((a) => !slugs.has(a));
  totalAnchors += new Set(anchors).size;
  unresolved += bad.length;
  console.log(`${bad.length === 0 ? 'OK  ' : 'FAIL'} ${rel}  (${new Set(anchors).size} distinct anchors)`);
  for (const b of bad) console.log(`       not a GitHub slug: #${b}`);
}

console.log(`\n${totalAnchors} distinct anchors checked against github-slugger; ${unresolved} unresolved.`);
process.exit(unresolved ? 1 : 0);
