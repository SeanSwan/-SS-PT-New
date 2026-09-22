/**
 * comfyuiGraph.mjs — loading a ComfyUI workflow and injecting one request into it.
 *
 * Split out of `comfyuiLocal.mjs` when that file crossed the 300-line cap (rule 4).
 * The division is real rather than cosmetic: this file is about the GRAPH — a JSON
 * document with node ids and input names — while the adapter next door is about the
 * TRANSPORT: HTTP, polling, bytes on disk. Neither needs the other's vocabulary.
 *
 * ── ROUND 18: OWN PROPERTIES, AND A REPORT THAT MATCHES THE RUN ─────────────
 * Three lookups here used to walk the PROTOTYPE CHAIN, and one validator checked JSON
 * syntax without checking JSON shape. See `own()` and `loadGraph` for what was wrong and
 * what it cost. `BINDINGS` was added so that `buildGraph` (what a run does) and
 * `inspectBindings` (what `verify()` tells an operator) read ONE table — two lists would
 * drift, and the drift would be a report that calls a broken configuration healthy.
 */

import { readFileSync, existsSync } from 'node:fs';

class ComfyError extends Error {
  constructor(code, message) { super(message); this.name = 'ComfyError'; this.code = code; }
}

/**
 * Own-property test. `obj[key]` and `key in obj` both resolve through the PROTOTYPE CHAIN, and
 * on a plain object literal that is not a theoretical concern — it is `Object.prototype`:
 *
 *   - `FIELD_CANDIDATES['constructor']` is `Object`, a FUNCTION, so `.find` on it threw
 *     `(FIELD_CANDIDATES[slot] || [slot]).find is not a function` where a refusal belonged;
 *   - `'constructor' in node.inputs` is TRUE on EVERY node, so the guard below — whose whole
 *     job is DETECTION, NEVER CREATION — would have "detected" an input that does not exist and
 *     written the prompt to a key ComfyUI ignores: full GPU cost, the template's placeholder
 *     rendered, success reported. That is the exact failure the comment above the guard names;
 *   - `graph[nodeId]` for such an id is a FUNCTION, and `node.inputs = node.inputs || {}` then
 *     WROTE to it. Measured: `SWAN_COMFYUI_NODE_PROMPT=constructor` created `Object.inputs` on
 *     the global `Object` constructor.
 *
 * The same class as round 6's `VIDEO_PROVIDERS['constructor']` and round 13's
 * `all.callers['__proto__']`, in a third shape. `!= null` because `Object.hasOwn(null, k)` throws.
 */
const own = (obj, key) => obj != null && Object.hasOwn(obj, key);

/** The node's inputs, or an empty object. A node whose `inputs` is not an object has no inputs
 *  to detect — and `Object.hasOwn('abc', 'length')` is TRUE, with `length` a real candidate for
 *  the duration slot, so treating a primitive as a container would reach the assignment below. */
const inputsOf = (node) => (node.inputs && typeof node.inputs === 'object' ? node.inputs : {});

/** Deep-clone the graph so an injection never mutates the template on disk. */
export function loadGraph(templatePath) {
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
  // SHAPE, not just syntax. `null`, a bare array and a scalar are all valid JSON, and each of
  // them used to be returned as a "graph" — the next call then ran `Object.keys(null)` inside
  // its own error message and threw a raw TypeError where a named refusal belongs. A refusal
  // that cannot say what is wrong is the "fails as the wrong answer" failure `wire.mjs` names.
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const what = parsed === null ? 'null' : Array.isArray(parsed) ? 'an array' : `a ${typeof parsed}`;
    throw new ComfyError('E_BAD_WORKFLOW',
      `Workflow template must be a JSON object of nodeId -> {class_type, inputs}; this file is ${what}. `
      + 'Export the graph from ComfyUI using "Save (API format)" and set SWAN_COMFYUI_WORKFLOW.');
  }
  // API-format exports are a flat map of nodeId -> {class_type, inputs}. A GUI-format
  // export has a `nodes` ARRAY instead, and posting one produces a confusing 400 from
  // ComfyUI, so name the mistake here where it is obvious.
  if (Array.isArray(parsed.nodes)) {
    throw new ComfyError('E_GUI_FORMAT_WORKFLOW',
      'This looks like a GUI-format workflow export. ComfyUI needs the API format — '
      + 'use "Save (API format)" (enable Dev Mode in settings if the option is hidden).');
  }
  return JSON.parse(JSON.stringify(parsed));
}

/**
 * Candidate input names per slot, most-common first.
 *
 * Node authors do not agree on these. Wan's `CLIPTextEncode` calls the prompt `text`;
 * MiniMax H3's `MiniMaxH3ImageToVideo` calls it `prompt`. Hardcoding `text` meant the
 * adapter drove one model and threw on the other — and it was caught only because the
 * guard below refuses to CREATE a field, which is precisely what that guard is for.
 */
export const FIELD_CANDIDATES = {
  prompt: ['text', 'prompt', 'string'],
  duration: ['value', 'length', 'duration', 'frames'],
  seed: ['seed', 'noise_seed'],
  image: ['image', 'first_frame', 'pixels'],
};

/** The candidate names for a slot. Own-property test: an unknown slot falls back to its own
 *  name, but a slot named after an `Object.prototype` member must NOT return `Object`. */
const candidatesFor = (slot) => (own(FIELD_CANDIDATES, slot) ? FIELD_CANDIDATES[slot] : [slot]);

