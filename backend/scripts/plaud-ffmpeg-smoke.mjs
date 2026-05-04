#!/usr/bin/env node
/**
 * PLAUD ffmpeg/ffprobe presence smoke
 * ====================================
 * Slice 3.1 first-action smoke per plan §9 (re-ordered per Codex Round 1 HIGH #3).
 * Verifies the runtime environment has ffmpeg + ffprobe available before
 * any merge-pipeline code is exercised.
 *
 * Usage:
 *   node backend/scripts/plaud-ffmpeg-smoke.mjs
 *
 * Exit codes:
 *   0 — both ffmpeg and ffprobe present and reporting versions
 *   2 — ffmpeg missing or non-functional
 *   3 — ffprobe missing or non-functional
 *   4 — both missing
 *
 * If this script exits non-zero on Render, update the Render Build
 * Command to install ffmpeg via apt-get install -y ffmpeg, then re-run
 * the smoke. See docs/ai-workflow/references/PLAUD-DEPLOYMENT.md (created
 * in slice 3.1).
 */
import { spawnSync } from 'node:child_process';

function probe(binary) {
  const env = { ...process.env };
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8', env });
  if (result.error) return { ok: false, error: result.error.message };
  if (result.status !== 0) return { ok: false, error: `exit code ${result.status}` };
  const firstLine = String(result.stdout || '').split('\n')[0] || '';
  return { ok: true, version: firstLine.trim() };
}

const ffmpegPath = process.env.PLAUD_FFMPEG_PATH || 'ffmpeg';
const ffprobePath = process.env.PLAUD_FFPROBE_PATH || 'ffprobe';

const ffmpeg = probe(ffmpegPath);
const ffprobe = probe(ffprobePath);

console.log(`[plaud-ffmpeg-smoke] ffmpeg @ ${ffmpegPath}: ${ffmpeg.ok ? ffmpeg.version : `MISSING (${ffmpeg.error})`}`);
console.log(`[plaud-ffmpeg-smoke] ffprobe @ ${ffprobePath}: ${ffprobe.ok ? ffprobe.version : `MISSING (${ffprobe.error})`}`);

if (!ffmpeg.ok && !ffprobe.ok) process.exit(4);
if (!ffmpeg.ok) process.exit(2);
if (!ffprobe.ok) process.exit(3);
process.exit(0);
