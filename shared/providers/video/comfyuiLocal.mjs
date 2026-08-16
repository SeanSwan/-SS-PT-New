/**
 * comfyuiLocal.mjs — the local ComfyUI adapter. Implements the same three
 * functions the image lane's provider contract established:
 *
 *   capabilities()  — declared, never name-inferred
 *   generate()      — validated request -> video bytes on disk
 *   verify()        — is this provider actually reachable and configured
 *
 * ── WHY THE WORKFLOW IS SUPPLIED, NOT BUILT IN ──────────────────────────────
 * A ComfyUI generation is a node graph, and the graph for a given model depends
 * on which custom nodes the user installed, under which names, at which
 * versions. Hardcoding an H3 graph here would mean shipping a guess that breaks
 * on any install that differs — and I have no 5090 to probe it against, so it
 * would be a guess I could not even test.
 *
 * So the graph is Sean's: he builds it once in the ComfyUI GUI, exports it in
 * API format, and declares which node inputs receive the prompt, the init image,
 * the duration and the seed. The adapter injects into those declared slots and
 * stays ignorant of everything else in the graph. This is also the standard way
 * ComfyUI is automated, so it matches what any tutorial he follows will produce.
 *
 * ── FAIL-CLOSED ─────────────────────────────────────────────────────────────
 * Missing template, missing binding, unreachable server, or a run that produces
 * no output file all THROW. Nothing here ever fabricates media or substitutes a
 * different model — the posture inherited from the service this lane replaces.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { capabilities as registryCapabilities } from './registry.mjs';

const PROVIDER_ID = 'comfyui/minimax-h3';

class ComfyError extends Error {
  constructor(code, message) { super(message); this.name = 'ComfyError'; this.code = code; }
}

export function capabilities() {
  return registryCapabilities(PROVIDER_ID);
}

/**
 * Where the graph lives and which of its inputs mean what.
 *
 * FAIL-CLOSED on every field: an unset binding is an error at config time
 * rather than a silently un-injected prompt that renders someone else's
 * hardcoded test string at full GPU cost.
 */
export function resolveConfig(env = process.env) {
  const host = String(env.SWAN_COMFYUI_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const templatePath = String(env.SWAN_COMFYUI_WORKFLOW || '').trim();
  const bindings = {
    prompt: String(env.SWAN_COMFYUI_NODE_PROMPT || '').trim(),
    initImage: String(env.SWAN_COMFYUI_NODE_IMAGE || '').trim(),
    duration: String(env.SWAN_COMFYUI_NODE_DURATION || '').trim(),
    seed: String(env.SWAN_COMFYUI_NODE_SEED || '').trim(),
  };
  return {
    host,
    templatePath,
    bindings,
    // Only the prompt binding is mandatory. A graph with a fixed duration or no
    // seed input is perfectly legitimate; a graph with no way to receive the
    // prompt is not a text-to-video graph at all.
    configured: Boolean(templatePath && bindings.prompt),
  };
}

/**
 * Is the provider actually usable right now? Returns a report; never throws.
 *
 * This is the probe that promotes a 'published' capability to 'probed'. It is
 * also the single command Sean runs on the 5090 to find out whether anything is
 * wired, which is why every failure mode reports what to DO, not just what broke.
 */
export async function verify(env = process.env, { fetchImpl = fetch } = {}) {
  const cfg = resolveConfig(env);
  const checks = [];

  const templateOk = Boolean(cfg.templatePath) && existsSync(cfg.templatePath);
  checks.push({
    name: 'workflow template',
    ok: templateOk,
    detail: cfg.templatePath
      ? (templateOk ? cfg.templatePath : `not found at ${cfg.templatePath}`)
      : 'SWAN_COMFYUI_WORKFLOW is unset — export your graph from ComfyUI in API format and point this at it',
  });

  checks.push({
    name: 'prompt node binding',
    ok: Boolean(cfg.bindings.prompt),
    detail: cfg.bindings.prompt
      ? `node ${cfg.bindings.prompt}`
      : 'SWAN_COMFYUI_NODE_PROMPT is unset — set it to the node id whose text input is the positive prompt',
  });

  let reachable = false;
  let reachDetail = '';
  try {
    const res = await fetchImpl(`${cfg.host}/system_stats`, { method: 'GET' });
    reachable = res.ok;
    reachDetail = res.ok ? `${cfg.host} responded ${res.status}` : `${cfg.host} responded ${res.status}`;
  } catch (err) {
    reachDetail = `${cfg.host} unreachable (${err.message}) — is ComfyUI running?`;
  }
  checks.push({ name: 'comfyui reachable', ok: reachable, detail: reachDetail });

  return { provider: PROVIDER_ID, ok: checks.every(c => c.ok), checks };
}

/** Deep-clone the graph so an injection never mutates the template on disk. */
function loadGraph(templatePath) {
  if (!templatePath || !existsSync(templatePath)) {
    throw new ComfyError('E_NO_WORKFLOW',
      `ComfyUI workflow template not found: ${templatePath || '(unset)'}. `
      + 'Export the graph from ComfyUI using "Save (API format)" and set SWAN_COMFYUI_WORKFLOW.');
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(templatePath, 'utf8'));
  } catch (err) {
    throw new ComfyError('E_BAD_WORKFLOW', `Workflow template is not valid JSON: ${err.message}`);
  }
  // API-format exports are a flat map of nodeId -> {class_type, inputs}. A GUI-format
  // export has a `nodes` ARRAY instead, and posting one produces a confusing 400 from
  // ComfyUI, so name the mistake here where it is obvious.
  if (parsed && Array.isArray(parsed.nodes)) {
    throw new ComfyError('E_GUI_FORMAT_WORKFLOW',
      'This looks like a GUI-format workflow export. ComfyUI needs the API format — '
      + 'use "Save (API format)" (enable Dev Mode in settings if the option is hidden).');
  }
  return JSON.parse(JSON.stringify(parsed));
}

