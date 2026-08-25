#!/usr/bin/env node
/**
 * @swan/forge — re-audit every `swan-guard-allow-hex` tag already in the tree against the FIXED
 * lexer.
 *
 * Why (Ox T2-R2 N1): the tags in the tree were placed by earlier versions of the tagger — first
 * by hand, then by a backtick-PARITY counter that a single backtick in a quoted string, or any
 * nested template, was enough to scramble. Rewriting the tagger fixes future tagging; it does
 * nothing about tags already placed. A `//` sitting inside a CSS template right now is silently
 * eaten by error-recovery along with the declaration after it, and a `//` after JSX children
 * renders as visible text. Neither shows up in a build.
 *
 * Reports every tag whose comment FORM disagrees with the form the fixed lexer would choose.
 * Read-only. Exit 1 if any mismatch is found.
 *
 * Usage (repo root): node packages/swan-forge/scripts/audit-hex-tags.mjs <dir> [<dir>...]
 */
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { lexStateAt } from './tag-legacy-hex.mjs';

const roots = process.argv.slice(2);
if (!roots.length) { console.error('usage: audit-hex-tags.mjs <dir> [<dir>...]'); process.exit(2); }

function* walk(dir, depth = 0) {
  if (depth > 12) return;
  let names = [];
  try { names = readdirSync(dir); } catch { return; }
  for (const name of names) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    try {
      const st = lstatSync(p);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) yield* walk(p, depth + 1);
      else if (/\.(tsx?|jsx?|mjs)$/.test(p)) yield p;
    } catch { /* unreadable entry */ }
  }
}

let checked = 0; let bad = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    if (!src.includes('swan-guard-allow-hex')) continue;
    const lines = src.split('\n');
    const offsets = []; let acc = 0;
    for (const l of lines) { offsets.push(acc); acc += l.length + 1; }
    lines.forEach((line, i) => {
      const at = line.indexOf('swan-guard-allow-hex');
      if (at < 0) return;
      checked++;
      // the form actually used, read backwards from the marker
      const before = line.slice(0, at);
      const used = /\{\/\*\s*$/.test(before) ? '{/* */}' : /\/\*\s*$/.test(before) ? '/* */' : /\/\/\s*$/.test(before) ? '//' : '(unrecognised)';
      const state = lexStateAt(src, offsets[i]);
      // Report DAMAGE, not merely "a different form than I would have picked". In plain code both
      // `//` and `/* */` are valid comments, and a marker sitting inside a pre-existing doc comment
      // is prose, not a tag. Only three combinations actually do harm:
      let damage = null;
      if (used === '(unrecognised)' || state === 'comment') {
        // marker is prose inside an existing comment — not a tag; nothing to verify
      } else if (state === 'template' && used === '//') {
        damage = 'a `//` inside a styled template is emitted into the CSS; error-recovery eats the next declaration';
      } else if (state === 'template' && used === '{/* */}') {
        damage = 'JSX comment form inside CSS — `{` and `}` are emitted into the stylesheet';
      } else if (state === 'normal' && /\.(t|j)sx$/.test(file) && /(<\/[A-Za-z][\w.]*>|\/>)/.test(line) && /[>}]\s*$/.test(line) && used !== '{/* */}') {
        damage = 'appended after JSX children, this is TEXT and renders in the UI';
      }
      if (damage) {
        bad++;
        console.log(`DAMAGE ${file}:${i + 1}\n  used ${used} in '${state}' context — ${damage}\n  ${line.trim().slice(0, 110)}`);
      }
    });
  }
}
console.log(`\n${checked} existing tag(s) audited against the fixed lexer · ${bad} mismatch(es)`);
process.exit(bad ? 1 : 0);
