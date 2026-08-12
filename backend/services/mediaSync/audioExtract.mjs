/**
 * Decode real media into the exact shape the sync engine requires.
 * ============================================================================
 *
 * WHY THIS EXISTS AT ALL. The correlator has 65 unit tests and ~2500 fuzz cases,
 * every one of them validating against Float32Arrays that were invented. Nothing had
 * ever decoded a real file. The largest known risk in the whole module lives here,
 * not there.
 *
 * ── THE TRAP THIS LAYER EXISTS TO CLOSE ─────────────────────────────────────
 * `crossCorrelation.mjs` carries an input contract: both signals MUST be
 * single-channel. Decoded stereo arrives interleaved as L R L R; consumed as mono the
 * apparent sample rate DOUBLES, so every reported offset is 2x wrong — and because
 * both channels carry the same program material the correlation peak still clears the
 * confidence gate. Wrong and confident: the worst output the system can produce, and
 * invisible to a fuzz harness that only generates mono.
 *
 * The defence is not a downstream check. It is to make the wrong shape unreachable:
 * ffmpeg does the downmix with `-ac 1`, ffprobe confirms what actually came back, and
 * a mismatch throws rather than degrading. The engine can then trust its input by
 * construction instead of by convention.
 *
 * ── WHY 8 kHz IS THE DEFAULT, NOT A COMPROMISE ──────────────────────────────
 * The correlator reduces everything to a 100 Hz energy envelope. Any rate that
 * preserves speech energy structure is equivalent for alignment, so decoding a
 * 20-minute take at 48 kHz would allocate ~230 MB of Float32 to build the same
 * envelope an 8 kHz decode produces from ~38 MB. Resampling also normalises the two
 * devices onto ONE timebase, which removes the other silent-wrong-answer class:
 * a camera at 48 kHz paired with a recorder at 44.1 kHz.
 */

import { spawn } from 'node:child_process';
import { probeFile } from '../audioProbeService.mjs';

const FFMPEG_BIN = process.env.PLAUD_FFMPEG_PATH || 'ffmpeg';
const FFPROBE_BIN = process.env.PLAUD_FFPROBE_PATH || 'ffprobe';

/** Enough to preserve speech envelope structure; see header. */
export const DEFAULT_EXTRACT_RATE = 8000;

/** f32le — the format we ask ffmpeg for, so this is fixed, not a preference. */
const BYTES_PER_SAMPLE = 4;

/**
 * Ratio above which a decode is presumed to have skipped the downmix.
 * N interleaved channels read as mono inflate apparent duration by exactly N, so the
 * smallest real failure is 2.0 and 1.5 separates it from container-estimate slop.
 */
export const INTERLEAVE_RATIO_THRESHOLD = 1.5;

/**
 * Exported so the protection is testable rather than merely asserted. Deliberately
 * one-sided — see the call site for why a lower bound was removed.
 */
export function interleavingSuspected(decodedSec, probedSec) {
  if (!probedSec || probedSec <= 1) return false;   // too short to judge
  return decodedSec / probedSec > INTERLEAVE_RATIO_THRESHOLD;
}

export class AudioExtractError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'AudioExtractError';
    this.detail = detail;
  }
}

/**
 * Neutralise a path that ffmpeg would read as a flag.
 *
 * `spawn` without a shell already prevents shell injection, but NOT argument injection:
 * a file named `-f` or `-i` is passed through verbatim and ffmpeg parses it as an
 * option. This layer will eventually be handed paths derived from user uploads, so a
 * filename is untrusted input. Prefixing with `./` makes it unambiguously a path.
 */
function safePath(p) {
  return p.startsWith('-') ? `./${p}` : p;
}

/**
 * Enumerate audio streams so we can pin the one we decode.
 *
 * WHY THIS EXISTS: ffprobe's consumer here picks the FIRST audio stream, while ffmpeg's
 * default stream selection picks the one with the MOST CHANNELS. On any file with more
 * than one audio track those disagree — verified on a two-stream fixture where the probe
 * described a mono 44.1kHz track and ffmpeg decoded the stereo 48kHz one instead.
 *
 * The reported metadata would then describe a different microphone than the samples
 * came from, and the duration guard cannot catch it: the wrong stream, correctly
 * downmixed, has the right duration. Silent, and wrong in the way that matters most
 * here — syncing against a track the operator did not choose.
 */
async function listAudioStreams(filePath, timeoutMs) {
  const args = ['-v', 'error', '-select_streams', 'a',
    '-show_entries', 'stream=index,channels,sample_rate,codec_name',
    '-of', 'json', safePath(filePath)];
  return new Promise((resolve) => {
    const p = spawn(FFPROBE_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); resolve([]); }, timeoutMs);
    p.stdout.on('data', (c) => { out += c.toString(); });
    p.on('error', () => { clearTimeout(timer); resolve([]); });
    p.on('close', () => {
      clearTimeout(timer);
      // Best-effort: a failure here degrades the warning, never the decode.
      try { resolve(JSON.parse(out).streams || []); } catch { resolve([]); }
    });
  });
}

