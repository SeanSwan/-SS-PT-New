/**
 * dropFolderImage.mjs — the ZERO-COST image lane.
 *
 * Sean's idea, corrected by what the tooling can actually do:
 *
 *   He asked whether Codex could generate images so a paid flat-rate
 *   subscription replaces per-image API spend. Verified 2026-08-11: Codex CLI
 *   v0.146.1 CANNOT generate images — its only image flag is `-i/--image`,
 *   which ATTACHES an image as input. Codex is a coding agent. If it called an
 *   image API the money would leave at the API, not at the agent, so nothing
 *   would be saved.
 *
 *   But the ARCHITECTURE he described — a producer writes a file, a consumer
 *   polls for it — is sound, and there IS a free producer: image generation
 *   included in his ChatGPT subscription. Generate there, drop the file here,
 *   the Forge picks it up. Flat-rate instead of $0.227/image.
 *
 * WHY THIS IS A PROVIDER AND NOT A SCRIPT
 * It implements the same capabilities/verify contract as openrouterImage.mjs,
 * so the compiler treats a human-in-the-loop source exactly like an API. The
 * expensive lane and the free lane are interchangeable at the seam.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It does not poll forever, it does not watch filesystem events, and it does
 * not "wait" — awaitDrop() takes an explicit deadline and RETURNS on timeout
 * rather than hanging. An agent that blocks indefinitely on a human is an agent
 * that has stopped working.
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';

/** Where a human (or any producer) drops finished images. */
export const DROP_DIR = '.ai-workflow/forge-drop';
export const REQUEST_DIR = join(DROP_DIR, 'requests');
export const READY_DIR = join(DROP_DIR, 'ready');
export const CONSUMED_DIR = join(DROP_DIR, 'consumed');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

class DropError extends Error {
  constructor(code, message) { super(message); this.name = 'DropError'; this.code = code; }
}

function ensureDirs(root) {
  for (const d of [DROP_DIR, REQUEST_DIR, READY_DIR, CONSUMED_DIR]) {
    const p = join(root, d);
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
  }
}

/**
 * Capabilities, in the shape the compiler consumes. A human producer is far
 * MORE capable than an API in some ways (they can honour an exact aspect ratio
 * by choosing it in the UI) and less in others (no seed, no negative prompt).
 * Declared honestly either way.
 */
export function capabilities() {
  return {
    provider: 'drop-folder',
    modelVersion: 'human-in-the-loop',
    label: 'Drop folder (flat-rate / manual)',
    promptStyle: 'sentence',      // a person reads prose better than tags
    maxPromptChars: 4000,
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:5', '21:9'],
    supportsImageInit: true,
    supportsInpainting: 'claimed', // depends entirely on the tool the human uses
    supportsSeed: false,
    seedIsDeterministic: 'false',
    honorsNegativePrompt: 'claimed',
    costCents: 0,                  // the entire point
  };
}

/** Always usable — it is a directory. Creates it if absent. */
export function verify(root = process.cwd()) {
  ensureDirs(root);
  return { ok: true, provider: 'drop-folder', problems: [] };
}

/**
 * Publish a request. Writes a human-readable brief the producer can act on,
 * and returns the id they should name the resulting image with.
 */
/**
 * Reduce any caller-supplied id to a single safe path segment.
 *
 * Found by an adversarial probe: a `briefId` of "../../escaped" produced an id
 * that `join()` resolved OUTSIDE the requests directory, writing an arbitrary
 * file into `.ai-workflow/`. That is a file-write primitive, and briefId is
 * exactly the kind of field that will one day carry user input.
 *
 * Strategy: allowlist, not blocklist. Anything that is not [A-Za-z0-9._-] is
 * replaced, which kills `/`, `\`, `..`, drive letters, NUL and unicode
 * separators in one rule rather than playing whack-a-mole with escapes.
 */
export function safeId(raw, fallback = 'brief') {
  const cleaned = String(raw ?? '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')   // any separator or oddity becomes a dash
    .replace(/^[.-]+/, '')                // no leading dots (hidden files) or dashes
    .replace(/\.+/g, '.')                 // collapse dot runs so ".." cannot survive
    .slice(0, 80);
  return cleaned.length ? cleaned : fallback;
}

