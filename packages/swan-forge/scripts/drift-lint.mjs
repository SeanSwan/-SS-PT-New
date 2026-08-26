#!/usr/bin/env node
/**
 * @swan/forge — drift linter v0 (plan §4 + §11.A2/C3/C5).
 * REPORT-ONLY by default (exit 0) until the D4 CLAUDE.md rule lands; --enforce exits 2.
 * Ships in the SAME slice as EXCEPTIONS.md (GLM C3) — suppressions are ledgered, never silent.
 *
 * Checks:
 *  R1 raw hex colors in Forge css/ (tokens/ is the only home for hex)
 *  R2 consumer CSS/JS overriding `.sw-` selectors or using !important against sw- classes
 *  R6 consumer styled(ForgeButton) wrapper that restyles instead of positioning (rule 84 standing law)
 *  R3 visual-reordering properties inside theme packs (§11.A2: packs must not fork tab order)
 *  R7 retention: a legacy revert target must not be deleted while its receipt ticket is open
 *  R4 adoption tracker: consumer files importing legacy exports the Forge replaces (GlowButton→Button)
 *
 * Usage: node scripts/drift-lint.mjs [--consumer <dir>]... [--enforce]
 */
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { styledWrapperBlocker } from './codemod-glowbutton.mjs';
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
  // Strip HTML comments FIRST. The ledger template ships a commented-out example row, and a
  // line-by-line regex loaded it as a LIVE suppression (own T2 round-4 finding). It suppressed
  // nothing today only because the example path does not exist — an example that silently
  // becomes an active governance exception is precisely the kind of quiet hole this ledger
  // exists to prevent.
  text = text.replace(/<!--[\s\S]*?-->/g, '');
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

/**
 * Index of the backtick that CLOSES the template opened at `open`, honouring escapes and
 * `${…}` interpolations (which may themselves contain templates). `indexOf('`')` stopped at the
 * first inner backtick, so an interpolated body was audited truncated (GLM T2-R3 B2a).
 */
function templateEnd(text, open) {
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') { i++; continue; }
    if (c === '`') return i;
    if (c === '$' && text[i + 1] === '{') {
      let depth = 1; i += 2;
      for (; i < text.length && depth; i++) {
        if (text[i] === '\\') { i++; continue; }
        if (text[i] === '`') { const inner = templateEnd(text, i); if (inner < 0) return -1; i = inner; continue; }
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
      }
      i--;
    }
  }
  return -1;
}

