#!/usr/bin/env node
/**
 * @swan/forge — drift linter v0 (plan §4 + §11.A2/C3/C5).
 * REPORT-ONLY by default (exit 0) until the D4 CLAUDE.md rule lands; --enforce exits 2.
 * Ships in the SAME slice as EXCEPTIONS.md (GLM C3) — suppressions are ledgered, never silent.
 *
 * Checks:
 *  R1 raw hex colors in Forge css/ (tokens/ is the only home for hex)
 *  R2 consumer CSS/JS overriding `.sw-` selectors or using !important against sw- classes
 *  R3 visual-reordering properties inside theme packs (§11.A2: packs must not fork tab order)
 *  R4 adoption tracker: consumer files importing legacy exports the Forge replaces (GlowButton→Button)
 *
 * Usage: node scripts/drift-lint.mjs [--consumer <dir>]... [--enforce]
 */
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const enforce = args.includes('--enforce');
const consumers = args.flatMap((a, i) => (a === '--consumer' && args[i + 1] ? [args[i + 1]] : []));

/** Legacy export → Forge class map (§11.C5: names, not filenames). */
export const LEGACY_EXPORT_MAP = { GlowButton: 'Button (@swan/forge)', GlacialInput: 'Input (@swan/forge)', VaultDrawer: 'Modal drawer variant (@swan/forge)' };

// Known limitations (documented, GLM code review 2026-08-24): the model is LINE-oriented —
// multi-line declarations (`flex-direction:\n row-reverse`) and multi-line imports evade it;
// `writing-mode`, `unicode-bidi`, and `transform: scaleX(-1)` visual reordering are out of
// scope for v0. These are accepted gaps, not unknown ones.
const REORDER_RE = /(?:^|[\s;{])(order\s*:|flex-direction\s*:\s*(?:row|column)-reverse|direction\s*:\s*(?:rtl|ltr)|grid-(?:row|column)\s*:\s*\d|grid-area\s*:\s*\d)/i;
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const SW_OVERRIDE_RE = /\.sw-[\w-]+[^{]*\{/;
const SW_IMPORTANT_RE = /--sw-[\w-]+[^;]*!important|\.sw-[\w-]+[^}]*!important/;
// R5: packs may never redefine primitive-tier tokens — the non-themeable floors
// (44px target, focus visibility) live there and the contract says NOT themeable.
const PRIMITIVE_IN_PACK_RE = /--sw-p-[\w-]+\s*:/;

/**
 * Hardened walker: lstat (never follow symlinks — cycle-safe), per-entry try/catch
 * (one unreadable file must not kill the whole lint), depth cap.
 * @param {string} dir @param {(f:string)=>boolean} filter @param {number} depth
 */
function* walk(dir, filter, depth = 0) {
  if (depth > 12) { console.log(`[drift-lint] depth cap hit, skipping: ${dir}`); return; }
  let names = [];
  try { names = readdirSync(dir); } catch (e) { console.log(`[drift-lint] unreadable dir skipped: ${dir} (${e.code})`); return; }
  for (const name of names) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    try {
      const st = lstatSync(p);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) yield* walk(p, filter, depth + 1);
      else if (filter(p)) yield p;
    } catch (e) { console.log(`[drift-lint] unreadable entry skipped: ${p} (${e.code})`); }
  }
}

/** Parse EXCEPTIONS.md ledger rows: `| path-substr | rule | owner | expiry |` */
export function loadExceptions(text, today = new Date()) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(R\d)\s*\|\s*([^|]+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/);
    if (!m) continue;
    const [, pathSub, rule, owner, expiry] = m;
    if (pathSub.toLowerCase() === 'path-substring') continue; // header row
    if (new Date(expiry) >= today) out.push({ pathSub, rule, owner, expiry });
  }
  return out;
}

/**
 * Strip block comments (preserving line count) and trailing // line comments so
 * commented-out code neither triggers rules (false positive) nor hides violations
 * appended after a `;` on the same line (Ox F7 — both directions were wrong before).
 * @param {string} text
 */
export function stripComments(text) {
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return noBlocks.split('\n').map((l) => {
    const i = l.indexOf('//');
    // keep URLs (://) intact; strip genuine trailing line comments
    return i >= 0 && l[i - 1] !== ':' ? l.slice(0, i) : l;
  }).join('\n');
}

