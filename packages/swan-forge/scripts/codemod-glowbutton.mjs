#!/usr/bin/env node
/**
 * @swan/forge — GlowButton → ForgeButton strangler codemod (Rule 73: the mechanical
 * part of a strangler PR is code, not a model retyping JSX).
 *
 * Handles (deterministically, brace-aware — a `>` inside `onClick={() => …}` is NOT
 * the end of the tag; the first regex version was, and it broke a build):
 *   import GlowButton from '<…>/ui/buttons/GlowButton'   → import ForgeButton from '<rel>/components/ui/forge/ForgeButton'
 *   <GlowButton …>…</GlowButton>  /  <GlowButton … />   → <ForgeButton …>
 *   <StyledBox as={GlowButton} … $style={{…}}>…</StyledBox> → <ForgeButton … style={{…}}>…</ForgeButton>
 *   (only the </StyledBox> that pairs with a CONVERTED open is rewritten; a nested same-tag
 *    paired open inside that span makes the pairing ambiguous → the site is SKIPPED + reported)
 *
 * Hardened after the PR #2 panel review (Ox Alpha + GLM 5.3 + own pass), each with a fixture:
 *   - strings are skipped at EVERY brace depth ("}" inside `go('x}')` no longer desyncs the scan)
 *   - `//` and `/* *​/` comments inside an open tag are skipped (a ">" in a comment is not the tag end)
 *   - matches inside template literals / block comments / line comments / same-line plain strings
 *     are never rewritten (opens, closes AND import statements) — always reported as SKIPPED
 *   - known limit: regex literals carry no lexer state (a `<GlowButton` inside /…/ is not masked)
 *   - `</Tag  >` (whitespace before ">") is a valid close and is found
 *   - an unterminated tag is a HARD error for that file (was a silent `break`)
 *   - spread props `{...x}` bypass the prop audit → reported, never silently accepted
 *   - only imports that resolve to the legacy `ui/buttons/GlowButton` are rewritten; any other
 *     default import named GlowButton is reported (import-hijack guard)
 *   - the legacy `minHeight: 44px` strip is digit-anchored (`minHeight: 440` is untouched)
 *   - post-transform invariant: any residual `GlowButton` identifier outside comments
 *     (`import GlowButton, { X }`, re-exports, `motion(GlowButton)`) → RESIDUAL, file not written, exit 1
 *
 * Usage:  node scripts/codemod-glowbutton.mjs --files a.tsx,b.tsx [--apply --frontend-src <dir>]
 *         (default is DRY-RUN: prints a summary per file, writes nothing; --apply REQUIRES --frontend-src)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, dirname, resolve, join } from 'node:path';

const KNOWN = new Set(['text', 'variant', 'theme', 'colorScheme', 'size', 'type', 'isLoading', 'disabled', 'fullWidth', 'leftIcon', 'rightIcon', 'startIcon', 'endIcon', 'children', 'className', 'style', 'onClick', 'title', 'id', 'aria-label', 'aria-describedby', 'data-testid', 'form', 'name', 'value', 'tabIndex', 'role', 'key', 'animateOnRender']);
// animateOnRender is SUPPORTED by the Forge binding (.sw-btn--enter) since PR #2 — 3 reachable users met rule-of-two.
const DROPPED = new Set(['pulse', 'haptic', 'glowIntensity']);
const LEGACY_IMPORT = /(?:^|\/)ui\/buttons\/GlowButton(?:\.tsx?)?$/;

/** Relative import specifier from a consumer file to the ForgeButton binding. */
function bindingSpecifier(file, frontendSrc) {
  const target = join(frontendSrc, 'components/ui/forge/ForgeButton');
  let rel = relative(dirname(resolve(file)), target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/**
 * Byte mask of regions that must never be rewritten: template literals, block comments,
 * line comments, and plain '…'/"…" strings that CLOSE on the same line (round 2: Ox W1 —
 * `'Try <GlowButton />'` was rewritten silently with no residual to catch it).
 * A quote that reaches the end of its line without closing is NOT a string (JS strings
 * cannot span lines — it is JSX text like `don't`); scanning resumes at opener+1 so the
 * phantom never swallows a later backtick or comment on the same line (GLM B2).
 * Known limit: regex literals have no lexer state here — `/<GlowButton/` is not masked.
 * @returns {Uint8Array} 1 = masked
 */
export function maskedRegions(src) {
  const mask = new Uint8Array(src.length);
  let i = 0;
  while (i < src.length) {
    const c = src[i]; const n = src[i + 1];
    if (c === '`') { const s = i; i++; while (i < src.length && src[i] !== '`') { if (src[i] === '\\') i++; i++; } i++; mask.fill(1, s, i); continue; }
    if (c === '/' && n === '*') { const s = i; const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; mask.fill(1, s, i); continue; }
    if (c === '/' && n === '/') { const s = i; const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; mask.fill(1, s, i); continue; }
    if (c === '"' || c === "'") {
      const q = c; const s = i; let j = i + 1;
      while (j < src.length && src[j] !== q && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      if (src[j] === q) { mask.fill(1, s, j + 1); i = j + 1; } else { i = s + 1; } // unterminated → not a string
      continue;
    }
    i++;
  }
  return mask;
}

/**
 * Find the end of a JSX opening tag starting at `start` (index of '<'), tracking
 * `{}` depth, string quotes at EVERY depth, and comments, so `>` inside expressions,
 * strings, or comments never terminates the tag.
 * @returns {{end: number, selfClosing: boolean}|null} end = index just past '>' / '/>'
 */
export function findTagEnd(src, start) {
  let depth = 0; let quote = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; } // escape-STATE, not lookbehind: 'C:\\' closes correctly (GLM R2)
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) return null; i = e + 1; continue; }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); if (e < 0) return null; i = e; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth === 0 && c === '/' && src[i + 1] === '>') return { end: i + 2, selfClosing: true };
    else if (depth === 0 && c === '>') return { end: i + 1, selfClosing: false };
  }
  return null;
}

