#!/usr/bin/env node
/**
 * Graphical Hermes command center. Renders a deterministic HTML/SVG view of
 * applications, routines, memory, skills, receipts, switches, queue, and anchor.
 * The inlined client code only zooms, pans, focuses, and switches responsive
 * views; it has no network, broker, approval, or command path. Motion disables
 * under reduced-motion. Registered T0 brain-view writes the page and a receipt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { listEntries } from './queueModel.mjs';
import { anchorStatus } from './anchorLedger.mjs';
import { readSchedule, readState } from './runnerLib.mjs';
import { renderBrainHtml } from './brainViewTemplate.mjs';
import { computeDigestData } from './receipt-digest.mjs';
import { buildHealthHistory } from './brainDensity.mjs';
import {
  readSwitches, readReceipts, resolveSwitchesFile, resolveVaultRoot, writeReceipt,
} from './hermesRunsLib.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const REPO = path.resolve(HERE, '..', '..');
const countDir = (p, filter = () => true) => {
  try { return fs.readdirSync(p).filter(filter).length; } catch { return null; }
};

export function gatherBrainData(vaultRoot, switchesFile, isoDate, { now } = {}) {
  const when = now || new Date().toISOString();
  const today = when.slice(0, 10);
  const ageMs = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${isoDate}T00:00:00Z`);
  const dataDateOffsetDays = Number.isFinite(ageMs) ? Math.trunc(ageMs / 86400000) : 0;
  const dataAgeDays = Math.max(0, dataDateOffsetDays);
  const map = JSON.parse(fs.readFileSync(path.join(HERE, 'brain-map.json'), 'utf8'));
  const sw = readSwitches(switchesFile);
  const digest = computeDigestData(vaultRoot, isoDate);
  const receipts = digest.receipts;
  let anchor;
  try { anchor = anchorStatus(vaultRoot, { today: isoDate }); } catch { anchor = { level: 'fault', faults: ['anchor check crashed'], notes: [] }; }
  let open = [];
  try { open = listEntries(vaultRoot, switchesFile, { filter: 'open', at: when }); } catch { open = []; }

  const sched = readSchedule(vaultRoot);
  const rstate = readStateSafe(vaultRoot);
  const routines = (sched.entries || []).map((e) => ({
    label: e.command, cadence: e.cadence, activity: receipts.filter((x) => String(x.what).startsWith(`${e.command} (`)).length,
    state: !e.enabled ? 'dark' : rstate.demoted[e.command] ? 'fault' : rstate.handled[e.command] === isoDate ? 'live' : 'idle',
  }));

  const liveCounts = {
    inbox: countDir(path.join(REPO, '.ai-workflow', 'hermes-inbox', 'pending'), (n) => n.endsWith('.md')),
    packets: countDir(path.join(REPO, 'docs', 'ai-workflow', 'hermes-learning-packets'), (n) => n.endsWith('.md')),
    brainstorms: countDir(path.join(REPO, 'docs', 'ai-workflow', 'brainstorms'), (n) => n.endsWith('.md')),
  };
  const mentions = (label) => receipts.filter((r) => [r.what,r.target].some((v) => String(v || '').toLowerCase().includes(String(label).toLowerCase()))).length;
  const applications = map.applications.map((a) => ({ ...a, activity: mentions(a.label) }));
  const memory = map.memory.map((m) => ({ ...m, count: m.live ? liveCounts[m.live] : null, activity: mentions(m.label) }));
  const skills = (() => {
    try { return fs.readdirSync(path.join(REPO, '.claude', 'skills')).filter((n) => !n.startsWith('.')); } catch { return []; }
  })();
  const skillStats = skills.map((name) => ({ name, count: receipts.filter((r) =>
    [r.what, r.target].some((v) => String(v || '').toLowerCase().includes(name.toLowerCase()))).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const topSkills = skillStats.slice(0, 12);
  const skillNodes = [...topSkills, ...(skillStats.length > 12 ? [{ name: `+${skillStats.length - 12} more`, count: skillStats.slice(12).reduce((n, x) => n + x.count, 0), aggregate: true }] : [])];

  const switches = sw.ok ? Object.entries(sw.state).map(([name, v]) => ({ name, on: v === true })) : null;
  const doctor = [...receipts].reverse().find((r) => r.what === 'hermes-doctor (T0)');
  const thoughtRows = receipts.map((r) => ({
    id: r.id, what: r.what, outcome: String(r.outcome), actor: r.who || 'unknown',
    time: Number.isFinite(Date.parse(r.when)) ? new Date(r.when).toISOString().slice(11, 16) : '--:--',
    tier: /\((T[0-4])\)/.exec(String(r.what))?.[1] || 'T0',
    mood: /^ok/.test(String(r.outcome)) ? 'ok' : /^refused|^failed/.test(String(r.outcome)) ? 'refused' : 'warn',
    attention: /^(refused|failed|partial)/.test(String(r.outcome)),
  }));
  const thoughts = thoughtRows.sort((a, b) => Number(b.attention) - Number(a.attention) || b.time.localeCompare(a.time)).slice(0, 10);

  // Hour-by-hour thinking sparkline (UTC hour of each receipt's `when`).
  const hourly = Array.from({ length: 24 }, () => 0);
  const hourlyTier2 = Array.from({ length: 24 }, () => 0);
  for (const r of receipts) {
    const h = new Date(r.when).getUTCHours();
    if (Number.isFinite(h)) { hourly[h] += 1; if (/\(T[2-4]\)/.test(String(r.what))) hourlyTier2[h] += 1; }
  }
  const yesterdayDate = new Date(Date.parse(`${isoDate}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const yesterdayReceipts = readReceipts(vaultRoot, yesterdayDate);
  const healthHistory = buildHealthHistory(vaultRoot, isoDate);
  const tileDeltas = { receipts: receipts.length - yesterdayReceipts.length, skills: null, memories: null, routines: null, approvals: null, anchor: null };
  const knownMemoryCounts = memory.filter((m) => m.count != null).map((m) => m.count);
  const memoriesTotal = knownMemoryCounts.length ? knownMemoryCounts.reduce((n, count) => n + count, 0) : null;

  // Aurora: one color readable from across the room.
  const anyFault = anchor.level === 'fault' || switches === null || (doctor && !String(doctor.outcome).startsWith('ok'));
  const anyWarn = anchor.level === 'warn' || !doctor || open.length > 0 || dataDateOffsetDays < 0 || routines.some((r) => r.state === 'fault');
  const health = anyFault ? 'red' : (anyWarn || dataAgeDays >= 1) ? 'amber' : 'green';

  // The brain's own next-best-action — the product's north-star pattern applied
  // to the operator. v2 fix: collect ALL true conditions into a RANKED rail (the
  // v1 code short-circuited to the first match and threw away real signal). The
  // loudest (nbaRail[0]) is the hero line; the rest render under it.
  const nbaRail = [];
  if (switches === null) nbaRail.push('switches file unreadable — everything is failing closed; restore it first');
  if (anchor.level === 'fault') nbaRail.push(`anchor FAULT — read the doctor receipt: ${(anchor.faults[0] || '').slice(0, 80)}`);
  if (open.length) nbaRail.push(`${open.length} approval(s) waiting — resolve via Telegram phrase or queue.mjs`);
  if (routines.some((r) => r.state === 'fault')) nbaRail.push('a routine is auto-demoted — re-enable it in runner-state.json after fixing the cause');
  if ((liveCounts.inbox || 0) > 0) nbaRail.push(`${liveCounts.inbox} Hermes-inbox memo(s) pending — run the doc-170 §E pass to wire Hermes's drain`);
  if (!doctor) nbaRail.push('no doctor run yet today — double-click the Command Center or wait for the 06:00 chain');
  if (anchor.level === 'warn') nbaRail.push('anchor degraded — set HERMES_ANCHOR_KEY / stand up the R2 witness (E4C runbook)');
  if (!nbaRail.length) nbaRail.push('all quiet, all green — nothing needs you');
  const nba = nbaRail[0];

  return {
    when, isoDate, today, dataAgeDays, dataDateOffsetDays, brain: map.brain, applications, routines, memory, skills, skillStats, skillNodes,
    switches, switchExplanations: map.switchExplain || {}, anchorLevel: anchor.level, anchorNote: (anchor.faults[0] || anchor.notes?.[0] || ''),
    queueOpen: open.length, doctorOk: doctor ? String(doctor.outcome).startsWith('ok') : null,
    receiptCount: receipts.length, thoughts, moreThoughts: Math.max(0, thoughtRows.length - 10), hourly, hourlyTier2, memoriesTotal, health, nba, nbaRail,
    digest, queueEntries: open, healthHistory, tileDeltas, silentDay: receipts.length === 0,
    productHealth: (() => { const row=[...receipts].reverse().find((x)=>x.what==='health-sweep (T0)'); return row ? { state:/^ok/.test(String(row.outcome))?'green':/^failed/.test(String(row.outcome))?'red':'amber', outcome:String(row.outcome) } : { state:'no-data', outcome:'health sweep not run' }; })(),
  };
}

function readStateSafe(vaultRoot) {
  try { return readState(vaultRoot); } catch { return { handled: {}, demoted: {} }; }
}

export function renderBrainView(vaultRoot, switchesFile, isoDate, { now } = {}) {
  const data = gatherBrainData(vaultRoot, switchesFile, isoDate, { now });
  const html = renderBrainHtml(data);
  const outPath = path.join(vaultRoot, 'runs', 'digests', 'hermes-brain.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  writeReceipt(vaultRoot, {
    who: 'harness/brain-view', what: 'brain-view (T0)', target: `second-brain graph ${isoDate}`,
    when: data.when, 'approved-by': 'n/a',
    outcome: `ok — brain view rendered (${data.skills.length} skills, ${data.routines.length} routines, anchor ${data.anchorLevel})`,
    evidence: outPath,
  });
  return { path: outPath, skills: data.skills.length, routines: data.routines.length };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({ options: { date: { type: 'string' } } });
  const isoDate = values.date || new Date().toISOString().slice(0, 10);
  const out = renderBrainView(resolveVaultRoot(), resolveSwitchesFile(), isoDate, {});
  console.log(out.path);
}