/** Lint one file's text. @returns {{rule:string,line:number,detail:string}[]} */
export function lintText(path, text, { isForgeCss = false, isPack = false, isConsumer = false } = {}) {
  const findings = [];
  const lines = stripComments(text).split('\n');
  lines.forEach((line, i) => {
    const at = i + 1;
    // belt+braces: orphan comment-continuation lines (unclosed /* in a fragment) stay skipped
    const t = line.trimStart();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    if (isForgeCss && !isPack && HEX_RE.test(line)) findings.push({ rule: 'R1', line: at, detail: `raw hex outside tokens/: ${line.trim().slice(0, 80)}` });
    if (isPack && REORDER_RE.test(line)) findings.push({ rule: 'R3', line: at, detail: `visual-reordering property in pack: ${line.trim().slice(0, 80)}` });
    if (isPack && PRIMITIVE_IN_PACK_RE.test(line)) findings.push({ rule: 'R5', line: at, detail: `pack redefines primitive-tier token (non-themeable floor): ${line.trim().slice(0, 80)}` });
    if (isConsumer) {
      if (SW_OVERRIDE_RE.test(line) || SW_IMPORTANT_RE.test(line)) findings.push({ rule: 'R2', line: at, detail: `consumer overrides sw-* surface: ${line.trim().slice(0, 80)}` });
      for (const legacy of Object.keys(LEGACY_EXPORT_MAP)) {
        if (new RegExp(`import[^;]*\\b${legacy}\\b`).test(line)) findings.push({ rule: 'R4', line: at, detail: `legacy ${legacy} import — Forge replacement: ${LEGACY_EXPORT_MAP[legacy]}` });
      }
    }
  });
  return findings.map((f) => ({ ...f, path }));
}

// ── CLI ──────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const exceptionsPath = join(PKG, 'EXCEPTIONS.md');
  const exceptions = existsSync(exceptionsPath) ? loadExceptions(readFileSync(exceptionsPath, 'utf8')) : [];
  /** @type {any[]} */
  let all = [];
  for (const f of walk(join(PKG, 'css'), (p) => p.endsWith('.css'))) {
    all.push(...lintText(relative(PKG, f), readFileSync(f, 'utf8'), { isForgeCss: true }));
  }
  for (const f of walk(join(PKG, 'tokens', 'packs'), (p) => p.endsWith('.css'))) {
    all.push(...lintText(relative(PKG, f), readFileSync(f, 'utf8'), { isPack: true }));
  }
  for (const dir of consumers) {
    if (!existsSync(dir)) { console.log(`[drift-lint] consumer dir missing: ${dir}`); continue; }
    for (const f of walk(dir, (p) => /\.(css|tsx?|jsx?|mjs)$/.test(p))) {
      all.push(...lintText(f, readFileSync(f, 'utf8'), { isConsumer: true }));
    }
  }
  // Segment-aware matching (Ox F10): 'Legacy.css' must not suppress 'Legacy.css.backup/x.ts'
  const norm = (p) => String(p).replace(/\\/g, '/');
  const pathMatches = (p, sub) => {
    const np = norm(p); const ns = norm(sub);
    return np === ns || np.endsWith('/' + ns) || np.includes('/' + ns + '/') || np.startsWith(ns + '/');
  };
  const suppressed = all.filter((v) => exceptions.some((e) => pathMatches(v.path, e.pathSub) && v.rule === e.rule));
  const active = all.filter((v) => !suppressed.includes(v));
  const blocking = active.filter((v) => v.rule !== 'R4'); // R4 is adoption telemetry, never blocking
  for (const v of active) console.log(`[${v.rule}] ${v.path}:${v.line} ${v.detail}`);
  for (const s of suppressed) console.log(`[suppressed:${s.rule}] ${s.path}:${s.line} (ledgered exception)`);
  console.log(`\n[drift-lint] ${active.length} finding(s) (${blocking.length} blocking-class), ${suppressed.length} suppressed by ledger, mode=${enforce ? 'ENFORCE' : 'report-only'}`);
  process.exit(enforce && blocking.length ? 2 : 0);
}
