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
import { join } from 'node:path';

/** The three questions. Deliberately few — a long rubric gets abandoned. */
export const RUBRIC = Object.freeze([
  { key: 'usable', q: 'Could you ship this as-is?', options: ['yes', 'with edits', 'no'] },
  { key: 'onBrand', q: 'Does it look like Swan, or like stock AI art?', options: ['swan', 'neutral', 'stock'] },
  { key: 'note', q: 'One sentence: what would you change?', options: null },
]);

function dataUri(root, ref) {
  if (!ref) return null;
  const p = join(root, ref);
  if (!existsSync(p)) return null;
  const ext = ref.split('.').pop().toLowerCase();
  const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[ext] || 'application/octet-stream';
  return `data:${mime};base64,${readFileSync(p).toString('base64')}`;
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
  const cards = ok.map((r, i) => {
    const src = dataUri(root, r.imageRef);
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
<div class="prompt">${esc(ok[0]?.promptText || '')}</div>
<h1>Rubric</h1>
<div class="sub">Answers append to the run ledger, so "what actually gets picked" becomes queryable.</div>
<ol>${questions}</ol>`;
}
