#!/usr/bin/env node
/**
 * scan-galaxy-residue.mjs — de-Galaxy enforcement, DETECTION CORE (Slice-0 / Fable B2).
 *
 * Detects the RETIRED "Galaxy-Swan" palette that CLAUDE.md rule 1 + the design-overhaul
 * program ban everywhere. This is the STABLE ban-core: the retired literals never change,
 * so it is safe to build ahead of the lens token regrounding (only the pale-cyan ALLOW-list,
 * added later, depends on the regrounded contract).
 *
 * Why not `grep`: the panel's biggest catch was that grep misses the palette "in disguise" —
 * named colors `aqua`/`cyan` (= #00FFFF), shorthand/8-digit hex, space-separated & percentage
 * rgb(), hsl(), and SVG `fill=` / canvas `addColorStop`. This walks source text and matches all
 * of those forms. (Binary-asset perceptual review is a separate, later pass — NOT covered here.)
 *
 * MODES:
 *   (default) report  — prints a categorized inventory, ALWAYS exits 0 (baseline, non-breaking).
 *   --gate            — exits 1 if any BANNED (not codename-review) hit is found, for CI once the
 *                       repo is clean. Do NOT wire as a blocking gate until the baseline is cleared.
 *   --json            — machine-readable output.
 *
 * SCOPE: frontend/src by default (override with --path <dir>). Excludes node_modules, build output,
 * archives, dashboard-export reference packs, and the retired theme file itself (intentional).
 *
 * Design/front-end scoped, zero PII. No dependencies.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const GATE = args.includes('--gate');
const JSON_OUT = args.includes('--json');
const pathArg = (() => { const i = args.indexOf('--path'); return i >= 0 && args[i + 1] ? args[i + 1] : 'frontend/src'; })();
const SCAN_ROOT = join(ROOT, pathArg);

const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.svg', '.html']);
// Paths that legitimately contain the retired palette or are out of scope; not violations.
const EXCLUDE_SUBSTR = [
  `${sep}node_modules${sep}`, `${sep}dist${sep}`, `${sep}build${sep}`, `${sep}.git${sep}`,
  `${sep}archive${sep}`, `pending-deletion`, `dashboard-export`, `open-design-reference-pack`,
  // The retired theme file is the intentional home of the retired palette (kept for reference).
  `galaxy-swan-theme.ts`,
];

// ── The retired Galaxy-Swan palette (FIXED). Each entry: label + matchers over normalized text.
// Colors: #0a0a1a (deep bg), #00ffff (neon cyan), #7851a9 (wing purple).
const HEX = { '#0a0a1a': 'retired-bg', '#00ffff': 'retired-cyan', '#7851a9': 'retired-purple' };
// Precompute RGB tuples for channel-form detection.
const RGB = { '0,10,26': 'retired-bg', '0,255,255': 'retired-cyan', '120,81,169': 'retired-purple' };

const BANNED_PATTERNS = [
  // 6-digit hex (case-insensitive), each retired color
  { re: /#0a0a1a\b/gi, label: 'hex #0a0a1a (retired bg)' },
  { re: /#00ffff\b/gi, label: 'hex #00FFFF (retired neon cyan)' },
  { re: /#7851a9\b/gi, label: 'hex #7851A9 (retired wing purple)' },
  // 8-digit hex (with alpha)
  { re: /#0a0a1a[0-9a-f]{2}\b/gi, label: 'hex8 #0a0a1aXX (retired bg + alpha)' },
  { re: /#00ffff[0-9a-f]{2}\b/gi, label: 'hex8 #00ffffXX (retired cyan + alpha)' },
  { re: /#7851a9[0-9a-f]{2}\b/gi, label: 'hex8 #7851a9XX (retired purple + alpha)' },
  // 3-digit shorthand: #0ff === #00FFFF (cyan). (#0a0a1a/#7851a9 have no valid shorthand.)
  { re: /#0ff\b/gi, label: 'hex3 #0ff (retired neon cyan shorthand)' },
  // Named colors that equal #00FFFF — ONLY as a CSS-value/attr context, never the English word.
  // Requires a value-introducer immediately before: `:` (CSS prop), `=` (JSX/SVG attr),
  // `(` (gradient/color fn start), or `,` (gradient/list item). This excludes prose ("Arctic
  // Cyan"), token names (`STORE_TOKENS.color.cyan` — preceded by `.`), and comments.
  { re: /(?:[:=(,])\s*["'`]?\s*(aqua|cyan)\b(?![\w-])/gi, label: 'named color aqua/cyan value (= #00FFFF)' },
  // rgb()/rgba() channel literals — tolerate comma OR space separators and optional alpha
  { re: /rgba?\(\s*0\s*[, ]\s*255\s*[, ]\s*255\b/gi, label: 'rgb(0,255,255) (retired cyan)' },
  { re: /rgba?\(\s*0\s*[, ]\s*10\s*[, ]\s*26\b/gi, label: 'rgb(0,10,26) (retired bg)' },
  { re: /rgba?\(\s*120\s*[, ]\s*81\s*[, ]\s*169\b/gi, label: 'rgb(120,81,169) (retired purple)' },
  // hsl cyan (180,100%,50%) — the retired neon cyan in HSL
  { re: /hsla?\(\s*180\s*[, ]\s*100%\s*[, ]\s*50%/gi, label: 'hsl(180,100%,50%) (retired cyan)' },
];

// Codename carriers — REVIEW, not auto-ban (Kimi: "gateway"/"navigate" false-positive on "gate").
const CODENAME_PATTERNS = [
  { re: /\bgalaxy[- ]?swan\b/gi, label: 'codename "Galaxy-Swan"' },
  { re: /\bcosmic\b/gi, label: 'codename "Cosmic"' },
  { re: /\bobservatory\b/gi, label: 'codename "Observatory"' },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    if (EXCLUDE_SUBSTR.some((s) => full.includes(s))) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

function scanFile(file) {
  let text;
  try { text = readFileSync(file, 'utf-8'); } catch { return { banned: [], codename: [] }; }
  const lines = text.split(/\r?\n/);
  const banned = [];
  const codename = [];
  lines.forEach((line, i) => {
    for (const p of BANNED_PATTERNS) {
      p.re.lastIndex = 0;
      if (p.re.test(line)) banned.push({ line: i + 1, label: p.label, text: line.trim().slice(0, 120) });
    }
    for (const p of CODENAME_PATTERNS) {
      p.re.lastIndex = 0;
      if (p.re.test(line)) codename.push({ line: i + 1, label: p.label, text: line.trim().slice(0, 120) });
    }
  });
  return { banned, codename };
}

const files = walk(SCAN_ROOT);
const results = [];
let bannedCount = 0;
let codenameCount = 0;
for (const file of files) {
  const { banned, codename } = scanFile(file);
  if (banned.length || codename.length) {
    results.push({ file: relative(ROOT, file).split(sep).join('/'), banned, codename });
    bannedCount += banned.length;
    codenameCount += codename.length;
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ scanRoot: pathArg, filesScanned: files.length, bannedCount, codenameCount, results }, null, 2));
} else {
  console.log(`\n=== de-Galaxy residue scan — ${pathArg} (${files.length} files scanned) ===\n`);
  const bannedFiles = results.filter((r) => r.banned.length);
  const codeFiles = results.filter((r) => r.codename.length);
  console.log(`## BANNED retired-palette hits: ${bannedCount} across ${bannedFiles.length} files\n`);
  for (const r of bannedFiles) {
    console.log(`  ${r.file}`);
    for (const h of r.banned) console.log(`    :${h.line}  ${h.label}  |  ${h.text}`);
  }
  console.log(`\n## CODENAME carriers (REVIEW, not auto-ban): ${codenameCount} across ${codeFiles.length} files\n`);
  for (const r of codeFiles) {
    console.log(`  ${r.file}`);
    for (const h of r.codename) console.log(`    :${h.line}  ${h.label}  |  ${h.text}`);
  }
  console.log(`\n=== summary: ${bannedCount} banned, ${codenameCount} codename-review, ${files.length} files ===`);
  console.log(GATE ? `(gate mode: exit ${bannedCount > 0 ? 1 : 0})` : '(report mode: exit 0 — non-breaking baseline)');
}

process.exit(GATE && bannedCount > 0 ? 1 : 0);
