/**
 * audioProbeService.mjs
 * ======================
 * Wraps ffprobe + ffmpeg volumedetect for PLAUD clip metadata extraction
 * and silent-clip rejection during the upload pipeline.
 *
 * Phase 3 Slice 3.2 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 *
 * Public API:
 *   probeFile(filePath)
 *     → { durationSec, codec, container, format, bitrate, sampleRate, channels, mimetype }
 *     Throws ClipCorruptError if ffprobe exits non-zero or returns malformed JSON.
 *
 *   detectSilence(filePath, { meanThresholdDb = -50, maxThresholdDb = -30 } = {})
 *     → { meanDb, maxDb, isSilent }
 *     `isSilent === true` only when BOTH mean_volume < meanThresholdDb AND
 *     max_volume < maxThresholdDb. Codex Round 2 MEDIUM finding: don't reject
 *     based on mean_volume alone; quiet-but-intelligible speech can fall
 *     below -50dB mean while max stays well above -30dB.
 *
 * Codex Round 1 + 2 fixes integrated:
 *   - Per-clip codec/container allowlist enforced at the caller (not here).
 *   - mean+max combined silence check (not mean alone).
 *   - 60s subprocess timeout default; SIGKILL on timeout; stderr capped at 4KB.
 *   - No shell:true. All paths passed as argv strings.
 */
import { spawn } from 'node:child_process';

const FFPROBE_BIN = process.env.PLAUD_FFPROBE_PATH || 'ffprobe';
const FFMPEG_BIN = process.env.PLAUD_FFMPEG_PATH || 'ffmpeg';

export class ClipCorruptError extends Error {
  constructor(message, { stderr } = {}) {
    super(message);
    this.name = 'ClipCorruptError';
    this.code = 'CLIP_CORRUPT';
    this.stderr = stderr;
  }
}

export class ClipProbeTimeoutError extends Error {
  constructor(stage) {
    super(`${stage} timed out`);
    this.name = 'ClipProbeTimeoutError';
    this.code = 'CLIP_PROBE_TIMEOUT';
  }
}

function runProcess(bin, args, { timeoutMs }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 65536) stdout = stdout.slice(-65536);
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already gone */ }
      reject(new ClipProbeTimeoutError(bin));
    }, timeoutMs);

    proc.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Run ffprobe to extract container/codec/duration. Returns structured
 * metadata. Throws ClipCorruptError if ffprobe rejects the file.
 */
export async function probeFile(filePath, { timeoutMs = 60_000 } = {}) {
  const args = [
    '-v', 'error',
    '-show_format',
    '-show_streams',
    '-of', 'json',
    filePath,
  ];
  const { code, stdout, stderr } = await runProcess(FFPROBE_BIN, args, { timeoutMs });
  if (code !== 0) {
    throw new ClipCorruptError(`ffprobe exit ${code}`, { stderr });
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout || '{}');
  } catch (err) {
    throw new ClipCorruptError(`ffprobe returned non-JSON (${err.message})`, { stderr });
  }

  const audioStream = (parsed.streams || []).find((s) => s.codec_type === 'audio');
  if (!audioStream) {
    throw new ClipCorruptError('no audio stream found', { stderr });
  }

  const format = parsed.format || {};
  return {
    durationSec: Number.parseFloat(format.duration || audioStream.duration || '0') || null,
    codec: audioStream.codec_name || null,
    container: format.format_name || null,
    bitrate: format.bit_rate ? Number.parseInt(format.bit_rate, 10) : null,
    sampleRate: audioStream.sample_rate ? Number.parseInt(audioStream.sample_rate, 10) : null,
    channels: audioStream.channels || null,
  };
}

/**
 * Run ffmpeg -af volumedetect to measure mean and max volume. Returns
 * { meanDb, maxDb, isSilent } where isSilent is true only when BOTH
 * mean and max fall below their respective thresholds.
 *
 * The combined-threshold rule is per Codex Round 2 MEDIUM finding:
 * mean_volume alone falsely rejects quiet-but-intelligible PLAUD
 * recordings where the trainer's voice peaks well above -30dB but the
 * average across silent gaps drags below -50dB.
 */
export async function detectSilence(filePath, opts = {}) {
  const meanThresholdDb = opts.meanThresholdDb ?? -50;
  const maxThresholdDb = opts.maxThresholdDb ?? -30;
  const timeoutMs = opts.timeoutMs ?? 60_000;

  const args = [
    '-hide_banner',
    '-nostats',
    '-i', filePath,
    '-af', 'volumedetect',
    '-f', 'null',
    '-',
  ];
  const { code, stderr } = await runProcess(FFMPEG_BIN, args, { timeoutMs });
  // ffmpeg writes volumedetect output to stderr even on exit 0
  if (code !== 0) {
    throw new ClipCorruptError(`ffmpeg volumedetect exit ${code}`, { stderr });
  }

  const meanMatch = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/i);
  const maxMatch = stderr.match(/max_volume:\s*([-\d.]+)\s*dB/i);
  const meanDb = meanMatch ? Number.parseFloat(meanMatch[1]) : null;
  const maxDb = maxMatch ? Number.parseFloat(maxMatch[1]) : null;

  // If we couldn't extract either reading, treat as corrupt rather than silent
  if (meanDb === null || maxDb === null) {
    throw new ClipCorruptError('volumedetect output missing mean/max', { stderr });
  }

  const isSilent = meanDb < meanThresholdDb && maxDb < maxThresholdDb;
  return { meanDb, maxDb, isSilent };
}

export default { probeFile, detectSilence, ClipCorruptError, ClipProbeTimeoutError };