/**
 * Prop names in an attribute string: `x=` forms AND bare booleans (`pulse`).
 * String and `{…}` values are blanked first so words inside text="Start Your Journey"
 * never masquerade as props (the first version reported "Your" as unknown).
 */
export function propNames(attrs) {
  let s = ''; let depth = 0; let quote = null;
  for (let i = 0; i < attrs.length; i++) {
    const c = attrs[i];
    if (quote) { if (c === quote && attrs[i - 1] !== '\\') quote = null; s += ' '; continue; }
    if (depth === 0 && (c === '"' || c === "'" || c === '`')) { quote = c; s += ' '; continue; }
    if (c === '{') { depth++; s += ' '; continue; }
    if (c === '}') { depth--; s += ' '; continue; }
    s += depth === 0 ? c : ' ';
  }
  return [...s.matchAll(/(?:^|\s)([a-zA-Z$][\w$-]*)(?==|\s|$)/g)].map((m) => m[1]);
}

/**
 * Rewrite every tag whose open matches `openRe` (must match starting at '<'), handing the
 * attribute text to `mapAttrs`, renaming to `newName`, and — for paired opens — renaming the
 * pairing `</oldClose>` (whitespace-tolerant). Sites are SKIPPED and reported when the open is
 * inside a masked region, is unterminated, or has a nested same-tag paired open before its close.
 */
