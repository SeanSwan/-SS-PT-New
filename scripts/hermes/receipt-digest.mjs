#!/usr/bin/env node
/**
 * receipt-digest.mjs — daily receipt digest renderer (Slice 1, T0, registered
 * row `receipt-digest` in command-effect-registry.md §3).
 *
 * Renders audit-receipts.md §5 exactly: counts by tier · attention lines ·
 * approval flow (median open→resolved) · switch activity · silence check.
 * Writes runs/digests/digest-<date>.md plus the human-readable
 * runs/receipts/<month>/receipts-<date>.md view (JSONL stays the source).
 * Digest body is deterministic from the day's data — no generated-at stamps.
 *
 * Gate: SWITCH_MASTER + SWITCH_RECEIPT_DIGEST, fresh-read, fail closed.
 * Receipts still WRITE with the digest switch off — only the view pauses
 * (kill-switches.md §4). Usage: node receipt-digest.mjs [--date YYYY-MM-DD]
 */
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import {
  checkSwitches, readJsonl, readReceipts, resolveSwitchesFile, resolveVaultRoot,
  vaultPaths, writeReceipt,
} from './hermesRunsLib.mjs';
import { verifyChain } from './spineLib.mjs';
import { loadQueueState } from './queueModel.mjs';

const TIERS = ['T0', 'T1', 'T2', 'T3', 'T4'];
const REFUSAL_CLUSTER_THRESHOLD = 5; // G-4: N+ refusals from one sender in 24h = a flood/injection cluster
const ARMED_STALE_MS = 24 * 60 * 60 * 1000; // G-9: a T4 armed-but-unexecuted past this is a receipt gap
const base = (f) => String(f).replace(/\\/g, '/').split('/').pop();

