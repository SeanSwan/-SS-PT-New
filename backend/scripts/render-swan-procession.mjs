// NOTE: no shebang — see render-agent.mjs for why (esbuild + CRLF).
/**
 * render-swan-procession — build the 15s hero as four fl2v-chained clips.
 * ============================================================================
 *
 * WHY THIS IS A SCRIPT AND NOT FOUR MANUAL RUNS. Each clip must start from the previous
 * clip's FINAL FRAME, or the four segments read as four separate videos with hard cuts.
 * Doing that by hand means: render, scrub to the last frame, export a PNG, upload it, point
 * the next graph at it, repeat. Four times, per world. It is exactly the kind of sequence a
 * human gets wrong once at step 11 and cannot tell where.
 *
 *   node backend/scripts/render-swan-procession.mjs --world alpine-mirror
 *   node backend/scripts/render-swan-procession.mjs --world storm-breaking --dry-run
 *
 * THE CHAIN, precisely:
 *   clip A  (no first_frame)  -> last frame -> upload -> clip B.first_frame
 *   clip B                    -> last frame -> upload -> clip C.first_frame
 *   clip C                    -> last frame -> upload -> clip D.first_frame
 *
 * `fl2v` means first/last-frame-to-video. Feeding the previous tail in as the next head is
 * the capability these weights exist for — the joins are continuous motion, not crossfades
 * pretending to be continuous.
 *
 * FAIL-CLOSED: a clip that does not reach `success` stops the chain. Continuing would build
 * the remaining segments on a frame that does not exist, and the failure would surface three
 * clips later as "the video looks wrong" instead of "clip B failed".
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COMFY = process.env.SWAN_COMFYUI_URL || 'http://127.0.0.1:8188';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const WORLD = flag('world', 'alpine-mirror');
const OUTDIR = flag('out', 'variants/procession');
const DRY = args.includes('--dry-run');

/** Worlds are the environment clause only — subject and craft are shared and fixed. */
const WORLDS = {
  'alpine-mirror': 'a perfectly mirrored alpine lake at dawn, snow-capped peaks reflected flawlessly, pink first light on the summits',
  'storm-breaking': 'a mountain lake as a storm breaks, one dramatic shaft of god-light piercing dark cloud onto the water, rain curtain receding',
  'glacier-lagoon': 'a turquoise glacial lagoon, a towering blue ice wall behind, pale drifting icebergs, cold clear light',
  'blue-hour-tarn': 'a highland tarn at blue hour, deep indigo sky, faint aurora ribbon above the ridge, utterly still water',
};

const CRAFT = ', shot on a cinema camera at water level, 50mm, shallow depth of field, ultra detailed '
  + 'feather texture, photorealistic, National Geographic nature photography, extreme clarity, '
  + 'no people, no text, locked-off camera, no camera movement';

/**
 * The four beats. Each names who is entering AND who is already in frame, so the model has a
 * reason to compose the shot consistently with the frame it was handed.
 */
