/**
 * Extraction — the only tests in this module that touch a REAL encoded file.
 * ============================================================================
 *
 * Every other test here validates against Float32Arrays that a test invented. That is
 * the right way to prove the maths, and it is structurally incapable of proving the one
 * failure that matters most: that a file on disk becomes the shape the engine requires.
 *
 * These tests encode actual media with ffmpeg — real containers, real AAC, real
 * resampling — where the true offset is known by construction, and assert the engine
 * recovers it. They are slower than the rest of the suite by design. They are also the
 * only tests that would have caught a 2x-wrong-but-confident answer, which was
 * demonstrated experimentally before this file was written:
 *
 *     both files stereo, read interleaved -> offset 25.0000s, usable TRUE, margin 3.26
 *     both files correctly downmixed      -> offset 12.5000s, usable TRUE, margin 3.27
 *
 * The wrong answer is indistinguishable from the right one at every downstream gate.
 * That is why the defence lives at the decode boundary and is asserted here.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  extractMono,
  AudioExtractError,
  interleavingSuspected,
  INTERLEAVE_RATIO_THRESHOLD,
} from '../../services/mediaSync/audioExtract.mjs';
import { findOffset } from '../../services/mediaSync/crossCorrelation.mjs';

const FFMPEG = process.env.PLAUD_FFMPEG_PATH || 'ffmpeg';
const RATE = 8000;
const FRAME_MS = 1000 / 30;

let dir;
let ffmpegAvailable = true;

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (c) => { err += c.toString(); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-300)}`))));
  });
}

/**
 * Sparse bursty content. NOT a tone: periodic content correlates with itself at every
 * period, which manufactures the exact ambiguity the engine is designed to refuse — a
 * test built on a tone measures the fixture, not the code.
 */