export function requestDrop(compiled, root = process.cwd()) {
  ensureDirs(root);
  const id = `${safeId(compiled.briefId)}-${compiled.seed}`;
  const body = [
    `# Forge request  ${id}`,
    '',
    '## Paste this prompt into ChatGPT (or any image tool)',
    '',
    compiled.promptText,
    '',
    '## Required output',
    // Reads the compiler's TYPED aspect field. This used to print
    // `compiled.slots.output`, which is a composed prose blob — so the sheet
    // told a human operator "aspect ratio: **16:9, seamless, edge-matched**"
    // and left them to guess which part was the ratio. Same parse-the-prose
    // defect as the API provider had, just aimed at a person instead of a param.
    `- aspect ratio: **${compiled.aspect || '16:9'}**  <- set this in the tool, do not rely on the prompt text`,
    `- save the image as: **${id}.png**  (or .jpg / .webp)`,
    `- drop it in: \`${READY_DIR}/\``,
    '',
    '## Provenance (do not edit)',
    '```json',
    JSON.stringify({
      id,
      brainVersion: compiled.brainVersion,
      promptStyle: compiled.promptStyle,
      seed: compiled.seed,
      provider: 'drop-folder',
    }, null, 2),
    '```',
  ].join('\n');
  writeFileSync(join(root, REQUEST_DIR, `${id}.md`), body, 'utf8');
  return { id, requestPath: join(REQUEST_DIR, `${id}.md`), readyDir: READY_DIR };
}

/** Any images sitting in ready/, newest first. */
export function listReady(root = process.cwd()) {
  ensureDirs(root);
  const dir = join(root, READY_DIR);
  return readdirSync(dir)
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .map((f) => {
      const p = join(dir, f);
      const st = statSync(p);
      return { file: f, path: p, bytes: st.size, mtimeMs: st.mtimeMs, id: f.replace(extname(f), '') };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Has the image for this request arrived yet? One check, no waiting. */
export function checkDrop(id, root = process.cwd()) {
  const hit = listReady(root).find((f) => f.id === id);
  return hit ? { ready: true, ...hit } : { ready: false, id };
}

/**
 * Poll until the drop arrives or the deadline passes. RETURNS on timeout —
 * never throws for a slow human, because a timeout here is an expected state,
 * not an error. Caller decides whether to keep waiting or move on.
 *
 * @param {object} o { id, root, timeoutMs, intervalMs, onTick, sleep }
 */
export async function awaitDrop({
  id, root = process.cwd(), timeoutMs = 10 * 60_000, intervalMs = 5_000,
  onTick = null, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now(),
} = {}) {
  if (!id) throw new DropError('E_NO_ID', 'awaitDrop requires an id');
  const deadline = now() + timeoutMs;
  let ticks = 0;
  for (;;) {
    const hit = checkDrop(id, root);
    if (hit.ready) return { ...hit, timedOut: false, ticks };
    if (now() >= deadline) return { ready: false, id, timedOut: true, ticks };
    ticks += 1;
    if (onTick) onTick({ id, ticks, msLeft: deadline - now() });
    await sleep(intervalMs);
  }
}

/**
 * Take delivery: read the bytes and MOVE the file to consumed/ so the same
 * image is never ingested twice. Archive rather than delete (Rule 34).
 */
export function consumeDrop(id, root = process.cwd()) {
  const hit = checkDrop(id, root);
  if (!hit.ready) throw new DropError('E_NOT_READY', `No image for "${id}" in ${READY_DIR}`);
  const bytes = readFileSync(hit.path);
  const dest = join(root, CONSUMED_DIR, hit.file);
  writeFileSync(dest, bytes);
  // Remove from ready/ so the same image is never ingested twice; the archived
  // copy in consumed/ is authoritative (Rule 34 — archive, never delete).
  // NOTE: this used `require('node:fs')` inside an ESM module, where `require`
  // is undefined. The try/catch swallowed the ReferenceError, the file stayed
  // in ready/, and it would have been ingested on every subsequent poll — the
  // exact double-delivery this step exists to prevent, hidden by the catch.
  let removedFromReady = false;
  try { unlinkSync(hit.path); removedFromReady = true; } catch { /* archived copy stands */ }
  return {
    id, bytes, archivedAt: join(CONSUMED_DIR, hit.file),
    sizeBytes: bytes.length, removedFromReady,
  };
}

export { DropError };
