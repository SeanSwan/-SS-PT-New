// scripts/coach-completion-tools/_root.mjs
//
// R7-13: THE ROOT A BUILDER WRITES TO MUST NOT BE WHATEVER `cwd` HAPPENS TO BE.
//
// Why this module exists, and it is a MEASURED story rather than a style preference. Seven of these
// builders derived their output location from `const ROOT = process.cwd()`. While they lived in
// `tmp/` and every caller ran `node tmp/<tool>.mjs` from the worktree root, that was invisible. Then
// I ran one of them from the TOOL DIRECTORY (checking that the relocated imports resolved) and
// `c0-build-bindings.mjs` — which computes `PKG = join(ROOT, 'docs/…')` and `mkdirSync`s it —
// **materialised an entire nested replica of the evidence tree** under
// `scripts/coach-completion-tools/docs/ai-workflow/…`, including a 90 KB stale
// `candidate-manifest.json` and a 12 KB `source-bindings.json` beside it.
//
// That is the same defect class as the rest of this review: an artefact whose meaning depends on
// ambient state. `source-bindings.json` at two different paths, hashing two different things, with
// nothing on either saying which tree it describes. So `assertRoot` makes the root EXPLICIT:
//
//   * default = two levels up from this file (the worktree root), so a builder works from any cwd;
//   * `--root=<path>` overrides, for out-of-tree use;
//   * it REFUSES if the resolved root has no `docs/ai-workflow/AI-HANDOFF` — because a root without
//     the package cannot be the tree these receipts describe, and writing there is how the stray
//     replica was created.
//
// A tool that cannot say which tree it wrote to has not produced evidence.
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const assertRoot = (argv = process.argv) => {
  const override = (argv.find((a) => a.startsWith('--root=')) || '').slice(7);
  const root = override ? resolve(override) : resolve(HERE, '..', '..');
  const marker = join(root, 'docs/ai-workflow/AI-HANDOFF');
  if (!existsSync(marker)) {
    console.error(`REFUSED — resolved root has no ${marker.replace(/\\/g, '/')}.`);
    console.error(`  resolved root: ${root}`);
    console.error('  This guard exists because a builder run from the tool directory once wrote a');
    console.error('  nested replica of the evidence tree. Pass --root=<worktree> or run from the root.');
    process.exit(4); // 4 = usage, per the exit-code contract. Never retried.
  }
  return root;
};

export const PKG_REL = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
