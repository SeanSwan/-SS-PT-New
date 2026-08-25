#!/usr/bin/env node
/**
 * @swan/forge — GlowButton → ForgeButton strangler codemod (Rule 73: the mechanical
 * part of a strangler PR is code, not a model retyping JSX).
 *
 * Handles (deterministically, brace-aware — a `>` inside `onClick={() => …}` is NOT
 * the end of the tag; the first regex version was, and it broke a build):
 *   import GlowButton from '<any path>/GlowButton'      → import ForgeButton from '<rel>/components/ui/forge/ForgeButton'
 *   <GlowButton …>…</GlowButton>  /  <GlowButton … />   → <ForgeButton …>
 *   <StyledBox as={GlowButton} … $style={{…}}>…</StyledBox> → <ForgeButton … style={{…}}>…</ForgeButton>
 *   (only the </StyledBox> that pairs with a CONVERTED open is rewritten — StyledBox is used for
 *    other elements in the same files; the pairing is the next </StyledBox> after the open,
 *    which holds because a button never nests another StyledBox)
 * Reports (never silently rewrites): props the Forge binding drops (animateOnRender, pulse,
 *   haptic, glowIntensity — accepted-and-dropped) and any unknown prop for a human decision.
 *
 * Usage:  node scripts/codemod-glowbutton.mjs --files a.tsx,b.tsx [--apply] [--frontend-src <dir>]
 *         (default is DRY-RUN: prints a summary per file, writes nothing)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, dirname, resolve, join } from 'node:path';

const KNOWN = new Set(['text', 'variant', 'theme', 'colorScheme', 'size', 'type', 'isLoading', 'disabled', 'fullWidth', 'leftIcon', 'rightIcon', 'startIcon', 'endIcon', 'children', 'className', 'style', 'onClick', 'title', 'id', 'aria-label', 'aria-describedby', 'data-testid', 'form', 'name', 'value', 'tabIndex', 'role', 'key', 'animateOnRender']);
// animateOnRender is SUPPORTED by the Forge binding (.sw-btn--enter) since PR #2 — 3 reachable users met rule-of-two.
const DROPPED = new Set(['pulse', 'haptic', 'glowIntensity']);

/** Relative import specifier from a consumer file to the ForgeButton binding. */
function bindingSpecifier(file, frontendSrc) {
  const target = join(frontendSrc, 'components/ui/forge/ForgeButton');
  let rel = relative(dirname(resolve(file)), target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/**
 * Find the end of a JSX opening tag starting at `start` (index of '<'), tracking
 * `{}` depth and string quotes so `>` inside expressions never terminates the tag.
 * @returns {{end: number, selfClosing: boolean}|null} end = index just past '>' / '/>'
 */
export function findTagEnd(src, start) {
  let depth = 0; let quote = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === quote && src[i - 1] !== '\\') quote = null; continue; }
    if (depth === 0 && (c === '"' || c === "'")) { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth === 0 && c === '`') { quote = '`'; }
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
 * NEXT `</oldClose>` after the open. Returns the new source and the count.
 */
function rewriteTags(src, openRe, oldClose, newName, mapAttrs) {
  let out = ''; let cursor = 0; let count = 0; let m;
  openRe.lastIndex = 0;
  while ((m = openRe.exec(src)) !== null) {
    const start = m.index;
    const tag = findTagEnd(src, start);
    if (!tag) break;
    const openText = src.slice(start, tag.end);
    const attrs = openText.slice(m[0].length, tag.end - start - (tag.selfClosing ? 2 : 1));
    count++;
    out += src.slice(cursor, start) + `<${newName}${mapAttrs(attrs)}${tag.selfClosing ? '/>' : '>'}`;
    cursor = tag.end;
    if (!tag.selfClosing) {
      const closePos = src.indexOf(`</${oldClose}>`, cursor);
      if (closePos >= 0) { out += src.slice(cursor, closePos) + `</${newName}>`; cursor = closePos + oldClose.length + 3; }
    }
    openRe.lastIndex = cursor;
  }
  return { out: out + src.slice(cursor), count };
}

/** Pure transform — no I/O, no process side effects (importable by tests). */
export function transform(src, file, frontendSrc = resolve('frontend/src')) {
  const report = { imports: 0, tags: 0, styledBoxAs: 0, dropped: new Set(), unknown: new Set(), notes: [] };
  const audit = (attrs) => { for (const p of propNames(attrs)) { if (DROPPED.has(p)) report.dropped.add(p); else if (!KNOWN.has(p) && !/^(data-|aria-|on[A-Z]|\$)/.test(p)) report.unknown.add(p); } };
  let out = src.replace(/import\s+GlowButton\s+from\s+['"][^'"]*GlowButton['"];?/g, () => { report.imports++; return `import ForgeButton from '${bindingSpecifier(file, frontendSrc)}'; // Forge strangler (was GlowButton)`; });
  // StyledBox as={GlowButton} … → ForgeButton ($style → style)
  ({ out, count: report.styledBoxAs } = rewriteTags(out, /<StyledBox\s+as=\{GlowButton\}/g, 'StyledBox', 'ForgeButton', (attrs) => {
    // $style → style; and strip the legacy `minHeight: 44px` a11y-floor hack — the Forge
    // skin guarantees the floor, and as an INLINE min-height it would beat the skin's
    // 48px medium geometry (measured in PR #2: 48 → 44 regression). Empty style objects are removed.
    const a = attrs.replace(/\$style=/g, 'style=')
      .replace(/minHeight:\s*['"]?44(?:px)?['"]?\s*,?\s*/g, '')
      .replace(/,\s*\}\}/g, ' }}')
      .replace(/\s*style=\{\{\s*\}\}/g, '');
    if (/\$[a-zA-Z]+=/.test(a)) report.notes.push('StyledBox transient prop other than $style left in place — manual review');
    audit(a); return a;
  }));
  // plain <GlowButton …>
  ({ out, count: report.tags } = rewriteTags(out, /<GlowButton(?=[\s/>])/g, 'GlowButton', 'ForgeButton', (attrs) => { audit(attrs); return attrs; }));
  if (/\bStyledBox\b/.test(out) && !/<StyledBox\b/.test(out) && /import\s*\{[^}]*StyledBox[^}]*\}/.test(out)) report.notes.push('StyledBox import may now be unused — remove if so');
  return { out, report };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const apply = args.includes('--apply');
  const files = (opt('--files', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const frontendSrc = resolve(opt('--frontend-src', 'frontend/src'));
  if (!files.length) { console.error('usage: codemod-glowbutton.mjs --files a.tsx,b.tsx [--apply] [--frontend-src frontend/src]'); process.exit(2); }
  let changed = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const { out, report } = transform(src, f, frontendSrc);
    const diff = out !== src;
    console.log(`${diff ? (apply ? 'APPLIED ' : 'WOULD-CHANGE') : 'NO-CHANGE   '} ${f}  imports=${report.imports} tags=${report.tags} styledBoxAs=${report.styledBoxAs}` +
      (report.dropped.size ? `  dropped-by-binding=[${[...report.dropped]}]` : '') +
      (report.unknown.size ? `  UNKNOWN-PROPS=[${[...report.unknown]}] ← human decision` : '') +
      (report.notes.length ? `  notes: ${report.notes.join('; ')}` : ''));
    if (diff && apply) { writeFileSync(f, out); changed++; }
  }
  console.log(apply ? `\n${changed} file(s) rewritten` : `\nDRY-RUN — nothing written (add --apply)`);
}
