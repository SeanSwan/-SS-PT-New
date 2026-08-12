#!/usr/bin/env node
/**
 * media-sync-probe — run two REAL media files through the sync engine.
 * ============================================================================
 *
 * Every piece of evidence the sync engine has ever produced came from Float32Arrays
 * that a test invented. 65 unit tests, ~2500 fuzz cases, zero real files. This harness
 * exists to close that gap, and it is deliberately a CLI rather than a test because the
 * inputs are Sean's camera and mic files, which cannot live in the repo.
 *
 *   node backend/scripts/media-sync-probe.mjs <camera-file> <mic-file>
 *
 * Options:
 *   --rate <hz>        decode rate (default 8000; see audioExtract.mjs)
 *   --max-offset <s>   search window in seconds (default 120)
 *   --drift            ALSO measure clock drift by syncing head and tail separately
 *   --json             emit machine-readable JSON instead of the report
 *
 * ── HOW TO READ THE RESULT, INCLUDING WHEN IT IS WRONG ──────────────────────
 * The output is designed to be falsifiable. `offsetSeconds` alone is not evidence —
 * a confidently-wrong answer looks identical to a correct one at that level. What makes
 * it checkable:
 *
 *   - SOURCE lines print the true channel count and sample rate of each file. If a file
 *     was stereo and the offset is exactly 2x what you expect, that is the interleaving
 *     failure this whole layer exists to prevent.
 *   - `marginToRefusal` says how far the answer sits above the refusal boundary. 1.0 IS
 *     the boundary. 1.2 is a pass that nearly failed and deserves a human ear.
 *   - `bindingTerm` says WHICH gate is closest to refusing, so a marginal result points
 *     at its own cause rather than requiring a bisect.
 *
 * The honest check is still your ears: apply the offset in an editor and listen for a
 * flam on a transient. This harness narrows what to listen for; it does not replace it.
 */

import { extractMono, DEFAULT_EXTRACT_RATE } from '../services/mediaSync/audioExtract.mjs';
import { findOffset } from '../services/mediaSync/crossCorrelation.mjs';
import { modelDrift } from '../services/mediaSync/driftModel.mjs';

/**
 * Validate here rather than letting a bad number reach the engine. Both failure modes
 * were observed: `--rate abc` surfaced as a raw ffmpeg option-parser error, and
 * `--max-offset -5` produced a REFUSAL reading `insufficient-audio` against 90s and
 * 102s files — a diagnosis that sends the operator hunting for longer footage when the
 * actual fault is their own flag. A wrong reason is worse than an error.
 */
function positive(raw, flag) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${flag} needs a positive number, got ${JSON.stringify(raw)}`);
  }
  return n;
}

function parseArgs(argv) {
  const opts = { rate: DEFAULT_EXTRACT_RATE, maxOffset: 120, drift: false, json: false, files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--rate') { opts.rate = positive(argv[++i], '--rate'); }
    else if (a === '--max-offset') { opts.maxOffset = positive(argv[++i], '--max-offset'); }
    else if (a === '--drift') { opts.drift = true; }
    else if (a === '--json') { opts.json = true; }
    else if (a.startsWith('--')) { throw new Error(`unknown flag ${a}`); }
    else { opts.files.push(a); }
  }
  return opts;
}

const USAGE = `
media-sync-probe — decode two real files and align them

  node backend/scripts/media-sync-probe.mjs <camera-file> <mic-file> [options]

  --rate <hz>        decode sample rate (default ${DEFAULT_EXTRACT_RATE})
  --max-offset <s>   search window, seconds (default 120)
  --drift            also measure clock drift across the take
  --json             machine-readable output