function speechLike(seconds, rate, seed = 7) {
  const n = Math.floor(seconds * rate);
  const out = new Float32Array(n);
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let i = 0;
  while (i < n) {
    i += Math.floor((0.05 + rnd() * 0.3) * rate);
    const burst = Math.floor((0.08 + rnd() * 0.2) * rate);
    const amp = 0.3 + rnd() * 0.6;
    for (let k = 0; k < burst && i + k < n; k += 1) {
      out[i + k] = (rnd() * 2 - 1) * amp * (0.5 - 0.5 * Math.cos((2 * Math.PI * k) / burst));
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

const OFFSET = 6.25;   // seconds the mic content sits later; not a round second, so an
                       // off-by-one-second bug cannot hide behind a lucky number
const DUR = 40;        // long enough to clear the 8s overlap floor with room to spare

beforeAll(async () => {
  try {
    await run(['-version']);
  } catch {
    ffmpegAvailable = false;
    return;
  }
  dir = mkdtempSync(join(tmpdir(), 'swan-sync-test-'));
  const master = join(dir, 'master.wav');
  writeWav(master, speechLike(DUR + OFFSET + 5, 48000, 11), 48000);

  // Camera: STEREO 48k AAC, both channels identical, noise bed, low level.
  await run(['-y', '-v', 'error',
    '-ss', String(OFFSET), '-t', String(DUR), '-i', master,
    '-f', 'lavfi', '-t', String(DUR), '-i', 'anoisesrc=r=48000:c=pink:a=0.05',
    '-filter_complex', '[0:a]volume=0.5[p];[p][1:a]amix=inputs=2:duration=first[m];[m]pan=stereo|c0=c0|c1=c0[a]',
    '-map', '[a]', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
    join(dir, 'camera.mp4')]);

  // Mic: MONO 44.1k AAC, clean. Deliberately a different rate AND channel count —
  // the pairing that a matched mono/mono fixture would never exercise.
  await run(['-y', '-v', 'error',
    '-ss', '0', '-t', String(DUR + OFFSET), '-i', master,
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '1',
    join(dir, 'mic.m4a')]);

  // Stereo mic, for the both-stereo trap case.
  await run(['-y', '-v', 'error', '-i', join(dir, 'mic.m4a'), '-ac', '2',
    '-c:a', 'aac', '-b:a', '192k', join(dir, 'mic_stereo.m4a')]);
}, 120_000);

afterAll(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

const maybe = () => (ffmpegAvailable ? it : it.skip);

describe('audio extraction from real encoded media', () => {
  maybe()('downmixes a stereo camera file to exactly one channel', async () => {
    const r = await extractMono(join(dir, 'camera.mp4'), { sampleRate: RATE });
    expect(r.channels).toBe(1);
    expect(r.source.channels).toBe(2);          // it really was stereo going in
    expect(r.sampleRate).toBe(RATE);
    expect(r.source.sampleRate).toBe(48000);
    // Sample count must reflect ONE channel. Two would double this.
    expect(r.durationSec).toBeCloseTo(DUR, 0);
    expect(r.samples.length).toBeCloseTo(DUR * RATE, -2);
  }, 60_000);

  maybe()('normalises a different source rate onto the requested timebase', async () => {
    const r = await extractMono(join(dir, 'mic.m4a'), { sampleRate: RATE });
    expect(r.source.sampleRate).toBe(44100);
    expect(r.sampleRate).toBe(RATE);
    expect(r.channels).toBe(1);
  }, 60_000);

  maybe()('recovers a known offset from real AAC across mismatched rate and channels', async () => {
    const [cam, mic] = await Promise.all([
      extractMono(join(dir, 'camera.mp4'), { sampleRate: RATE }),
      extractMono(join(dir, 'mic.m4a'), { sampleRate: RATE }),
    ]);
    const r = findOffset(cam.samples, mic.samples, {
      referenceSampleRate: cam.sampleRate,
      targetSampleRate: mic.sampleRate,
      maxOffsetSeconds: 60,
    });
    expect(r.usable).toBe(true);
    // Sign matters as much as magnitude: the mic content occurs LATER, so positive.
    expect(r.offsetSeconds).toBeGreaterThan(0);
    expect(Math.abs(r.offsetSeconds - OFFSET) * 1000).toBeLessThan(FRAME_MS);
  }, 60_000);

  /**
   * THE REGRESSION THAT JUSTIFIES THIS FILE.
   *
   * If `-ac 1` is ever dropped, or a future caller decodes by hand, two stereo files
   * read as mono are each 2x time-stretched by the SAME factor — so correlation still
   * succeeds and the offset is exactly 2x wrong at full confidence. This asserts the
   * shipped path does not do that, by comparing it against a deliberately broken decode.
   */
  maybe()('is not fooled by two stereo files (the 2x-wrong-but-confident case)', async () => {
    const decodeRaw = (path, downmix) => new Promise((res, rej) => {
      const a = ['-v', 'error', '-i', path, '-vn'];
      if (downmix) a.push('-ac', '1');
      a.push('-ar', String(RATE), '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1');
      const p = spawn(FFMPEG, a, { stdio: ['ignore', 'pipe', 'pipe'] });
      const cs = []; let n = 0;
      p.stdout.on('data', (c) => { cs.push(c); n += c.length; });
      p.on('error', rej);
      p.on('close', () => {
        const b = Buffer.concat(cs, n); const s = new Float32Array(n / 4);
        for (let i = 0; i < s.length; i += 1) s[i] = b.readFloatLE(i * 4);
        res(s);
      });
    });

    const opts = { referenceSampleRate: RATE, targetSampleRate: RATE, maxOffsetSeconds: 60 };

    // Broken path: both stereo, no downmix.
    const broken = findOffset(
      await decodeRaw(join(dir, 'camera.mp4'), false),
      await decodeRaw(join(dir, 'mic_stereo.m4a'), false),
      opts,
    );
    // This is the point of the test: the WRONG answer looks perfectly healthy.
    expect(broken.usable).toBe(true);
    expect(Math.abs(broken.offsetSeconds - OFFSET * 2)).toBeLessThan(0.1);

    // Shipped path: extractMono, which downmixes.
    const [cam, mic] = await Promise.all([
      extractMono(join(dir, 'camera.mp4'), { sampleRate: RATE }),
      extractMono(join(dir, 'mic_stereo.m4a'), { sampleRate: RATE }),
    ]);
    const correct = findOffset(cam.samples, mic.samples, opts);
    expect(correct.usable).toBe(true);
    expect(Math.abs(correct.offsetSeconds - OFFSET) * 1000).toBeLessThan(FRAME_MS);

    // And the two disagree by exactly the factor that makes this dangerous.
    expect(broken.offsetSeconds / correct.offsetSeconds).toBeCloseTo(2, 1);
  }, 90_000);

  /**
   * ffprobe's first-audio-stream and ffmpeg's most-channels default selection disagree
   * on any multi-track file. Before this was pinned, the metadata described one
   * microphone while the samples came from another — and the duration guard could not
   * see it, because the wrong stream correctly downmixed has the right duration.
   */
  maybe()('decodes the audio stream it reports, on a multi-stream file', async () => {
    const multi = join(dir, 'multi.mp4');
    await run(['-y', '-v', 'error',
      '-i', join(dir, 'mic.m4a'), '-i', join(dir, 'camera.mp4'),
      '-map', '0:a', '-map', '1:a', '-c:a', 'aac', '-shortest', multi]);

    const s0 = await extractMono(multi, { sampleRate: RATE, audioStreamIndex: 0 });
    const s1 = await extractMono(multi, { sampleRate: RATE, audioStreamIndex: 1 });

    expect(s0.source.audioStreamCount).toBe(2);
    // Each reports the properties of the track it actually decoded.
    expect(s0.source.channels).toBe(1);
    expect(s0.source.sampleRate).toBe(44100);
    expect(s1.source.channels).toBe(2);
    expect(s1.source.sampleRate).toBe(48000);

    // And they are genuinely different audio, not the same stream twice.
    const n = Math.min(s0.samples.length, s1.samples.length);
    let diff = 0;
    for (let i = 0; i < n; i += 97) diff += Math.abs(s0.samples[i] - s1.samples[i]);
    expect(diff / (n / 97)).toBeGreaterThan(0.001);

    await expect(extractMono(multi, { sampleRate: RATE, audioStreamIndex: 5 }))
      .rejects.toThrow(AudioExtractError);
  }, 90_000);

  /**
   * Two files that share NO content must not produce a usable answer.
   *
   * They used to. The overlap floor degrades to whatever geometry allows and flags
   * `lowOverlap`, but the peak gate stayed at 0.3 — a threshold calibrated for 8s of
   * overlap. Measured worst spurious correlation between UNRELATED speech envelopes is
   * 0.682 at 3s and 0.963 at 1s, so below the floor that gate passes junk routinely.
   * A 3s clip against a 90s take returned offset -1.3376s at peak 0.5566, `usable:true`.
   */
  maybe()('refuses a clip too short to share meaningful overlap', async () => {
    const tiny = join(dir, 'tiny.m4a');
    await run(['-y', '-v', 'error', '-t', '3', '-i', join(dir, 'mic.m4a'), '-c:a', 'aac', tiny]);

    const [cam, small] = await Promise.all([
      extractMono(join(dir, 'camera.mp4'), { sampleRate: RATE }),
      extractMono(tiny, { sampleRate: RATE }),
    ]);
    const r = findOffset(cam.samples, small.samples, {
      referenceSampleRate: RATE, targetSampleRate: RATE, maxOffsetSeconds: 60,
    });
    expect(r.usable).toBe(false);
    expect(r.reason).toBe('insufficient-overlap-to-judge');
    expect(r.lowOverlap).toBe(true);
    // The offset is still reported — a UI may offer it for verification by ear. What is
    // withheld is the claim that it can be trusted.
    expect(Number.isFinite(r.offsetSeconds)).toBe(true);
  }, 90_000);

  maybe()('refuses a file it cannot decode rather than returning empty audio', async () => {
    const bogus = join(dir, 'not-media.mp4');
    writeFileSync(bogus, Buffer.from('this is not a media file'));
    await expect(extractMono(bogus, { sampleRate: RATE })).rejects.toThrow(AudioExtractError);
  }, 60_000);

  maybe()('refuses a missing file with a typed error', async () => {
    await expect(extractMono(join(dir, 'nope.mp4'), { sampleRate: RATE }))
      .rejects.toThrow(AudioExtractError);
  }, 60_000);

  it('requires a path', async () => {
    await expect(extractMono('')).rejects.toThrow(AudioExtractError);
  });
});

/**
 * The backstop for "someone edits the ffmpeg args and drops `-ac 1`". Tested directly
 * because the shipped path cannot produce the failure any more — which is the point,
 * and also the reason this protection would otherwise go unverified forever.
 */
describe('interleaving guard', () => {
  it('flags the channel counts that actually occur', () => {
    // Measured, not assumed: an undownmixed stereo decode of a 90s file yielded 180.01s.
    expect(interleavingSuspected(180.01, 90.00)).toBe(true);   // stereo  -> 2.0x
    expect(interleavingSuspected(360, 90)).toBe(true);         // 4-track -> 4.0x
    expect(interleavingSuspected(540, 90)).toBe(true);         // 5.1     -> 6.0x
  });

  it('does not flag an honest decode, including container-estimate slop', () => {
    expect(interleavingSuspected(90.01, 90.00)).toBe(false);
    // The real case that nearly broke this: ffprobe estimated 532s for a raw ADTS
    // stream whose true content was 308s. Under-reading must never be flagged.
    expect(interleavingSuspected(308.04, 532.14)).toBe(false);
    expect(interleavingSuspected(45, 90)).toBe(false);
  });

  it('declines to judge when there is nothing to judge', () => {
    expect(interleavingSuspected(10, 0)).toBe(false);
    expect(interleavingSuspected(10, null)).toBe(false);
    expect(interleavingSuspected(10, undefined)).toBe(false);
    expect(interleavingSuspected(2, 0.5)).toBe(false);   // too short to be meaningful
  });

  /**
   * A single NaN is catastrophic and DISGUISES ITSELF. Measured on a 40s signal with
   * one NaN sample: peak NaN, offset pinned at the search edge, reason
   * "search-range-too-narrow-to-judge". Safe (it refuses) but the diagnosis points at
   * the wrong problem, so extraction refuses first, where the true cause is nameable.
   */
  it('a single non-finite sample corrupts the whole measurement', async () => {
    const { findOffset: fo } = await import('../../services/mediaSync/crossCorrelation.mjs');
    const SR = 800; const secs = 40; const n = SR * secs;
    const a = new Float32Array(n); const b = new Float32Array(n);
    let s = 7;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let i = 0;
    while (i < n) {
      i += Math.floor((0.05 + rnd() * 0.3) * SR);
      const bl = Math.floor((0.08 + rnd() * 0.2) * SR); const amp = 0.3 + rnd() * 0.6;
      for (let k = 0; k < bl && i + k < n; k += 1) a[i + k] = (rnd() * 2 - 1) * amp;
      i += bl;
    }
    const shift = 3 * SR;
    for (let j = 0; j < n; j += 1) b[j] = j - shift >= 0 ? a[j - shift] : 0;

    const clean = fo(a, b, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(clean.usable).toBe(true);
    expect(clean.offsetSeconds).toBeCloseTo(3, 2);

    // One bad sample out of 32,000 destroys it — and does NOT report why.
    const poisoned = Float32Array.from(a);
    poisoned[Math.floor(n / 2)] = NaN;
    const bad = fo(poisoned, b, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(bad.usable).toBe(false);
    expect(Number.isNaN(bad.peak)).toBe(true);
    // Documented so the misleading reason is a known property, not a surprise.
    expect(bad.reason).toBe('search-range-too-narrow-to-judge');
  });

  it('sits below the smallest real failure and above normal slop', () => {
    // Derived, not restated: the threshold must separate 1.0x from 2.0x.
    expect(INTERLEAVE_RATIO_THRESHOLD).toBeGreaterThan(1);
    expect(INTERLEAVE_RATIO_THRESHOLD).toBeLessThan(2);
  });
});
