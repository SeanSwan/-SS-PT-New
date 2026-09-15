#!/usr/bin/env node
/**
 * S17 — same-document anchor repair (fix-anchors).
 *
 * Eight documentation files carry tables of contents whose `(#anchor)` targets
 * were written by hand, shortened, and never re-derived from the real headings.
 * `scripts/ci/check-docs-links.mjs` therefore reports them as 404s: the checker
 * builds an anchor set from the headings and does a literal `includes()` test.
 *
 * This script does NOT invent anchors. For every broken target it either finds
 * the one heading the link was demonstrably pointing at, or it leaves the text
 * alone and records the anchor as UNRESOLVED.
 *
 * On top of that derived pass, `DISPOSITIONS` below holds the human-approved
 * repairs from the packet review that the derived pass cannot reach: the four
 * VS16 headings (where the gate's slug and GitHub's disagree, so the anchor was
 * only ever "alive" for the checker), the unbalanced fence that hid a real
 * heading from every renderer, the two truncated appendix anchors, and the one
 * TOC entry whose section was never written. Each disposition is asserted
 * against the text (before/after occurrence counts); an ambiguous one aborts the
 * run rather than guessing, and one already present is recorded as
 * `already-applied` instead of being applied twice.
 *
 * Slug algorithm — byte-for-byte port of the `extractSections()` chain in
 * `markdown-link-check@3.14.2` (node_modules/markdown-link-check/index.js:68-111),
 * which is what the CI gate runs:
 *
 *   1. collapse `[text](#target)` inside the heading to `text`
 *   2. lowercase (Unicode-aware)
 *   3. strip the leading `#` run and following whitespace
 *   4. delete every char outside [\p{L}\p{Nd}\p{Nl}\s_\-`]
 *   5. delete `*`
 *   6. delete backticks
 *   7. replace whitespace with `-`
 *   8. encodeURIComponent
 *
 * The checker additionally de-duplicates repeated headings by appending `-1`,
 * `-2`, … in document order; that behaviour is reproduced here so the "is this
 * anchor live?" test matches the gate exactly.
 *
 * Usage (from anywhere):
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/fix-anchors.mjs            # dry run (default)
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/fix-anchors.mjs --write    # apply + receipt
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/fix-anchors.mjs --write --verbose
 *
 * Exit codes: 0 = every broken anchor resolved, 1 = at least one UNRESOLVED, 2 = misuse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const RECEIPT_PATH = path.join(HERE, 'anchor-repairs.json');

/** The eight files in scope. Nothing outside this list is read or written. */
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

/* -------------------------------------------------------- dispositions */

const P2 = 'docs/ai-workflow/VIDEO-LIBRARY-PHASE-2-BLUEPRINT.md';
const UNIFIED = 'docs/ai-workflow/personal-training/UNIFIED-TRAINING-INTERFACE-DESIGN.md';
const ADMIN = 'docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md';
const V2 = 'docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md';

/**
 * Repairs approved by the packet owner that the derived precedence cannot
 * reach. Expressed against the pristine (pre-repair) content of each file.
 *
 * Governing rule: an anchor must be correct for a HUMAN READER on GitHub, not
 * merely alive for markdown-link-check. Where the two engines disagree the
 * reader wins, so A1–A4 change the heading rather than the anchor.
 *
 * A1–A4: markdown-link-check deletes U+FE0F; github-slugger keeps it. For these
 * four headings the two therefore produced different slugs, and the anchor that
 * satisfied the gate (`#-context--prerequisites`) would not have jumped in a
 * browser (GitHub's slug is `#\uFE0F-context--prerequisites`). Removing the
 * leading emoji makes the slug engine-independent. No other heading's emoji is
 * removed: for every other heading both engines already agree.
 */
