/**
 * initImageBind.mjs — the agent-side half of the Motion bind.
 * ============================================================================
 *
 * The server queues a Motion job whose `params.initImage` is an OBJECT:
 * `{ assetId, r2Key, sha256, mime }` — a reference to a persisted still, never a
 * prompt and never a filename the agent has to trust. ComfyUI's LoadImage node,
 * however, wants a filename inside its own `input/` directory. This module is
 * the only place that turns one into the other, and it does the one thing that
 * makes "animate the frame you approved" true:
 *
 *   download the bytes → hash them → REFUSE if the hash is not the bound one →
 *   upload into ComfyUI → hand the graph the filename ComfyUI assigned.
 *
 * The hash check is not paranoia. The server verified the hash when it queued
 * the job; the agent verifies it again at the moment of use, because between
 * those two moments the object could have been replaced, and the graph would
 * happily animate whatever it was given.
 *
 * A string `initImage` passes through untouched — the pre-existing contract for
 * operators who reference a file already in ComfyUI's input dir.
 *
 * Everything is injected so the suite runs without a network, an R2, or a GPU.
 */

import { createHash } from 'node:crypto';

export class BindError extends Error {
  constructor(code, message, { permanent = true } = {}) {
    super(message);
    this.name = 'BindError';
    this.code = code;
    // A hash mismatch or a missing asset is a fact about the REQUEST — retrying
    // downloads the same wrong bytes. A network blip is not.
    this.permanent = permanent;
  }
}

export function isBoundInitImage(v) {
  return !!v && typeof v === 'object' && typeof v.sha256 === 'string' && v.sha256.length === 64;
}

/**
 * Upload bytes into ComfyUI's input directory. Returns the filename ComfyUI assigned
 * (it may rename on collision unless `overwrite` — we send overwrite and a
 * hash-derived name, so a re-run of the same job reuses the same file).
 */
export async function uploadToComfy(bytes, name, { comfyHost, fetchImpl = fetch } = {}) {
  const fd = new FormData();
  fd.append('image', new Blob([bytes]), name);
  fd.append('overwrite', 'true');
  let res;
  try {
    res = await fetchImpl(`${String(comfyHost).replace(/\/$/, '')}/upload/image`, { method: 'POST', body: fd });
  } catch (err) {
    throw new BindError('E_COMFY_UPLOAD_FAILED', `Could not reach ComfyUI to upload the bound frame: ${err?.message || err}`, { permanent: false });
  }
  if (!res.ok) {
    throw new BindError('E_COMFY_UPLOAD_FAILED', `ComfyUI refused the bound frame upload (${res.status}).`, { permanent: res.status < 500 });
  }
  const body = await res.json().catch(() => ({}));
  if (!body?.name) throw new BindError('E_COMFY_UPLOAD_FAILED', 'ComfyUI accepted the upload but returned no filename.', { permanent: false });
  return body.name;
}

/**
 * Resolve `params.initImage` to what the graph can use.
 *
 * @param {object} job          the leased job (id + params)
 * @param {object} deps         { api, fetchImpl, comfyHost, onProgress }
 *   api(path, {method,body})   the agent's authenticated client (agent token)
 * @returns {Promise<string|null>} a ComfyUI input filename, the original string, or null
 */
export async function bindInitImage(job, deps = {}) {
  const { api, fetchImpl = fetch, comfyHost, onProgress = async () => {} } = deps;
  const ref = job?.params?.initImage ?? null;
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (!isBoundInitImage(ref)) {
    throw new BindError('E_BIND_MALFORMED', 'params.initImage is neither a filename nor a bound asset reference.');
  }
  if (typeof api !== 'function') {
    throw new BindError('E_BIND_NO_API', 'A bound init image needs the agent API to fetch a read URL; none was supplied.', { permanent: false });
  }
  if (!comfyHost) throw new BindError('E_BIND_NO_COMFY_HOST', 'No ComfyUI host to upload the bound frame into.');

  await onProgress(3, 'fetching bound frame');
  // The server, not the agent, decides which object this job may read: the URL is
  // derived from the JOB's own params on the server side. The agent cannot name a key.
  const ticket = await api(`/jobs/${job.id}/init-image`, { method: 'POST' });
  const url = ticket?.data?.url;
  const expected = String(ticket?.data?.sha256 || ref.sha256);
  if (!url) throw new BindError('E_BIND_NO_READ_URL', 'Server returned no read URL for the bound frame.', { permanent: false });

  let res;
  try { res = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(60_000) }); } catch (err) {
    throw new BindError('E_BIND_DOWNLOAD_FAILED', `Could not download the bound frame: ${err?.message || err}`, { permanent: false });
  }
  if (!res.ok) throw new BindError('E_BIND_DOWNLOAD_FAILED', `Bound frame download answered ${res.status}.`, { permanent: res.status === 404 });
  const bytes = Buffer.from(await res.arrayBuffer());

  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) {
    // THE BIND. The frame the operator approved is identified by this hash and nothing else.
    throw new BindError('E_BIND_HASH_MISMATCH',
      `The bound frame's bytes hash to ${actual.slice(0, 12)}…, not the approved ${expected.slice(0, 12)}…. `
      + 'Refusing to animate a frame that is not the one approved.');
  }

  await onProgress(4, 'uploading bound frame to ComfyUI');
  const ext = (ticket?.data?.mime || ref.mime || 'image/png').split('/')[1] || 'png';
  return uploadToComfy(bytes, `swan-bound-${expected.slice(0, 16)}.${ext === 'jpeg' ? 'jpg' : ext}`, { comfyHost, fetchImpl });
}

/**
 * Apply the bind to a validated request. A string or absent `initImage` leaves the
 * request untouched. A BindError keeps its own `permanent` verdict — a hash mismatch
 * is a fact about the request; a network blip is not — so the queue's retry
 * classifier reads it as-is.
 */
export async function applyBoundInitImage(job, request, { api, fetchImpl = fetch, env = process.env, onProgress } = {}) {
  const comfyHost = String(env.SWAN_COMFYUI_URL || 'http://127.0.0.1:8188');
  const bound = await bindInitImage(job, { api, fetchImpl, comfyHost, onProgress });
  return bound === null ? request : { ...request, initImage: bound };
}
