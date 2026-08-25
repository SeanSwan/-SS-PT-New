#!/usr/bin/env node
/**
 * @swan/forge — tag PRE-EXISTING legacy hex literals that the G4 guard reports on files a
 * strangler merely touched.
 *
 * Why this exists (Rule 73 "twice = codify" — this is the third time): `frontend-guards.mjs`
 * scans WHOLE FILES, not changed lines, so migrating an import in a 200-line styled-components
 * file surfaces every raw hex the file already had. Those literals are real debt, but they are
 * not this slice's debt, and hand-tagging them is where the mistakes happen — the comment form
 * MUST match the lexical context or it does damage:
 *   `//` inside a styled template  -> emitted into the CSS; error-recovery eats the next rule
 *   `//` after JSX children        -> not a comment at all, it is TEXT, and it renders in the UI
 * Both of those are silent: the build passes either way. (The JSX one bit for real in T2.)
 *
 * So it REFUSES rather than guesses. A line is tagged only when its context is positively
 * classified by a real lexer (`lexStateAt`); everything else is handed back for a human. The
 * first version counted backticks, which one backtick inside a quoted string was enough to break.
 *
 * It NEVER changes a colour, only appends a comment. It skips lines already carrying the marker,
 * preserves CRLF, and reads the guard's own output rather than re-implementing the scan — so it
 * can only ever tag lines the guard actually flagged. Exits 1 if anything was refused.
 *
 * Usage (repo root):
 *   node scripts/hooks/frontend-guards.mjs | node packages/swan-forge/scripts/tag-legacy-hex.mjs --ticket SWA-206 --expires 2026-11-23 [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

/**
 * Lexical state at byte `idx`: 'template' | 'normal' | 'string' | 'comment'.
 *
 * The first version counted backticks and called it a day. A single backtick inside a quoted
 * string or a comment ("a ` b") flipped the parity for the entire rest of the file, so a `//`
 * could land INSIDE a CSS template — where it is not a comment, and CSS error-recovery eats the
 * following declaration. Counting is not lexing; this tracks real state.
 */
export function lexStateAt(src, idx) {
  let state = 'normal'; let quote = '';
  for (let i = 0; i < idx; i++) {
    const c = src[i]; const n = src[i + 1];
    if (state === 'normal') {
      if (c === '/' && n === '*') { state = 'block'; i++; continue; }
      if (c === '/' && n === '/') { state = 'line'; i++; continue; }
      if (c === '`') { state = 'template'; continue; }
      if (c === '"' || c === "'") { state = 'quote'; quote = c; continue; }
    } else if (state === 'block') { if (c === '*' && n === '/') { state = 'normal'; i++; } continue; }
    else if (state === 'line') { if (c === '\n') state = 'normal'; continue; }
    else if (state === 'quote') { if (c === '\\') { i++; continue; } if (c === quote || c === '\n') state = 'normal'; continue; }
    else if (state === 'template') { if (c === '\\') { i++; continue; } if (c === '`') state = 'normal'; continue; }
  }
  return state === 'block' || state === 'line' ? 'comment' : state === 'quote' ? 'string' : state;
}

/**
 * Pick the comment form for a flagged line, or null to REFUSE.
 * Refusing costs one human decision; guessing wrong ships visible junk text into the UI or
 * corrupts a stylesheet — so anything not positively classified is handed back, not tagged.
 */
export function commentFormFor(file, src, lineStart, line) {
  const state = lexStateAt(src, lineStart);
  if (state === 'template') return `/* ${'%R'} */`;                       // inside styled CSS
  if (state !== 'normal') return null;                                     // inside a string/comment — refuse
  const isJsxFile = /\.(t|j)sx$/.test(file);
  const closesJsx = /(<\/[A-Za-z][\w.]*>|\/>)/.test(line) && /[>}]\s*$/.test(line);
  if (isJsxFile && closesJsx) return `{/* ${'%R'} */}`;                    // JSX children position
  // Plain JS statement: no angle brackets on the line at all, and it ends a statement.
  if (!/[<>]/.test(line) && /[;,{]\s*$/.test(line)) return `// ${'%R'}`;
  return null;                                                             // ambiguous → refuse
}

if (isMain) {
const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const apply = args.includes('--apply');
const ticket = opt('--ticket');
const expires = opt('--expires');
if (!ticket || !expires) { console.error('usage: … | tag-legacy-hex.mjs --ticket <ID> --expires <YYYY-MM-DD> [--apply]'); process.exit(2); }
const REASON = `swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket ${ticket}; expires ${expires})`;
const input = readFileSync(0, 'utf8');
const hits = new Map(); // file -> Set(lineNo)
for (const line of input.split('\n')) {
  const m = line.match(/^FAIL: G4 hardcoded-hex \(Rule 6\) — (.+?):(\d+) —/);
  if (m) { const f = m[1].replace(/\\/g, '/'); if (!hits.has(f)) hits.set(f, new Set()); hits.get(f).add(+m[2]); }
}
if (!hits.size) { console.error('no G4 FAIL lines on stdin — nothing to tag'); process.exit(0); }

let tagged = 0; let skipped = 0; let refused = 0;
for (const [file, lineNos] of hits) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const offsets = []; let acc = 0;
  for (const l of lines) { offsets.push(acc); acc += l.length + 1; }
  for (const n of [...lineNos].sort((a, b) => a - b)) {
    const i = n - 1;
    if (lines[i] === undefined) { console.error(`  ! ${file}:${n} out of range — skipped`); skipped++; continue; }
    if (lines[i].includes('swan-guard-allow-hex')) { skipped++; continue; }
    const template = commentFormFor(file, src, offsets[i], lines[i]);
    if (!template) { console.error(`  ? ${file}:${n} — context not positively classified; REFUSED (tag it by hand)`); refused++; continue; }
    const form = template.replace('%R', REASON);
    const hadCr = lines[i].endsWith('\r');
    lines[i] = lines[i].replace(/\r$/, '') + ' ' + form + (hadCr ? '\r' : ''); // preserve CRLF
    tagged++;
  }
  if (apply) writeFileSync(file, lines.join('\n'));
  console.error(`${apply ? 'TAGGED ' : 'WOULD  '} ${file} — ${[...lineNos].sort((a, b) => a - b).join(',')}`);
}
console.error(`\n${tagged} line(s) ${apply ? 'tagged' : 'would be tagged'}, ${skipped} already tagged, ${refused} REFUSED as ambiguous (tag those by hand)${apply ? '' : ' — add --apply'}`);
if (refused) process.exit(1);
}
