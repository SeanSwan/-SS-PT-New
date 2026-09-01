/**
 * mediaSync.mjs — the audio-offset handler, moved out of the agent loop.
 *
 * The agent already kept its handlers in this directory (generateVideo, completion,
 * initImageBind); mediasync was the one still living inline, and render-agent.mjs was over
 * the 300-line cap because of it. Three reviewers flagged that a wiring slice had pushed an
 * already-over file further over, and they were right — so the handler went where the
 * convention already said it belonged. Behaviour is unchanged, and render-agent re-exports
 * both public symbols so every existing import keeps working.
 */

import { extractMono } from '../../services/mediaSync/audioExtract.mjs';
import { findOffset } from '../../services/mediaSync/crossCorrelation.mjs';

/**
 * The only handler that currently does real work. Everything else is refused explicitly
 * rather than faked — an agent that pretends to render is the same lie as an endpoint
 * that pretends to queue.
 */
/**
 * Is this extraction failure ever going to succeed on a retry?
 *
 * It matters because `retryable` decides whether the job goes back on the queue. A file
 * that does not exist, is not media, or is a directory will NEVER become valid — but the
 * first version reported all of them as retryable, so each one burned the job's entire
 * attempt budget in a loop, occupying lease slots ahead of real work and ending in the
 * same failure hours later. Measured: missing file, non-media file, and a directory all
 * reported permanent:false.
 *
 * The distinction is structural-vs-environmental, not error-vs-success:
 *   permanent   the INPUT is wrong — wrong path, no audio stream, corrupt stream
 *   retryable   the ENVIRONMENT was wrong — timeout, ffmpeg missing, transient mount
 */
export function isPermanentExtractionFailure(err) {
  // The probe classifies its own failures; a corrupt/unreadable clip is about the file.
  if (err?.detail?.cause === 'ClipCorruptError') return true;
  const m = String(err?.message || '');
  if (/timed out/i.test(m)) return false;              // may succeed on a quieter machine
  if (/failed to start/i.test(m)) return false;        // ffmpeg absent — an env fix
  return /no audio stream|zero audio bytes|non-finite|not a multiple of 4|exceeds .* cap|does not exist/i.test(m);
}

async function extractOrClassify(filePath, opts) {
  try {
    return await extractMono(filePath, opts);
  } catch (err) {
    err.permanent = isPermanentExtractionFailure(err);
    throw err;
  }
}

export async function runMediaSync(job, onProgress) {
  const p = job.params || {};
  const refPath = p.referencePath;
  const tgtPath = p.targetPath;
  if (!refPath || !tgtPath) {
    const e = new Error('mediasync requires params.referencePath and params.targetPath');
    e.permanent = true;
    throw e;
  }

  await onProgress(10, 'decoding reference');
  const ref = await extractOrClassify(refPath, { sampleRate: p.sampleRate || 8000 });
  await onProgress(45, 'decoding target');
  const tgt = await extractOrClassify(tgtPath, { sampleRate: p.sampleRate || 8000 });

  await onProgress(75, 'correlating');
  const result = findOffset(ref.samples, tgt.samples, {
    referenceSampleRate: ref.sampleRate,
    targetSampleRate: tgt.sampleRate,
    maxOffsetSeconds: p.maxOffsetSeconds || 120,
  });

  // A refusal is a legitimate ANSWER, not a crash: the engine is telling us the evidence
  // is too weak to trust. Reporting it as a failed job would be a lie in the other
  // direction, and retrying it would produce the same refusal forever.
  return {
    offsetSeconds: result.offsetSeconds,
    usable: result.usable,
    reason: result.reason,
    peak: result.peak,
    prominence: result.prominence,
    marginToRefusal: result.marginToRefusal,
    reference: { path: refPath, durationSec: ref.durationSec, sourceChannels: ref.source.channels },
    target: { path: tgtPath, durationSec: tgt.durationSec, sourceChannels: tgt.source.channels },
  };
}
