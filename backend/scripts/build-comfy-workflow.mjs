// NOTE: no shebang — see render-agent.mjs for why (esbuild + CRLF).
/**
 * build-comfy-workflow — emit a LAID-OUT ComfyUI workflow, not an API graph.
 * ============================================================================
 *
 * WHY THIS EXISTS. The graphs this repo renders with are in ComfyUI's **API format** —
 * `{ nodeId: { class_type, inputs } }` — which the /prompt endpoint accepts and the UI
 * cannot meaningfully open. The UI's own format is a different thing entirely: an array of
 * nodes carrying positions, sizes, slot definitions, and POSITIONAL `widgets_values`, plus
 * an explicit link table.
 *
 * The consequence, and the reason Sean lost twenty minutes: with no saved workflow, ComfyUI
 * opens on a blank canvas and the operator has to rebuild — or worse, hunt the node menu and
 * pick a `partner/` node that bills per run.
 *
 * WIDGET ORDER IS POSITIONAL AND UNFORGIVING. `widgets_values` is an array matched by INDEX
 * against the node's non-link inputs in declaration order. Get the order wrong and the graph
 * still loads, still runs, and quietly renders at the wrong resolution or with the seed in
 * the steps field. So the order is read from the live `/object_info` rather than typed from
 * memory — the server is the only authority on its own node signatures.
 *
 *   node backend/scripts/build-comfy-workflow.mjs [--out <dir>]
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const COMFY = process.env.SWAN_COMFYUI_URL || 'http://127.0.0.1:8188';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const OUT = flag('out', 'C:/ComfyUI/user/default/workflows');
// Two workflows are emitted: the plain text-to-video starting point, and the
// first-frame variant that conditions on an image (the free equivalent of the paid
// partner/ First-Last-Frame node). Both are LOCAL.
const VARIANT = flag('variant', 'both');

/**
 * Node signatures come from the LIVE server when it is up, because it is the only
 * authority on its own widget order. But requiring ComfyUI to be running in order to
 * BUILD a workflow is a bad dependency — the operator closes the app and the tool that
 * fixes their setup stops working. So fall back to a committed cache, and say clearly
 * which source was used: a cache can go stale after a ComfyUI or custom-node update, and
 * a silently-stale signature is the exact positional-widget bug this file exists to avoid.
 */
const CACHE = new URL('../../shared/providers/video/workflows/comfy-object-info.cache.json', import.meta.url);
let objectInfo;
let sigSource;
try {
  objectInfo = await (await fetch(`${COMFY}/object_info`)).json();
  sigSource = 'live ComfyUI';
  writeFileSync(CACHE, JSON.stringify(objectInfo));
} catch {
  if (!existsSync(CACHE)) {
    process.stderr.write(
      `\n  ComfyUI is not reachable at ${COMFY} and no signature cache exists.\n`
      + '  Start ComfyUI once so the cache can be written, then re-run.\n\n',
    );
    process.exit(2);
  }
  objectInfo = JSON.parse(readFileSync(CACHE, 'utf8'));
  sigSource = 'CACHED signatures (ComfyUI offline — re-run with it up if nodes changed)';
}

/** Inputs that arrive over a LINK, not a widget — these never appear in widgets_values. */
const LINK_TYPES = new Set(['MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK', 'VIDEO', 'AUDIO']);

function signature(type) {
  const spec = objectInfo[type];
  if (!spec) throw new Error(`ComfyUI does not know node type "${type}"`);
  const req = spec.input?.required || {};
  const linkInputs = [];
  const widgets = [];
  for (const [name, def] of Object.entries(req)) {
    const t = Array.isArray(def) ? def[0] : def;
    if (typeof t === 'string' && LINK_TYPES.has(t)) { linkInputs.push({ name, type: t }); continue; }
    widgets.push(name);
    // A widget declaring `control_after_generate` gets a SECOND, UI-only widget immediately
    // after it (the randomize/increment/fixed selector). It occupies its own slot in
    // widgets_values, so omitting it shifts every later value by one — the graph still
    // loads and still runs, with the seed landing in `steps` and cfg in `sampler_name`.
    // Silent misconfiguration, which is why this is read from the spec and not assumed.
    const opts = Array.isArray(def) && def.length > 1 && typeof def[1] === 'object' ? def[1] : {};
    if (opts.control_after_generate) widgets.push(`${name}__control`);
  }
  const outputs = (spec.output_name || spec.output || []).map((n, i) => ({
    name: n, type: (spec.output || [])[i] || n,
  }));
  return { linkInputs, widgets, outputs };
}

