/**
 * FILE: convert-evidence-encoding.mjs
 * WHY:  Logs hg01-hg119 were captured with PowerShell `*>` redirection, which writes UTF-16LE with a
 *       BOM. `grep` and `ripgrep` treat those as BINARY and silently return ZERO matches for ASCII
 *       patterns that are present in them. That already produced one real false negative in this
 *       packet: a repo-wide search for ROUTE_GRAPH_LINKS_OK returned nothing, and I concluded no log
 *       had ever contained the marker. An encoding-aware search found it in hg120. The conclusion
 *       survived by luck; the method did not.
 *
 * THE HAZARD THIS TOOL EXISTS TO AVOID, stated before the code because it is the whole design:
 *   `preflight-freshness.mjs --record` refuses to write the source manifest unless a qualifying gate
 *   log is NEWER than every source file. That ordering signal is mtime. Blindly re-encoding the logs
 *   would stamp every one of them with TODAY'S mtime — which is precisely the round-124 forgery
 *   (touch a nine-day-old log, watch the ordering check pass). Re-encoding must therefore be
 *   INVISIBLE to ordering: every timestamp is recorded and restored, and the restore is asserted
 *   rather than intended. A lossless-encoding fix must not become a freshness bypass.
 *
 * TWO ASSERTIONS, both per file, and neither is a plausibility check:
 *   decode-compare  the UTF-8 bytes written must decode to EXACTLY the string the UTF-16 bytes
 *                   decoded to (sha256 over the decoded text, before vs after). Content identity is
 *                   what makes it safe to convert files a reviewer may be holding.
 *   mtime identity  the mtime must read back within MTIME_TOLERANCE_NS of the pre-write value, and
 *                   the ACTUAL drift in nanoseconds is reported for every file. This is asserted
 *                   from `mtimeNs`, never from a `Date` — see the measured failure below.
 *
 * MEASURED FAILURE, kept because it is the reason both the assertion and its tolerance are written
 * the way they are: the first applied run restored timestamps with `utimesSync(file, stat.atime,
 * stat.mtime)` — `Date` objects. A `Date` holds whole milliseconds, so every one of the 116 converted
 * logs lost its sub-millisecond fraction: `hg01-h09-f3f4.log` went `.6475162` -> `.6480000`,
 * `hg98-backend-full.log` `.5126259` -> `.5130000` (a shift of about +0.4-0.5 ms, measured with .NET
 * `LastWriteTimeUtc` before and after). The tool's own check did NOT catch it, because it compared
 * `Date.getTime()` on both sides — two ROUNDED values agreeing with each other, printing
 * "mtime drift: 0". `preflight-freshness.mjs` compares `statSync().mtimeMs`, a FLOAT, so that
 * ~0.5 ms sat inside the signal that gate reads.
 *
 * The restore now derives fractional SECONDS from `mtimeNs`. A self-test on a synthetic UTF-16LE log
 * with a genuine sub-millisecond mtime REFUTED the first version of this fix: the assertion fired
 * with `FAILED_MTIME_600ns`, i.e. the float-seconds path is NOT exact either, because a seconds value
 * around 1.79e9 cannot be represented as a double to better than a few hundred nanoseconds. That is a
 * ~1000x improvement on the `Date` path and it is now measured rather than assumed.
 *
 * WHY THE TOLERANCE IS 1 ms AND NOT 0: zero would make the tool fail on every run forever, and a tool
 * that always fails gets ignored. The requirement is not clock archaeology — it is that the gate's
 * ORDERING decision cannot change. That decision separates a qualifying log from a source file by
 * seconds or more, and the worst drift this tool can produce is the ~0.5 ms the `Date` path already
 * produced, so 1 ms is the magnitude that could ever matter and is therefore the fail threshold. Any
 * drift is reported per file and summarised, so a recurrence is visible even when it passes.
 * An exact restore would need 100 ns resolution, which `utimesSync` cannot express from Node (it takes
 * seconds as a double); that limit is stated rather than papered over.
 *
 * MODES:
 *   (default) dry run — decodes, round-trips through UTF-16LE+BOM to prove the decode is total, and
 *                       reports what WOULD change. Writes nothing, not even the manifest.
 *   --apply           performs the conversion, re-verifies both assertions, and writes
 *                     evidence-encoding-conversion.json as the audit record.
 *
 * LIMITS, so the result is not over-read:
 *  - Only files matching hg*.log in this artifacts directory are touched. Nothing under backend/ or
 *    frontend/ is read or written, so no gate input changes and no gate re-run is implied.
 *  - The `.log` extension is gitignored (`.gitignore:191:*.log`) and untracked, so this produces no
 *    git state change at all.
 *  - A file that is already valid UTF-8 is left BYTE-IDENTICAL (never re-written, so its mtime is
 *    not even touched); "converted" counts only real UTF-16LE files.
 *  - Decoding is strict: a malformed surrogate raises rather than silently substituting U+FFFD, so a
 *    file that cannot be losslessly decoded fails loudly instead of being quietly corrupted.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const artifacts = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const apply = process.argv.includes('--apply');

// The fail threshold for mtime restoration, and why it is not zero — see the header. `utimesSync`
// takes seconds as a double, so a ~1.79e9-second value cannot be restored to better than a few
// hundred nanoseconds; a zero tolerance would fail forever, which is a tool nobody reads.
const MTIME_TOLERANCE_NS = 1000000n;

const logFiles = readdirSync(artifacts)
  .filter((name) => /^hg.*\.log$/.test(name))
  .sort();

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const textHash = (str) => sha256(Buffer.from(str, 'utf8'));

/** Total decode: throws on a lone surrogate instead of substituting U+FFFD. */
function decodeStrict(buf, encoding) {
  if (encoding === 'utf16le') {
    return new TextDecoder('utf-16le', { fatal: true }).decode(buf);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(buf);
}

const results = [];
for (const name of logFiles) {
  const full = path.join(artifacts, name);
  const before = readFileSync(full);
  const stat = statSync(full);
  const hasUtf16Bom = before.length >= 2 && before[0] === 0xff && before[1] === 0xfe;
  const hasUtf8Bom = before.length >= 3 && before[0] === 0xef && before[1] === 0xbb && before[2] === 0xbf;
  const encoding = hasUtf16Bom ? 'utf16le' : 'utf8';

  // Decode the payload with the BOM removed; the BOM is transport, not content.
  const payload = encoding === 'utf16le' ? before.subarray(2) : hasUtf8Bom ? before.subarray(3) : before;
  const text = decodeStrict(payload, encoding);

  // Proof the decode is total: re-encoding the decoded text must reproduce the original payload
  // byte-for-byte. If this fails, the file is not plain text and must not be converted.
  const roundTripOk = encoding === 'utf16le'
    ? Buffer.from(text, 'utf16le').equals(payload)
    : Buffer.from(text, 'utf8').equals(payload);

  const record = {
    name,
    encoding,
    bytesBefore: before.length,
    bytesAfter: before.length,
    textSha256: textHash(text),
    textSha256After: textHash(text),
    mtimeBeforeUtc: stat.mtime.toISOString(),
    mtimeAfterUtc: stat.mtime.toISOString(),
    roundTripOk,
    status: 'ALREADY_UTF8',
  };

  if (encoding === 'utf16le') {
    if (!roundTripOk) {
      record.status = 'REFUSED_ROUND_TRIP';
      results.push(record);
      continue;
    }
    const utf8Payload = Buffer.from(text, 'utf8');

    if (apply) {
      // Timestamps are read as BigInt NANOSECONDS before the write and restored as fractional
      // seconds. `Date` is never used here: it would round to whole milliseconds and silently move
      // the mtime the freshness gate compares (see the MEASURED FAILURE note above).
      const nsBefore = statSync(full, { bigint: true });
      writeFileSync(full, utf8Payload);
      utimesSync(full, Number(nsBefore.atimeNs) / 1e9, Number(nsBefore.mtimeNs) / 1e9);
      const nsAfter = statSync(full, { bigint: true });
      const reread = decodeStrict(readFileSync(full), 'utf8');
      const mtimeSame = nsAfter.mtimeNs === nsBefore.mtimeNs;
      const driftNs = nsAfter.mtimeNs - nsBefore.mtimeNs;
      record.mtimeAfterUtc = new Date(Number(nsAfter.mtimeNs / 1000000n)).toISOString();
      record.mtimeNsBefore = nsBefore.mtimeNs.toString();
      record.mtimeNsAfter = nsAfter.mtimeNs.toString();
      record.mtimeDriftNs = driftNs.toString();
      record.textSha256After = textHash(reread);
      record.bytesAfter = readFileSync(full).length;
      if (reread !== text) record.status = 'FAILED_CONTENT';
      else if (driftNs > MTIME_TOLERANCE_NS || driftNs < -MTIME_TOLERANCE_NS) record.status = `FAILED_MTIME_${driftNs}ns`;
      else record.status = 'CONVERTED';
    } else {
      record.bytesAfter = utf8Payload.length;
      record.status = 'WOULD_CONVERT';
    }
  }

  results.push(record);
}

const converted = results.filter((r) => r.status === 'CONVERTED');
const wouldConvert = results.filter((r) => r.status === 'WOULD_CONVERT');
const failed = results.filter((r) => r.status.startsWith('FAILED') || r.status === 'REFUSED_ROUND_TRIP');
const already = results.filter((r) => r.status === 'ALREADY_UTF8');

console.log(`logs scanned        : ${results.length}`);
console.log(`already UTF-8       : ${already.length} (left byte-identical)`);
console.log(`${apply ? 'CONVERTED' : 'WOULD CONVERT'}          : ${apply ? converted.length : wouldConvert.length}`);
console.log(`round-trip refusals : ${results.filter((r) => r.status === 'REFUSED_ROUND_TRIP').length}`);
console.log(`FAILURES            : ${failed.length}`);
for (const f of failed) console.log(`  ${f.status}  ${f.name}`);

const contentDrift = results.filter((r) => r.textSha256 !== r.textSha256After);
console.log(`content drift       : ${contentDrift.length} (must be 0 — decode-compare per file)`);
for (const d of contentDrift) console.log(`  ${d.name}  ${d.textSha256} -> ${d.textSha256After}`);

// NOT measured in a dry run — nothing is written, so there is no restore to assert. Reported as N/A
// rather than 0: an unmeasured check must never print the same number as a passing one, or the log
// becomes a false receipt for a check that never ran.
//
// The ACTUAL drift is always printed, even when inside tolerance, so "preserved" is a measurement
// rather than an assurance. This line used to read `mtimeBeforeUtc !== mtimeAfterUtc` on
// millisecond-rounded strings and therefore printed 0 while every file had moved ~0.5 ms.
const driftOf = (r) => (r.mtimeDriftNs === undefined ? null : Number(r.mtimeDriftNs));
const convertedRows = results.filter((r) => r.status === 'CONVERTED');
const maxDriftNs = apply && convertedRows.length > 0
  ? Math.max(...convertedRows.map((r) => Math.abs(driftOf(r) ?? 0)))
  : null;
console.log(apply
  ? `mtime drift         : max ${maxDriftNs} ns across ${convertedRows.length} file(s); tolerance ${MTIME_TOLERANCE_NS} ns (ordering signal: a gate decision separates logs from sources by seconds)`
  : 'mtime drift         : N/A (dry run — nothing written, so nothing to restore and nothing to assert)');
for (const r of convertedRows.filter((x) => (driftOf(x) ?? 0) !== 0)) {
  console.log(`  shifted ${String(driftOf(r)).padStart(7)} ns  ${r.name}  (${r.mtimeNsBefore} -> ${r.mtimeNsAfter})`);
}

const remainingUtf16 = results.filter((r) => r.encoding === 'utf16le' && r.status !== 'CONVERTED');
console.log(`still UTF-16LE      : ${apply ? remainingUtf16.length : results.filter((r) => r.encoding === 'utf16le').length}`);

if (apply) {
  // CUMULATIVE, not overwritten. A second `--apply` legitimately finds nothing left to convert (the
  // first run fixed them all), so writing only this run's scan would erase the record of which files
  // were converted and what their pre-conversion bytes were. Records for a file are kept from the
  // run that actually changed it, preferring a conversion outcome over a later "already UTF-8" pass.
  const manifestPath = path.join(artifacts, 'evidence-encoding-conversion.json');
  let prior = { files: [], runs: [] };
  try {
    prior = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    prior = { files: [], runs: [] };
  }
  const rank = (status) => (status === 'CONVERTED' ? 3 : status.startsWith('FAILED') ? 2 : 1);
  const merged = new Map();
  for (const row of [...(prior.files ?? []), ...results]) {
    const existing = merged.get(row.name);
    if (!existing || rank(row.status) >= rank(existing.status)) merged.set(row.name, row);
  }
  const manifest = {
    tool: 'convert-evidence-encoding.mjs',
    rationale: 'UTF-16LE logs are invisible to grep/ripgrep; converted losslessly with mtime preserved so the preflight ordering signal is unchanged.',
    runs: [
      ...(prior.runs ?? []),
      { appliedAtUtc: new Date().toISOString(), scanned: results.length, converted: converted.length, alreadyUtf8: already.length, failed: failed.length },
    ],
    precisionNote: prior.precisionNote,
    totals: {
      scannedEver: merged.size,
      convertedEver: [...merged.values()].filter((r) => r.status === 'CONVERTED').length,
      failedEver: [...merged.values()].filter((r) => String(r.status).startsWith('FAILED')).length,
    },
    files: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest written    : evidence-encoding-conversion.json (cumulative; ${manifest.totals.convertedEver} conversions recorded)`);
}

// A drift beyond tolerance is already a FAILED_MTIME_* status, so it arrives inside `failed`; the
// measured drift itself is printed above. An earlier version of this line still referenced the
// removed `mtimeDrift` array and threw a ReferenceError AFTER printing a clean summary — so the run
// looked green and exited 1 with no verdict line at all. The summary and the verdict are computed
// from the same list now.
const ok = failed.length === 0 && contentDrift.length === 0;
const marker = ok ? (apply ? 'ENCODING_CONVERSION_OK' : 'ENCODING_DRYRUN_OK') : (apply ? 'ENCODING_CONVERSION_FAILED' : 'ENCODING_DRYRUN_FAILED');
console.log(marker);
process.exit(ok ? 0 : 1);
