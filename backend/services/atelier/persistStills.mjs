/**
 * persistStills.mjs — a Compose still becomes a MediaAsset, or the caller is told why not.
 * ============================================================================
 *
 * This is the missing half of the Still rung. Without it a still is bytes in a
 * response (hosted) or a file on the render box (local) — and the Motion rung
 * cannot exist, because approving a still must BIND the exact artifact the
 * first-frame graph consumes. "Same prompt, same seed" does not reproduce an
 * image. An asset id plus a sha256 does.
 *
 * ── THREE RULES ────────────────────────────────────────────────────────────
 * 1. Storage must exist before a row does. R2 unconfigured REFUSES. The
 *    evidence service's `local://` placeholder is fine for dev photos; a
 *    provenance-bearing asset that points at bytes nobody can produce is a
 *    licence record about nothing.
 * 2. The object key IS the artifact hash. `atelier/stills/<owner>/<sha256>.<ext>` (no date)
 *    — so a replay, a double-click, or an at-least-once retry lands on
 *    `findOrCreate` with the same key. MediaAsset's own docblock: the unique key
 *    is what makes at-least-once harmless.
 * 3. Persistence never hides a still. A failure is recorded per still with a
 *    code; the still is still returned. Bytes exist, the row does not, and the
 *    caller can see which.
 *
 * Every collaborator is injectable (uploader, model, reader, fetch, clock) so
 * the suite runs with no R2 and no database. Production defaults load lazily so
 * importing this module never opens a DB connection on its own.
 */

import { createHash } from 'node:crypto';
import { readFile as fsReadFile } from 'node:fs/promises';
import { imageDimensions } from '../../../shared/imageDimensions.mjs';
import { buildProvenance } from '../../../shared/providers/video/provenance.mjs';
import { resolve as resolveProvider, ProviderError } from '../../../shared/providers/video/registry.mjs';
import { ComposeError } from './composeLimits.mjs';
import { STILL_PROVIDER } from './localStillLane.mjs';

export class PersistError extends ComposeError {
  constructor(code, message, extra) { super(code, message, extra); this.name = 'PersistError'; }
}

const MIME_BY_FORMAT = Object.freeze({ png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' });
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/**
 * CONTENT-ADDRESSED. `atelier/stills/<owner>/<sha256>.<ext>` — no date segment. An
 * earlier draft put the month in the path, which made the same bytes two objects
 * and two rows across a month boundary and quietly broke the "key = hash" claim the
 * panel took at its word. The month lives in the row's timestamps, not the key.
 */
export function stillObjectKey({ userId, sha256: hash, ext = 'png' }) {
  return `atelier/stills/${userId}/${hash}.${ext}`;
}

/** Production collaborators, loaded only when nothing was injected. */
async function defaultDeps() {
  const env = process.env;
  const storageReady = !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);
  const [{ default: MediaAsset }, r2, s3] = await Promise.all([
    import('../../models/MediaAsset.mjs'),
    import('../r2StorageService.mjs'),
    import('@aws-sdk/client-s3'),
  ]);
  return {
    storageReady,
    assetModel: MediaAsset,
    putObject: async ({ Key, Body, ContentType, Metadata }) => {
      await r2.getR2Client().send(new s3.PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key, Body, ContentType, Metadata }));
    },
    readUrl: (key, mime) => r2.generatePlaybackUrl({ objectKey: key, mimeType: mime }),
    readFile: (p) => fsReadFile(p),
    fetchImpl: fetch,
    now: new Date(),
  };
}

/** Bytes for a still, from whichever shape the lane produced. */
async function loadBytes(still, { readFile, fetchImpl }) {
  const img = still.image || {};
  if (img.kind === 'path') {
    try { return await readFile(img.path); } catch (err) {
      throw new PersistError('E_STILL_UNREADABLE',
        `The rendered still at ${img.path} could not be read by the backend (${err?.code || err?.message}). `
        + 'The render machine and the backend must share that path, or the agent must upload the artifact.');
    }
  }
  const data = String(img.data || '');
  if (/^https?:\/\//i.test(data)) {
    let res;
    try { res = await fetchImpl(data, { signal: AbortSignal.timeout(30_000) }); } catch (err) {
      throw new PersistError('E_STILL_UNREADABLE', `Could not fetch the provider image: ${err?.message || err}`);
    }
    if (!res.ok) throw new PersistError('E_STILL_UNREADABLE', `Provider image URL answered ${res.status}.`);
    return Buffer.from(await res.arrayBuffer());
  }
  const b64 = data.replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length === 0) throw new PersistError('E_STILL_UNREADABLE', 'The still carried no image bytes.');
  return buf;
}

function capsFor(still, model) {
  if (still.lane === 'local') {
    try { return resolveProvider(STILL_PROVIDER, { commercial: true, requireEnabled: false }); } catch (err) {
      if (err instanceof ProviderError) return { provider: STILL_PROVIDER, label: STILL_PROVIDER, attribution: null };
      throw err;
    }
  }
  // Hosted image models are not in the video catalogue: no licence entry, so the
  // snapshot records nulls rather than inventing terms. Provider + prompt hash + artifact
  // hash are still frozen — that is what makes the record identify its file.
  return { provider: still.provider || model, label: still.provider || model, attribution: null };
}