/**
 * The config bindings this adapter knows how to inject, in injection order.
 *
 * ONE TABLE, TWO CONSUMERS. `buildGraph` injects from it; `inspectBindings` reports from it, and
 * `verify()` shows that report to an operator before anything runs. Two hand-written lists would
 * drift, and the drift is invisible in the direction that matters: a binding added to `buildGraph`
 * and forgotten here would make `verify()` call a configuration healthy that every run refuses —
 * a completeness claim that is a fabrication, which is round 16's lesson one level down.
 *
 * Exported so a probe can assert it against the keys `resolveConfig` actually reads; a binding
 * present in one and not the other is the drift this table exists to prevent.
 */
export const BINDINGS = Object.freeze([
  {
    key: 'prompt', slot: 'prompt', env: 'SWAN_COMFYUI_NODE_PROMPT', required: true,
    value: (request) => request.prompt,
  },
  {
    key: 'duration', slot: 'duration', env: 'SWAN_COMFYUI_NODE_DURATION',
    value: (request) => request.duration,
  },
  {
    key: 'seed', slot: 'seed', env: 'SWAN_COMFYUI_NODE_SEED',
    value: (request, seed) => seed,
    // A graph with no seed input is legitimate, and so is a run that does not want one.
    when: (request, seed) => seed !== undefined,
  },
  {
    key: 'initImage', slot: 'image', env: 'SWAN_COMFYUI_NODE_IMAGE',
    value: (request) => request.initImage,
    when: (request) => Boolean(request.initImage),
  },
]);

export function injectInput(graph, nodeId, slot, value) {
  if (!own(graph, nodeId)) {
    throw new ComfyError('E_NO_NODE',
      `Workflow has no node "${nodeId}". Present node ids: ${Object.keys(graph || {}).join(', ')}`);
  }
  const node = graph[nodeId];
  if (!node || typeof node !== 'object') {
    throw new ComfyError('E_NO_NODE',
      `Workflow node "${nodeId}" is ${node === null ? 'null' : `a ${typeof node}`}, not a node object. `
      + `Present node ids: ${Object.keys(graph).join(', ')}`);
  }
  const inputs = inputsOf(node);
  const candidates = candidatesFor(slot);

  // DETECTION, NEVER CREATION. Pick the first candidate the node actually declares; if
  // none match, fall through to the refusal rather than inventing an input.
  //
  // Creating one would be the worst failure mode available here: ComfyUI silently
  // ignores an input a node does not declare, so the graph would run at full GPU cost,
  // render whatever placeholder prompt the template was saved with, and report success.
  const field = candidates.find((f) => own(inputs, f));
  if (!field) {
    throw new ComfyError('E_NO_INPUT',
      `Node "${nodeId}" (${node.class_type || 'unknown type'}) has no input for "${slot}" `
      + `(tried: ${candidates.join(', ')}). `
      + `Its inputs are: ${Object.keys(inputs).join(', ') || '(none)'}. `
      + 'Point the binding at the node that actually carries this value.');
  }
  node.inputs[field] = value;
  return field;
}

/**
 * Does each SET binding name a node the template declares, and does that node declare an input
 * for the slot? Returns findings; never throws.
 *
 * `buildGraph` answers the same question by THROWING, and for a run that is right. `verify()`
 * needs the answer as a REPORT, and it needs it EARLIER: `buildGraph` runs inside `generate()`,
 * which the queue reaches only after the quote was authorised and the job created. A typo in
 * `SWAN_COMFYUI_NODE_PROMPT` therefore costs a job rather than a line of output.
 *
 * `when` is deliberately not consulted. A binding that is set is worth checking whether or not
 * this particular request would use it — the operator is asking whether the CONFIGURATION is
 * coherent, and "the image binding is broken but you did not send an image" is still broken.
 */
export function inspectBindings(graph, bindings = {}) {
  const findings = [];
  for (const { key, slot, env } of BINDINGS) {
    const nodeId = (bindings || {})[key] || '';
    if (!nodeId) continue;              // an unset binding is verify()'s other check, not this one
    if (!own(graph, nodeId)) {
      findings.push({
        key, slot, nodeId, code: 'E_NO_NODE',
        detail: `${env} names node "${nodeId}", which the template does not declare. `
          + `Present node ids: ${Object.keys(graph || {}).join(', ') || '(none)'}`,
      });
      continue;
    }
    const node = graph[nodeId] && typeof graph[nodeId] === 'object' ? graph[nodeId] : {};
    const inputs = inputsOf(node);
    const candidates = candidatesFor(slot);
    if (!candidates.some((f) => own(inputs, f))) {
      findings.push({
        key, slot, nodeId, code: 'E_NO_INPUT',
        detail: `node "${nodeId}" (${node.class_type || 'unknown type'}) declares no "${slot}" input `
          + `(tried: ${candidates.join(', ')}; its inputs are: ${Object.keys(inputs).join(', ') || '(none)'}). `
          + 'Point the binding at the node that carries this value.',
      });
    }
  }
  return findings;
}

/** Build the graph for one request. Pure, so injection is testable without a GPU. */
export function buildGraph(request, cfg, { seed } = {}) {
  const graph = loadGraph(cfg.templatePath);
  const bindings = cfg.bindings || {};
  for (const { key, slot, required, when, value } of BINDINGS) {
    const nodeId = bindings[key] || '';
    // Only the prompt binding is unconditional: a graph with no way to receive the prompt is not
    // a text-to-video graph, so it refuses loudly rather than skipping.
    if (!required && !nodeId) continue;
    if (when && !when(request, seed)) continue;
    injectInput(graph, nodeId, slot, value(request, seed));
  }
  return graph;
}

/**
 * Find the produced video in a history entry.
 *
 * Video-saving nodes are not standardised — different custom node packs report under
 * `gifs`, `videos`, or plain `images` with a video extension. Scanning all of them beats
 * hardcoding one pack's convention.
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

export { ComfyError };