const DISPOSITIONS = [
  {
    id: 'A1',
    file: P2,
    kind: 'heading',
    before: '## 🏗️ CONTEXT & PREREQUISITES',
    after: '## CONTEXT & PREREQUISITES',
    expectedAnchor: '#context--prerequisites',
    why: 'VS16 (U+FE0F) in the heading made the gate slug and GitHub slug differ; stripping the emoji makes both engines agree.',
  },
  {
    id: 'A2',
    file: P2,
    kind: 'heading',
    before: '## 🏗️ ARCHITECTURE & DATA FLOW',
    after: '## ARCHITECTURE & DATA FLOW',
    expectedAnchor: '#architecture--data-flow',
    why: 'Same VS16 divergence as A1.',
  },
  {
    id: 'A3',
    file: UNIFIED,
    kind: 'heading',
    before: '## 🖥️ USER INTERFACE LAYOUT',
    after: '## USER INTERFACE LAYOUT',
    expectedAnchor: '#user-interface-layout',
    why: 'Same VS16 divergence as A1 (U+1F5A5 U+FE0F).',
  },
  {
    id: 'A4',
    file: UNIFIED,
    kind: 'heading',
    before: '## 🏋️ BOOT CAMP MODE',
    after: '## BOOT CAMP MODE',
    expectedAnchor: '#boot-camp-mode',
    why: 'Same VS16 divergence as A1 (U+1F3CB U+FE0F).',
  },
  {
    id: 'B',
    file: ADMIN,
    kind: 'structure',
    before: '# Import adminVideoRoutes\r\n\r\n**Total Files to Create:** 10 files',
    after: '# Import adminVideoRoutes\r\n```\r\n\r\n**Total Files to Create:** 10 files',
    why:
      'The bare ``` opened at old line 565 to show the proposed backend/ file tree, but was never closed. ' +
      'markdown-link-check\'s removeCodeBlocks() therefore swallowed every line up to the next exactly-``` line ' +
      '(old line 622), which hid the real headings "## Testing Strategy" and "### Unit Tests (Backend)" from the ' +
      'checker and rendered two prose lines as code. Closing the fence immediately after the tree\'s last line ' +
      '(the `└── routes.mjs` entry) restores the intended boundary: the tree stays one code block and the ' +
      'javascript block that follows (previously swallowed whole) becomes a normal fenced block again.',
    expectedAnchor: '#testing-strategy',
  },
  {
    id: 'C1',
    file: V2,
    kind: 'anchor',
    before: '](#appendix-b-1rm-conversion-chart)',
    after: '](#appendix-b-1rm-conversion-chart-51000-lbs)',
    why: 'Truncated prefix of the real heading slug; the parenthetical "(5–1000 lbs)" is part of the heading.',
    expectedAnchor: '#appendix-b-1rm-conversion-chart-51000-lbs',
  },
  {
    id: 'C2',
    file: V2,
    kind: 'anchor',
    before: '](#appendix-c-full-exercise-database)',
    after: '](#appendix-c-full-exercise-database-500-exercises-by-category)',
    why: 'Truncated prefix of the real heading slug; the parenthetical is part of the heading.',
    expectedAnchor: '#appendix-c-full-exercise-database-500-exercises-by-category',
  },
  {
    id: 'D',
    file: P2,
    kind: 'delink',
    before: '7. [Implementation Details](#implementation-details)',
    after:
      '7. Implementation Details (no such section exists in this document — the heading below is Architecture & Data Flow)',
    why:
      'The TOC promises an "Implementation Details" section that was never written — no ## or ### heading in the ' +
      'file carries that meaning (the implementation work lives inside "## 📊 TASK BREAKDOWN"). The entry keeps its ' +
      'number and text; only the hyperlink is removed, with the absence stated so a reader is not left guessing.',
  },
];

/** Occurrence count of a literal needle. */
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/**
 * Apply this file's dispositions. A disposition whose `after` is already present
 * and whose `before` is gone is reported, not re-applied — so this can be run
 * against a tree another editor has already touched without double-editing it.
 */
function applyDispositions(rel, text) {
  const records = [];
  for (const d of DISPOSITIONS.filter((x) => x.file === rel)) {
    const beforeCount = countOccurrences(text, d.before);
    const afterCount = countOccurrences(text, d.after);
    if (beforeCount === 1 && afterCount === 0) {
      const idx = text.indexOf(d.before);
      records.push({ ...d, status: 'applied', line: countLines(text, idx) });
      text = text.slice(0, idx) + d.after + text.slice(idx + d.before.length);
    } else if (beforeCount === 0 && afterCount === 1) {
      records.push({ ...d, status: 'already-applied', line: countLines(text, text.indexOf(d.after)) });
    } else {
      throw new Error(
        `${rel}: disposition ${d.id} is ambiguous — before=${beforeCount} occurrence(s), after=${afterCount}. Refusing to guess.`,
      );
    }
  }
  return { text, records };
}

