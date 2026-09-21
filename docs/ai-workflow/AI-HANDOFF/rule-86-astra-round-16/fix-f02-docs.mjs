#!/usr/bin/env node
// sable-fix-f02-docs.mjs — correct the supersede-doctrine text that Astra F02's fix made stale.
//
// F02 was reproduced: `new-review.mjs` used to set the PREDECESSOR's `superseded_by` at the
// moment a successor was STAMPED. The stamped file is a draft, excluded from the index until
// its findings are written, so a completed review ended up reading as retired by a review that
// did not exist in the index. The fix removed that write.
//
// Removing the write made the surrounding PROSE false. The sentence "`new-review.mjs
// --supersedes` writes it, `relink.mjs` repairs a missing one" was true before the fix and is
// not true after it — and it is the sentence a reader meets first, in `--help` output and in
// the rule block installed into every harness. A tool whose own help text documents the
// behaviour it no longer has is the same class of defect the archive exists to catch, so the
// doctrine is corrected in the same pass as the code.
//
// Files are enumerated EXPLICITLY: a broad walk on this machine times out, and the rule block
// is installed at a known set of paths. Every target is asserted to exist first, and the run
// prints changed / already-correct / missing so a silent no-op cannot pass as a fix.

import fs from 'node:fs';
import os from 'node:os';

const HOME = os.homedir().replace(/\\/g, '/'); // derived, never hardcoded (Rule 8 / Rule 39)
const S = (p) => `${HOME}/${p}`;
const REPO = `${HOME}/Desktop/@Everything/quick-pt/SS-PT`;

const CANDIDATES = [
  // user-level installed surfaces (not in any git repo — patched on disk only)
  S('.claude/CLAUDE.md'),
  S('.codex/AGENTS.md'),
  S('.gemini/GEMINI.md'),
  S('.copilot/copilot-instructions.md'),
  S('.continue/rules/00-makeer-blueprints.md'),
  S('.roo/rules/00-makeer-blueprints.md'),
  S('.agents/MAKEER-BLUEPRINTS.md'),
  S('.agents/standards/MAKEER-BLUEPRINTS.canonical.md'),
  S('.agents/skills/non-vibe-coding/references/makeer-blueprints.md'),
  S('.claude/skills/non-vibe-coding/references/makeer-blueprints.md'),
  S('.codex/skills/non-vibe-coding/references/makeer-blueprints.md'),
  // repo-local surfaces
  `${REPO}/CLAUDE.md`,
  `${REPO}/AGENTS.md`,
  `${REPO}/CODEBUDDY.md`,
  `${REPO}/.github/copilot-instructions.md`,
  `${REPO}/.continue/rules/00-makeer-blueprints.md`,
  `${REPO}/.cursor/rules/00-makeer-blueprints.mdc`,
  `${REPO}/docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md`,
  `${REPO}/.claude/skills/hostile-review-archive/SKILL.md`,
  // the archive's own docs and the tool's own help text
  'Z:/HostileReviews/README.md',
  'Z:/HostileReviews/new-review.mjs',
];

// --- the replacements -------------------------------------------------------
// Ordered: the most specific forms first, so a later general rule cannot re-break them.

const EDITS = [
  // V1 — the standard sentence, present in 18 of the 19 surfaces. The clause sits on ONE
  // line in both the unwrapped and the wrapped variants, so one literal form serves both.
  {
    name: 'V1 standard clause',
    from: '`new-review.mjs --supersedes` writes it, `relink.mjs` repairs a missing one,',
    to: '`new-review.mjs --supersedes` records the forward half; `relink.mjs` writes the backward half once the successor is published,',
  },
  // V2 — the skill's bash comment.
  {
    name: 'V2 skill comment',
    from: '# ONLY if this round replaces an earlier one — sets BOTH halves',
    to: '# ONLY if this round replaces an earlier one — records the FORWARD half',
  },
  // V3 — the skill's prose paragraph, which claimed the tool writes both halves.
  {
    name: 'V3 skill prose',
    from: '`new-review.mjs\n--supersedes <old-review_id>` writes both halves; `relink.mjs` repairs a one-way link later.',
    to: '`new-review.mjs\n--supersedes <old-review_id>` records the forward half; `relink.mjs` writes the backward half, and only once the successor is published.',
  },
  // V4 — the README layout note about hand-copying TEMPLATE.md.
  {
    name: 'V4 README layout',
    from: 'and BOTH halves of the supersede link. Use `new-review.mjs` (§8).',
    to: 'and the forward supersede link (`relink.mjs` writes the backward half at publication). Use `new-review.mjs` (§8).',
  },
];

// V5 — new-review.mjs's own usage docstring, which `--help` prints verbatim.
const DOC_OLD = ` * --supersedes <old-review_id> sets BOTH halves of the supersede link: it writes
 * \`supersedes:\` in the new review AND rewrites \`superseded_by:\` in the old one. Pass it
 * whenever this review replaces an earlier round. A link declared only in the new review
 * leaves the older verdict still reading as current, which is the failure the archive
 * exists to prevent. If the old file is missing, or already names a different successor,
 * the new review is still filed and the link is reported as NOT set — \`relink.mjs\` repairs
 * a one-way link afterwards, and \`reindex.mjs\` reports one that is not reciprocal.`;

const DOC_NEW = ` * --supersedes <old-review_id> records ONLY the FORWARD half of the supersede link: it
 * writes \`supersedes:\` in the new review and deliberately does NOT touch the old file.
 * Pass it whenever this review replaces an earlier round. The backward half
 * (\`superseded_by:\` on the old review) is written by \`relink.mjs\`, and only once this
 * review is PUBLISHED — a stamped file is a draft, and a draft's existence must never
 * retire a filed review (Astra F02, reproduced: the old early write made a completed
 * review read as superseded by a review that was not in the index). The order is:
 * stamp with --supersedes -> write the findings -> set \`status: published\` ->
 * \`reindex.mjs\` (reports the one-way link) -> \`relink.mjs\` (writes the backward half).`;

// --- run --------------------------------------------------------------------

const report = [];
let changed = 0, correct = 0, missing = 0;

for (const f of CANDIDATES) {
  if (!fs.existsSync(f)) { report.push(['MISSING', f, '']); missing++; continue; }
  const before = fs.readFileSync(f, 'utf8');
  let after = before;
  const applied = [];

  for (const e of EDITS) {
    if (after.includes(e.from)) { after = after.split(e.from).join(e.to); applied.push(e.name); }
  }
  if (after.includes(DOC_OLD)) { after = after.split(DOC_OLD).join(DOC_NEW); applied.push('V5 docstring'); }

  if (after === before) { report.push(['correct', f, '']); correct++; continue; }

  fs.writeFileSync(f, after, 'utf8');
  // Assert off disk — every write in this workstream is proven from the file, not the variable.
  const check = fs.readFileSync(f, 'utf8');
  if (check !== after) { report.push(['FAILED', f, 'write did not land']); continue; }
  report.push(['FIXED', f, applied.join(' + ')]);
  changed++;
}

for (const [state, f, what] of report) {
  console.log(`${state.padEnd(8)} ${f}${what ? '  [' + what + ']' : ''}`);
}
console.log(`\nchanged: ${changed} · already correct: ${correct} · missing: ${missing}`);
if (missing) process.exit(2);
