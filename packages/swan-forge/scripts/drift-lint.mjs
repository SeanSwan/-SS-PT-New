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
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const enforce = args.includes('--enforce');
const consumers = args.flatMap((a, i) => (a === '--consumer' && args[i + 1] ? [args[i + 1]] : []));

/** Legacy export → Forge class map (§11.C5: names, not filenames). */
export const LEGACY_EXPORT_MAP = { GlowButton: 'Button (@swan/forge)', GlacialInput: 'Input (@swan/forge)', VaultDrawer: 'Modal drawer variant (@swan/forge)' };

const REORDER_RE = /(?:^|[\s;{])(order\s*:|flex-direction\s*:\s*(?:row|column)-reverse|direction\s*:\s*rtl|grid-(?:row|column)\s*:\s*\d)/;
const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/;
const SW_OVERRIDE_RE = /\.sw-[\w-]+[^{]*\{/;
const SW_IMPORTANT_RE = /--sw-[\w-]+[^;]*!important|\.sw-[\w-]+[^}]*!important/;

/** @param {string} dir @param {(f:string)=>boolean} filter */
function* walk(dir, filter) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p, filter);
    else if (filter(p)) yield p;
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

/** Lint one file's text. @returns {{rule:string,line:number,detail:string}[]} */
export function lintText(path, text, { isForgeCss = false, isPack = false, isConsumer = false } = {}) {
  const findings = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const at = i + 1;
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//') || line.trimStart().startsWith('/*')) return;
    if (isForgeCss && !isPack && HEX_RE.test(line)) findings.push({ rule: 'R1', line: at, detail: `raw hex outside tokens/: ${line.trim().slice(0, 80)}` });
    if (isPack && REORDER_RE.test(line)) findings.push({ rule: 'R3', line: at, detail: `visual-reordering property in pack: ${line.trim().slice(0, 80)}` });
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
  const suppressed = all.filter((v) => exceptions.some((e) => v.path.includes(e.pathSub) && v.rule === e.rule));
  const active = all.filter((v) => !suppressed.includes(v));
  const blocking = active.filter((v) => v.rule !== 'R4'); // R4 is adoption telemetry, never blocking
  for (const v of active) console.log(`[${v.rule}] ${v.path}:${v.line} ${v.detail}`);
  for (const s of suppressed) console.log(`[suppressed:${s.rule}] ${s.path}:${s.line} (ledgered exception)`);
  console.log(`\n[drift-lint] ${active.length} finding(s) (${blocking.length} blocking-class), ${suppressed.length} suppressed by ledger, mode=${enforce ? 'ENFORCE' : 'report-only'}`);
  process.exit(enforce && blocking.length ? 2 : 0);
}
