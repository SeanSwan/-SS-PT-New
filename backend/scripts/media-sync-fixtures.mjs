// NOTE: no shebang, deliberately. esbuild (vitest) fails on a shebang in a
// NON-entry module, and with a CRLF checkout the line ends in a carriage return
// that reports as 'Invalid or unexpected token'. Invoke with `node <path>`.
/**
 * Build REAL media files with a KNOWN offset, to test the extraction layer end to end.
 * ============================================================================
 *
 * The sync engine's entire evidence base is Float32Arrays invented by tests. This
 * generator closes the smallest honest part of that gap: it produces actual encoded
 * media — real containers, real codecs, real resampling, real lossy compression — where
 * the true answer is known by construction, so the recovered offset can be CHECKED
 * rather than eyeballed.
 *
 * It does not replace Sean's camera. Synthetic speech is not speech, and AAC on a
 * generated signal is not AAC on a room. What it DOES prove is every mechanical link
 * between a file on disk and a number out of `findOffset` — container demux, channel
 * downmix, sample-rate conversion, float conversion, sign convention — which is exactly
 * where a 2x-wrong-but-confident answer would come from.
 *
 * ── WHY THE DEFAULT PAIR IS STEREO-48k AGAINST MONO-44.1k ───────────────────
 * Because that pair is the trap. A Sony A7R IV writes 2-channel 48kHz; a separate
 * recorder may write mono 44.1kHz. If the downmix silently fails, decoded stereo is
 * read as mono at double the apparent rate and every offset comes back 2x wrong while
 * still clearing the confidence gate. A fixture pair that is mono-on-both-sides at a
 * matched rate would pass happily while that bug is fully present.
 *
 *   node backend/scripts/media-sync-fixtures.mjs [--offset 12.5] [--duration 90]
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FFMPEG_BIN = process.env.PLAUD_FFMPEG_PATH || 'ffmpeg';

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (c) => { err += c.toString(); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${bin} exit ${code}: ${err.slice(-400)}`))));
  });
}

/**
 * Speech-like, which for alignment purposes means ONE thing: a sparse, bursty energy
 * envelope. A periodic tone is the classic bad fixture — it correlates with itself at
 * every period, so it manufactures the ambiguity the engine is supposed to refuse, and
 * a test built on it measures the fixture rather than the code. (That mistake has
 * already been made once in this module's history.)
 *
 * So: syllable bursts of randomized length at randomized spacing, with pauses. The
 * carrier is noise rather than a tone, because noise has no self-similar period.
 */
function speechLike(seconds, rate, seed = 1) {
  const n = Math.floor(seconds * rate);
  const out = new Float32Array(n);
  // Deterministic PRNG — a fixture that changes between runs cannot be debugged.
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let i = 0;
  while (i < n) {
    const pause = Math.floor((0.05 + rnd() * 0.35) * rate);
    i += pause;
    const burst = Math.floor((0.08 + rnd() * 0.22) * rate);
    const amp = 0.25 + rnd() * 0.6;
    for (let k = 0; k < burst && i + k < n; k += 1) {
      // Raised-cosine envelope so bursts have soft edges like syllables, not clicks.
      const env = 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / burst);
      out[i + k] = (rnd() * 2 - 1) * amp * env;
    }
    i += burst;
  }
  return out;
}

function writeWav(path, samples, rate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (flag, dflt) => {
    const i = argv.indexOf(flag);
    return i === -1 ? dflt : Number(argv[i + 1]);
  };
  const OFFSET = get('--offset', 12.5);      // seconds the mic content sits later
  const DURATION = get('--duration', 90);    // seconds of shared programme
  const outDir = join(tmpdir(), 'swan-media-sync-fixtures');
  mkdirSync(outDir, { recursive: true });

  const MASTER_RATE = 48000;
  // Generate MORE than we need so both files can be trimmed to different windows of
  // the same underlying performance — which is what two devices recording one take are.
  const master = speechLike(DURATION + Math.abs(OFFSET) + 20, MASTER_RATE, 42);
  const masterPath = join(outDir, '_master.wav');
  writeWav(masterPath, master, MASTER_RATE);

  // CAMERA: stereo, 48kHz, AAC in MP4, with a noise bed and reduced level — the
  // scratch-mic character. Starts at t=OFFSET into the master.
  const cameraPath = join(outDir, 'camera_stereo_48k.mp4');
  await run(FFMPEG_BIN, [
    '-y', '-v', 'error',
    '-ss', String(Math.max(0, OFFSET)), '-t', String(DURATION), '-i', masterPath,
    '-f', 'lavfi', '-t', String(DURATION), '-i', `anoisesrc=r=${MASTER_RATE}:c=pink:a=0.06`,
    // Mix programme with a noise bed, then duplicate to two channels. Both channels
    // carry the same programme, which is precisely why a failed downmix stays confident.
    '-filter_complex', '[0:a]volume=0.5[p];[p][1:a]amix=inputs=2:duration=first[m];[m]pan=stereo|c0=c0|c1=c0[a]',
    '-map', '[a]', '-c:a', 'aac', '-b:a', '128k', '-ar', String(MASTER_RATE), '-ac', '2',
    cameraPath,
  ]);

  // MIC: mono, 44.1kHz, different codec, clean and loud — the lav character. Starts at
  // t=0 of the master, so its content runs EARLIER in wall-clock than the camera's.
  const micPath = join(outDir, 'mic_mono_44k.m4a');
  await run(FFMPEG_BIN, [
    '-y', '-v', 'error',
    '-ss', '0', '-t', String(DURATION + OFFSET), '-i', masterPath,
    '-af', 'volume=1.0', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '1',
    micPath,
  ]);

  // ── THE EXPECTED ANSWER, DERIVED NOT GUESSED ──────────────────────────────
  // The camera begins at master time OFFSET; the mic begins at master time 0. A given
  // event therefore sits at (t_master - OFFSET) in the camera and at t_master in the
  // mic — so it occurs LATER in the mic's own timeline by exactly OFFSET.
  // Per the module's sign convention (positive = clean track's content occurs later),
  // findOffset(camera, mic) must return +OFFSET.
  const expected = OFFSET;

  process.stdout.write(`${JSON.stringify({
    outDir, camera: cameraPath, mic: micPath,
    expectedOffsetSeconds: expected,
    durationSeconds: DURATION,
    note: 'findOffset(camera, mic) should return expectedOffsetSeconds',
  }, null, 2)}\n`);
}

// Only run when invoked directly. Importing this module used to execute main() and
// silently regenerate every fixture with DEFAULT parameters — which happened during an
// import smoke test and later produced measurements that disagreed with the run that
// had supposedly created them. A script with side effects on import is a script that
// will eventually rewrite state something else is mid-way through using.
const invokedDirectly = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly) {
  main().catch((e) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}

export { main as generateFixtures, speechLike, writeWav };
