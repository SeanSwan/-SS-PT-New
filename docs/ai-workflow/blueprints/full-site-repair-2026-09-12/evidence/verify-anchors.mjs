#!/usr/bin/env node
/**
 * S17 — independent verification of the same-document anchor repair.
 *
 * Three checks, deliberately not sharing code with fix-anchors.mjs:
 *
 *   1. `--engine`  — runs the actual gate engine (markdown-link-check@3.14.2,
 *      the version scripts/ci/check-docs-links.mjs pins) over the eight files
 *      and lists every dead same-document anchor. This is ground truth; it is
 *      what CI will say. Non-anchor links are ignored so the run stays offline
 *      and fast.
 *   2. default     — re-parses each file from scratch, recomputes the heading
 *      slug set with a fresh port of the checker's algorithm, and reports every
 *      same-document anchor that is not in that set.
 *   3. `--slugger` — computes each heading's slug with github-slugger@2.0.0 and
 *      reports disagreements with the anchor written by fix-anchors.mjs.
 *      Disagreements are reported, never auto-corrected.
 *
 * Usage:
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/verify-anchors.mjs
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/verify-anchors.mjs --engine
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/verify-anchors.mjs --slugger
 *   node .mega-blueprints/artifacts/docs-link-debt-20260913/verify-anchors.mjs --all
 *
 * Exit codes: 0 = clean, 1 = failures found, 2 = misuse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const RECEIPT_PATH = path.join(HERE, 'anchor-repairs.json');
const VERIFY_PATH = path.join(HERE, 'anchor-verification.json');
const SLUGGER_PATH =
  'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/s17-slugcheck/node_modules/github-slugger/index.js';

const require = createRequire(import.meta.url);
const markdownLinkCheck = promisify(require('markdown-link-check'));

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

/* ------------------------------------------- independent slug port (v2) */

