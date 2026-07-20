/**
 * ingest.mjs — turn exported Hermes dictation into per-client workout records.
 * ============================================================================
 *
 * BLUEPRINT
 * ---------
 * PIPELINE
 *   1. exportMessages.py   (WSL, read-only)  state.db  → candidates.jsonl
 *   2. THIS FILE           (node)            candidates.jsonl → one markdown record per client
 *                                            + _review-needed.md + regenerated INDEX.md
 *
 * SAFETY POSTURE (each rule earned by a real failure — see the test suites)
 *   - DRY RUN BY DEFAULT. Nothing is written without `--apply`.
 *   - No client marker            → REPORTED (`needsClient`), never guessed.
 *   - A SECOND client in one line → REPORTED (`multiClient`), never split by regex.
 *   - Unusable timestamp          → REPORTED (`badTimestamp`), never silently dated "today".
 *   - Same source message twice   → SKIPPED via sourceRef idempotency, never double-written.
 *   - Unrecognised text           → preserved verbatim as notes.
 *   - Record root                 → jailed outside every git repo and the vault (clientRecord.mjs).
 *   - On --apply, everything that needs a human lands in `_review-needed.md` inside the root —
 *     console output is not a durable place for unresolved client data.
 *
 * USAGE
 *   node ingest.mjs --in /tmp/workout-candidates.jsonl --root ~/swan-client-notes            # dry run
 *   node ingest.mjs --in /tmp/workout-candidates.jsonl --root ~/swan-client-notes --apply    # write
 *
 * @module ingest
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseWorkout } from './parseWorkout.mjs';
import { appendSession, resolveRecordRoot, ensureRecordRoot, normalizeDateIso, writeIndex } from './clientRecord.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const labelOf = (ref) => (ref ? (ref.kind === 'id' ? `client ${ref.value}` : ref.value) : '(no client)');
const previewOf = (entry) => `[${String(entry.dateIso).slice(0, 10)}] ${entry.preview}`;

function main() {
  const inPath = arg('in');
  const root = arg('root', process.env.SWAN_CLIENT_NOTES_ROOT);
  const apply = has('apply');

  if (!inPath || !root) {
    console.error('usage: node ingest.mjs --in <candidates.jsonl> --root <records-dir> [--apply]');
    console.error('  --root may also come from SWAN_CLIENT_NOTES_ROOT');
    return 2;
  }

  // Validate the destination BEFORE parsing anything, so a bad root fails fast and loudly.
  let safeRoot;
  try {
    safeRoot = resolveRecordRoot(root);
  } catch (err) {
    console.error(`error: ${err.message}`);
    return 2;
  }

  const lines = readFileSync(inPath, 'utf8').split('\n').filter((l) => l.trim());

  const planned = [];
  const needsClient = [];
  const multiClient = [];
  const badTimestamp = [];
  const noExercises = [];
  let badRows = 0;

  for (const line of lines) {
    let rec;
    try { rec = JSON.parse(line); } catch { badRows++; continue; }

    const parsed = parseWorkout(rec.text);
    if (!parsed.exercises.length) { noExercises.push(String(rec.text).slice(0, 70)); continue; }

    // Prefer the exporter's normalised ISO; fall back to the raw column; refuse garbage.
    let dateIso;
    try {
      dateIso = normalizeDateIso(rec.timestampIso ?? rec.timestamp);
    } catch {
      badTimestamp.push({ preview: String(rec.text).slice(0, 80), raw: rec.timestamp });
      continue;
    }

    const entry = {
      ref: parsed.clientRef,
      dateIso,
      exercises: parsed.exercises,
      unparsed: parsed.unparsed,
      sourceRef: `hermes msg ${rec.messageId} (${rec.source})`,
      preview: String(rec.text).slice(0, 80),
    };

    if (parsed.multiClient) multiClient.push(entry);
    else if (parsed.needsClient) needsClient.push(entry);
    else planned.push(entry);
  }

  // ── report ────────────────────────────────────────────────────────────────
  console.log(`\nrecords root  : ${safeRoot}`);
  console.log(`candidates    : ${lines.length}`);
  console.log(`will write    : ${planned.length}`);
  console.log(`needs client  : ${needsClient.length}`);
  console.log(`multi client  : ${multiClient.length}`);
  console.log(`bad timestamp : ${badTimestamp.length}`);
  console.log(`no exercises  : ${noExercises.length}`);
  if (badRows) console.log(`bad jsonl rows: ${badRows}`);

  if (planned.length) {
    const byClient = new Map();
    for (const p of planned) byClient.set(labelOf(p.ref), (byClient.get(labelOf(p.ref)) || 0) + 1);
    console.log('\nsessions per client:');
    for (const [k, n] of [...byClient].sort()) console.log(`  ${k}: ${n}`);
  }

  const reportBucket = (title, entries) => {
    if (!entries.length) return;
    console.log(`\n⚠ ${title} — NOT written, resolve manually:`);
    for (const e of entries.slice(0, 10)) console.log(`  ${previewOf(e)}`);
    if (entries.length > 10) console.log(`  … and ${entries.length - 10} more`);
  };
  reportBucket('exercises but NO client marker', needsClient);
  reportBucket('MORE THAN ONE client in a single line (ambiguous attribution)', multiClient);
  if (badTimestamp.length) {
    console.log('\n⚠ unusable timestamps — NOT written (would misdate the record):');
    for (const b of badTimestamp.slice(0, 5)) console.log(`  ts=${JSON.stringify(b.raw)} ${b.preview}`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write these records.');
    return 0;
  }

  // ── apply ─────────────────────────────────────────────────────────────────
  let written = 0;
  let skippedDupes = 0;
  for (const p of planned) {
    const { skipped } = appendSession({
      root: safeRoot, clientRef: p.ref, dateIso: p.dateIso,
      exercises: p.exercises, unparsed: p.unparsed, sourceRef: p.sourceRef,
    });
    if (skipped) skippedDupes++; else written++;
  }

  // Unresolved items are client data too — persist them where Sean will actually see them.
  // Idempotent like the records themselves: a line already present (by sourceRef / preview) is not
  // re-appended on a re-run — round-2 hostile review caught the same entry duplicating per run.
  const unresolved = [...needsClient, ...multiClient];
  if (unresolved.length || badTimestamp.length) {
    ensureRecordRoot(safeRoot);
    const review = join(safeRoot, '_review-needed.md');
    if (!existsSync(review)) {
      writeFileSync(review, '# Needs human resolution\n\n> Lines the ingest refused to attribute or date. Fix the dictation (or the jsonl) and re-run.\n');
    }
    const already = readFileSync(review, 'utf8');
    const fresh = [];
    for (const e of needsClient) {
      if (!already.includes(e.sourceRef)) fresh.push(`- NO CLIENT: ${previewOf(e)}  <sub>${e.sourceRef}</sub>`);
    }
    for (const e of multiClient) {
      if (!already.includes(e.sourceRef)) fresh.push(`- MULTI CLIENT: ${previewOf(e)}  <sub>${e.sourceRef}</sub>`);
    }
    for (const b of badTimestamp) {
      if (!already.includes(b.preview)) fresh.push(`- BAD TIMESTAMP (${JSON.stringify(b.raw)}): ${b.preview}`);
    }
    if (fresh.length) {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      appendFileSync(review, [`\n## ingest ${stamp}`, '', ...fresh].join('\n') + '\n');
      console.log(`\nwrote ${fresh.length} unresolved line(s) to ${review}`);
    } else {
      console.log(`\nall unresolved line(s) already recorded in ${review}`);
    }
  }

  const { clients } = writeIndex({ root: safeRoot });

  console.log(`\nwrote ${written} session block(s), skipped ${skippedDupes} duplicate(s) into ${safeRoot}`);
  console.log(`INDEX.md regenerated — ${clients} client file(s)`);
  return 0;
}

process.exit(main());