const CLIPS = [
  { id: 'A', subject: 'a white mute swan glides from right to left across the still water, four grey cygnets following in single file close to her flank, S-curved neck' },
  { id: 'B', subject: 'a black swan with a crimson bill enters from the right and crosses left, three dark cygnets trailing her, her reflection doubled perfectly beneath her, a white swan family exiting at the far left edge' },
  { id: 'C', subject: 'a pure white swan with a high sharply curved neck and tightly folded wings raised at the shoulder crosses from right to left, a cold rim of light along the leading edge of her wing, two cygnets following, black and white swan families ahead of her in frame' },
  { id: 'D', subject: 'three swan families - white, black, and one luminous white swan with a high arched neck - strung in a single unbroken line moving left, cygnets between the adults, water settling flat behind them' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(bin, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (c) => { err += c.toString(); });
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${bin} exit ${c}: ${err.slice(-300)}`))));
  });
}

async function api(path, body, method = 'POST') {
  const res = await fetch(`${COMFY}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

/** Upload a PNG so a LoadImage node can reference it by name. */
async function uploadImage(path, name) {
  const fd = new FormData();
  fd.append('image', new Blob([readFileSync(path)]), name);
  fd.append('overwrite', 'true');
  const res = await fetch(`${COMFY}/upload/image`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`upload ${name} -> HTTP ${res.status}`);
  return (await res.json()).name;
}

function buildGraph(base, { prompt, seed, prefix, firstFrameName }) {
  const g = JSON.parse(JSON.stringify(base));
  g['6'].inputs.prompt = prompt;
  g['6'].inputs.width = 1280;
  // 704, NOT 720. Without a first_frame the model builds its own latent and 720 is fine.
  // With an ENCODED first_frame the image latent must match the sampler's expected shape
  // exactly, and 720 does not divide cleanly on this model's stride — it fails at the
  // KSampler with `shape [1,24,1,1,22,2,40,2] is invalid for input of size 86400`, whose
  // 44x80 latent decodes to 704x1280. Measured, not guessed: 704 renders, 720 errors.
  g['6'].inputs.height = 704;
  g['6'].inputs.length = 97;
  g['8'].inputs.seed = seed;
  g['11'].inputs.filename_prefix = prefix;
  if (firstFrameName) {
    // A LoadImage node feeding the OPTIONAL first_frame input. This is the whole chain.
    g['20'] = { class_type: 'LoadImage', inputs: { image: firstFrameName } };
    g['6'].inputs.first_frame = ['20', 0];
  }
  return g;
}

async function waitFor(promptId, label) {
  for (let i = 0; i < 60; i += 1) {
    await sleep(10_000);
    const h = await api(`/history/${promptId}`, null, 'GET').catch(() => ({}));
    const rec = h?.[promptId];
    if (!rec) continue;
    const status = rec.status?.status_str;
    if (status === 'success') {
      const img = rec.outputs?.['11']?.images?.[0];
      if (!img) throw new Error(`${label} reported success with no output file`);
      return img;
    }
    // Anything that is not success is fatal for the CHAIN — see the fail-closed note above.
    if (status && status !== 'running') throw new Error(`${label} ended as "${status}"`);
  }
  throw new Error(`${label} did not finish within 10 minutes`);
}

async function main() {
  const world = WORLDS[WORLD];
  if (!world) {
    process.stderr.write(`\n  Unknown world "${WORLD}". Known: ${Object.keys(WORLDS).join(', ')}\n\n`);
    process.exit(2);
  }
  const basePath = 'shared/providers/video/workflows/minimax_h3_t2v_api.json';
  if (!existsSync(basePath)) {
    process.stderr.write(`\n  Base graph not found at ${basePath}\n\n`);
    process.exit(2);
  }
  const base = JSON.parse(readFileSync(basePath, 'utf8'));
  mkdirSync(OUTDIR, { recursive: true });

  process.stdout.write(`\n  Swan procession — world: ${WORLD}\n  ${'─'.repeat(62)}\n`);

  const files = [];
  let carryFrame = null;

  for (const clip of CLIPS) {
    const prompt = `${clip.subject}, ${world}${CRAFT}`;
    const prefix = `swanproc/${WORLD}_${clip.id}`;
    if (DRY) { process.stdout.write(`  [dry] clip ${clip.id}: ${prompt.slice(0, 90)}...\n`); continue; }

    const g = buildGraph(base, { prompt, seed: 4242, prefix, firstFrameName: carryFrame });
    const { prompt_id: pid, node_errors: errs } = await api('/prompt', { prompt: g });
    if (errs && Object.keys(errs).length) throw new Error(`clip ${clip.id} rejected: ${JSON.stringify(errs)}`);
    process.stdout.write(`  clip ${clip.id} queued ${pid.slice(0, 8)}${carryFrame ? ` (from ${carryFrame})` : ''}\n`);

    const img = await waitFor(pid, `clip ${clip.id}`);
    const localMp4 = join(OUTDIR, `${WORLD}_${clip.id}.mp4`);
    const url = `${COMFY}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=output`;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(localMp4, buf);
    files.push(localMp4);
    process.stdout.write(`  clip ${clip.id} done   ${(buf.length / 1e6).toFixed(2)} MB\n`);

    if (clip.id !== 'D') {
      // Extract the FINAL frame, not a near-final one: `-sseof -0.05` seeks from the end so
      // the handoff frame is genuinely the one the next clip continues from.
      const framePng = join(OUTDIR, `${WORLD}_${clip.id}_last.png`);
      await run('ffmpeg', ['-y', '-v', 'error', '-sseof', '-0.05', '-i', localMp4,
        '-frames:v', '1', '-vf', 'scale=1280:704', '-q:v', '2', framePng]);
      carryFrame = await uploadImage(framePng, `${WORLD}_${clip.id}_last.png`);
    }
  }

  if (DRY) { process.stdout.write('\n  dry run — nothing rendered\n\n'); return; }

  const listPath = join(OUTDIR, `${WORLD}_list.txt`);
  // Basename must handle BOTH separators. node's join() emits backslashes on Windows, so
  // split('/') returned the entire relative path unchanged — and because ffmpeg resolves
  // concat entries against the LIST FILE's directory, it doubled the prefix and looked for
  // variants\procession\variants\procession\clip.mp4. All four clips had rendered fine; only
  // the stitch failed, which is the most expensive place to discover a path bug.
  writeFileSync(listPath, files.map((f) => `file '${f.split(/[\\/]/).pop()}'`).join('\n'));
  const raw = join(OUTDIR, `${WORLD}_raw.mp4`);
  const final = join(OUTDIR, `swan_hero_${WORLD}_15s.mp4`);
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', raw]);
  // -an strips audio deliberately: muted homepage background, and the audio VAE is unwired.
  await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-t', '15',
    '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-an', final]);

  process.stdout.write(`  ${'─'.repeat(62)}\n  FINAL: ${final}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`\n  FAILED: ${err.message}\n\n`);
  process.exit(1);
});