/** Skip a balanced `(...)` starting at `open`; returns the index just past the matching `)`. */
function skipParens(text, open) {
  let depth = 0; let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

/** Skip a method chain (`.attrs(…).withConfig(…)`) with BALANCED parens; returns the end index. */
function skipChain(text, i) {
  for (;;) {
    const m = /^\s*\.\s*\w+\s*\(/.exec(text.slice(i));
    if (!m) return i;
    const end = skipParens(text, i + m[0].length - 1);
    if (end < 0) return i;
    i = end;
  }
}

/**
 * R6 scan: every styled() wrapper that ultimately wraps the Forge button binding.
 *
 * A first version matched only the literal `styled(ForgeButton)\`…\`` and a probe found four ways
 * straight past it: `.attrs({})`, `.withConfig({})`, object-styles call syntax, and — the one that
 * matters most — re-extending an already-wrapped component (`styled(MyWrapper)\`background:red\``).
 * So this resolves the transitive set of locally-bound wrapper identifiers first, then checks each.
 *
 * DOCUMENTED LIMIT (Ox T2-R3 #2, second half): this is a PER-FILE linter, so a wrapper exported
 * from one file and re-extended in another is not resolved — the importing file has no forge
 * import to seed from. Cross-file resolution needs a module graph, which this deliberately is
 * not. R6 is therefore a standing law WITHIN a file and a tripwire across files; that is the
 * honest scope, and it is stated here rather than implied by silence.
 *
 * Object-styles syntax (`styled(X)({...})`) is FLAGGED unconditionally: it cannot be audited by
 * the shared string boundary, and "cannot verify" must never render as "fine" for a standing law.
 */
export function scanStyledBindings(text) {
  const findings = [];
  // Seed from the IMPORT, not from the literal name: the binding is a default export, so the
  // local name is whatever the importer chose. `import FB from '…/forge/ForgeButton'` then
  // `styled(FB)` was invisible to the first version — and hand-written wrappers are the entire
  // threat model R6 exists for, so the bypass walked in the front door (Ox T2-R2 N2).
  const bound = new Set();
  for (const m of text.matchAll(/import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"][^'"]*forge\/ForgeButton['"]/g)) bound.add(m[1]);
  for (const m of text.matchAll(/import\s*\{[^}]*\bForgeButton\s+as\s+(\w+)[^}]*\}\s*from/g)) bound.add(m[1]);
  if (!bound.size) bound.add('ForgeButton'); // fixtures and files that use the name without an import line
  // Transitive closure. The seed must tolerate a method chain: `const W = styled(ForgeButton)
  // .attrs({…})` never entered `bound` when the pattern demanded `)` immediately after the name,
  // so every later `styled(W)` was invisible (Ox T2-R3 #2, GLM B2b).
  for (let pass = 0; pass < 5; pass++) {
    const before = bound.size;
    for (const name of [...bound]) {
      for (const m of text.matchAll(new RegExp(`(?:const|let|var)\\s+(\\w+)\\s*=\\s*styled\\(\\s*${name}\\s*\\)`, 'g'))) bound.add(m[1]);
      // `const W = FB.attrs({…})` — a wrapper built off the binding without styled() at all.
      for (const m of text.matchAll(new RegExp(`(?:const|let|var)\\s+(\\w+)\\s*=\\s*${name}\\s*\\.\\s*\\w+\\s*\\(`, 'g'))) bound.add(m[1]);
    }
    if (bound.size === before) break;
  }
  for (const name of bound) {
    for (const m of text.matchAll(new RegExp(`styled\\(\\s*${name}\\s*(?=[).])`, 'g'))) {
      const line = text.slice(0, m.index).split('\n').length;
      const via = name === 'ForgeButton' ? 'styled(ForgeButton)' : `styled(${name}) [transitively wraps ForgeButton]`;
      // Balanced-paren scan: `.attrs((p) => ({…}))` or any `)` inside the args used to end the
      // chain early, after which the backtick never matched and the wrapper went UNSCANNED.
      const closeParen = skipParens(text, m.index + 'styled'.length);
      // "Cannot verify" must never render as "fine" — this file prints that law a few lines up,
      // and these two `continue`s were the only places it broke its own rule: an unbalanceable
      // chain or an unterminated body made the wrapper VANISH, unscanned and unreported, which is
      // reachable by exactly the hand-written wrapper R6 exists for (Ox T2-R4 narrow reopen).
      if (closeParen < 0) { findings.push({ rule: 'R6', line, detail: `${via} — could not parse the styled() call (unbalanced parens); NOT audited, human decision required (rule 84)` }); continue; }
      let i = skipChain(text, closeParen);
      while (/\s/.test(text[i])) i++;
      if (text[i] === '(') { findings.push({ rule: 'R6', line, detail: `${via} uses object-styles syntax, which cannot be audited statically — use a --sw-btn-* override or a template literal (rule 84)` }); continue; }
      // Neither a template nor a call after the chain means the wrapper declares NO styles
      // (`const W = styled(FB).attrs({});`) — nothing to violate, and W is already in `bound`, so
      // any later `styled(W)` is still audited. This `continue` is benign, unlike the two above:
      // it is "nothing to verify", not "could not verify". The only inputs that reach it otherwise
      // are non-compiling (an unterminated call), which is outside the threat model.
      if (text[i] !== '`') continue;
      // Terminator must respect escapes and interpolations, not stop at the first backtick.
      const end = templateEnd(text, i);
      if (end < 0) { findings.push({ rule: 'R6', line, detail: `${via} — could not find the template terminator; NOT audited, human decision required (rule 84)` }); continue; }
      const blocker = styledWrapperBlocker(text.slice(i + 1, end));
      if (blocker) findings.push({ rule: 'R6', line, detail: `${via} ${blocker} — use a --sw-btn-* override instead (rule 84)` });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

/**
 * R7: the legacy component must remain importable while any migrated surface lacks a live
 * receipt. A drilled revert proves the code reverts cleanly TODAY; it says nothing about whether
 * the revert target still exists next week (Ox T2-R2 N4). Deleting GlowButton while SWA-213 is
 * open would silently convert a proven rollback into an unexecutable one — the failure would be
 * discovered at the worst possible moment, during an incident.
 * Retire this rule together with the retention ticket, not before.
 */
export const RETENTION_GUARDED = Object.freeze([
  { path: 'components/ui/buttons/GlowButton.tsx', until: 'SWA-213', why: 'revert target for the T2 authenticated migration; no live receipt yet' },
  // The re-export shim is what two real T-tier surfaces import (OptimizedSignupModal,
  // PricingInquiryModal). Guarding only the .tsx would let the shim be deleted and break the
  // revert for exactly the files that reach the button through it (GLM T2-R3 B4).
  { path: 'components/ui/GlowButton.ts', until: 'SWA-213', why: 're-export shim; two T-tier surfaces import the button through it, so the revert needs it too' },
]);

/** @returns {{rule:string,line:number,detail:string,path:string}[]} */
export function checkRetention(existsFn) {
  return RETENTION_GUARDED.flatMap(({ path, until, why }) => (existsFn(path) ? [] : [{
    rule: 'R7', line: 1, path,
    detail: `retention-guarded file is MISSING — ${why}. It must stay importable until ${until} closes, or the drilled rollback stops being executable.`,
  }]));
}

/** Lint one file's text. @returns {{rule:string,line:number,detail:string}[]} */
export function lintText(path, text, { isForgeCss = false, isPack = false, isConsumer = false } = {}) {
  const findings = [];
  const lines = stripComments(text).split('\n');
  // R6 (block-level, consumers): a styled(ForgeButton) wrapper may position the button in its
  // parent layout, never restyle it — the sanctioned override surface is the published
  // --sw-btn-* custom properties (rule 84 / R2). The codemod refuses to CREATE such a wrapper;
  // this refuses to let one be hand-written afterwards, which is the half that survives the merge
  // (Ox T2 B3: "codemod-only enforcement decays on contact with humans"). Both call the SAME
  // boundary function, so the rule cannot drift between the migration gate and the standing law.
  // stripComments output, not raw text: a commented-out wrapper must not phantom-flag, and the
  // scan surface should match every other rule in this file (Ox T2-R2 N2.2).
  if (isConsumer) findings.push(...scanStyledBindings(lines.join('\n')));
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
    all.push(...checkRetention((p) => existsSync(join(dir, p))));
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