function tierOf(what) {
  return /\((T[0-4])\)/.exec(String(what))?.[1] ?? 'T0';
}
function commandOf(what) {
  return String(what).split(' (')[0];
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** UX-8: a local calendar day for an operator at `offsetMinutes` east of UTC
 *  (PDT = -420) spans two UTC-dated stream files. No storage change — the
 *  local mode gathers both files and filters records by the local day of `when`. */
export function localWindow(localDate, offsetMinutes) {
  const startMs = Date.parse(`${localDate}T00:00:00Z`) - offsetMinutes * 60000;
  const endMs = startMs + 24 * 60 * 60 * 1000;
  const utcDates = [...new Set([new Date(startMs).toISOString().slice(0, 10), new Date(endMs - 1).toISOString().slice(0, 10)])];
  return { startMs, endMs, utcDates };
}

export function renderDigest(vaultRoot, isoDate, { local = false, offsetMinutes = 0 } = {}) {
  let receipts;
  let queueRecords;
  let streamDates = [isoDate];
  if (local) {
    const w = localWindow(isoDate, offsetMinutes);
    streamDates = w.utcDates;
    const inWindow = (iso) => { const ms = Date.parse(iso); return Number.isFinite(ms) && ms >= w.startMs && ms < w.endMs; };
    receipts = streamDates.flatMap((d) => readReceipts(vaultRoot, d)).filter((r) => inWindow(r.when));
    queueRecords = streamDates.flatMap((d) => readJsonl(vaultPaths(vaultRoot, d).queueFile))
      .filter((r) => inWindow(r.type === 'create' ? r.entry?.created : r.at));
  } else {
    receipts = readReceipts(vaultRoot, isoDate);
    queueRecords = readJsonl(vaultPaths(vaultRoot, isoDate).queueFile);
  }

  const counts = Object.fromEntries(TIERS.map((t) => [t, 0]));
  for (const r of receipts) counts[tierOf(r.what)] += 1;

  const attention = receipts.filter((r) => /^(failed|refused|partial)/.test(String(r.outcome)));
  const flips = receipts.filter((r) => commandOf(r.what) === 'switch-flip');

  // Refusal clusters (G-4): refusals are the injection/flood signal, not noise.
  const refusals = receipts.filter((r) => /^refused/.test(String(r.outcome)));
  const floodHit = refusals.filter((r) => /flood cap/i.test(String(r.outcome)));
  const bySender = {};
  for (const r of refusals) bySender[r.who] = (bySender[r.who] || 0) + 1;
  const clusters = Object.entries(bySender).filter(([, n]) => n >= REFUSAL_CLUSTER_THRESHOLD).sort((a, b) => b[1] - a[1]);

  // Integrity (G-7 + G-9): surface what silently degrades to T0 or lingers armed.
  const paths = vaultPaths(vaultRoot, isoDate);
  const unparseable = receipts.filter((r) => r.__unparseable !== undefined);
  const tierless = receipts.filter((r) => r.what !== undefined && !/\((T[0-4])\)/.test(String(r.what)));
  const chainBroken = streamDates
    .flatMap((d) => { const p = vaultPaths(vaultRoot, d); return [p.receiptsFile, p.queueFile]; })
    .map((f) => verifyChain(f)).filter((c) => !c.ok);
  const refMs = Date.parse(`${isoDate}T23:59:59Z`);
  const armedStale = [...loadQueueState(vaultRoot).values()].filter(
    (e) => e.status === 'armed' && Number.isFinite(Date.parse(e.armedAt)) && refMs - Date.parse(e.armedAt) > ARMED_STALE_MS
  );
  // Actor partition (G-15): who did what, ranked (per-trainer review, Q7, builds on this).
  const byActor = {};
  for (const r of receipts) if (r.who) byActor[r.who] = (byActor[r.who] || 0) + 1;
  const actorRows = Object.entries(byActor).sort((a, b) => b[1] - a[1]);

  const opened = queueRecords.filter((r) => r.type === 'create');
  const byOutcome = (to) => queueRecords.filter((r) => r.type === 'transition' && r.to === to);
  const resolvedMinutes = [];
  for (const t of [...byOutcome('approved'), ...byOutcome('denied')]) {
    const created = opened.find((c) => c.entry.id === t.id)?.entry.created;
    const delta = Date.parse(t.at) - Date.parse(created);
    if (Number.isFinite(delta)) resolvedMinutes.push(Math.round(delta / 60000));
  }
  const med = median(resolvedMinutes);

  let silence;
  const scheduleFile = vaultPaths(vaultRoot, isoDate).scheduleFile;
  if (!fs.existsSync(scheduleFile)) {
    silence = ['No schedule registered (pre-slice-5) — silence check idle.'];
  } else {
    let scheduled = [];
    try { scheduled = JSON.parse(fs.readFileSync(scheduleFile, 'utf8')).scheduled ?? []; }
    catch { scheduled = null; }
    if (scheduled === null) {
      silence = ['Schedule file unreadable — treating every scheduled command as silent (fail closed).'];
    } else {
      const seen = new Set(receipts.map((r) => commandOf(r.what)));
      const silent = scheduled.filter((name) => !seen.has(name));
      silence = silent.length
        ? silent.map((name) => `- scheduled \`${name}\` produced no receipt — silence is a failure mode, not a clean day.`)
        : ['All scheduled commands receipted.'];
    }
  }

  const utcOff = offsetMinutes === 0 ? 'UTC' : `UTC${offsetMinutes > 0 ? '+' : '-'}${String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0')}:${String(Math.abs(offsetMinutes) % 60).padStart(2, '0')}`;
  const lines = [
    `# Receipt digest — ${isoDate}${local ? ` (LOCAL day, ${utcOff}; spans UTC files ${streamDates.join(' + ')})` : ''}`,
    '',
    '## Counts by tier (24h)',
    TIERS.map((t) => `${t}: ${counts[t]}`).join(' · '),
    ...(counts.T4 > 0 ? ['', '**⚠ T4 activity present — a T4 count above zero is always a headline. Read those receipts first.**'] : []),
    '',
    '## Attention lines',
    ...(attention.length
      ? attention.map((r) => `- ${r.id} · ${r.what} · ${r.outcome} · evidence: ${r.evidence}`)
      : ['None — clean day.']),
    '',
    '## Refusal clusters (flood / injection watch)',
    ...(floodHit.length ? [`**⚠ FLOOD CAP HIT ${floodHit.length}× in 24h — a requester was refused new queue entries; a buggy or hostile source may be flooding the approval queue. Investigate before approving.**`] : []),
    ...clusters.map(([who, n]) => `- ${who}: ${n} refusals in 24h — refusal clusters are the injection/flood signal, not noise.`),
    ...((!floodHit.length && !clusters.length) ? ['No refusal clusters.'] : []),
    '',
    '## Integrity',
    ...(unparseable.length ? [`**⚠ ${unparseable.length} unparseable/torn receipt line(s) — corrupt or crash-torn; inspect the JSONL source.**`] : []),
    ...(tierless.length ? [`**⚠ ${tierless.length} tier-less receipt(s) (no (Tn) marker) — silently counted as T0; fix the caller's \`what\`.**`] : []),
    ...chainBroken.map((c) => `**⚠ CHAIN BREAK ${base(c.file)} L${c.breakAt}: ${c.reason}**`),
    ...armedStale.map((e) => `**⚠ ARMED > 24h, no filed receipt: ${e.id} (${e.action}) armed ${e.armedAt} — a T4 armed-but-unexecuted is a receipt gap; resolve it.**`),
    ...((!unparseable.length && !tierless.length && !chainBroken.length && !armedStale.length) ? ['No integrity issues.'] : []),
    '',
    '## Approval flow',
    `opened ${opened.length} · approved ${byOutcome('approved').length} · denied ${byOutcome('denied').length} · expired ${byOutcome('expired').length} · median open→resolved: ${med === null ? 'n/a' : `${med} min`}`,
    '',
    '## By actor (24h)',
    ...(actorRows.length ? actorRows.map(([who, n]) => `- ${who}: ${n} receipt(s)`) : ['No activity.']),
    '',
    '## Switch activity',
    ...(flips.length
      ? flips.map((r) => `- ${r.id} · ${r.target} · ${r.outcome}`)
      : ['No flips. (Rare by design — but a switch untested for 90 days is presumed broken.)']),
    '',
    '## Silence check',
    ...silence,
    '',
  ];

  const view = [
    `# Receipts — ${isoDate} (rendered view; JSONL is the source)`,
    '',
    '| id | who | what | target | outcome |',
    '|---|---|---|---|---|',
    ...receipts.map((r) => `| ${r.id} | ${r.who} | ${r.what} | ${r.target} | ${r.outcome} |`),
    '',
  ];

  return { digestMarkdown: lines.join('\n'), viewMarkdown: view.join('\n') };
}

export function writeDigest(vaultRoot, switchesFile, isoDate, { now, local = false, offsetMinutes = 0 } = {}) {
  const when = now || new Date().toISOString();
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER', 'SWITCH_RECEIPT_DIGEST'], {
    who: 'harness/receipt-digest', what: 'receipt-digest (T0)',
    target: `daily digest ${isoDate}${local ? ' (local)' : ''}`, when,
  });
  const { digestMarkdown, viewMarkdown } = renderDigest(vaultRoot, isoDate, { local, offsetMinutes });
  let { digestFile, receiptsView } = vaultPaths(vaultRoot, isoDate);
  // Local mode writes a SIBLING file — the canonical UTC digest stays deterministic
  // (golden-locked) and the two views never clobber each other.
  if (local) digestFile = digestFile.replace(/\.md$/, '-local.md');
  fs.writeFileSync(digestFile, digestMarkdown);
  if (!local) fs.writeFileSync(receiptsView, viewMarkdown);
  writeReceipt(vaultRoot, {
    who: 'harness/receipt-digest', what: 'receipt-digest (T0)',
    target: `daily digest ${isoDate}`, when, 'approved-by': 'n/a',
    outcome: 'ok — digest + human view rendered',
    evidence: digestFile,
  });
  return { digestFile, viewFile: local ? null : receiptsView };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({ options: { date: { type: 'string' }, local: { type: 'boolean' }, offset: { type: 'string' } } });
  // --local: render the OPERATOR's calendar day (UX-8). Offset = minutes east of
  // UTC; defaults to this machine's current zone (PDT → -420).
  const offsetMinutes = values.offset !== undefined ? Number(values.offset) : -new Date().getTimezoneOffset();
  const isoDate = values.date || (values.local
    ? new Date(Date.now() + offsetMinutes * 60000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10));
  const out = writeDigest(resolveVaultRoot(), resolveSwitchesFile(), isoDate, { local: values.local ?? false, offsetMinutes });
  console.log(`digest: ${out.digestFile}${out.viewFile ? `\nview:   ${out.viewFile}` : ''}`);
}