function checkerSlug(headingLine) {
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

function headingRecords(markdown) {
  const stripped = markdown.replace(/^```[\S\s]+?^```$/gm, (b) => b.replace(/[^\n]/g, ' '));
  const out = [];
  const re = /^#+ .*$/gm;
  let m;
  while ((m = re.exec(stripped)) !== null) out.push({ line: lineOf(stripped, m.index), raw: m[0], text: m[0].replace(/^#+\s*/, '') });
  // Headings that exist in the file but that the checker never sees, because
  // its `removeCodeBlocks` pass swallowed them (unbalanced ``` fences).
  hiddenHeadings.length = 0;
  const visible = new Set(out.map((h) => h.line + '\u0000' + h.raw));
  const reRaw = /^#+ .*$/gm;
  let r;
  while ((r = reRaw.exec(markdown)) !== null) {
    const line = lineOf(markdown, r.index);
    if (!visible.has(line + '\u0000' + r[0])) hiddenHeadings.push({ line, raw: r[0] });
  }
  const seen = new Map();
  for (const h of out) {
    h.slug = checkerSlug(h.raw);
    if (seen.has(h.slug)) {
      const n = seen.get(h.slug) + 1;
      seen.set(h.slug, n);
      h.slug = `${h.slug}-${n}`;
    }
    seen.set(h.slug, 0);
  }
  return out;
}

const hiddenHeadings = [];

function lineOf(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Same-document anchors, found with a regex that ignores code and comments. */
function anchorsIn(markdown) {
  const masked = markdown
    .replace(/^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1[ \t]*$/gm, (b) => b.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?(?:-->|$)/g, (b) => b.replace(/[^\n]/g, ' '));
  const out = [];
  const re = /\[[^\]]*\]\(\s*(#[^)\s]*)/g;
  let m;
  while ((m = re.exec(masked)) !== null) out.push({ line: lineOf(masked, m.index), anchor: m[1] });
  return out;
}

/* ------------------------------------------------------------- 1. engine */

async function engineCheck() {
  const config = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.github', 'markdown-link-check-config.json'), 'utf8'));
  const rows = [];
  for (const rel of FILES) {
    const abs = path.join(REPO_ROOT, rel);
    const markdown = fs.readFileSync(abs, 'utf8');
    const dir = path.dirname(abs);
    const results = await markdownLinkCheck(markdown, {
      ...config,
      // Only same-document anchors matter here; everything else is off-topic
      // and would turn this into a network run.
      ignorePatterns: [{ pattern: '^(?!#)' }],
      projectBaseUrl: `file:///${REPO_ROOT.replace(/\\/g, '/')}`,
      baseUrl: process.platform === 'win32' ? `file://${dir.replace(/\\/g, '/')}` : `file://${dir}`,
      quiet: true,
    });
    const dead = results.filter((r) => r.status === 'dead' && r.link.startsWith('#'));
    const alive = results.filter((r) => r.status !== 'dead' && r.link.startsWith('#'));
    rows.push({ file: rel, anchorsSeen: dead.length + alive.length, dead: dead.map((d) => d.link), alive: alive.map((a) => a.link) });
  }
  return rows;
}

/* ------------------------------------------- 3. github-slugger cross-check */

async function sluggerCrossCheck() {
  const { default: GithubSlugger } = await import(pathToFileURL(SLUGGER_PATH).href);
  const receipt = fs.existsSync(RECEIPT_PATH) ? JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8')) : null;
  const rows = [];
  for (const rel of FILES) {
    const markdown = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const headings = headingRecords(markdown);
    const slugger = new GithubSlugger();
    const bySlug = new Map();
    for (const h of headings) {
      const gs = slugger.slug(h.text);
      const mine = h.slug;
      bySlug.set(mine, { gs, heading: h.raw, line: h.line });
    }
    const fixed = (receipt?.files.find((f) => f.file === rel)?.changes || []).map((c) => ({
      newAnchor: c.newAnchor.slice(1),
      oldAnchor: c.oldAnchor,
      headingText: c.headingText,
      headingLine: c.headingLine,
      linkLine: c.line,
    }));
    const comparisons = [];
    for (const f of fixed) {
      const entry = bySlug.get(f.newAnchor);
      const gs = entry ? entry.gs : null;
      const decodedMine = safeDecode(f.newAnchor);
      const decodedGs = gs === null ? null : safeDecode(gs);
      comparisons.push({
        file: rel,
        linkLine: f.linkLine,
        oldAnchor: f.oldAnchor,
        newAnchor: `#${f.newAnchor}`,
        heading: f.headingText,
        headingLine: f.headingLine,
        ours: f.newAnchor,
        githubSlugger: gs,
        // The checker percent-encodes; github-slugger does not. Only a
        // difference that survives percent-decoding is a real disagreement.
        semanticallyEqual: decodedMine === decodedGs,
        encodingOnly: decodedMine === decodedGs && f.newAnchor !== gs,
      });
    }
    rows.push({ file: rel, compared: comparisons.length, comparisons });
  }
  return rows;
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/* ------------------------------- 4. human-reader check (every anchor, both engines) */

/**
 * The gate's slug rules and GitHub's are not identical — github-slugger keeps
 * U+FE0F variation selectors, markdown-link-check strips them. An anchor that
 * satisfies the checker but not github-slugger would pass CI and still fail to
 * jump for a reader, so EVERY same-document anchor is tested against both slug
 * sets, not only the ones a repair touched.
 */
async function humanReaderCheck() {
  const { default: GithubSlugger } = await import(pathToFileURL(SLUGGER_PATH).href);
  const rows = [];
  for (const rel of FILES) {
    const markdown = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const headings = headingRecords(markdown);
    const checkerSlugs = new Set(headings.map((h) => h.slug));
    const slugger = new GithubSlugger();
    const sluggerSlugs = new Set(headings.map((h) => slugger.slug(h.text)));
    const anchors = anchorsIn(markdown);
    const failsChecker = [];
    const failsSlugger = [];
    const perAnchor = [];
    let okBoth = 0;
    for (const a of anchors) {
      const raw = a.anchor.slice(1);
      const body = safeDecode(raw);
      const inChecker = checkerSlugs.has(raw) || checkerSlugs.has(body);
      const inSlugger = sluggerSlugs.has(body) || sluggerSlugs.has(raw);
      if (!inChecker) failsChecker.push(`L${a.line} ${a.anchor}`);
      if (!inSlugger) failsSlugger.push(`L${a.line} ${a.anchor}`);
      if (inChecker && inSlugger) okBoth++;
      perAnchor.push({ line: a.line, anchor: a.anchor, markdownLinkCheckAlive: inChecker, githubSluggerAlive: inSlugger });
    }
    rows.push({
      file: rel,
      anchors: anchors.length,
      anchorsValidForBothEngines: okBoth,
      failsChecker,
      failsGithubSlugger: failsSlugger,
      perAnchor,
    });
  }
  return rows;
}

/* ------------------------------- 5. rendering sanity (marked lexer) */

/**
 * Disposition B was a structural repair, not an anchor repair: a bare ``` opened
 * at ADMIN:…:565 and was never closed, so the checker — and every renderer —
 * treated real prose as code and hid two genuine headings inside the block.
 * An anchor can therefore be "alive" for the wrong reason, so the block
 * boundaries are asserted directly against a real Markdown lexer.
 */
async function renderingSanity() {
  const { marked } = await import(pathToFileURL(require.resolve('marked')).href);
  const rows = [];
  for (const rel of FILES) {
    const markdown = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const tokens = marked.lexer(markdown);
    const headings = tokens.filter((t) => t.type === 'heading');
    const codes = tokens.filter((t) => t.type === 'code' && !/^(markdown|md)$/i.test(t.lang || ''));
    // Bold prose that a renderer puts inside a code block is prose a reader
    // cannot read as prose — the exact damage an unbalanced fence causes.
    const proseInCode = [];
    for (const c of codes) {
      for (const line of c.text.split('\n')) {
        if (/^\*\*[^*].*\*\*\s*$/.test(line) || /^#{2,6} /.test(line)) {
          proseInCode.push(`${line.slice(0, 70)}${line.length > 70 ? '…' : ''} (lang=${c.lang || 'none'})`);
        }
      }
    }
    const find = (re, depth) => headings.find((h) => re.test(h.text) && (!depth || h.depth === depth));
    const inCode = (needle) => codes.some((c) => c.text.includes(needle));
    rows.push({
      file: rel,
      headingTokens: headings.length,
      codeTokens: codes.length,
      proseRenderedAsCode: proseInCode,
      assertions:
        rel === 'docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md'
          ? {
              'h2 "Testing Strategy" restored': Boolean(find(/Testing Strategy/, 2)),
              'h3 "Unit Tests (Backend)" restored': Boolean(find(/Unit Tests \(Backend\)/, 3)),
              'file tree still rendered as code': inCode('# Import adminVideoRoutes'),
              'JS test block still rendered as code': inCode("describe('Admin Video API'"),
              '"Total Files to Create" no longer rendered as code': !inCode('**Total Files to Create:**'),
              '"Total LOC Estimate" no longer rendered as code': !inCode('**Total LOC Estimate:**'),
            }
          : null,
    });
  }
  return rows;
}

/* -------------------------------------------------------------------- main */

const argv = process.argv.slice(2);
const runAll = argv.includes('--all') || argv.length === 0;
const unknown = argv.filter((a) => !['--engine', '--slugger', '--reparse', '--reader', '--render', '--all'].includes(a));
if (unknown.length) {
  console.error(`unknown argument(s): ${unknown.join(' ')}`);
  process.exit(2);
}

const report = { tool: 'verify-anchors.mjs', at: new Date().toISOString() };
let failures = 0;

if (runAll || argv.includes('--engine')) {
  report.engine = await engineCheck();
  console.log('\n=== 1. GATE ENGINE (markdown-link-check 3.14.2, same-document anchors only) ===');
  for (const r of report.engine) {
    console.log(`  ${r.file}\n      anchors=${r.anchorsSeen} dead=${r.dead.length}${r.dead.length ? ' -> ' + r.dead.join(', ') : ''}`);
    failures += r.dead.length;
  }
  console.log(`  TOTAL DEAD (engine): ${report.engine.reduce((n, r) => n + r.dead.length, 0)}`);
}

if (runAll || argv.includes('--reparse')) {
  report.reparse = [];
  console.log('\n=== 2. INDEPENDENT RE-PARSE (recomputed heading slug set) ===');
  for (const rel of FILES) {
    const markdown = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const headings = headingRecords(markdown);
    const slugs = new Set(headings.map((h) => h.slug));
    const anchors = anchorsIn(markdown);
    const broken = anchors.filter((a) => !slugs.has(a.anchor.slice(1)));
    const hidden = hiddenHeadings.map((h) => `L${h.line} ${h.raw}`);
    report.reparse.push({ file: rel, headings: headings.length, anchors: anchors.length, broken: broken.length, brokenAnchors: broken.map((b) => `L${b.line} ${b.anchor}`), headingsInvisibleToChecker: hidden });
    console.log(`  ${rel}\n      headings=${headings.length} anchors=${anchors.length} remainingBroken=${broken.length}${broken.length ? ' -> ' + broken.map((b) => b.anchor + '@L' + b.line).join(', ') : ''}`);
    if (hidden.length) console.log(`      headings present in file but INVISIBLE to the checker: ${hidden.join(' | ')}`);
  }
  console.log(`  TOTAL REMAINING BROKEN (re-parse): ${report.reparse.reduce((n, r) => n + r.broken, 0)}`);

  // Cross-check: the two independent views must agree.
  if (report.engine) {
    console.log('\n=== 2b. ENGINE vs RE-PARSE AGREEMENT ===');
    for (const rel of FILES) {
      const e = new Set(report.engine.find((r) => r.file === rel).dead);
      const p = new Set(report.reparse.find((r) => r.file === rel).brokenAnchors.map((s) => s.replace(/^L\d+ /, '')));
      const onlyEngine = [...e].filter((x) => !p.has(x));
      const onlyParse = [...p].filter((x) => !e.has(x));
      const ok = onlyEngine.length === 0 && onlyParse.length === 0;
      console.log(`  ${ok ? 'AGREE ' : 'DIFFER'} ${rel}${ok ? '' : ` engineOnly=[${onlyEngine}] parseOnly=[${onlyParse}]`}`);
      if (!ok) failures++;
    }
  }
}

if (runAll || argv.includes('--slugger')) {
  report.slugger = await sluggerCrossCheck();
  console.log('\n=== 3. github-slugger@2.0.0 CROSS-CHECK (report only, no auto-fix) ===');
  const disagreements = [];
  let encodingOnlyCount = 0;
  for (const r of report.slugger) {
    for (const c of r.comparisons) {
      if (c.encodingOnly) encodingOnlyCount++;
      if (!c.semanticallyEqual) disagreements.push(c);
    }
  }
  console.log(`  resolved headings compared: ${report.slugger.reduce((n, r) => n + r.compared, 0)}`);
  console.log(`  semantic disagreements: ${disagreements.length}`);
  for (const d of disagreements) {
    console.log(`    ${d.file}:${d.linkLine} ${d.oldAnchor} -> ${d.newAnchor} | ours=${d.ours} github-slugger=${d.githubSlugger} | heading ${d.heading}`);
  }
  console.log(`  percent-encoding-only differences (expected, checker requires encoding): ${encodingOnlyCount}`);
  report.sluggerDisagreements = disagreements;
  report.sluggerEncodingOnly = encodingOnlyCount;
  failures += disagreements.length;
}

if (runAll || argv.includes('--reader')) {
  report.reader = await humanReaderCheck();
  console.log('\n=== 4. HUMAN-READER CHECK (every anchor vs BOTH slug sets) ===');
  for (const r of report.reader) {
    const bad = r.failsChecker.length + r.failsGithubSlugger.length;
    console.log(
      `  ${bad === 0 ? 'OK    ' : 'FAIL  '} ${r.file}\n      anchors=${r.anchors} validForBothEngines=${r.anchorsValidForBothEngines}` +
        `${r.failsChecker.length ? ` failsChecker=[${r.failsChecker.join(', ')}]` : ''}` +
        `${r.failsGithubSlugger.length ? ` failsGithubSlugger=[${r.failsGithubSlugger.join(', ')}]` : ''}`,
    );
  }
  const totalBad = report.reader.reduce((n, r) => n + r.failsChecker.length + r.failsGithubSlugger.length, 0);
  console.log(`  TOTAL anchors that would not resolve for a reader: ${report.reader.reduce((n, r) => n + r.failsGithubSlugger.length, 0)}`);
  failures += totalBad;
}

if (runAll || argv.includes('--render')) {
  report.rendering = await renderingSanity();
  console.log('\n=== 5. RENDERING SANITY (marked lexer — block boundaries) ===');
  for (const r of report.rendering) {
    const asserts = r.assertions ? Object.entries(r.assertions) : [];
    const failed = asserts.filter(([, ok]) => !ok);
    console.log(
      `  ${failed.length === 0 ? 'OK    ' : 'FAIL  '} ${r.file}\n      headings=${r.headingTokens} codeBlocks=${r.codeTokens} proseRenderedAsCode=${r.proseRenderedAsCode.length}`,
    );
    for (const [label, ok] of asserts) console.log(`        ${ok ? 'PASS' : 'FAIL'}  ${label}`);
    for (const p of r.proseRenderedAsCode) console.log(`        prose-in-code: ${p}`);
    failures += failed.length;
  }
}

fs.writeFileSync(VERIFY_PATH, JSON.stringify(report, null, 2) + '\n');
console.log(`\nverification receipt: ${path.relative(REPO_ROOT, VERIFY_PATH).split(path.sep).join('/')}`);
process.exit(failures > 0 ? 1 : 0);
