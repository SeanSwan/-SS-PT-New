#!/usr/bin/env node
/**
 * forge-ab-sheet.mjs — a BLIND comparison page, so the one open decision can
 * actually be made.
 *
 * The kill-list ships OFF pending a ruling on six images. Handing someone six
 * loose files named `...-with-1.png` and `...-without-1.png` is not asking for a
 * judgement, it is asking them to confirm a label. So this shuffles them behind
 * neutral tags, writes the mapping to a separate file the reader does not open,
 * and decodes the answer afterwards.
 *
 * WHY BLIND MATTERS HERE SPECIFICALLY: the measured differences are nil —
 * identical acceptance rate, identical palette coverage, ~7% cost. If the labels
 * are visible the only signal left is expectation, and I have already spent this
 * workstream learning what happens when a measurement is contaminated by what
 * the measurer believed.
 *
 * Read-only over the artifact store; writes exactly two files. No generation,
 * no spend, no deletion.
 */

import { readdirSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, utimesSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { sheetSrc } from '../shared/contactSheet.mjs';
import { RUN_DIR } from '../shared/variantRun.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = flag('root', process.cwd());
const AB_DIR = join(RUN_DIR, 'ab-avoid');
const dir = join(ROOT, AB_DIR);

if (!existsSync(dir)) {
  console.error(`No A/B images at ${AB_DIR}. Run scripts/forge-ab-avoid.mjs first.`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
if (!files.length) { console.error(`No images in ${AB_DIR}.`); process.exit(1); }

/**
 * Deterministic shuffle from a fixed key.
 *
 * Deliberately NOT `Math.random`: the mapping has to be reproducible so the
 * answer can be decoded later even if the mapping file is lost, and so a rerun
 * does not silently renumber the options under a half-finished review.
 */
const order = files
  .map((f) => ({ f, k: createHash('sha256').update(`swan-ab-2026-08-13:${f}`).digest('hex') }))
  .sort((a, b) => a.k.localeCompare(b.k))
  .map((x) => x.f);

/**
 * COPY TO NEUTRAL NAMES. The blinding is otherwise a fiction: the source
 * filenames are `...-with-1.png` and `...-without-1.png`, and an `<img src>`
 * puts that string straight into the page. The first version of this script
 * shuffled the ORDER and leaked the ANSWER in the markup — a blind test whose
 * labels are visible in view-source is not a blind test.
 */
const BLIND_DIR = join(RUN_DIR, 'ab-blind');
rmSync(join(ROOT, BLIND_DIR), { recursive: true, force: true });
mkdirSync(join(ROOT, BLIND_DIR), { recursive: true });
const blindNames = order.map((f, i) => {
  const tag = String.fromCharCode(65 + i);
  const ext = f.slice(f.lastIndexOf('.'));
  const dest = join(ROOT, BLIND_DIR, `${tag}${ext}`);
  copyFileSync(join(dir, f), dest);
  // Uniform mtimes: copy order otherwise reconstructs the shuffle, which
  // reconstructs the arms. One fixed instant for all of them.
  utimesSync(dest, new Date(0), new Date(0));
  return `${tag}${ext}`;
});

/**
 * WHAT THIS BLINDING DOES AND DOES NOT COVER — stated, because a blind test
 * whose limits are unstated is just a blind test you trust too much.
 *
 * CLOSED: the markup carries no arm labels (the first version leaked them in
 * `<img src>` filenames), and mtimes are uniform so copy order reveals nothing.
 *
 * OPEN, and not worth closing: each image has a distinct BYTE SIZE, and the
 * source files still sit in `ab-avoid/` under their `-with-`/`-without-` names.
 * Anyone willing to compare file sizes between two directories can decode the
 * whole thing in a minute.
 *
 * That is acceptable HERE and the reason is specific: the reader is the person
 * who wants the honest answer, and the failure mode being guarded against is
 * unconscious expectation while looking at pictures — not an adversary. A
 * viewer who goes to the filesystem to decode it has stopped taking the test.
 * If this were ever used to settle a dispute between two parties, this blinding
 * would be insufficient and the images would need re-encoding to uniform size.
 */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sheetDir = resolve(ROOT, RUN_DIR.replace(/\\/g, '/'));
const cards = order.map((f, i) => {
  const tag = String.fromCharCode(65 + i);          // A, B, C...
  const src = sheetSrc(sheetDir, join(ROOT, BLIND_DIR, blindNames[i]));
  return `
    <figure class="card">
      <div class="frame"><img src="${src}" alt="option ${tag}"></div>
      <figcaption><span class="tag">${tag}</span></figcaption>
    </figure>`;
}).join('\n');

const html = `<meta charset="utf-8"><title>Blind A/B — does the constraint clause help?</title>
<style>
  :root{--bg:#0A0A0F;--card:#141419;--edge:#1A1A24;--text:#E0ECF4;--dim:#8b93a7;--cyan:#60C0F0}
  *{box-sizing:border-box}
  body{margin:0;padding:32px;background:var(--bg);color:var(--text);
       font:15px/1.6 'Plus Jakarta Sans',system-ui,-apple-system,sans-serif}
  h1{font-size:20px;margin:0 0 6px}
  .sub{color:var(--dim);font-size:13px;max-width:70ch;margin-bottom:26px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
  .card{margin:0;background:var(--card);border:1px solid var(--edge);border-radius:12px;overflow:hidden}
  .frame{aspect-ratio:16/9;background:#000}
  .frame img{width:100%;height:100%;object-fit:cover;display:block}
  figcaption{padding:10px 14px}
  .tag{font:15px/1 'Fira Code',ui-monospace,monospace;color:var(--cyan);
       display:inline-flex;align-items:center;justify-content:center;
       min-width:44px;min-height:44px}
  .ask{margin-top:30px;padding:16px 18px;background:var(--card);
       border:1px solid var(--edge);border-radius:10px;max-width:70ch}
  code{font:13px/1.7 'Fira Code',ui-monospace,monospace;color:var(--dim)}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
<h1>Blind A/B — does the constraint clause help?</h1>
<div class="sub">Same brief, same model, ${order.length} images. Half were generated with a
clause telling the model to avoid iridescent gradients, glassmorphism, fantasy wallpaper and
literal creature forms; half without. Which half is which is not shown, and the measured
differences are nil — same acceptance rate, same palette coverage, about 7% more cost with
the clause. If you cannot tell them apart, the clause is pure cost and I delete it.</div>
<div class="grid">${cards}</div>
<div class="ask">
  <strong>The question:</strong> are any of these clearly better or worse than the others?<br>
  Name the tags, or say "no difference".<br><br>
  <code>${esc(order.map((_, i) => String.fromCharCode(65 + i)).join('  '))}</code>
</div>`;

mkdirSync(sheetDir, { recursive: true });
const out = join(RUN_DIR, 'ab-blind.html');
writeFileSync(join(ROOT, out), html, 'utf8');

// The key lives in a SEPARATE file, so opening the sheet cannot reveal it.
const key = join(RUN_DIR, 'ab-blind-key.json');
writeFileSync(join(ROOT, key), `${JSON.stringify({
  note: 'Decoder for ab-blind.html. Do not open before answering.',
  mapping: Object.fromEntries(order.map((f, i) => [String.fromCharCode(65 + i),
    f.includes('-with-') ? 'WITH clause' : 'WITHOUT clause'])),
}, null, 2)}\n`, 'utf8');

console.log(`blind sheet: ${out}`);
console.log(`decoder:     ${key}   (separate file — do not open before answering)`);
console.log(`  ${order.length} images, tagged ${order.map((_, i) => String.fromCharCode(65 + i)).join(' ')}`);