/**
 * Decode any media file to a mono Float32Array at a known sample rate.
 *
 * @param {string} filePath
 * @param {{sampleRate?: number, timeoutMs?: number, maxSeconds?: number,
 *          audioStreamIndex?: number}} [opts]
 *   `audioStreamIndex` selects among a file's audio tracks (default 0, the first).
 * @returns {Promise<{
 *   samples: Float32Array, sampleRate: number, channels: 1, durationSec: number,
 *   source: { channels: number|null, sampleRate: number|null, codec: string|null,
 *             container: string|null, durationSec: number|null,
 *             audioStreamCount: number, audioStreamIndex: number }
 * }>}
 */
export async function extractMono(filePath, {
  sampleRate = DEFAULT_EXTRACT_RATE,
  timeoutMs = 300_000,
  maxSeconds = 3 * 60 * 60,
  audioStreamIndex = 0,
} = {}) {
  if (!filePath) throw new AudioExtractError('filePath is required');

  // Probe FIRST. Knowing the true source shape is what lets us assert afterwards that
  // the downmix actually happened, rather than assuming ffmpeg honoured the flag.
  let source;
  try {
    source = await probeFile(filePath, { timeoutMs: Math.min(timeoutMs, 60_000) });
  } catch (err) {
    throw new AudioExtractError(`could not probe ${filePath}: ${err.message}`, { cause: err.name });
  }

  if (source.durationSec && source.durationSec > maxSeconds) {
    throw new AudioExtractError(
      `refusing to decode ${source.durationSec.toFixed(0)}s of audio (cap ${maxSeconds}s)`,
      { durationSec: source.durationSec },
    );
  }

  // The duration cap above is advisory only: it is silently skipped when the container
  // reports no duration, and seconds are the wrong unit for the resource actually at
  // risk. Decoding holds the chunk list, the concatenated buffer, AND the typed array
  // at once — roughly three copies — so a 3-hour cap at 48kHz would mean multi-GB
  // peak RSS on a box sized for a web service. Bound the bytes directly, which covers
  // the missing-metadata case too.
  const maxBytes = Math.ceil(maxSeconds * sampleRate * BYTES_PER_SAMPLE);

  const streams = await listAudioStreams(filePath, Math.min(timeoutMs, 30_000));
  if (streams.length > 1 && audioStreamIndex === 0) {
    // Not fatal — but the operator has a choice they may not know they have, and
    // defaulting silently is how the wrong microphone ends up in a published video.
    process.emitWarning(
      `${filePath} has ${streams.length} audio streams; decoding stream 0 `
      + `(${streams.map((s) => `#${s.index}:${s.channels}ch@${s.sample_rate}`).join(', ')}). `
      + 'Pass audioStreamIndex to choose another.',
      'MultipleAudioStreams',
    );
  }
  if (streams.length && !streams[audioStreamIndex]) {
    throw new AudioExtractError(
      `audioStreamIndex ${audioStreamIndex} does not exist (file has ${streams.length} audio stream(s))`,
      { available: streams.length },
    );
  }
  const chosen = streams[audioStreamIndex] || null;

  const args = [
    '-v', 'error',
    '-i', safePath(filePath),
    // PIN THE STREAM. Without this, ffmpeg's default selection takes the stream with
    // the MOST CHANNELS while our metadata describes the FIRST — so the numbers we
    // report would describe a different track than the samples came from.
    '-map', `0:a:${audioStreamIndex}`,
    '-vn',                    // ignore video entirely — we only want the audio track
    '-ac', '1',               // DOWNMIX TO MONO. The single most important flag here.
    '-ar', String(sampleRate),// resample onto one known timebase for both devices
    '-f', 'f32le',            // raw float samples; no container to misparse
    '-acodec', 'pcm_f32le',
    'pipe:1',
  ];

  const chunks = [];
  let bytes = 0;
  let stderr = '';

  await new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new AudioExtractError(`ffmpeg timed out after ${timeoutMs}ms`, { filePath }));
    }, timeoutMs);

    proc.stdout.on('data', (c) => {
      chunks.push(c);
      bytes += c.length;
      if (bytes > maxBytes) {
        // Stop the producer rather than growing until the process dies. A stream that
        // never ends (a live input, a malformed container ffmpeg keeps emitting from)
        // would otherwise take the whole service down instead of failing one job.
        clearTimeout(timer);
        proc.kill('SIGKILL');
        chunks.length = 0;
        reject(new AudioExtractError(
          `audio exceeds ${(maxBytes / 1e6).toFixed(0)}MB decode cap `
          + `(${maxSeconds}s at ${sampleRate}Hz)`,
          { maxBytes, sampleRate, maxSeconds },
        ));
      }
    });
    // Bounded: a corrupt file can emit errors indefinitely, and we only ever report
    // the tail of this anyway.
    proc.stderr.on('data', (c) => {
      if (stderr.length < 8192) stderr += c.toString();
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new AudioExtractError(`ffmpeg failed to start: ${err.message}`, { bin: FFMPEG_BIN }));
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new AudioExtractError(`ffmpeg exit ${code}`, { stderr: stderr.slice(-500) }));
        return;
      }
      resolve();
    });
  });

  if (bytes === 0) {
    throw new AudioExtractError('decoded zero audio bytes', { filePath, stderr: stderr.slice(-500) });
  }
  if (bytes % 4 !== 0) {
    // f32le is 4 bytes per sample. A ragged length means a truncated pipe, and
    // silently dropping the tail would shift every subsequent sample.
    throw new AudioExtractError(`decoded ${bytes} bytes, not a multiple of 4 (truncated stream?)`, { bytes });
  }

  const buf = Buffer.concat(chunks, bytes);
  const samples = new Float32Array(bytes / BYTES_PER_SAMPLE);
  // readFloatLE rather than a typed-array view: the view would use platform endianness,
  // and we explicitly asked ffmpeg for LITTLE-endian floats.
  //
  // Finiteness is checked in this same pass because it is free here and because a
  // single NaN is catastrophic downstream in a way that looks like a different bug
  // entirely: it propagates through the envelope into every correlation score, so the
  // engine reports `peak: NaN`, an offset pinned at the search edge, and the reason
  // "search-range-too-narrow-to-judge" — sending the operator off to widen a window
  // when the real cause is one corrupt sample. Refuse here, where we can say so.
  let nonFinite = 0;
  let firstBadIndex = -1;
  for (let i = 0; i < samples.length; i += 1) {
    const v = buf.readFloatLE(i * BYTES_PER_SAMPLE);
    if (!Number.isFinite(v)) {
      nonFinite += 1;
      if (firstBadIndex < 0) firstBadIndex = i;
      continue;                 // leave it as 0 so the message, not the maths, reports it
    }
    samples[i] = v;
  }
  if (nonFinite > 0) {
    throw new AudioExtractError(
      `decoded ${nonFinite} non-finite sample(s), first at ${(firstBadIndex / sampleRate).toFixed(3)}s `
      + '— the audio stream is corrupt',
      { nonFinite, firstBadIndex, firstBadSeconds: firstBadIndex / sampleRate },
    );
  }

  const durationSec = samples.length / sampleRate;

  // POST-CONDITION, not a comment. If the decode produced MORE audio than the file is
  // supposed to contain, the `-ac 1` downmix did not happen and channels arrived
  // interleaved — the failure that yields a 2x-wrong offset at full confidence.
  //
  // DELIBERATELY ONE-SIDED. An earlier version also refused ratios below 0.5, which
  // protected against nothing and nearly refused a valid file: ffprobe estimated 532s
  // for a raw ADTS stream whose real content was 308s (ratio 0.579, a hair above the
  // floor), and the error would have blamed channel handling for what is actually an
  // unreliable container estimate. Under-reading cannot produce the confidently-wrong
  // answer; a total decode failure is already caught by the zero-bytes check above.
  // Interleaving always lands at ratio >= 2 (N channels -> N), so 1.5 separates cleanly.
  if (interleavingSuspected(durationSec, source.durationSec)) {
    const ratio = durationSec / source.durationSec;
    throw new AudioExtractError(
      `decoded ${durationSec.toFixed(2)}s from a file probed at ${source.durationSec.toFixed(2)}s `
      + `(${ratio.toFixed(2)}x) — channels are arriving interleaved, not downmixed`,
      { decodedSec: durationSec, probedSec: source.durationSec, sourceChannels: source.channels },
    );
  }

  return {
    samples,
    sampleRate,
    channels: 1,
    durationSec,
    source: {
      // Prefer the PINNED stream's own properties over the format-level probe, so
      // these describe the track we actually decoded rather than whichever one the
      // probe happened to find first.
      channels: chosen ? Number(chosen.channels) : source.channels,
      sampleRate: chosen ? Number(chosen.sample_rate) : source.sampleRate,
      codec: chosen?.codec_name ?? source.codec,
      container: source.container,
      durationSec: source.durationSec,
      audioStreamCount: streams.length,
      audioStreamIndex,
    },
  };
}

export default { extractMono, AudioExtractError, DEFAULT_EXTRACT_RATE };
