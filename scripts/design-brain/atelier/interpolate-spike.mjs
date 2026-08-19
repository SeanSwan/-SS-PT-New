#!/usr/bin/env node
/**
 * interpolate-spike.mjs — A0b frame-interpolation spike (QUARANTINED slice, R2 ruling R-3).
 *
 * Job: prove/refute the 30->60fps interpolation step on footage containing TEXT,
 * because rule 40's 60fps scrub gate needs a path to itself and minterpolate is
 * known to smear typography. This spike is the gate before any A0b production use:
 *
 * ACCEPTANCE (all three, or A0b stays closed):
 *   1. Pipeline runs: output stream is 60fps and duration is preserved (+-2 frame
 *      periods). NOT naive frame-doubling: minterpolate cannot invent frames past the
 *      last source frame, so short clips lose a few at the boundary by construction.
 *   2. Static-region fidelity: SSIM(interpolated even frames vs source frames) >= 0.95
 *      — interpolation must not damage the frames it did not invent.
 *   3. TEXT LEGIBILITY on invented frames: HUMAN EYES on the extracted odd-frame strip.
 *      SSIM cannot certify legibility — a smeared glyph can score high. The spike
 *      emits `spike-out/invented-frames/*.png` for Sean (or a reviewing agent with
 *      vision) to judge. The spike REFUSES to print PASS for criterion 3; it prints
 *      EYES-REQUIRED. (An instrument must not claim what it cannot measure.)
 *
 * Modes: --synthetic (default; generates a 2s 30fps clip with scrolling text over a
 * moving gradient — the worst reasonable case) or --input <file.mp4> for real footage
 * (e.g. Swans.mp4 pulled from R2 — NOT in this repo).
 *
 * Engine: ffmpeg minterpolate (mci). RIFE is the expected production upgrade if
 * minterpolate fails criterion 3; this spike establishes the baseline + the harness.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'spike-out');

function ff(args) { return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8' }); }
function ffprobe(args) { return execFileSync('ffprobe', ['-v', 'error', ...args], { encoding: 'utf8' }).trim(); }

export function frameCount(file) {
  return Number(ffprobe(['-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file]));
}

function main() {
  const inputIdx = process.argv.indexOf('--input');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'invented-frames'), { recursive: true });

  let src = inputIdx >= 0 ? process.argv[inputIdx + 1] : join(OUT, 'synthetic-30fps.mp4');
  if (inputIdx < 0) {
    // Worst reasonable case: text scrolling horizontally over a moving gradient.
    ff(['-f', 'lavfi', '-i', 'gradients=size=1280x720:speed=0.05:duration=2:rate=30',
      '-vf', "drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='APEX STRIDE 4\\:58/km THE ROAD ANSWERS':fontsize=54:fontcolor=white:x=w-mod(t*420\\,w+tw):y=h/2-27:borderw=2:bordercolor=black",
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-y', src]);
  }
  if (!existsSync(src)) { console.error(`input not found: ${src}`); process.exit(1); }

  const interp = join(OUT, 'interpolated-60fps.mp4');
  const t0 = Date.now();
  ff(['-i', src, '-vf', "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1", '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-y', interp]);
  const wallS = ((Date.now() - t0) / 1000).toFixed(1);

  const nSrc = frameCount(src);
  const nOut = frameCount(interp);
  const dur = (f) => Number(ffprobe(['-select_streams', 'v:0', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));
  const fpsOut = (() => {
    const r = ffprobe(['-select_streams', 'v:0', '-show_entries', 'stream=avg_frame_rate', '-of', 'csv=p=0', interp]);
    const [a, b] = r.split('/').map(Number); return b ? a / b : Number(r);
  })();
  const durSrc = dur(src); const durOut = dur(interp);
  const doubled = Math.abs(fpsOut - 60) < 0.6 && Math.abs(durOut - durSrc) <= 2 / 30;

  // Criterion 2: compare source frames vs the interpolated stream downsampled back to
  // 30fps (the kept frames). SSIM parsed from ffmpeg's stderr summary line.
  let ssimAll = null;
  const stderr = execFileSync('bash', ['-c',
    `ffmpeg -hide_banner -i "${interp}" -i "${src}" -lavfi "[0:v]fps=30[a];[a][1:v]ssim" -f null - 2>&1 | grep "SSIM" | tail -1`],
  { encoding: 'utf8' });
  const m = stderr.match(/All:\s*([\d.]+)/);
  ssimAll = m ? Number(m[1]) : null;

  // Criterion 3 artifacts: extract INVENTED (odd) frames for human judgment.
  ff(['-i', interp, '-vf', "select='mod(n\\,2)',scale=640:-1", '-vsync', 'vfr', '-frames:v', '8',
    join(OUT, 'invented-frames', 'invented-%02d.png'), '-y']);

  const invented = readdirSync(join(OUT, 'invented-frames')).length;
  console.log('--- A0b interpolation spike ---');
  console.log(`source: ${src} (${nSrc} frames @30fps) -> ${nOut} frames @60fps in ${wallS}s`);
  console.log(`criterion 1 (60fps + duration preserved): ${doubled ? 'PASS' : 'FAIL'} (fps=${fpsOut.toFixed(2)}, dur ${durSrc.toFixed(2)}s -> ${durOut.toFixed(2)}s)`);
  console.log(`criterion 2 (kept-frame SSIM >= 0.95): ${ssimAll === null ? 'UNMEASURED' : ssimAll >= 0.95 ? `PASS (${ssimAll})` : `FAIL (${ssimAll})`}`);
  console.log(`criterion 3 (text legibility): EYES-REQUIRED — ${invented} invented frames extracted to spike-out/invented-frames/`);
  console.log('A0b verdict: criteria 1+2 mechanical; criterion 3 is a human gate BY DESIGN.');
  if (!doubled || (ssimAll !== null && ssimAll < 0.95)) process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