function injectInput(graph, nodeId, field, value) {
  const node = graph[nodeId];
  if (!node) {
    throw new ComfyError('E_NO_NODE',
      `Workflow has no node "${nodeId}". Present node ids: ${Object.keys(graph).join(', ')}`);
  }
  node.inputs = node.inputs || {};
  // The field must ALREADY exist. Creating it would be the worst possible failure
  // mode here: ComfyUI ignores an input a node does not declare, so the graph
  // would run happily, at full GPU cost, rendering whatever placeholder prompt
  // the template was saved with — and report success. An API-format export always
  // carries its widget values, so an absent field means the binding points at the
  // wrong node or the wrong input name.
  if (!(field in node.inputs)) {
    throw new ComfyError('E_NO_INPUT',
      `Node "${nodeId}" (${node.class_type || 'unknown type'}) has no input "${field}". `
      + `Its inputs are: ${Object.keys(node.inputs).join(', ') || '(none)'}. `
      + 'Point the binding at the node that actually carries this value.');
  }
  node.inputs[field] = value;
}

/**
 * Build the graph for one request. Exported separately from `generate` so the
 * injection is unit-testable without a GPU, a server, or a network call —
 * which is the only part of this file that can be proven off Sean's machine.
 */
export function buildGraph(request, cfg, { seed } = {}) {
  const graph = loadGraph(cfg.templatePath);

  injectInput(graph, cfg.bindings.prompt, 'text', request.prompt);

  if (cfg.bindings.duration) injectInput(graph, cfg.bindings.duration, 'value', request.duration);
  if (cfg.bindings.seed && seed !== undefined) injectInput(graph, cfg.bindings.seed, 'seed', seed);
  if (cfg.bindings.initImage && request.initImage) {
    injectInput(graph, cfg.bindings.initImage, 'image', request.initImage);
  }

  return graph;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Submit, poll, retrieve. `onProgress` mirrors the render-agent handler contract
 * so the queue's heartbeat keeps the lease alive through a long render.
 */
export async function generate(request, opts = {}) {
  const {
    env = process.env,
    fetchImpl = fetch,
    onProgress = async () => {},
    outPath,
    seed,
    timeoutMs = 15 * 60 * 1000,
    sleep = (ms) => new Promise(r => setTimeout(r, ms)),
  } = opts;

  const cfg = resolveConfig(env);
  if (!cfg.configured) {
    throw new ComfyError('E_NOT_CONFIGURED',
      'ComfyUI provider is not configured. Run verify() to see exactly which field is missing.');
  }
  if (!outPath) throw new ComfyError('E_NO_OUTPUT_PATH', 'generate() requires opts.outPath.');

  const graph = buildGraph(request, cfg, { seed });

  await onProgress(10, 'submitting to comfyui');
  const submit = await fetchImpl(`${cfg.host}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: graph }),
  });
  if (!submit.ok) {
    const detail = await submit.text().catch(() => '');
    // 4xx is a fact about the GRAPH — retrying resubmits the same bad graph forever.
    // 5xx is a fact about the MOMENT — ComfyUI restarting or out of VRAM, which a
    // later attempt genuinely may survive. Collapsing both into one permanent code
    // would throw away jobs for a service blip.
    const code = submit.status >= 500 ? 'E_SUBMIT_FAILED' : 'E_SUBMIT_REJECTED';
    throw new ComfyError(code, `ComfyUI rejected the graph (${submit.status}): ${detail.slice(0, 300)}`);
  }
  const { prompt_id: promptId } = await submit.json();
  if (!promptId) throw new ComfyError('E_NO_PROMPT_ID', 'ComfyUI accepted the graph but returned no prompt_id.');

  const deadline = Date.now() + timeoutMs;
  let entry = null;
  // Tracked separately from `entry`. A partially-populated history entry keeps
  // `entry` truthy, so testing `!entry` after the loop cannot tell "ran out of
  // time" from "finished with nothing" — and reported every timeout as though the
  // graph had produced no output, sending diagnosis at the wrong problem.
  let completed = false;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const hist = await fetchImpl(`${cfg.host}/history/${promptId}`, { method: 'GET' });
    if (!hist.ok) continue;
    const body = await hist.json().catch(() => ({}));
    entry = body?.[promptId] || null;
    if (entry?.status?.completed || entry?.outputs) { completed = true; break; }
    await onProgress(undefined, 'rendering');
  }
  if (!completed) {
    throw new ComfyError('E_TIMEOUT',
      `ComfyUI did not finish within ${Math.round(timeoutMs / 1000)}s (prompt ${promptId}). `
      + 'The job is still queued on the GPU; this attempt gave up waiting.');
  }

  const file = findOutputFile(entry);
  if (!file) {
    throw new ComfyError('E_NO_OUTPUT',
      'ComfyUI reported completion but produced no video output. Check that the graph ends in a video-saving node.');
  }

  await onProgress(85, 'downloading artifact');
  const q = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || '',
    type: file.type || 'output',
  });
  const dl = await fetchImpl(`${cfg.host}/view?${q}`, { method: 'GET' });
  if (!dl.ok) throw new ComfyError('E_DOWNLOAD_FAILED', `Could not retrieve ${file.filename} (${dl.status}).`);

  const bytes = Buffer.from(await dl.arrayBuffer());
  if (bytes.length === 0) throw new ComfyError('E_EMPTY_ARTIFACT', `${file.filename} came back empty.`);

  // Honour the artifact's REAL container. The caller proposes a path, but a graph
  // ending in a webm or gif saver produces exactly that, and writing those bytes
  // to a `.mp4` name would hand every downstream consumer — R2, the player, the
  // browser's type sniffing — a filename that misdescribes its contents.
  const actualExt = (file.filename.match(/\.[^.]+$/) || ['.mp4'])[0];
  const finalPath = outPath.replace(/\.[^.\\/]*$/, '') + actualExt;
  writeFileSync(finalPath, bytes);

  return {
    provider: PROVIDER_ID,
    promptId,
    outPath: finalPath,
    bytes: bytes.length,
    filename: file.filename,
    attribution: capabilities().attribution,
  };
}

/**
 * Find the produced video in a history entry.
 *
 * Video-saving nodes are not standardised — different custom node packs report
 * under `gifs`, `videos`, or plain `images` with a video extension. Scanning all
 * of them beats hardcoding one pack's convention.
 */
export function findOutputFile(entry) {
  const VIDEO_EXT = /\.(mp4|webm|mov|mkv|gif)$/i;
  for (const nodeOut of Object.values(entry?.outputs || {})) {
    for (const key of ['videos', 'gifs', 'images']) {
      for (const f of nodeOut?.[key] || []) {
        if (f?.filename && VIDEO_EXT.test(f.filename)) return f;
      }
    }
  }
  return null;
}

export { ComfyError, PROVIDER_ID };
