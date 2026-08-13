/**
 * contactSheet.mjs — put a run's options in front of a human, and record what
 * they say about it.
 *
 * WHY THIS AND NOT AN AESTHETIC SCORER. Kimi's ruling was explicit: do not build
 * automated aesthetic scoring. It would mean writing thresholds by eye about
 * TASTE, and every eyeballed threshold in this subsystem has been refuted by the
 * first real measurement. The fix for "every quality claim routes through Sean's
 * eyes" is not to replace his eyes — it is to RECORD them.
 *
 * After ~10 reviews the ledger can answer the question no metric here can:
 * does the law filter actually correlate with what gets picked? That is the real
 * scoring dataset, and it can only be collected one honest human answer at a time.
 *
 * The sheet is a single self-contained HTML file — images inlined as data URIs
 * so it opens from disk with no server and nothing to fetch.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, relative, sep, resolve, dirname } from 'node:path';
import { RUN_DIR } from './variantRun.mjs';

/** The run dir as it appears inside an imageRef (always POSIX separators). */
const RUN_DIR_POSIX = RUN_DIR.replace(/\\/g, '/');

/** The three questions. Deliberately few — a long rubric gets abandoned. */
export const RUBRIC = Object.freeze([
  { key: 'usable', q: 'Could you ship this as-is?', options: ['yes', 'with edits', 'no'] },
  { key: 'onBrand', q: 'Does it look like Swan, or like stock AI art?', options: ['swan', 'neutral', 'stock'] },
  { key: 'note', q: 'One sentence: what would you change?', options: null },
]);

/**
 * The path from the sheet to an image. ONE code path, always relative.
 *
 * There used to be two — inline base64 under a size budget, link above it — and
 * the link branch SHIPPED BROKEN precisely because the inline branch was the one
 * ever exercised. It hardcoded `images/<basename>`, correct for
 * `forge-runs/images/` and silently wrong for every sibling directory, so an A/B
 * image in `forge-runs/ab-avoid/` pointed at a file that did not exist.
 *
 * Collapsing to one path deletes that entire bug class, the size threshold, and
 * the ~33% base64 inflation with it. The sheet is written beside its images and
 * opened from disk, so a relative link is all it ever needed. Computed with
 * `relative()` rather than string surgery, and URI-encoded because a filename is
 * not automatically a valid URL component.
 */
export function sheetSrc(sheetDir, imageAbsPath) {
  const rel = relative(sheetDir, imageAbsPath).split(sep).join('/');
  return encodeURI(rel.startsWith('.') ? rel : `./${rel}`);
}

function imageSrc(root, ref, sheetDir, emitted) {
  if (!ref) return { src: null };
  const p = join(root, ref);
  if (!existsSync(p)) return { src: null };
  const src = sheetSrc(sheetDir, p);
  emitted.push({ src, abs: p });
  return { src };
}

/**
 * Escape for HTML. Prompt text is the one place arbitrary user input reaches
 * this document, and it may contain angle brackets by design (a brief can
 * legitimately say "<no text>").
 *
 * The single quote is escaped even though nothing here uses single-quoted
 * attributes — safe TODAY only because of that, which is exactly the kind of
 * conditional safety that breaks the first time someone adds one.
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Build the sheet. Returns HTML; the caller writes it.
 *
 * Dark-first and token-shaped on purpose: this is the first Forge surface a
 * human looks at, and it should not be the one place Swan doctrine is ignored.
 * Kept to plain CSS with explicit fallbacks — it is a local file, not an app
 * surface, so it must render with no build step and no theme provider.
 */
