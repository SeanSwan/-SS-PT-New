/**
 * Phase 3 Slice 3.2 — audioProbeService source-text + behavioral locks
 * =====================================================================
 * Locks the design choices for ffprobe + volumedetect wrapping. Behavioral
 * tests run only when ffmpeg/ffprobe are present (Codex Round 2 gap #9 —
 * cross-platform test strategy: skip when binaries missing rather than fail
 * the whole suite).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SVC_PATH = resolve(__dirname, '../../services/audioProbeService.mjs');
const SOURCE = readFileSync(SVC_PATH, 'utf8');

function hasBinary(bin) {
  try {
    const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
    return r.status === 0;
  } catch { return false; }
}

const HAS_FFMPEG = hasBinary('ffmpeg');
const HAS_FFPROBE = hasBinary('ffprobe');

describe('Slice 3.2 — audioProbeService source contract', () => {
  it('exports probeFile and detectSilence', () => {
    expect(SOURCE).toMatch(/export\s+(async\s+)?function\s+probeFile/);
    expect(SOURCE).toMatch(/export\s+(async\s+)?function\s+detectSilence/);
  });

  it('exports ClipCorruptError and ClipProbeTimeoutError classes', () => {
    expect(SOURCE).toMatch(/export\s+class\s+ClipCorruptError\s+extends\s+Error/);
    expect(SOURCE).toMatch(/export\s+class\s+ClipProbeTimeoutError\s+extends\s+Error/);
  });

  it('respects PLAUD_FFPROBE_PATH and PLAUD_FFMPEG_PATH env overrides', () => {
    expect(SOURCE).toMatch(/process\.env\.PLAUD_FFPROBE_PATH/);
    expect(SOURCE).toMatch(/process\.env\.PLAUD_FFMPEG_PATH/);
  });

  it('uses spawn (NOT shell:true) for both ffprobe and ffmpeg invocations', () => {
    expect(SOURCE).toMatch(/import\s+\{\s*spawn\s*\}\s+from\s+'node:child_process'/);
    // Lock against `shell: true` appearing in a spawn options object.
    // The literal phrase "shell:true" can appear in code comments as a
    // doc warning; the bug we're guarding against is `shell: true` as
    // an actual option value passed to spawn.
    expect(SOURCE).not.toMatch(/^\s*shell\s*:\s*true\s*[,}]/m);
  });

  it('caps stderr capture at 4KB to bound memory', () => {
    expect(SOURCE).toMatch(/stderr\.length\s*>\s*4096/);
  });

  it('caps stdout capture to bound memory (ffprobe JSON could grow)', () => {
    expect(SOURCE).toMatch(/stdout\.length\s*>\s*\d{4,}/);
  });

  it('SIGKILLs subprocesses on timeout', () => {
    expect(SOURCE).toMatch(/proc\.kill\(\s*['"]SIGKILL['"]\s*\)/);
  });

  it('detectSilence uses BOTH mean AND max thresholds (Codex Round 2 MEDIUM — not mean alone)', () => {
    expect(SOURCE).toMatch(/meanDb\s*<\s*meanThresholdDb\s*&&\s*maxDb\s*<\s*maxThresholdDb/);
  });

  it('default silence thresholds are mean=-50dB and max=-30dB', () => {
    expect(SOURCE).toMatch(/meanThresholdDb\s*\?\?\s*-50/);
    expect(SOURCE).toMatch(/maxThresholdDb\s*\?\?\s*-30/);
  });

  it('throws ClipCorruptError when volumedetect output missing readings (no silent default)', () => {
    expect(SOURCE).toMatch(/volumedetect output missing mean\/max/);
  });
});

describe.skipIf(!HAS_FFMPEG || !HAS_FFPROBE)('Slice 3.2 — audioProbeService behavior (live ffmpeg/ffprobe)', () => {
  let tmpDir;
  let silentClipPath;
  let toneClipPath;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'plaud-probe-test-'));
    silentClipPath = join(tmpDir, 'silent.mp3');
    toneClipPath = join(tmpDir, 'tone.mp3');

    // Generate 2s silent MP3
    spawnSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=24000',
      '-t', '2', '-c:a', 'libmp3lame', '-b:a', '64k', silentClipPath,
    ]);

    // Generate 2s 1kHz tone MP3 at full volume
    spawnSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=2:sample_rate=24000',
      '-c:a', 'libmp3lame', '-b:a', '64k', toneClipPath,
    ]);
  });

  afterAll(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('probeFile returns duration + codec for a valid clip', async () => {
    const { probeFile } = await import('../../services/audioProbeService.mjs');
    const meta = await probeFile(toneClipPath);
    expect(meta.durationSec).toBeGreaterThan(1.5);
    expect(meta.durationSec).toBeLessThan(2.5);
    expect(meta.codec).toMatch(/mp3/i);
    expect(meta.channels).toBe(1);
  });

  it('probeFile throws ClipCorruptError on a non-audio file', async () => {
    const { probeFile, ClipCorruptError } = await import('../../services/audioProbeService.mjs');
    const fakePath = join(tmpDir, 'notaudio.mp3');
    writeFileSync(fakePath, 'this is not audio data');
    await expect(probeFile(fakePath)).rejects.toBeInstanceOf(ClipCorruptError);
  });

  it('detectSilence flags isSilent=true on a silent clip', async () => {
    const { detectSilence } = await import('../../services/audioProbeService.mjs');
    const { isSilent, meanDb, maxDb } = await detectSilence(silentClipPath);
    expect(isSilent).toBe(true);
    expect(meanDb).toBeLessThan(-50);
    expect(maxDb).toBeLessThan(-30);
  });

  it('detectSilence flags isSilent=false on a 1kHz tone (loud)', async () => {
    const { detectSilence } = await import('../../services/audioProbeService.mjs');
    const { isSilent, maxDb } = await detectSilence(toneClipPath);
    expect(isSilent).toBe(false);
    expect(maxDb).toBeGreaterThan(-30);
  });
});
