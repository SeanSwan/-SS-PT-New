/**
 * videoCompression.logic.test.ts — presets, ffmpeg args, size/cost math, validation.
 */
import { describe, it, expect } from 'vitest';
import {
  PRESETS,
  DEFAULT_PRESET_ID,
  getPreset,
  buildFfmpegArgs,
  estimateOutputBytes,
  compressionSavings,
  monthlyUsdForBytes,
  validateInputFile,
  outputFileName,
  savingsSummary,
  MAX_INPUT_BYTES,
  SOFT_WARN_BYTES,
} from './videoCompression.logic';

describe('presets', () => {
  it('exposes high/balanced/small with balanced as default', () => {
    expect(PRESETS.map(p => p.id)).toEqual(['high', 'balanced', 'small']);
    expect(DEFAULT_PRESET_ID).toBe('balanced');
    expect(getPreset('small').crf).toBeGreaterThan(getPreset('high').crf); // smaller = higher crf
  });
  it('falls back to balanced for an unknown id', () => {
    // @ts-expect-error intentional bad id
    expect(getPreset('bogus').id).toBe('balanced');
  });
});

describe('buildFfmpegArgs', () => {
  it('produces an H.264/AAC mp4 argv with capped, non-upscaling scale + faststart', () => {
    const args = buildFfmpegArgs(getPreset('balanced'), 'in.mov', 'out.mp4');
    expect(args[0]).toBe('-i');
    expect(args[1]).toBe('in.mov');
    expect(args[args.length - 1]).toBe('out.mp4');
    expect(args).toContain('libx264');
    expect(args).toContain('aac');
    expect(args).toContain('+faststart');
    expect(args).toContain('-crf');
    // crf value follows the -crf flag
    expect(args[args.indexOf('-crf') + 1]).toBe('26');
    // scale caps height, escapes the min() comma for the filtergraph (not a shell)
    const vf = args[args.indexOf('-vf') + 1];
    expect(vf).toBe('scale=-2:min(720\\,ih)');
  });
});

describe('estimateOutputBytes', () => {
  it('scales by the preset ratio and floors junk to 0', () => {
    expect(estimateOutputBytes(1000, getPreset('balanced'))).toBe(350);
    expect(estimateOutputBytes(0, getPreset('high'))).toBe(0);
    expect(estimateOutputBytes(-5, getPreset('small'))).toBe(0);
  });
});

describe('compressionSavings', () => {
  it('computes saved bytes and percent, clamped to >= 0', () => {
    expect(compressionSavings(1000, 250)).toEqual({ savedBytes: 750, savedPct: 75 });
  });
  it('reports 0% when the output is somehow bigger', () => {
    expect(compressionSavings(1000, 1200)).toEqual({ savedBytes: 0, savedPct: 0 });
  });
  it('is safe on empty input', () => {
    expect(compressionSavings(0, 0)).toEqual({ savedBytes: 0, savedPct: 0 });
  });
});

describe('monthlyUsdForBytes', () => {
  it('prices a GB at the R2 rate', () => {
    expect(monthlyUsdForBytes(1024 ** 3)).toBeCloseTo(0.015, 6);
    expect(monthlyUsdForBytes(0)).toBe(0);
  });
});

describe('validateInputFile', () => {
  it('accepts a normal video by mime or extension', () => {
    expect(validateInputFile({ type: 'video/mp4', size: 1000, name: 'a.mp4' })).toEqual({ ok: true, warn: null });
    expect(validateInputFile({ type: '', size: 1000, name: 'a.MOV' })).toEqual({ ok: true, warn: null });
  });
  it('rejects non-video and empty files', () => {
    expect(validateInputFile({ type: 'image/png', size: 10, name: 'a.png' })).toEqual({ ok: false, error: expect.stringMatching(/video/i) });
    expect(validateInputFile({ type: 'video/mp4', size: 0, name: 'a.mp4' })).toEqual({ ok: false, error: expect.stringMatching(/empty/i) });
  });
  it('rejects files over the hard cap', () => {
    const r = validateInputFile({ type: 'video/mp4', size: MAX_INPUT_BYTES + 1, name: 'big.mp4' });
    expect(r.ok).toBe(false);
  });
  it('warns (but allows) files over the soft threshold', () => {
    const r = validateInputFile({ type: 'video/mp4', size: SOFT_WARN_BYTES + 1, name: 'mid.mp4' });
    expect(r).toEqual({ ok: true, warn: expect.stringMatching(/large/i) });
  });
});

describe('outputFileName', () => {
  it('swaps the extension to .mp4 and tags the preset, sanitizing the base', () => {
    expect(outputFileName('squat.mov', 'balanced')).toBe('squat-web-balanced.mp4');
    expect(outputFileName('My Clip (1).webm', 'small')).toBe('My_Clip_1_-web-small.mp4');
    expect(outputFileName('', 'high')).toBe('video-web-high.mp4');
  });
});

describe('savingsSummary', () => {
  it('renders a before -> after one-liner with cost saved', () => {
    const s = savingsSummary(10 * 1024 * 1024, 2 * 1024 * 1024);
    expect(s).toContain('10.0 MB → 2.0 MB');
    expect(s).toContain('80% smaller');
    expect(s).toContain('/mo saved on R2');
  });
});