function rewriteTags(src, openRe, oldClose, newName, mapAttrs, report) {
  const mask = maskedRegions(src);
  const closeRe = new RegExp(`</${oldClose}\\s*>`, 'g');
  let out = ''; let cursor = 0; let count = 0; let m;
  openRe.lastIndex = 0;
  while ((m = openRe.exec(src)) !== null) {
    const start = m.index;
    if (mask[start]) { report.skipped.push(`<${oldClose}> at offset ${start} is inside a comment/template literal — not rewritten`); continue; }
    const tag = findTagEnd(src, start);
    if (!tag) { report.errors.push(`unterminated <${oldClose}> tag at offset ${start} — file NOT transformed`); return { out: src, count: 0 }; }
    let closePos = -1; let closeLen = 0;
    if (!tag.selfClosing) {
      closeRe.lastIndex = tag.end;
      let cm;
      while ((cm = closeRe.exec(src)) !== null && mask[cm.index]) { /* a close inside a comment/string never pairs (Ox W3) */ }
      if (!cm) { report.errors.push(`no </${oldClose}> found for the open at offset ${start} — file NOT transformed`); return { out: src, count: 0 }; }
      closePos = cm.index; closeLen = cm[0].length;
      // nested SAME-tag paired open inside the span makes positional pairing ambiguous
      const span = src.slice(tag.end, closePos);
      const nestedRe = new RegExp(openRe.source, 'g'); let nm; let nested = false;
      while ((nm = nestedRe.exec(span)) !== null) { const nt = findTagEnd(span, nm.index); if (nt && !nt.selfClosing) { nested = true; break; } }
      if (nested) { report.skipped.push(`<${oldClose}> at offset ${start} nests another paired <${oldClose}> — manual migration`); openRe.lastIndex = tag.end; continue; }
    }
    const openText = src.slice(start, tag.end);
    const attrs = openText.slice(m[0].length, tag.end - start - (tag.selfClosing ? 2 : 1));
    count++;
    out += src.slice(cursor, start) + `<${newName}${mapAttrs(attrs)}${tag.selfClosing ? '/>' : '>'}`;
    cursor = tag.end;
    if (!tag.selfClosing) { out += src.slice(cursor, closePos) + `</${newName}>`; cursor = closePos + closeLen; }
    openRe.lastIndex = cursor;
  }
  return { out: out + src.slice(cursor), count };
}

/** Residual `GlowButton` identifiers outside comments (the post-transform invariant). */
export function residualGlowButton(src) {
  const mask = maskedRegions(src);
  const hits = [];
  for (const m of src.matchAll(/\bGlowButton\b/g)) if (!mask[m.index]) hits.push(m.index);
  return hits;
}