The FIRST file is the reference (normally the camera, whose timeline you keep).
A POSITIVE offset means the second file's content occurs LATER in its own timeline.
`;

function fmtSource(label, r) {
  const ch = r.source.channels === null ? '?' : r.source.channels;
  const warn = r.source.channels > 1 ? `  [downmixed from ${ch}ch]` : '';
  return `${label}\n`
    + `    source   ${r.source.codec ?? '?'} / ${r.source.container ?? '?'} · `
    + `${ch}ch @ ${r.source.sampleRate ?? '?'}Hz · ${(r.source.durationSec ?? 0).toFixed(2)}s${warn}\n`
    + `    decoded  1ch @ ${r.sampleRate}Hz · ${r.durationSec.toFixed(2)}s · ${r.samples.length} samples`;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`\n  ${err.message}\n${USAGE}`);
    process.exit(2);
  }
  if (opts.files.length !== 2) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  const [refPath, tgtPath] = opts.files;

  const t0 = Date.now();
  // Decode both in parallel — they are independent processes and this halves wall time
  // on the 10-20 minute takes this is built for.
  const [ref, tgt] = await Promise.all([
    extractMono(refPath, { sampleRate: opts.rate }),
    extractMono(tgtPath, { sampleRate: opts.rate }),
  ]);
  const decodeMs = Date.now() - t0;

  const t1 = Date.now();
  const result = findOffset(ref.samples, tgt.samples, {
    referenceSampleRate: ref.sampleRate,
    targetSampleRate: tgt.sampleRate,
    maxOffsetSeconds: opts.maxOffset,
  });
  const syncMs = Date.now() - t1;

  // Drift is only meaningful once we know where the files sit relative to each other;
  // an unusable gross sync makes every window slice a guess.
  let drift = null;
  if (opts.drift) {
    drift = result.usable
      ? measureDrift(ref, tgt, opts, result.offsetSeconds)
      : { error: 'gross sync was refused; cannot align drift windows' };
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({
      reference: { path: refPath, ...ref, samples: undefined },
      target: { path: tgtPath, ...tgt, samples: undefined },
      result, drift, timing: { decodeMs, syncMs },
    }, null, 2)}\n`);
    return result.usable ? 0 : 1;
  }

  const L = [];
  L.push('');
  L.push('  MEDIA SYNC PROBE');
  L.push('  ' + '─'.repeat(66));
  L.push(fmtSource(`  REFERENCE  ${refPath}`, ref));
  L.push(fmtSource(`  TARGET     ${tgtPath}`, tgt));
  L.push('  ' + '─'.repeat(66));

  if (result.usable) {
    const frames30 = result.offsetSeconds * 30;
    L.push(`  OFFSET     ${result.offsetSeconds >= 0 ? '+' : ''}${result.offsetSeconds.toFixed(4)}s`
      + `   (${frames30 >= 0 ? '+' : ''}${frames30.toFixed(2)} frames @30fps)`);
    L.push(`  peak ${result.peak.toFixed(4)}   prominence ${result.prominence.toFixed(4)}`);
    L.push(`  margin to refusal ${result.marginToRefusal.toFixed(2)}x   (binding gate: ${result.bindingTerm})`);
    if (result.marginToRefusal < 1.5) {
      L.push('  ⚠  THIN MARGIN — this passed, but not by much. Verify by ear before trusting it.');
    }
  } else {
    L.push(`  REFUSED    ${result.reason}`);
    L.push(`  peak ${result.peak?.toFixed(4) ?? 'n/a'}   prominence ${result.prominence?.toFixed(4) ?? 'n/a'}`);
    L.push('  A refusal is a correct outcome when the evidence is weak. Check that the two');
    L.push('  files are actually the same take before treating this as a bug.');
  }

  L.push(`  searched ±${result.searchedSeconds?.toFixed(1) ?? '?'}s`
    + `${result.searchTruncated ? ' (TRUNCATED by file length)' : ''}`
    + `${result.lowOverlap ? ' · LOW OVERLAP' : ''}`);

  if (drift) {
    L.push('  ' + '─'.repeat(66));
    if (drift.error) L.push(`  DRIFT      not measured: ${drift.error}`);
    else if (!drift.plausible) L.push(`  DRIFT      refused: ${drift.reason}`);
    else if (!drift.correctionNeeded) {
      const why = drift.belowNoiseFloor
        ? `below the ±${drift.noiseFloorPpm.toFixed(1)}ppm this ${drift.spanSec.toFixed(0)}s span can resolve`
        : 'small enough to ignore';
      L.push(`  DRIFT      ${drift.driftPpm.toFixed(1)}ppm — no correction (${why})`);
    } else {
      L.push(`  DRIFT      ${drift.driftPpm.toFixed(1)}ppm · resample ${drift.resampleRatio.toFixed(9)}`);
      // Named for what it measures. This is drift across the MEASURED span, not the
      // whole take — reporting it as end-of-take error understates a real take by the
      // ratio of take length to span, which is false comfort in a QA number.
      L.push(`             ${drift.errorAcrossMeasuredSpanMs.toFixed(0)}ms accumulated across the `
        + `${drift.spanSec.toFixed(0)}s measured span`);
    }
  }

  L.push('  ' + '─'.repeat(66));
  L.push(`  decode ${decodeMs}ms · sync ${syncMs}ms`);
  L.push('');
  process.stdout.write(`${L.join('\n')}\n`);

  return result.usable ? 0 : 1;
}

