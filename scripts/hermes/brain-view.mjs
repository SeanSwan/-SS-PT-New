#!/usr/bin/env node
/**
 * brain-view.mjs — the GRAPHICAL command center (F-2/SB-2 from the 7★ consult
 * review; Sean's ask: "visual nodes and lights showing the brain, how it's
 * thinking and what's in it"). Renders ONE static HTML/SVG page — the ARMS/
 * Four-C second-brain graph around a pulsing HERMES core, lit by LIVE state:
 * Applications (C2 connections) · Routines (C4: real schedule + runner state) ·
 * Memory (C1: real store counts) · Skills (C3: real .claude/skills inventory) ·
 * operator ring (switches, queue, anchor) · a thought-stream of the latest
 * receipts. Same doctrine as status-page: ZERO action surface (no script/
 * button/form/input — lights are pure CSS/SVG animation, disabled under
 * prefers-reduced-motion), no broker path, unplug changes nothing.
 * Registered T0 `brain-view`. Writes runs/digests/hermes-brain.html + receipt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { listEntries } from './queueModel.mjs';
import { anchorStatus } from './anchorLedger.mjs';
import { readSchedule, readState } from './runnerLib.mjs';
import { renderBrainHtml } from './brainViewTemplate.mjs';
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
  const map = JSON.parse(fs.readFileSync(path.join(HERE, 'brain-map.json'), 'utf8'));
  const sw = readSwitches(switchesFile);
  const receipts = readReceipts(vaultRoot, isoDate);
  let anchor;
  try { anchor = anchorStatus(vaultRoot, { today: isoDate }); } catch { anchor = { level: 'fault', faults: ['anchor check crashed'], notes: [] }; }
  let open = [];
  try { open = listEntries(vaultRoot, switchesFile, { filter: 'open', at: when }); } catch { open = []; }

  const sched = readSchedule(vaultRoot);
  const rstate = readStateSafe(vaultRoot);
  const routines = (sched.entries || []).map((e) => ({
    label: e.command, cadence: e.cadence,
    state: !e.enabled ? 'dark' : rstate.demoted[e.command] ? 'fault' : rstate.handled[e.command] === isoDate ? 'live' : 'idle',
  }));

  const liveCounts = {
    inbox: countDir(path.join(REPO, '.ai-workflow', 'hermes-inbox', 'pending'), (n) => n.endsWith('.md')),
    packets: countDir(path.join(REPO, 'docs', 'ai-workflow', 'hermes-learning-packets'), (n) => n.endsWith('.md')),
    brainstorms: countDir(path.join(REPO, 'docs', 'ai-workflow', 'brainstorms'), (n) => n.endsWith('.md')),
  };
  const memory = map.memory.map((m) => ({ ...m, count: m.live ? liveCounts[m.live] : null }));
  const skills = (() => {
    try { return fs.readdirSync(path.join(REPO, '.claude', 'skills')).filter((n) => !n.startsWith('.')); } catch { return []; }
  })();

  const switches = sw.ok ? Object.entries(sw.state).map(([name, v]) => ({ name, on: v === true })) : null;
  const doctor = [...receipts].reverse().find((r) => r.what === 'hermes-doctor (T0)');
  const thoughts = receipts.slice(-6).reverse().map((r) => ({
    id: r.id, what: r.what, outcome: String(r.outcome),
    mood: /^ok/.test(String(r.outcome)) ? 'ok' : /^refused/.test(String(r.outcome)) ? 'refused' : 'warn',
  }));

  // Hour-by-hour thinking sparkline (UTC hour of each receipt's `when`).
  const hourly = Array.from({ length: 24 }, () => 0);
  for (const r of receipts) {
    const h = new Date(r.when).getUTCHours();
    if (Number.isFinite(h)) hourly[h] += 1;
  }
  const memoriesTotal = memory.reduce((n, m) => n + (m.count || 0), 0) || null;

  // Aurora: one color readable from across the room.
  const anyFault = anchor.level === 'fault' || switches === null || (doctor && !String(doctor.outcome).startsWith('ok'));
  const anyWarn = anchor.level === 'warn' || open.length > 0 || routines.some((r) => r.state === 'fault');
  const health = anyFault ? 'red' : anyWarn ? 'amber' : 'green';

  // The brain's own next-best-action — the product's north-star pattern applied
  // to the operator (highest-priority actionable truth, one line, zero clicks).
  const nba = switches === null ? 'switches file unreadable — everything is failing closed; restore it first'
    : anchor.level === 'fault' ? `anchor FAULT — read the doctor receipt: ${(anchor.faults[0] || '').slice(0, 80)}`
      : open.length ? `${open.length} approval(s) waiting — resolve via Telegram phrase or queue.mjs`
        : routines.some((r) => r.state === 'fault') ? 'a routine is auto-demoted — re-enable it in runner-state.json after fixing the cause'
          : (liveCounts.inbox || 0) > 0 ? `${liveCounts.inbox} Hermes-inbox memo(s) pending — run the doc-170 §E pass to wire Hermes's drain`
            : !doctor ? 'no doctor run yet today — double-click the Command Center or wait for the 06:00 chain'
              : anchor.level === 'warn' ? 'anchor degraded — set HERMES_ANCHOR_KEY / stand up the R2 witness (E4C runbook)'
                : 'all quiet, all green — nothing needs you';

  return {
    when, isoDate, brain: map.brain, applications: map.applications, routines, memory, skills,
    switches, anchorLevel: anchor.level, anchorNote: (anchor.faults[0] || anchor.notes?.[0] || ''),
    queueOpen: open.length, doctorOk: doctor ? String(doctor.outcome).startsWith('ok') : null,
    receiptCount: receipts.length, thoughts, hourly, memoriesTotal, health, nba,
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