/** Pure transform — no I/O, no process side effects (importable by tests). */
export function transform(src, file, frontendSrc = resolve('frontend/src')) {
  const report = { imports: 0, tags: 0, styledBoxAs: 0, dropped: new Set(), unknown: new Set(), notes: [], skipped: [], errors: [], residual: [] };
  const audit = (attrs) => {
    if (/\{\s*\.\.\./.test(attrs)) report.notes.push('spread props {...x} — prop audit BYPASSED for this site; verify the object has no pulse/haptic/glowIntensity or unknown keys');
    for (const p of propNames(attrs)) { if (DROPPED.has(p)) report.dropped.add(p); else if (!KNOWN.has(p) && !/^(data-|aria-|on[A-Z]|\$)/.test(p)) report.unknown.add(p); }
  };
  // Import rewrite is mask-aware (GLM B1): an import statement inside a template literal or
  // comment is documentation/codegen text, never a real edge — skipped + reported.
  const importMask = maskedRegions(src);
  let out = src.replace(/import\s+GlowButton\s+from\s+(['"])([^'"]*)\1;?/g, (whole, _q, spec, offset) => {
    if (importMask[offset]) { report.skipped.push(`import GlowButton at offset ${offset} is inside a comment/template literal — not rewritten`); return whole; }
    if (!LEGACY_IMPORT.test(spec)) { report.notes.push(`import GlowButton from '${spec}' is NOT the legacy ui/buttons/GlowButton — left untouched (import-hijack guard)`); return whole; }
    report.imports++; return `import ForgeButton from '${bindingSpecifier(file, frontendSrc)}'; // Forge strangler (was GlowButton)`;
  });
  // StyledBox as={GlowButton} … → ForgeButton ($style → style)
  ({ out, count: report.styledBoxAs } = rewriteTags(out, /<StyledBox\s+as=\{GlowButton\}/g, 'StyledBox', 'ForgeButton', (attrs) => {
    // $style → style; and strip the legacy `minHeight: 44px` a11y-floor hack — the Forge
    // skin guarantees the floor, and as an INLINE min-height it would beat the skin's
    // 48px medium geometry (measured in PR #2: 48 → 44 regression). Digit-anchored so
    // `minHeight: 440` is untouched. Empty style objects are removed.
    const a = attrs.replace(/\$style=/g, 'style=')
      .replace(/minHeight:\s*(['"]?)44(?:px)?\1(?![\d.])\s*,?\s*/g, '')
      .replace(/,\s*\}\}/g, ' }}')
      .replace(/\s*style=\{\{\s*\}\}/g, '');
    if (/\$[a-zA-Z]+=/.test(a)) report.notes.push('StyledBox transient prop other than $style left in place — manual review');
    audit(a); return a;
  }, report));
  if (report.errors.length) return { out: src, report };
  // plain <GlowButton …>
  ({ out, count: report.tags } = rewriteTags(out, /<GlowButton(?=[\s/>])/g, 'GlowButton', 'ForgeButton', (attrs) => { audit(attrs); return attrs; }, report));
  if (report.errors.length) return { out: src, report };
  if (/\bStyledBox\b/.test(out) && !/<StyledBox\b/.test(out) && /import\s*\{[^}]*StyledBox[^}]*\}/.test(out)) report.notes.push('StyledBox import may now be unused — remove if so');
  report.residual = residualGlowButton(out);
  return { out, report };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const apply = args.includes('--apply');
  const files = (opt('--files', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const srcOpt = opt('--frontend-src');
  if (!files.length) { console.error('usage: codemod-glowbutton.mjs --files a.tsx,b.tsx [--apply --frontend-src frontend/src]'); process.exit(2); }
  if (apply && !srcOpt) { console.error('--apply requires an explicit --frontend-src (the emitted import specifier is relative to it; cwd is not trusted)'); process.exit(2); }
  const frontendSrc = resolve(srcOpt || 'frontend/src');
  let changed = 0; let failed = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const { out, report } = transform(src, f, frontendSrc);
    const diff = out !== src;
    const blocked = report.errors.length > 0 || report.residual.length > 0;
    const status = blocked ? (report.errors.length ? 'ERROR       ' : 'RESIDUAL    ') : diff ? (apply ? 'APPLIED     ' : 'WOULD-CHANGE') : 'NO-CHANGE   ';
    console.log(`${status} ${f}  imports=${report.imports} tags=${report.tags} styledBoxAs=${report.styledBoxAs}` +
      (report.dropped.size ? `  dropped-by-binding=[${[...report.dropped]}]` : '') +
      (report.unknown.size ? `  UNKNOWN-PROPS=[${[...report.unknown]}] ← human decision` : '') +
      (report.residual.length ? `  RESIDUAL GlowButton identifier(s) at offset(s) ${report.residual.join(',')} ← manual migration required; file NOT written` : '') +
      (report.errors.length ? `  ERRORS: ${report.errors.join('; ')}` : '') +
      (report.skipped.length ? `  SKIPPED: ${report.skipped.join('; ')}` : '') +
      (report.notes.length ? `  notes: ${report.notes.join('; ')}` : ''));
    if (blocked) { failed++; continue; }
    if (diff && apply) { writeFileSync(f, out); changed++; }
  }
  console.log(apply ? `\n${changed} file(s) rewritten${failed ? `, ${failed} BLOCKED` : ''}` : `\nDRY-RUN — nothing written (add --apply --frontend-src <dir>)${failed ? `; ${failed} file(s) would be BLOCKED` : ''}`);
  if (failed) process.exit(1);
}