export function buildContactSheet(rows, root = process.cwd(), meta = {}) {
  const ok = rows.filter((r) => r.status === 'ok');
  // Where the sheet will be written. Every src is relative to THIS.
  const sheetDir = meta.sheetDir ? resolve(meta.sheetDir) : resolve(root, RUN_DIR_POSIX);
  const emitted = [];
  const cards = ok.map((r, i) => {
    const { src } = imageSrc(root, r.imageRef, sheetDir, emitted);
    return `
    <figure class="card${r.winner ? ' winner' : ''}">
      <div class="frame">${src
    ? `<img src="${src}" alt="option ${i + 1}">`
    : '<div class="missing">image not on disk</div>'}</div>
      <figcaption>
        <div class="id">${esc(r.variantId.slice(0, 10))}${r.winner ? ' <span class="star">★ picked</span>' : ''}</div>
        <div class="meta">${esc(r.intent || '—')} · ${r.actualWidth || '?'}×${r.actualHeight || '?'}
          · $${typeof r.costUsd === 'number' ? r.costUsd.toFixed(5) : '?'}
          · ${r.wallMs ? `${(r.wallMs / 1000).toFixed(1)}s` : '?'}</div>
      </figcaption>
    </figure>`;
  }).join('\n');

  const questions = RUBRIC.map((q) => `
    <li><strong>${esc(q.q)}</strong>
      ${q.options ? `<span class="opts">${q.options.map(esc).join(' &nbsp;/&nbsp; ')}</span>`
    : '<span class="opts">(free text)</span>'}
      <div class="answer">forge review-answer &lt;variantId&gt; --${esc(q.key)} &lt;value&gt;</div>
    </li>`).join('\n');

  /**
   * VERIFY EFFECT, NOT INTENT — the check that would have caught the shipped bug.
   *
   * The old sheet reported "N image(s) linked", counting `src` strings WRITTEN.
   * Every one of those links for `ab-avoid/` was broken and it still reported
   * success. A count of attempts is not a count of outcomes, and this subsystem
   * has now produced that exact lie three times (pruner marks, sheet links,
   * retention size). So: resolve every emitted link back to disk before the
   * caller is handed anything.
   */
  const broken = emitted.filter((e) => !existsSync(resolve(sheetDir, decodeURI(e.src))));
  if (broken.length) {
    const err = new Error(`E_SHEET_LINK_BROKEN: ${broken.length} link(s) do not resolve `
      + `from ${sheetDir}: ${broken.map((b) => b.src).join(', ').slice(0, 200)}`);
    err.code = 'E_SHEET_LINK_BROKEN';
    throw err;
  }

  return `<meta charset="utf-8"><title>Forge review — ${esc(meta.runId || '')}</title>
<style>
  :root{--bg:#0A0A0F;--card:#141419;--edge:#1A1A24;--text:#E0ECF4;--dim:#8b93a7;--gold:#C6A84B;--cyan:#60C0F0}
  *{box-sizing:border-box}
  body{margin:0;padding:32px;background:var(--bg);color:var(--text);
       font:15px/1.5 'Plus Jakarta Sans',system-ui,-apple-system,sans-serif}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:var(--dim);margin-bottom:28px;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}
  .card{margin:0;background:var(--card);border:1px solid var(--edge);border-radius:12px;overflow:hidden}
  .card.winner{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
  .frame{aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center}
  .frame img{width:100%;height:100%;object-fit:cover;display:block}
  .missing{color:var(--dim);font-size:13px}
  figcaption{padding:12px 14px}
  .id{font:13px/1.4 'Fira Code',ui-monospace,monospace;color:var(--cyan)}
  .star{color:var(--gold)}
  .meta{color:var(--dim);font-size:12px;margin-top:4px}
  .prompt{margin:28px 0;padding:14px 16px;background:var(--card);border:1px solid var(--edge);
          border-radius:10px;color:var(--dim);font:13px/1.6 'Fira Code',ui-monospace,monospace;
          white-space:pre-wrap;overflow-x:auto}
  ol{padding-left:20px} li{margin-bottom:14px}
  .opts{color:var(--cyan);margin-left:8px}
  .answer{font:12px/1.6 'Fira Code',ui-monospace,monospace;color:var(--dim);margin-top:4px}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
<h1>Forge review — ${esc(meta.runId || 'run')}</h1>
<div class="sub">${ok.length} option(s) · $${ok.reduce((s, r) => s + (r.costUsd || 0), 0).toFixed(4)} total
  · brief <code>${esc(meta.briefId || rows[0]?.briefId || '')}</code></div>
<div class="grid">${cards}</div>
<div class="sub">${emitted.length} image(s) linked from beside this file.</div>
<div class="prompt">${esc(ok[0]?.promptText || '')}</div>
<h1>Rubric</h1>
<div class="sub">Answers append to the run ledger, so "what actually gets picked" becomes queryable.</div>
<ol>${questions}</ol>`;
}
