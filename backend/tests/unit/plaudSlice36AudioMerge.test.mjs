/**
 * Phase 3 Slice 3.6 — audioMergeService source-text locks
 * =========================================================
 * Source-text locks for the ffmpeg subprocess wrapper. Behavioral
 * tests with real ffmpeg are deferred to slice 3.7 integration where
 * they run end-to-end through the merge endpoint with multiple
 * fixture audio files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = readFileSync(resolve(__dirname, '../../services/audioMergeService.mjs'), 'utf8');

describe('Slice 3.6 — audioMergeService source contract', () => {
  it('exports normalizeClip, mergeNormalizedClips, mergeAndCleanup', () => {
    expect(SRC).toMatch(/export\s+async\s+function\s+normalizeClip/);
    expect(SRC).toMatch(/export\s+async\s+function\s+mergeNormalizedClips/);
    expect(SRC).toMatch(/export\s+async\s+function\s+mergeAndCleanup/);
  });

  it('exports FfmpegError class with code field', () => {
    expect(SRC).toMatch(/export\s+class\s+FfmpegError\s+extends\s+Error/);
    expect(SRC).toMatch(/this\.code\s*=\s*code/);
  });

  it('uses spawn (NOT shell:true) — Codex Round 1 prescription', () => {
    expect(SRC).toMatch(/import\s+\{\s*spawn\s*\}\s+from\s+'node:child_process'/);
    // Negative lock: no shell:true in any spawn call
    expect(SRC).not.toMatch(/^\s*shell\s*:\s*true\s*[,}]/m);
  });

  it('respects PLAUD_FFMPEG_PATH env override', () => {
    expect(SRC).toMatch(/process\.env\.PLAUD_FFMPEG_PATH/);
  });

  it('reads PLAUD_DISK_BASE per-call (testable, no module-init caching)', () => {
    expect(SRC).toMatch(/function\s+getPlaudDiskBase/);
    expect(SRC).toMatch(/process\.env\.PLAUD_DISK_BASE\s*\|\|\s*['"]\/tmp\/plaud['"]/);
  });

  it('normalizeClip uses libmp3lame mono 24kHz 64kbit', () => {
    expect(SRC).toMatch(/['"]libmp3lame['"]/);
    expect(SRC).toMatch(/['"]-ar['"]\s*,\s*['"]24000['"]/);
    expect(SRC).toMatch(/['"]-ac['"]\s*,\s*['"]1['"]/);
    expect(SRC).toMatch(/['"]-b:a['"]\s*,\s*['"]64k['"]/);
  });

  it('normalizeClip timeouts SIGKILL and rejects with FFMPEG_NORMALIZE_TIMEOUT', () => {
    expect(SRC).toMatch(/proc\.kill\(\s*['"]SIGKILL['"]\s*\)/);
    expect(SRC).toMatch(/FFMPEG_NORMALIZE_TIMEOUT/);
  });

  it('mergeNormalizedClips uses concat demuxer with -safe 0', () => {
    expect(SRC).toMatch(/['"]-f['"]\s*,\s*['"]concat['"]/);
    expect(SRC).toMatch(/['"]-safe['"]\s*,\s*['"]0['"]/);
  });

  it('mergeNormalizedClips uses -c:a copy (inputs already normalized)', () => {
    expect(SRC).toMatch(/['"]-c:a['"]\s*,\s*['"]copy['"]/);
  });

  it('mergeNormalizedClips path validation uses path.resolve against PLAUD_DISK_BASE/_normalized', () => {
    expect(SRC).toMatch(/path\.resolve\(\s*base\s*,\s*['"]_normalized['"]\s*\)/);
    expect(SRC).toMatch(/resolved\.startsWith\(\s*normalizedBase\s*\+\s*path\.sep\s*\)/);
  });

  it('mergeNormalizedClips path validation rejects non-UUID dir + non-numeric file (Codex Round 3 MEDIUM #1)', () => {
    expect(SRC).toMatch(/\[0-9a-f-\]\{36\}\[\\\\\/\]\\d\+\\\.mp3/);
  });

  it('mergeNormalizedClips escapes single quotes in concat list (no command injection)', () => {
    expect(SRC).toMatch(/replace\(\s*\/'\/g\s*,/);
  });

  it('mergeNormalizedClips creates list dir with mode 0700', () => {
    expect(SRC).toMatch(/mkdir\([^)]*\{\s*recursive:\s*true,\s*mode:\s*0o700/);
  });

  it('mergeNormalizedClips writes list file with mode 0600', () => {
    expect(SRC).toMatch(/writeFile\([^)]*listFile[^)]*0o600/);
  });

  it('cleanup runs in BOTH exit and error paths (Codex Round 2 LOW #2)', () => {
    // The unified cleanup() function should be referenced in both proc.on('exit') and proc.on('error')
    expect(SRC).toMatch(/proc\.on\(\s*['"]exit['"][\s\S]*?await\s+cleanup\(\)/);
    expect(SRC).toMatch(/proc\.on\(\s*['"]error['"][\s\S]*?await\s+cleanup\(\)/);
  });

  it('stderr capped to last 4KB', () => {
    expect(SRC).toMatch(/stderr\.length\s*>\s*4096/);
  });

  it('default timeouts: 60s normalize, 120s concat (overridable via env)', () => {
    expect(SRC).toMatch(/PLAUD_NORMALIZE_TIMEOUT_MS[\s\S]{0,80}60_?000/);
    expect(SRC).toMatch(/PLAUD_MERGE_TIMEOUT_MS[\s\S]{0,80}120_?000/);
  });

  it('mergeAndCleanup namespaces normalized intermediate by mergeRequestId UUID', () => {
    expect(SRC).toMatch(/_normalized.*mergeRequestId/);
    expect(SRC).toMatch(/\/\^\[0-9a-fA-F-\]\{36\}\$\//);
  });

  it('mergeAndCleanup deletes normalized intermediates in finally', () => {
    expect(SRC).toMatch(/finally\s*\{[\s\S]{0,300}fs\.unlink/);
  });
});
