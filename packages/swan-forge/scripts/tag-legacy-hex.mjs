#!/usr/bin/env node
/**
 * @swan/forge — tag PRE-EXISTING legacy hex literals that the G4 guard reports on files a
 * strangler merely touched.
 *
 * Why this exists (Rule 73 "twice = codify" — this is the third time): `frontend-guards.mjs`
 * scans WHOLE FILES, not changed lines, so migrating an import in a 200-line styled-components
 * file surfaces every raw hex the file already had. Those literals are real debt, but they are
 * not this slice's debt, and hand-tagging them is where the mistakes happen: a `//` comment
 * inside a styled template literal is emitted into the CSS, so the comment form must match the
 * context. This picks the form deterministically by counting unescaped backticks.
 *
 * It NEVER changes a colour, only appends a comment. It refuses to tag a line that already
 * carries the marker, and it reads the guard's own output rather than re-implementing the scan —
 * so it can only ever tag lines the guard actually flagged.
 *
 * Usage (repo root):
 *   node scripts/hooks/frontend-guards.mjs | node packages/swan-forge/scripts/tag-legacy-hex.mjs --ticket SWA-206 --expires 2026-11-23 [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const apply = args.includes('--apply');
const ticket = opt('--ticket');
const expires = opt('--expires');
if (!ticket || !expires) { console.error('usage: … | tag-legacy-hex.mjs --ticket <ID> --expires <YYYY-MM-DD> [--apply]'); process.exit(2); }

const REASON = `swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket ${ticket}; expires ${expires})`;

/** Is byte `idx` inside a template literal? Counts unescaped backticks before it. */
function inTemplate(src, idx) {
  let n = 0;
  for (let i = 0; i < idx; i++) { if (src[i] === '\\') { i++; continue; } if (src[i] === '`') n++; }
  return n % 2 === 1;
}

const input = readFileSync(0, 'utf8');
const hits = new Map(); // file -> Set(lineNo)
for (const line of input.split('\n')) {
  const m = line.match(/^FAIL: G4 hardcoded-hex \(Rule 6\) — (.+?):(\d+) —/);
  if (m) { const f = m[1].replace(/\\/g, '/'); if (!hits.has(f)) hits.set(f, new Set()); hits.get(f).add(+m[2]); }
}
if (!hits.size) { console.error('no G4 FAIL lines on stdin — nothing to tag'); process.exit(0); }

let tagged = 0; let skipped = 0;
for (const [file, lineNos] of hits) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const offsets = []; let acc = 0;
  for (const l of lines) { offsets.push(acc); acc += l.length + 1; }
  for (const n of [...lineNos].sort((a, b) => a - b)) {
    const i = n - 1;
    if (lines[i] === undefined) { console.error(`  ! ${file}:${n} out of range — skipped`); skipped++; continue; }
    if (lines[i].includes('swan-guard-allow-hex')) { skipped++; continue; }
    // THREE contexts, not two (caught live: a `//` appended after JSX children is not a comment —
    // it is TEXT, and it renders in the UI. The build passes and the junk ships silently):
    //   inside a styled template  -> /* … */   (a // would be emitted into the CSS)
    //   JSX children              -> {/* … */}
    //   plain JS/TS               -> // …
    const isJsx = /\.(t|j)sx$/.test(file) && /(<\/[A-Za-z][\w.]*>|\/>)\s*\}?\s*$/.test(lines[i]);
    const form = inTemplate(src, offsets[i]) ? `/* ${REASON} */` : isJsx ? `{/* ${REASON} */}` : `// ${REASON}`;
    lines[i] = lines[i].replace(/\r$/, '') + ' ' + form;
    tagged++;
  }
  if (apply) writeFileSync(file, lines.join('\n'));
  console.error(`${apply ? 'TAGGED ' : 'WOULD  '} ${file} — ${[...lineNos].sort((a, b) => a - b).join(',')}`);
}
console.error(`\n${tagged} line(s) ${apply ? 'tagged' : 'would be tagged'}, ${skipped} already tagged/skipped${apply ? '' : ' — add --apply'}`);