let nodeId = 0;
let linkId = 0;
const nodes = [];
const links = [];

/**
 * @param widgetValues object keyed by widget NAME — converted to a positional array here so
 *   callers never have to know the order, which is the whole class of bug this guards.
 */
function addNode(type, { pos, values = {}, size, title }) {
  const sig = signature(type);
  const id = ++nodeId;
  const missing = Object.keys(values).filter((k) => !sig.widgets.includes(k));
  if (missing.length) {
    throw new Error(`${type}: no widget named ${missing.join(', ')} (has: ${sig.widgets.join(', ')})`);
  }
  nodes.push({
    id,
    type,
    pos,
    size: size || [330, 100 + sig.widgets.length * 26],
    flags: {},
    order: id - 1,
    mode: 0,
    inputs: sig.linkInputs.map((i) => ({ name: i.name, type: i.type, link: null })),
    outputs: sig.outputs.map((o) => ({ name: o.name, type: o.type, links: [], slot_index: 0 })),
    properties: { 'Node name for S&R': type },
    // Positional, ordered by the LIVE signature — never by hand.
    widgets_values: sig.widgets.map((w) => {
      if (w in values) return values[w];
      // The UI-only control selector defaults to 'randomize' in ComfyUI's own graphs.
      if (w.endsWith('__control')) return 'randomize';
      return null;
    }),
    ...(title ? { title } : {}),
  });
  return id;
}

/** Wire an output slot to a named input, updating both sides plus the link table. */
function connect(fromId, fromSlot, toId, inputName) {
  const from = nodes.find((n) => n.id === fromId);
  const to = nodes.find((n) => n.id === toId);
  let slot = to.inputs.findIndex((i) => i.name === inputName);
  if (slot === -1) {
    // OPTIONAL inputs (first_frame, last_frame) are not in the required set, so they have
    // no slot until something connects to them. Create it rather than refusing — refusing
    // would make every image-conditioned graph unbuildable.
    const spec = objectInfo[to.type]?.input?.optional?.[inputName];
    if (!spec) throw new Error(`${to.type} has no input "${inputName}"`);
    const t = Array.isArray(spec) ? spec[0] : spec;
    to.inputs.push({ name: inputName, type: t, link: null });
    slot = to.inputs.length - 1;
  }
  const id = ++linkId;
  to.inputs[slot].link = id;
  from.outputs[fromSlot].links.push(id);
  links.push([id, fromId, fromSlot, toId, slot, from.outputs[fromSlot].type]);
}

function note(text, pos, size) {
  const id = ++nodeId;
  nodes.push({
    id, type: 'Note', pos, size, flags: {}, order: id - 1, mode: 0,
    inputs: [], outputs: [], properties: { text: '' }, widgets_values: [text], color: '#432', bgcolor: '#653',
  });
  return id;
}

// ── the graph ──────────────────────────────────────────────────────────────
const unet = addNode('UNETLoader', { pos: [40, 60], title: '1 · H3 model (LOCAL)',
  values: { unet_name: 'minimax_h3_fl2va_pruned_fp8_scaled.safetensors', weight_dtype: 'default' } });
