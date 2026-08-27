// Deterministic GlowButton usage scan (Rule 73: code inventories, not the model).
// Usage: node scan-glowbutton-usage.mjs <file-list.txt>   (run from repo root)
import { readFileSync } from 'node:fs';
const files = readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean);
const props = {}; const patterns = { styledBoxAs: 0, asProp: 0, hrefProp: 0, jsxTags: 0, files: files.length };
const perFile = [];
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  const tags = [...s.matchAll(/<GlowButton\b([\s\S]*?)\/?>/g)];
  patterns.jsxTags += tags.length;
  const sb = (s.match(/as=\{GlowButton\}/g) || []).length; patterns.styledBoxAs += sb;
  const used = new Set();
  for (const t of tags) for (const m of t[1].matchAll(/\b([a-zA-Z$]+)=/g)) used.add(m[1]);
  for (const p of used) props[p] = (props[p] || 0) + 1;
  if (/<GlowButton[^>]*\bas=/.test(s)) patterns.asProp++;
  if (/<GlowButton[^>]*\bhref=/.test(s)) patterns.hrefProp++;
  perFile.push(`${f.replace('frontend/src/', '')}: tags=${tags.length} styledBoxAs=${sb} props=[${[...used].join(',')}]`);
}
console.log(perFile.join('\n'));
console.log('--- prop totals (files using) ---');
console.log(Object.entries(props).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' '));
console.log('--- patterns ---', JSON.stringify(patterns));
