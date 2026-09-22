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
 *
 * ── ROUND 19: A FAILED RUN IS NOT A FINISHED ONE ────────────────────────────
 * The poll loop decided both with `entry?.status?.completed || entry?.outputs`, and ComfyUI
 * reports an errored graph as `outputs: {}` — which is TRUTHY. So a graph that raised on the GPU
 * was reported as a graph that finished with nothing, and the node's own exception was never read.
 * The decision now lives in `comfyuiHistory.mjs`; this file only turns its verdict into an error.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { capabilities as registryCapabilities } from './registry.mjs';
import { buildGraph, findOutputFile, loadGraph, inspectBindings, ComfyError } from './comfyuiGraph.mjs';
import { terminalState, describeFailure, describeTimeout, failureIsDeterministic } from './comfyuiHistory.mjs';

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
 *
 * ── ROUND 18: PRESENT IS NOT USABLE ─────────────────────────────────────────
 * This function used to answer with `existsSync` and a truthiness test, and so reported
 * `ok: true` for a template that is not JSON, a GUI-format export ComfyUI answers with a 400,
 * and a prompt binding naming a node the graph does not contain. Three configurations in which
 * every run fails, all reported healthy by the one command whose job is to say whether they
 * will. It now loads the graph and inspects the bindings, so the answer is about USABILITY.
 */
export async function verify(env = process.env, { fetchImpl = fetch, providerId = PROVIDER_ID } = {}) {
  const cfg = resolveConfig(env, providerId);
  const checks = [];

  // The template must be LOADABLE, not merely present. `loadGraph` also refuses a document that
  // is not a graph at all — `null`, a bare array, a scalar — which is the shape that used to be
  // returned and then reach `Object.keys(null)` as a raw TypeError.
  let graph = null; let templateDetail;
  if (!cfg.templatePath) {
    templateDetail = 'SWAN_COMFYUI_WORKFLOW is unset — export your graph from ComfyUI in API format and point this at it';
  } else if (!existsSync(cfg.templatePath)) {
    templateDetail = `not found at ${cfg.templatePath}`;
  } else {
    try { graph = loadGraph(cfg.templatePath); templateDetail = cfg.templatePath; }
    catch (err) { templateDetail = `${cfg.templatePath} — ${err.code}: ${err.message}`; }
  }
  checks.push({ name: 'workflow template', ok: graph !== null, detail: templateDetail });

  // ...AND THE BINDING MUST NAME A NODE THE TEMPLATE DECLARES. `buildGraph` answers this too, by
  // throwing — but it runs inside `generate()`, which the queue reaches only after the quote was
  // authorised and the job created. Answering it HERE is the difference between a line of output
  // on the render box and a job spent on a typo in an environment variable.
  const findings = graph ? inspectBindings(graph, cfg.bindings) : [];
  const promptFinding = findings.find((f) => f.key === 'prompt');
  checks.push({
    name: 'prompt node binding',
    ok: Boolean(cfg.bindings.prompt) && !promptFinding,
    detail: !cfg.bindings.prompt
      ? 'SWAN_COMFYUI_NODE_PROMPT is unset — set it to the node id whose text input is the positive prompt'
      : promptFinding ? promptFinding.detail
        : !graph ? `node ${cfg.bindings.prompt} — cannot be checked until the template loads`
          : `node ${cfg.bindings.prompt} carries the prompt`,
  });

  // The optional bindings get their own line so a bad duration/seed/image binding is NAMED rather
  // than hidden behind a healthy prompt binding. Vacuous when none are set, and it says so rather
  // than implying a check that did not happen.
  const optionalSet = Object.entries(cfg.bindings).filter(([k, v]) => k !== 'prompt' && v);
  const optionalFindings = findings.filter((f) => f.key !== 'prompt');
  checks.push({
    name: 'optional node bindings',
    ok: optionalFindings.length === 0,
    detail: optionalFindings.length ? optionalFindings.map((f) => f.detail).join(' ')
      : optionalSet.length
        ? `${optionalSet.length} set (${optionalSet.map(([k]) => k).join(', ')}) and all resolve`
        : 'none set — a graph with a fixed duration or no seed input needs none',
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
  // ...AND OBSERVED, so the timeout can report what actually happened. The old message asserted
  // "The job is still queued on the GPU" whether or not the prompt had ever appeared in history.
  let historyOk = 0;
  let sawEntry = false;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const hist = await fetchImpl(`${cfg.host}/history/${promptId}`, { method: 'GET' });
    if (hist.ok) {
      historyOk += 1;
      const body = await hist.json().catch(() => ({}));
      entry = body?.[promptId] || null;
      if (entry) sawEntry = true;
      // WHAT THE ENTRY MEANS, decided in one place. `{}` outputs and `completed` are not mutually
      // exclusive, and `status_str` is the only field that separates a failed graph from a finished
      // one that produced nothing — so a truthiness test here cannot answer the question.
      const state = terminalState(entry);
      if (state.state === 'failed') {
        // ROUND 25: `E_GRAPH_FAILED` is a MIXED code, so permanence is decided per INSTANCE here,
        // where the node's own exception is in hand, rather than by adding the code to the runner's
        // set. A blanket addition would make `CUDA out of memory` permanent, and OOM is a fact about
        // the moment — the very fixture this lane uses for this code. `markPermanence` in the runner
        // only ever sets `permanent` to true, never clears it, so this survives it; `ceilings.mjs`
        // already sets the flag per-instance for the same reason.
        const err = new ComfyError('E_GRAPH_FAILED', describeFailure(state.failure, promptId));
        if (failureIsDeterministic(state.failure)) err.permanent = true;
        throw err;
      }
      if (state.state === 'done') { completed = true; break; }
    }
    await onProgress(undefined, 'rendering');
  }
  if (!completed) {
    throw new ComfyError('E_TIMEOUT', describeTimeout({ promptId, timeoutMs, historyOk, sawEntry }));
  }

  const file = findOutputFile(entry);
  if (!file) {
    // ROUND 19: this branch is now HONEST rather than a guess. It is reached only when
    // `terminalState` said `done`, so the graph really did finish — which is what makes blaming the
    // output node correct here and wrong for a graph that raised (that is `E_GRAPH_FAILED` above).
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
