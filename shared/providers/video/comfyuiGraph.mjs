/**
 * comfyuiGraph.mjs — loading a ComfyUI workflow and injecting one request into it.
 *
 * Split out of `comfyuiLocal.mjs` when that file crossed the 300-line cap (rule 4).
 * The division is real rather than cosmetic: this file is about the GRAPH — a JSON
 * document with node ids and input names — while the adapter next door is about the
 * TRANSPORT: HTTP, polling, bytes on disk. Neither needs the other's vocabulary.
 */

import { readFileSync, existsSync } from 'node:fs';

class ComfyError extends Error {
  constructor(code, message) { super(message); this.name = 'ComfyError'; this.code = code; }
}

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

export function injectInput(graph, nodeId, slot, value) {
  const node = graph[nodeId];
  if (!node) {
    throw new ComfyError('E_NO_NODE',
      `Workflow has no node "${nodeId}". Present node ids: ${Object.keys(graph).join(', ')}`);
  }
  node.inputs = node.inputs || {};

  // DETECTION, NEVER CREATION. Pick the first candidate the node actually declares; if
  // none match, fall through to the refusal rather than inventing an input.
  //
  // Creating one would be the worst failure mode available here: ComfyUI silently
  // ignores an input a node does not declare, so the graph would run at full GPU cost,
  // render whatever placeholder prompt the template was saved with, and report success.
  const field = (FIELD_CANDIDATES[slot] || [slot]).find((f) => f in node.inputs);
  if (!field) {
    throw new ComfyError('E_NO_INPUT',
      `Node "${nodeId}" (${node.class_type || 'unknown type'}) has no input for "${slot}" `
      + `(tried: ${(FIELD_CANDIDATES[slot] || [slot]).join(', ')}). `
      + `Its inputs are: ${Object.keys(node.inputs).join(', ') || '(none)'}. `
      + 'Point the binding at the node that actually carries this value.');
  }
  node.inputs[field] = value;
  return field;
}

/** Build the graph for one request. Pure, so injection is testable without a GPU. */
export function buildGraph(request, cfg, { seed } = {}) {
  const graph = loadGraph(cfg.templatePath);

  injectInput(graph, cfg.bindings.prompt, 'prompt', request.prompt);

  if (cfg.bindings.duration) injectInput(graph, cfg.bindings.duration, 'duration', request.duration);
  if (cfg.bindings.seed && seed !== undefined) injectInput(graph, cfg.bindings.seed, 'seed', seed);
  if (cfg.bindings.initImage && request.initImage) {
    injectInput(graph, cfg.bindings.initImage, 'image', request.initImage);
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
export const VIDEO_EXT = /\.(mp4|webm|mov|mkv|gif)$/i;
export const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

/**
 * @param {object} entry   a ComfyUI /history entry
 * @param {RegExp} [match] which filenames count as THE artifact. Defaults to
 *   video — the lane this was written for. The Atelier still lane passes
 *   IMAGE_EXT: a graph ending in SaveImage emits `.png`, which the video
 *   default rightly ignores, so without this a finished still reported as
 *   "no output" and pointed diagnosis at the graph instead of the matcher.
 */
export function findOutputFile(entry, match = VIDEO_EXT) {
  for (const nodeOut of Object.values(entry?.outputs || {})) {
    for (const key of ['videos', 'gifs', 'images']) {
      for (const f of nodeOut?.[key] || []) {
        if (f?.filename && match.test(f.filename)) return f;
      }
    }
  }
  return null;
}

export { ComfyError };
