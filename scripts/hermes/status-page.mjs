#!/usr/bin/env node
/**
 * status-page.mjs — registered T0 `status-page`: slice-3 v0 of the command
 * center (7★ UX-10). ONE static HTML page rendered from the local stores —
 * REAL data, ZERO buttons, no broker path, nothing granted. Buttons arrive as
 * slice-3 v1 only after slice-2b's broker hardening; unplugging this page
 * changes nothing about governance (dashboard-command-center-spec.md doctrine).
 *
 * Panels: health (doctor's last receipt + live anchor level) · kill switches ·
 * open approval queue (tier badges) · today's receipts tail · briefing pointer.
 * Design: hermes-os spec §8 — Crystalline dark, tier badges T0 Ice Wing /
 * T1 Swan Lavender / T2 Gilded Fern / T3 Wing Purple / T4 #E5484D, 44px rows,
 * no JS, reduced-motion-safe (no motion at all). Writes
 * runs/digests/hermes-status.html + a receipt. Read-only by design; the only
 * writes are the page file, the receipt, and vault-id-on-first-run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { listEntries } from './queueModel.mjs';
import { anchorStatus } from './anchorLedger.mjs';
import {
  readSwitches, readReceipts, resolveSwitchesFile, resolveVaultRoot, vaultPaths, writeReceipt,
} from './hermesRunsLib.mjs';

const TIER_COLORS = { T0: '#60C0F0', T1: '#4070C0', T2: '#C6A84B', T3: '#8B5CF6', T4: '#E5484D' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const badge = (tier) => `<span class="badge" style="background:${TIER_COLORS[tier] || '#4070C0'}">${esc(tier)}</span>`;
const tierOf = (what) => (/\((T[0-4])\)/.exec(String(what)) || [])[1] || 'T0';

export function renderStatusPage(vaultRoot, switchesFile, isoDate, { now } = {}) {
  const when = now || new Date().toISOString();
  const sw = readSwitches(switchesFile);
  const receipts = readReceipts(vaultRoot, isoDate);
  const doctor = [...receipts].reverse().find((r) => r.what === 'hermes-doctor (T0)');
  let anchor;
  try { anchor = anchorStatus(vaultRoot, { today: isoDate }); }
  catch (err) { anchor = { level: 'fault', faults: [`anchor check crashed: ${String(err.message).slice(0, 80)}`], warns: [], notes: [] }; }
  let open = [];
  let queueErr = null;
  try { open = listEntries(vaultRoot, switchesFile, { filter: 'open', at: when }); }
  catch (err) { queueErr = String(err.message).slice(0, 80); }
  const briefing = path.join(vaultRoot, 'runs', 'digests', `briefing-${isoDate}.md`);
  const digest = vaultPaths(vaultRoot, isoDate).digestFile;

  const dot = (ok) => `<span class="dot ${ok === true ? 'ok' : ok === 'warn' ? 'warn' : 'bad'}"></span>`;
  const anchorDot = anchor.level === 'ok' ? true : anchor.level === 'warn' ? 'warn' : false;
  const rows = [];
  rows.push(`<section><h2>Health</h2>
    <p>${doctor ? `${dot(String(doctor.outcome).startsWith('ok'))} doctor: ${esc(doctor.outcome)}` : `${dot('warn')} no hermes-doctor receipt today — run it or check the daily task`}</p>
    <p>${dot(anchorDot)} anchor: ${esc(anchor.level.toUpperCase())}${anchor.faults.length ? ` — ${esc(anchor.faults.slice(0, 2).join(' | '))}` : ''}${anchor.warns?.length ? ` · ${esc(anchor.warns[0])}` : ''}</p>
    <p class="muted">${esc((anchor.notes || []).join(' · '))}</p></section>`);

  rows.push(`<section><h2>Kill switches</h2>${sw.ok
    ? `<table>${Object.entries(sw.state).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v === true ? '<b class="on">ON</b>' : '<b class="off">OFF</b>'}</td></tr>`).join('')}</table>`
    : `<p>${dot(false)} switches UNREADABLE (${esc(sw.reason)}) — everything fails closed</p>`}</section>`);

  rows.push(`<section><h2>Approval queue</h2>${queueErr
    ? `<p>${dot(false)} queue unreadable: ${esc(queueErr)}</p>`
    : open.length
      ? `<ul>${open.slice(0, 10).map((e) => `<li>${badge(e.tier || tierOf(e.action))} <code>${esc(e.id)}</code> ${esc(e.action)} → ${esc(e.target)} <span class="muted">expires ${esc(e.expiresAt || '?')}</span></li>`).join('')}</ul><p class="muted">Approve via Telegram phrase or queue.mjs — this page has NO buttons by design (v0).</p>`
      : '<p class="muted">empty — nothing awaits approval</p>'}</section>`);

  rows.push(`<section><h2>Today (${esc(isoDate)}) — last receipts</h2><ul>${receipts.slice(-8).reverse()
    .map((r) => `<li>${badge(tierOf(r.what))} <code>${esc(r.id)}</code> ${esc(r.what)} — ${esc(String(r.outcome).slice(0, 90))}</li>`).join('') || '<li class="muted">no receipts yet today</li>'}</ul></section>`);

  rows.push(`<section><h2>Artifacts</h2><p class="muted">briefing: ${fs.existsSync(briefing) ? esc(briefing) : 'not rendered yet'} · digest: ${fs.existsSync(digest) ? esc(digest) : 'not rendered yet'}</p></section>`);

  const html = `<!doctype html><meta charset="utf-8"><title>Hermes Command Center · v0</title>
<style>
  body{background:#0A0A0F;color:#E0ECF4;font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif;max-width:880px;margin:2rem auto;padding:0 1rem}
  h1{font-size:1.3rem;letter-spacing:.06em} h2{font-size:1rem;color:#60C0F0;margin:0 0 .5rem}
  section{background:#141419;border:1px solid #1A1A24;border-radius:12px;padding:1rem 1.25rem;margin:1rem 0}
  table{border-collapse:collapse}td{padding:.35rem .9rem .35rem 0;min-height:44px}
  ul{margin:.25rem 0;padding-left:1.1rem}li{margin:.35rem 0;min-height:24px}
  code{font-family:'Fira Code',monospace;color:#50A0F0;font-size:.85em}
  .badge{color:#0A0A0F;font-weight:700;font-size:.7em;padding:.15em .5em;border-radius:6px;margin-right:.4em}
  .dot{display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-right:.4em}
  .dot.ok{background:#60C0F0}.dot.warn{background:#C6A84B}.dot.bad{background:#E5484D}
  .on{color:#60C0F0}.off{color:#E5484D}.muted{color:#8b93a7;font-size:.85em}
</style>
<h1>HERMES COMMAND CENTER <span class="muted">v0 · read-only · LAN-local file · no buttons, no broker path</span></h1>
${rows.join('\n')}
<p class="muted">generated ${esc(when)} by status-page (T0) — regenerate: <code>node scripts/hermes/status-page.mjs</code> · this page grants nothing; unplugging it changes nothing.</p>`;

  const outPath = path.join(vaultRoot, 'runs', 'digests', 'hermes-status.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  writeReceipt(vaultRoot, {
    who: 'harness/status-page', what: 'status-page (T0)', target: `command-center v0 render ${isoDate}`, when,
    'approved-by': 'n/a', outcome: `ok — rendered (${open.length} open, anchor ${anchor.level})`, evidence: outPath,
  });
  return { path: outPath, open: open.length, anchor: anchor.level };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({ options: { date: { type: 'string' } } });
  const isoDate = values.date || new Date().toISOString().slice(0, 10);
  const out = renderStatusPage(resolveVaultRoot(), resolveSwitchesFile(), isoDate, {});
  console.log(out.path);
}