/**
 * Persist ONE still. Returns { assetId, r2Key, sha256, created, mime, width, height }.
 * Throws PersistError (a ComposeError) with a code the route can map.
 */
export async function persistStill({ still, userId, workspaceId = null, model, caps, commercial = true, territory = 'US', grantRecorded = false }, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  if (!d.storageReady) {
    throw new PersistError('E_STORAGE_UNCONFIGURED',
      'Object storage is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME). '
      + 'A still cannot become an asset without a place for its bytes; nothing was written.');
  }
  if (!Number.isInteger(userId)) throw new PersistError('E_BAD_OWNER', 'An owner user id is required to persist an asset.');

  const bytes = await loadBytes(still, d);
  const hash = sha256(bytes);
  if (still.sha256 && still.sha256 !== hash) {
    throw new PersistError('E_ARTIFACT_HASH_MISMATCH',
      `The still declared sha256 ${still.sha256.slice(0, 12)}… but the bytes read hash to ${hash.slice(0, 12)}…; refusing to record provenance for a file that is not the one rendered.`);
  }
  const dims = imageDimensions(bytes);
  const format = dims?.format || (still.image?.mime ? still.image.mime.split('/')[1] : null) || 'png';
  const mime = MIME_BY_FORMAT[format] || still.image?.mime || 'image/png';
  const r2Key = stillObjectKey({ userId, sha256: hash, ext: format === 'jpeg' ? 'jpg' : format });

  const c = caps || capsFor(still, model);
  const provenance = buildProvenance({
    caps: c,
    request: { prompt: still.promptText || '', category: 'atelier-still', style: null, duration: null, initImage: null },
    result: { filename: r2Key.split('/').pop(), bytes: bytes.length, sha256: hash, promptId: null },
    commercial, territory, grantRecorded, now: d.now,
  });

  // Row first, then bytes only if the row is new: an existing row means the bytes are
  // already there under this exact key (the key IS the hash).
  const [row, created] = await d.assetModel.findOrCreate({
    where: { r2Key },
    defaults: {
      ownerUserId: userId, jobId: null, kind: 'image', source: 'generated', r2Key, posterR2Key: null,
      mime, width: dims?.width ?? still.width ?? null, height: dims?.height ?? still.height ?? null,
      durationMs: null, sizeBytes: bytes.length, exerciseId: null,
      // `projectId` is a content_projects FK, not a workspace. Workspaces do not exist yet (S5);
      // recording a workspace id in a column that means something else would be drift by design.
      projectId: null,
      approvalStatus: 'draft',
      tags: ['atelier', 'still', `lane:${still.lane}`, `seed:${still.seed}`, ...(workspaceId ? [`workspace:${workspaceId}`] : [])],
      provenance,
    },
  });
  if (created) {
    await d.putObject({ Key: r2Key, Body: bytes, ContentType: mime, Metadata: { ownerUserId: String(userId), sha256: hash, lane: String(still.lane) } });
  }
  return { assetId: row.id, r2Key, sha256: hash, created, mime, width: dims?.width ?? null, height: dims?.height ?? null };
}

/**
 * Persist a whole batch, never failing the batch. Mutates each still in place with
 * `assetId`/`r2Key`/`sha256` on success or `persist: {ok:false, code, message}` on failure.
 * Returns the batch verdict.
 */
export async function persistBatch({ stills, lane, userId, workspaceId, model }, deps = {}) {
  let persisted = 0; let firstError = null;
  for (const s of stills) {
    try {
      const r = await persistStill({ still: { ...s, lane: s.lane || lane }, userId, workspaceId, model }, deps);
      Object.assign(s, { assetId: r.assetId, r2Key: r.r2Key, sha256: r.sha256, persist: { ok: true, created: r.created } });
      persisted += 1;
    } catch (err) {
      const code = err?.code || 'E_PERSIST_FAILED';
      s.persist = { ok: false, code, message: err?.message || String(err) };
      s.assetId = null;
      if (!firstError) firstError = { code, message: s.persist.message };
      // Storage unconfigured is the same answer for every still; do not repeat the refusal N times.
      if (code === 'E_STORAGE_UNCONFIGURED') { for (const rest of stills.slice(stills.indexOf(s) + 1)) { rest.persist = s.persist; rest.assetId = null; } break; }
    }
  }
  return { ok: persisted === stills.length, persisted, total: stills.length, ...(firstError ? { code: firstError.code, message: firstError.message } : {}) };
}

/** One asset, owner-scoped, with provenance and a short-lived read URL. */
export async function readAsset({ id, userId }, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  const row = await d.assetModel.findOne({ where: { id, ownerUserId: userId } });
  if (!row) throw new PersistError('E_ASSET_NOT_FOUND', 'No asset with that id belongs to you.');
  const readUrl = d.readUrl ? await d.readUrl(row.r2Key, row.mime).catch(() => null) : null;
  return {
    id: row.id, r2Key: row.r2Key, mime: row.mime, width: row.width, height: row.height, sizeBytes: row.sizeBytes,
    approvalStatus: row.approvalStatus, tags: row.tags, provenance: row.provenance, readUrl,
    sha256: row.provenance?.artifact?.sha256 ?? null,
  };
}
