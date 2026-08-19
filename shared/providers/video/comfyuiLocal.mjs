/**
 * comfyuiLocal.mjs — the local ComfyUI adapter. Implements the same three
 * functions the image lane's provider contract established:
 *
 *   capabilities()  — declared, never name-inferred
 *   generate()      — validated request -> video bytes on disk
 *   verify()        — is this provider actually reachable and configured
 *
 * ── WHY THE WORKFLOW IS SUPPLIED, NOT BUILT IN ──────────────────────────────
 * A ComfyUI generation is a node graph, and the graph depends on which custom
 * nodes are installed, under which names, at which versions. Hardcoding one
 * would break on any install that differs.
 *
 * That choice paid off immediately: this adapter was written for MiniMax H3 and
 * the first video it ever produced came from Wan 2.2 instead — 26.73s on an
 * RTX 5090 — with NO change to this file, because the graph is an input. Which
 * is also why one adapter now serves every ComfyUI-hosted model: only the
 * provider id and the graph differ.
 *
 * ── FAIL-CLOSED ─────────────────────────────────────────────────────────────
 * Missing template, missing binding, unreachable server, or a run producing no
 * output file all THROW. Nothing here fabricates media or substitutes a model.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { capabilities as registryCapabilities } from './registry.mjs';
import { buildGraph, findOutputFile, ComfyError } from './comfyuiGraph.mjs';

const PROVIDER_ID = 'comfyui/minimax-h3';

/**
 * Per-provider env suffix: `comfyui/wan-2.2` -> `WAN_2_2`.
 *
 * Two local models mean two graphs, so `SWAN_COMFYUI_WORKFLOW` alone stopped being
 * enough the moment Wan was registered. The suffixed key wins; the bare key remains the
 * fallback so an existing single-model setup keeps working untouched.
 */
export function envSuffix(providerId) {
  return String(providerId).split('/').pop().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function capabilities(providerId = PROVIDER_ID) {
  return registryCapabilities(providerId);
}

/**
 * Where the graph lives and which of its inputs mean what.
 *
 * FAIL-CLOSED on every field: an unset binding is an error at config time
 * rather than a silently un-injected prompt that renders someone else's
 * hardcoded test string at full GPU cost.
 */
export function resolveConfig(env = process.env, providerId = PROVIDER_ID) {
  const sfx = envSuffix(providerId);
  // Provider-specific key first, bare key as fallback.
  const pick = (name) => String(env[`${name}_${sfx}`] ?? env[name] ?? '').trim();
  const host = String(env.SWAN_COMFYUI_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const templatePath = pick('SWAN_COMFYUI_WORKFLOW');
  const bindings = {
    prompt: pick('SWAN_COMFYUI_NODE_PROMPT'),
    initImage: pick('SWAN_COMFYUI_NODE_IMAGE'),
    duration: pick('SWAN_COMFYUI_NODE_DURATION'),
    seed: pick('SWAN_COMFYUI_NODE_SEED'),
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
 * Is the provider usable right now? Returns a report; never throws.
 * Every failure reports what to DO, not just what broke — it is the first command
 * run on the render box, by whoever has not finished setting it up.
 */
export async function verify(env = process.env, { fetchImpl = fetch, providerId = PROVIDER_ID } = {}) {
  const cfg = resolveConfig(env, providerId);
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

  let reachable = false; let reachDetail = '';
  try {
    const res = await fetchImpl(`${cfg.host}/system_stats`, { method: 'GET' });
    reachable = res.ok;
    reachDetail = `${cfg.host} responded ${res.status}`;
  } catch (err) {
    reachDetail = `${cfg.host} unreachable (${err.message}) — is ComfyUI running?`;
  }
  checks.push({ name: 'comfyui reachable', ok: reachable, detail: reachDetail });

  return { provider: providerId, ok: checks.every(c => c.ok), checks };
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
    providerId = PROVIDER_ID,
    timeoutMs = 15 * 60 * 1000,
    sleep = (ms) => new Promise(r => setTimeout(r, ms)),
  } = opts;

  const cfg = resolveConfig(env, providerId);
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
    provider: providerId,
    promptId,
    outPath: finalPath,
    bytes: bytes.length,
    filename: file.filename,
    // Hashed here, where the bytes are already in hand. Provenance without this is a
    // record that cannot identify the artifact it claims to describe — it would assert
    // "this file came from H3 under these terms" while being unable to tell that file
    // from any other.
    sha256: createHash('sha256').update(bytes).digest('hex'),
    attribution: capabilities(providerId).attribution,
  };
}


export { ComfyError, PROVIDER_ID, buildGraph, findOutputFile };