/**
 * Drift needs two measurements taken far apart in the take, so it is a DIFFERENCE of
 * offsets. We slice the decoded arrays rather than re-decoding — correlation time only.
 *
 * THE SUBTLETY THAT MAKES THIS CORRECT: the two windows must be sliced at times that
 * actually correspond. Per the module's sign convention an event at reference time `t`
 * sits at target time `t + grossOffset`, so slicing BOTH files at the same wall-clock
 * second compares non-overlapping content whenever the gross offset is large — the
 * recorder started 40s before the camera is the normal case, not the exotic one. Both
 * correlations would then fail, or worse, succeed against unrelated material.
 *
 * Pre-aligning by `grossOffset` leaves a small residual in each window. That is exactly
 * what we want: subtracting the SAME constant from both measurements leaves their
 * difference untouched, and drift is that difference.
 */
function measureDrift(ref, tgt, opts, grossOffset) {
  const WINDOW_SEC = 30;
  const shared = {
    referenceSampleRate: ref.sampleRate,
    targetSampleRate: tgt.sampleRate,
    maxOffsetSeconds: opts.maxOffset,
  };

  // Usable span is where BOTH files have content after alignment is accounted for.
  const refStart = Math.max(0, -grossOffset);
  const refEnd = Math.min(ref.durationSec, tgt.durationSec - grossOffset);
  const usableSpan = refEnd - refStart;
  if (usableSpan < WINDOW_SEC * 3) {
    return {
      error: `only ${usableSpan.toFixed(0)}s of overlapping material; `
        + `need ${WINDOW_SEC * 3}s for two separated windows`,
    };
  }

  const slice = (src, startSec) => src.samples.subarray(
    Math.max(0, Math.floor(startSec * src.sampleRate)),
    Math.min(src.samples.length, Math.floor((startSec + WINDOW_SEC) * src.sampleRate)),
  );

  const headAt = refStart;
  const tailAt = refEnd - WINDOW_SEC;

  const head = findOffset(slice(ref, headAt), slice(tgt, headAt + grossOffset), shared);
  const tail = findOffset(slice(ref, tailAt), slice(tgt, tailAt + grossOffset), shared);
  if (!head.usable || !tail.usable) {
    return {
      error: `head ${head.usable ? 'ok' : head.reason}, tail ${tail.usable ? 'ok' : tail.reason}`,
      spanSec: tailAt - headAt,
    };
  }
  return {
    ...modelDrift({ ...head, atSeconds: headAt }, { ...tail, atSeconds: tailAt }),
    spanSec: tailAt - headAt,
  };
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`\n  FAILED  ${err.name}: ${err.message}\n`);
    if (err.detail) process.stderr.write(`  ${JSON.stringify(err.detail)}\n`);
    process.stderr.write('\n');
    process.exit(3);
  });