/* ------------------------------------------------------------------ slug */

/**
 * Exact port of the markdown-link-check heading → anchor transform.
 * Input is the raw heading line, e.g. `## 2. CHART DATA PIPELINE — Connect …`.
 */
export function headingSlug(headingLine) {
  let s = headingLine;
  s = s.replace(/\[(.+)\]\(((?:\.?\/|https?:\/\/|#)[\w\d./?=#-]+)\)/, '$1');
  s = s.toLowerCase();
  s = s.replace(/^#+\s*/, '');
  s = s.replace(/[^\p{L}\p{Nd}\p{Nl}\s_\-`]/gu, '');
  s = s.replace(/\*(?=.*)/gu, '');
  s = s.replace(/`/gu, '');
  s = s.replace(/\s/gu, '-');
  return encodeURIComponent(s);
}

/**
 * markdown-link-check's `removeCodeBlocks`, made length- and newline-preserving
 * so line numbers and byte offsets survive. Removed characters become spaces,
 * which cannot form a heading, so heading detection is unaffected.
 */
export function blankFencedCode(markdown) {
  return markdown.replace(/^```[\S\s]+?^```$/gm, (block) => block.replace(/[^\n]/g, ' '));
}

/** Line-numbered headings, in document order, with checker-identical de-dup. */
export function extractHeadings(markdown) {
  const stripped = blankFencedCode(markdown);
  const headings = [];
  const re = /^#+ .*$/gm;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    headings.push({
      offset: m.index,
      line: countLines(stripped, m.index),
      raw: m[0],
      text: m[0].replace(/^#+\s*/, ''),
      slug: headingSlug(m[0]),
    });
  }
  // De-dup exactly as the checker does: `uniq[section]++` then `section + '-' + n`.
  const seen = new Map();
  for (const h of headings) {
    if (seen.has(h.slug)) {
      const n = seen.get(h.slug) + 1;
      seen.set(h.slug, n);
      h.slug = `${h.slug}-${n}`;
      h.deduped = true;
    }
    seen.set(h.slug, 0);
  }
  return headings;
}

function countLines(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/* --------------------------------------------------- code/comment masking */

/** Ranges of fenced code blocks (``` or ~~~), used to exclude them from edits. */
function fencedRanges(text) {
  const ranges = [];
  let offset = 0;
  let open = null;
  for (const line of text.split('\n')) {
    const start = offset;
    offset += line.length + 1;
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (open) {
      if (
        fence &&
        fence[1][0] === open.char &&
        fence[1].length >= open.len &&
        fence[2].trim() === ''
      ) {
        ranges.push([open.start, start + line.length]);
        open = null;
      }
    } else if (fence) {
      open = { char: fence[1][0], len: fence[1].length, start };
    }
  }
  if (open) ranges.push([open.start, text.length]);
  return ranges;
}

/** CommonMark inline-code spans: a backtick run closed by an equal-length run. */
function codeSpanRanges(text) {
  const runs = [];
  const re = /`+/g;
  let m;
  while ((m = re.exec(text)) !== null) runs.push({ start: m.index, len: m[0].length });
  const ranges = [];
  let i = 0;
  while (i < runs.length) {
    let j = i + 1;
    while (j < runs.length && runs[j].len !== runs[i].len) j++;
    if (j < runs.length) {
      ranges.push([runs[i].start, runs[j].start + runs[j].len]);
      i = j + 1;
    } else {
      i++;
    }
  }
  return ranges;
}

/** HTML comments, including an unterminated one running to end of file. */
function commentRanges(text) {
  const ranges = [];
  const re = /<!--[\s\S]*?(?:-->|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}

/** Byte mask: 1 where the character belongs to code or a comment. */
function buildMask(text, ranges) {
  const mask = new Uint8Array(text.length);
  for (const [start, end] of ranges) {
    for (let i = Math.max(0, start); i < Math.min(text.length, end); i++) mask[i] = 1;
  }
  return mask;
}

const LINK_RE = /\[((?:[^[\]]|\[[^[\]]*\])*)\]\(\s*(#[^)\s]*)(?:\s+["'][^"']*["'])?\s*\)/g;

/**
 * Every `[…](#target)` in the file that the checker would actually see:
 * outside fenced code, outside inline code, outside HTML comments.
 */
export function findAnchorLinks(text) {
  const mask = buildMask(text, [
    ...fencedRanges(text),
    ...codeSpanRanges(text),
    ...commentRanges(text),
  ]);
  const links = [];
  LINK_RE.lastIndex = 0;
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    let masked = false;
    for (let i = start; i < end; i++) {
      if (mask[i]) {
        masked = true;
        break;
      }
    }
    if (masked) continue;
    const anchorStart = m.index + m[0].indexOf('(', m[0].indexOf(']')) + 1;
    const anchorText = m[2];
    const anchorOffset = m[0].indexOf(anchorText, m[0].indexOf(']('));
    links.push({
      line: countLines(text, start),
      text: m[1].trim(),
      anchor: anchorText,
      anchorStart: start + anchorOffset,
      anchorEnd: start + anchorOffset + anchorText.length,
      raw: m[0].replace(/\s+/g, ' '),
    });
  }
  return links;
}

/* ------------------------------------------------------ text normalisation */

/**
 * Comparable form of a link label / heading label: lowercase, emoji and
 * variation selectors dropped, markdown emphasis markers dropped, every run of
 * punctuation or symbols collapsed to one space, whitespace collapsed.
 */
export function normaliseLabel(value) {
  return value
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}]/gu, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/[^\p{L}\p{Nd}\p{Nl}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Headings that exist in the file but that the checker never sees, because its
 * `removeCodeBlocks()` pass swallowed the line inside an unbalanced fence.
 */
export function hiddenHeadings(markdown) {
  const visible = new Set(extractHeadings(markdown).map((h) => `${h.line}\u0000${h.raw}`));
  const out = [];
  const re = /^#+ .*$/gm;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const line = countLines(markdown, m.index);
    if (!visible.has(`${line}\u0000${m[0]}`)) {
      out.push({ line, raw: m[0], text: m[0].replace(/^#+\s*/, ''), wouldBeSlug: headingSlug(m[0]) });
    }
  }
  return out;
}

/* -------------------------------------------------------------- resolution */

/**
 * Precedence:
 *   a. the one heading whose normalised label equals the link's visible text
 *   b. the one heading whose leading number matches the anchor's leading number
 *      (`2-…` → the heading `2. …` / `2) …`, never `2.7 …`)
 *   c. unresolved
 */
export function resolveAnchor(link, headings, slugSet) {
  if (slugSet.has(link.anchor.slice(1))) {
    return { kind: 'already-valid' };
  }

  const wanted = normaliseLabel(link.text);
  if (wanted) {
    const byText = headings.filter((h) => normaliseLabel(h.text) === wanted);
    if (byText.length === 1) return { kind: 'text', heading: byText[0] };
    if (byText.length > 1) {
      return {
        kind: 'unresolved',
        reason: `link text matches ${byText.length} headings`,
        candidates: byText.map(describeHeading),
      };
    }
  }

  const numbered = /^(\d+)-/.exec(link.anchor.slice(1));
  if (numbered) {
    const n = numbered[1];
    const byNumber = headings.filter((h) => new RegExp(`^${n}[.)](?!\\d)`).test(h.text));
    if (byNumber.length === 1) return { kind: 'number', heading: byNumber[0] };
    if (byNumber.length > 1) {
      return {
        kind: 'unresolved',
        reason: `anchor number ${n} matches ${byNumber.length} headings`,
        candidates: byNumber.map(describeHeading),
      };
    }
    return {
      kind: 'unresolved',
      reason: `anchor number ${n} matches no heading numbered "${n}." or "${n})"`,
      candidates: [],
    };
  }

  return { kind: 'unresolved', reason: 'no heading has this label and the anchor has no number', candidates: [] };
}

function describeHeading(h) {
  return { line: h.line, heading: h.raw, slug: h.slug };
}

/**
 * Root-cause evidence for an anchor the precedence could not resolve. Never
 * applied — reported so a human can decide. Distinguishes the three shapes we
 * actually hit: the heading exists but the checker cannot see it, the heading
 * exists and the anchor is a truncated prefix of its slug, or there is no such
 * heading at all.
 */
function diagnoseAnchor(link, headings, hidden) {
  const anchorBody = link.anchor.slice(1);
  const wanted = normaliseLabel(link.text);
  return {
    headingExistsButInvisibleToChecker: hidden
      .filter(
        (h) =>
          (wanted && normaliseLabel(h.text) === wanted) ||
          h.wouldBeSlug === anchorBody ||
          h.wouldBeSlug.startsWith(anchorBody),
      )
      .map((h) => ({ line: h.line, heading: h.raw, wouldBeSlugIfVisible: h.wouldBeSlug })),
    visibleHeadingsWhoseSlugStartsWithThisAnchor: headings
      .filter((h) => h.slug.startsWith(anchorBody))
      .map(describeHeading),
    note: 'Not applied: outside the specified resolution precedence (a) unique label match, (b) unique leading heading number.',
  };
}

/* -------------------------------------------------------------------- main */

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes('--write');
  const verbose = argv.includes('--verbose');
  const rootArg = argv.find((a) => a.startsWith('--root='));
  const root = rootArg ? path.resolve(rootArg.slice(7)) : REPO_ROOT;
  const unknown = argv.filter((a) => !['--write', '--verbose', '--dry'].includes(a) && !a.startsWith('--root='));
  if (unknown.length) {
    console.error(`unknown argument(s): ${unknown.join(' ')}`);
    process.exit(2);
  }

  const receipt = {
    tool: '.mega-blueprints/artifacts/docs-link-debt-20260913/fix-anchors.mjs',
    generatedAt: new Date().toISOString(),
    mode: write ? 'write' : 'dry-run',
    inputRoot: path.relative(REPO_ROOT, root).split(path.sep).join('/') || '.',
    baselineContent: 'git HEAD — the pre-fix worktree content of the eight files.',
    inputRootNote:
      'inputRoot is where the analysed text came from. "." means the live worktree. When the ' +
      'repair has already landed, the pre-fix content is staged under inputRoot so this change ' +
      'log can still be regenerated; the repaired staging file is byte-identical to the worktree ' +
      'file it mirrors (verified by sha256 after the run).',
    slugAlgorithm: 'markdown-link-check@3.14.2 extractSections() port (see file header)',
    resolutionPrecedence: [
      'a. unique heading whose normalised label equals the link visible text',
      'b. unique heading whose leading number matches the anchor leading number (N- -> N. / N), excluding N.M sub-headings',
      'c. otherwise UNRESOLVED, file untouched at that anchor',
    ],
    files: [],
    totals: { dispositions: 0, changes: 0, unresolved: 0, stillBrokenAfter: 0 },
  };

  let exitCode = 0;

  for (const rel of FILES) {
    const abs = path.join(root, rel);
    const original = fs.readFileSync(abs, 'utf8');

    // 1. human-approved dispositions first, so the derived pass sees the same
    //    text a reader will (and picks up any anchor they leave behind).
    const { text: dispositioned, records: dispositions } = applyDispositions(rel, original);

    const headings = extractHeadings(dispositioned);
    const hidden = hiddenHeadings(dispositioned);
    const slugSet = new Set(headings.map((h) => h.slug));
    const links = findAnchorLinks(dispositioned);

    // Every disposition that promises an anchor must actually produce it.
    for (const d of dispositions) {
      if (!d.expectedAnchor) continue;
      if (!slugSet.has(d.expectedAnchor.slice(1))) {
        throw new Error(
          `${rel}: disposition ${d.id} expected anchor ${d.expectedAnchor}, but no heading has that slug`,
        );
      }
    }

    const changes = [];
    const unresolved = [];

    for (const link of links) {
      const verdict = resolveAnchor(link, headings, slugSet);
      if (verdict.kind === 'already-valid') continue;
      if (verdict.kind === 'unresolved') {
        unresolved.push({
          line: link.line,
          anchor: link.anchor,
          linkText: link.text,
          reason: verdict.reason,
          candidates: verdict.candidates,
          diagnosis: diagnoseAnchor(link, headings, hidden),
        });
        continue;
      }
      changes.push({
        line: link.line,
        oldAnchor: link.anchor,
        newAnchor: `#${verdict.heading.slug}`,
        matchedBy: verdict.kind === 'text' ? 'visible link text' : 'leading heading number',
        headingLine: verdict.heading.line,
        headingText: verdict.heading.raw,
        linkText: link.text,
        _anchorStart: link.anchorStart,
        _anchorEnd: link.anchorEnd,
      });
    }

    // Apply edits right-to-left so earlier offsets stay valid.
    let updated = dispositioned;
    for (const c of [...changes].sort((a, b) => b._anchorStart - a._anchorStart)) {
      if (updated.slice(c._anchorStart, c._anchorEnd) !== c.oldAnchor) {
        throw new Error(
          `${rel}:${c.line} offset check failed (expected ${c.oldAnchor} at ${c._anchorStart})`,
        );
      }
      updated = updated.slice(0, c._anchorStart) + c.newAnchor + updated.slice(c._anchorEnd);
    }

    // Post-edit re-parse: every same-document anchor must now be in the slug set.
    const afterHeadings = extractHeadings(updated);
    const afterSlugs = new Set(afterHeadings.map((h) => h.slug));
    const stillBroken = findAnchorLinks(updated).filter((l) => !afterSlugs.has(l.anchor.slice(1)));
    if (stillBroken.length !== unresolved.length) {
      console.error(
        `[warn] ${rel}: ${stillBroken.length} broken anchors remain but ${unresolved.length} were reported unresolved`,
      );
    }

    if (write && updated !== original) {
      fs.writeFileSync(abs, updated);
    }

    const row = {
      file: rel,
      headings: headings.length,
      anchorsScanned: links.length,
      brokenBefore: changes.length + unresolved.length,
      fixed: changes.length,
      unresolved: unresolved.length,
      stillBrokenAfter: stillBroken.length,
      dispositionsApplied: dispositions.map((d) => ({
        id: d.id,
        kind: d.kind,
        status: d.status,
        line: d.line,
        before: d.before,
        after: d.after,
        expectedAnchor: d.expectedAnchor ?? null,
        why: d.why,
      })),
      changes: changes.map(({ _anchorStart, _anchorEnd, ...rest }) => rest),
      unresolvedAnchors: unresolved,
      remainingBrokenAnchors: stillBroken.map((l) => ({ line: l.line, anchor: l.anchor })),
    };
    receipt.files.push(row);
    receipt.totals.changes += changes.length;
    receipt.totals.dispositions += dispositions.length;
    receipt.totals.unresolved += unresolved.length;
    receipt.totals.stillBrokenAfter += stillBroken.length;

    console.log(
      `${rel}\n  headings=${row.headings} anchors=${row.anchorsScanned} dispositions=${dispositions.length} ` +
        `derivedFixes=${row.fixed} unresolved=${row.unresolved} stillBroken=${row.stillBrokenAfter}`,
    );
    if (verbose || !write) {
      for (const d of row.dispositionsApplied) {
        console.log(`   [${d.id}/${d.kind}/${d.status}] L${d.line}  ${d.before.split('\r\n')[0]}  ->  ${d.after.split('\r\n')[0]}`);
      }
      for (const c of row.changes) {
        console.log(`   L${c.line} ${c.oldAnchor} -> ${c.newAnchor}   [${c.matchedBy}] ${c.headingText}`);
      }
      for (const u of row.unresolvedAnchors) {
        console.log(`   L${u.line} ${u.anchor} UNRESOLVED (${u.reason})`);
      }
      if (row.remainingBrokenAnchors.length) {
        console.log(
          `   remaining broken: ${row.remainingBrokenAnchors.map((b) => `${b.anchor}@L${b.line}`).join(', ')}`,
        );
      }
    }
  }

  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + '\n');
  console.log(
    `\n${write ? 'APPLIED' : 'DRY RUN'} — ${receipt.totals.dispositions} disposition(s), ` +
      `${receipt.totals.changes} derived anchor fix(es), ${receipt.totals.unresolved} unresolved, ` +
      `${receipt.totals.stillBrokenAfter} still broken.`,
  );
  console.log(`receipt: ${path.relative(REPO_ROOT, RECEIPT_PATH).split(path.sep).join('/')}`);

  if (receipt.totals.unresolved > 0) exitCode = 1;
  if (!write) exitCode = exitCode || 0;
  process.exit(exitCode);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
