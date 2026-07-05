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

const TIERS = ['T0', 'T1', 'T2', 'T3', 'T4'];

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

export function renderDigest(vaultRoot, isoDate) {
  const receipts = readReceipts(vaultRoot, isoDate);
  const queueRecords = readJsonl(vaultPaths(vaultRoot, isoDate).queueFile);

  const counts = Object.fromEntries(TIERS.map((t) => [t, 0]));
  for (const r of receipts) counts[tierOf(r.what)] += 1;

  const attention = receipts.filter((r) => /^(failed|refused|partial)/.test(String(r.outcome)));
  const flips = receipts.filter((r) => commandOf(r.what) === 'switch-flip');

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

  const lines = [
    `# Receipt digest — ${isoDate}`,
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
    '## Approval flow',
    `opened ${opened.length} · approved ${byOutcome('approved').length} · denied ${byOutcome('denied').length} · expired ${byOutcome('expired').length} · median open→resolved: ${med === null ? 'n/a' : `${med} min`}`,
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

export function writeDigest(vaultRoot, switchesFile, isoDate, { now } = {}) {
  const when = now || new Date().toISOString();
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER', 'SWITCH_RECEIPT_DIGEST'], {
    who: 'harness/receipt-digest', what: 'receipt-digest (T0)',
    target: `daily digest ${isoDate}`, when,
  });
  const { digestMarkdown, viewMarkdown } = renderDigest(vaultRoot, isoDate);
  const { digestFile, receiptsView } = vaultPaths(vaultRoot, isoDate);
  fs.writeFileSync(digestFile, digestMarkdown);
  fs.writeFileSync(receiptsView, viewMarkdown);
  writeReceipt(vaultRoot, {
    who: 'harness/receipt-digest', what: 'receipt-digest (T0)',
    target: `daily digest ${isoDate}`, when, 'approved-by': 'n/a',
    outcome: 'ok — digest + human view rendered',
    evidence: digestFile,
  });
  return { digestFile, viewFile: receiptsView };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const { values } = parseArgs({ options: { date: { type: 'string' } } });
  const isoDate = values.date || new Date().toISOString().slice(0, 10);
  const out = writeDigest(resolveVaultRoot(), resolveSwitchesFile(), isoDate, {});
  console.log(`digest: ${out.digestFile}\nview:   ${out.viewFile}`);
}