const clip = addNode('CLIPLoader', { pos: [40, 210], title: '2 · Text encoder',
  values: { clip_name: 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors', type: 'minimax' } });
const vae = addNode('VAELoader', { pos: [40, 360], title: '3 · Video VAE',
  values: { vae_name: 'minimax_h3_video_vae_fp16.safetensors' } });
const lora = addNode('LoraLoaderModelOnly', { pos: [40, 480], title: '4 · Turbo LoRA (4-step)',
  values: { lora_name: 'minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors', strength_model: 1.0 } });
const shift = addNode('MiniMaxH3SigmaShift', { pos: [40, 640], title: '5 · Sigma shift',
  values: { shift_video: 5.0, shift_audio: 5.0 } });

const i2v = addNode('MiniMaxH3ImageToVideo', {
  pos: [430, 60], size: [460, 300], title: '6 · PROMPT + SIZE  <-- edit here',
  values: {
    prompt: 'a white mute swan glides from right to left across a mirrored alpine lake at dawn, '
      + 'snow-capped peaks reflected, grey cygnets following in single file, '
      + 'shot at water level, 50mm, shallow depth of field, ultra detailed feather texture, '
      + 'photorealistic, National Geographic nature photography, no people, no text, '
      + 'locked-off camera, no camera movement',
    width: 1280, height: 704, length: 97,
  },
});
const zero = addNode('ConditioningZeroOut', { pos: [430, 400], title: '7 · Negative (empty)' });
const ks = addNode('KSampler', {
  pos: [950, 60], size: [330, 290], title: '8 · Sampler  <-- seed here',
  values: { seed: 4242, steps: 4, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0 },
});
const dec = addNode('VAEDecode', { pos: [950, 400], title: '9 · Decode' });
const cv = addNode('CreateVideo', { pos: [950, 520], title: '10 · Assemble', values: { fps: 24.0 } });
const sv = addNode('SaveVideo', { pos: [950, 660], title: '11 · Save',
  values: { filename_prefix: 'swan/h3', format: 'mp4', codec: 'h264' } });

connect(unet, 0, lora, 'model');
connect(lora, 0, shift, 'model');
connect(clip, 0, i2v, 'clip');
connect(vae, 0, i2v, 'vae');
connect(i2v, 0, zero, 'conditioning');
connect(shift, 0, ks, 'model');
connect(i2v, 0, ks, 'positive');
connect(zero, 0, ks, 'negative');
connect(i2v, 1, ks, 'latent_image');
connect(ks, 0, dec, 'samples');
connect(vae, 0, dec, 'vae');
connect(dec, 0, cv, 'images');
connect(cv, 0, sv, 'video');

note(
  [
    'SWAN STUDIOS — LOCAL H3  (runs on YOUR 5090, costs nothing)',
    '',
    'EDIT NODE 6 for the prompt. EDIT NODE 8 seed to reroll. Then hit Run.',
    '',
    'NEVER use nodes under the "partner/" category — those call MiniMax servers',
    'and bill credits per run. Everything in THIS graph is local.',
    '',
    'SIZE: 1280x704. Not 720 — an encoded first frame must match the latent',
    'stride and 720 throws at the sampler.',
    'LENGTH: 97 -> 107 frames -> 4.458s @24fps. ~100s per render.',
    'For 15s, chain four clips: backend/scripts/render-swan-procession.mjs',
    '',
    '--- PROMPT RECIPE -------------------------------------------------',
    'SUBJECT   what moves, and which way it crosses frame',
    'WORLD     glacial lagoon / alpine mirror / misted fjord / waterfall',
    '          basin / autumn boreal / geothermal / blue-hour tarn /',
    '          cenote / frost marsh / storm breaking',
    'CRAFT     shot at water level, 50mm, shallow depth of field, ultra',
    '          detailed feather texture, photorealistic, National',
    '          Geographic nature photography, no people, no text,',
    '          locked-off camera, no camera movement',
    '',
    'Hold the CRAFT clause fixed and vary only SUBJECT or WORLD — that way',
    'a difference you see was caused by your edit, not by generation luck.',
  ].join('\n'),
  [430, 470], [460, 470],
);

const workflow = {
  id: 'swan-h3-local',
  revision: 0,
  last_node_id: nodeId,
  last_link_id: linkId,
  nodes,
  links,
  groups: [],
  config: {},
  extra: {},
  version: 0.4,
};

// ── first-frame variant ────────────────────────────────────────────────────
// LoadImage -> ImageScale -> first_frame. The ImageScale is NOT cosmetic: an encoded
// first frame must match the sampler's latent stride, so a 720-tall image throws at the
// KSampler while 704 succeeds. Scaling inside the graph means the operator can drop in
// any image without knowing that.
if (VARIANT !== 'base') {
  const img = addNode('LoadImage', { pos: [430, 980], title: 'A · Your image (logo, still, frame)',
    values: { image: 'Logo.png' } });
  const scale = addNode('ImageScale', { pos: [430, 1180], title: 'B · Match latent stride (1280x704)',
    values: { upscale_method: 'lanczos', width: 1280, height: 704, crop: 'center' } });
  connect(img, 0, scale, 'image');
  connect(scale, 0, i2v, 'first_frame');
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const fileName = VARIANT === 'base'
  ? '00 SWAN — H3 local (start here).json'
  : '01 SWAN — H3 local + first frame.json';
const path = join(OUT, fileName);
writeFileSync(path, JSON.stringify(workflow, null, 2));
process.stdout.write(
  `\n  wrote ${path}\n  ${nodes.length} nodes, ${links.length} links`
  // Naming the signature source matters: a cache that predates a ComfyUI or custom-node
  // update can reorder widgets, and the resulting graph loads and runs while silently
  // misconfigured. Say which authority was used so a stale build is visible, not inferred.
  + `\n  signatures: ${sigSource}\n\n`,
);
