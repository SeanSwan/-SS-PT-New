/**
 * motionBind.mjs — the server half of the Motion rung.
 * ============================================================================
 *
 * "Approve → Motion" must animate THE frame the operator approved. Same prompt
 * and same seed do not reproduce an image, so the only honest input to the
 * first-frame graph is an asset id plus the sha256 of its bytes. This module
 * turns that pair into a queued job on the existing video queue — the same
 * lease/heartbeat/sweeper path every render already uses — and never accepts
 * a prompt in place of an asset.
 *
 * WHAT THE JOB CARRIES: `params.initImage = { assetId, r2Key, sha256, mime }`.
 * The agent resolves it (handlers/initImageBind.mjs): downloads via a read URL
 * the SERVER derives from the job's own params, re-verifies the hash at the
 * point of use, uploads into ComfyUI, and only then does the graph see a
 * filename. The agent cannot name a key; the operator cannot substitute a frame.
 *
 * The licence gate, request validation, idempotency and worker-presence honesty
 * are the existing ones from the video route — reused, not reimplemented.
 */

import { createHash } from 'node:crypto';
import { resolve as resolveProvider, validateVideoRequest, readGrants, readEnabled, ProviderError } from '../../../shared/providers/video/registry.mjs';
import { ComposeError, DERIVED_KEY_BUCKET_MS, normalizeText } from './composeLimits.mjs';
import { STILL_PROVIDER } from './localStillLane.mjs';

export class MotionError extends ComposeError {
  constructor(code, message, extra) { super(code, message, extra); this.name = 'MotionError'; }
}

/** The video registry's fixed vocabularies — reused so a Motion job is a normal job. */
export const MOTION_CATEGORY = 'marketing';
export const MOTION_STYLE = 'cinematic';
export const DEFAULT_MOTION_PROVIDER = STILL_PROVIDER; // comfyui/wan-2.2 — Apache, image2video

async function defaultDeps() {
  const [{ default: MediaAsset }, jobs, presence, r2] = await Promise.all([
    import('../../models/MediaAsset.mjs'),
    import('../videoRenderJobService.mjs'),
    import('../renderWorkerPresence.mjs'),
    import('../r2StorageService.mjs'),
  ]);
  return {
    assetModel: MediaAsset,
    createJob: jobs.createJob,
    getJob: jobs.getJob,
    workerPresence: presence.workerPresence,
    describePresence: presence.describePresence,
    readUrl: (key, mime) => r2.generatePlaybackUrl({ objectKey: key, mimeType: mime }),
    env: process.env,
    now: Date.now(),
  };
}

/**
 * Queue a Motion job bound to an approved still.
 * @param {object} req  { assetId, sha256, userId, prompt?, provider?, duration?, seed?, workspaceId?, idempotencyKey? }
 */
export async function bindMotion(req = {}, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  const assetId = String(req.assetId || '').trim();
  const sha256 = String(req.sha256 || '').trim().toLowerCase();
  if (!assetId) throw new MotionError('E_BIND_NO_ASSET', 'Motion needs an approved still: pass its assetId. A prompt is not accepted here.');
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new MotionError('E_BIND_NO_HASH', 'Motion needs the sha256 of the approved still. Approval binds bytes, not words.');
  if (!Number.isInteger(req.userId)) throw new MotionError('E_BAD_OWNER', 'An owner user id is required.');

  // GATE 1 — the asset exists, is the caller's, is an image, and its bytes are the approved bytes.
  const asset = await d.assetModel.findOne({ where: { id: assetId, ownerUserId: req.userId } });
  if (!asset) throw new MotionError('E_BIND_ASSET_NOT_FOUND', 'No asset with that id belongs to you.');
  if (asset.kind !== 'image') throw new MotionError('E_ASSET_NOT_IMAGE', `Asset ${assetId.slice(0, 8)} is a ${asset.kind}, not a still.`);
  const recorded = asset.provenance?.artifact?.sha256 || null;
  if (!recorded) throw new MotionError('E_BIND_NO_RECORDED_HASH', 'That asset has no recorded artifact hash, so approval cannot be bound to it.');
  if (recorded !== sha256) {
    throw new MotionError('E_BIND_HASH_MISMATCH',
      `The approved hash ${sha256.slice(0, 12)}… is not this asset's recorded ${recorded.slice(0, 12)}…. Refusing to animate a frame that is not the one approved.`);
  }

  // GATE 2 — provider: licence + enablement, exactly as the video route does it.
  const providerId = String(req.provider || DEFAULT_MOTION_PROVIDER);
  const territory = d.env?.SWAN_OPERATOR_TERRITORY || 'US';
  let caps;
  // Grants and enablement come from the INJECTED env. Letting the registry fall back to
  // process.env made the `env` parameter decorative — a test passed against one env while
  // production would read another. The bind's own test caught it.
  try { caps = resolveProvider(providerId, { commercial: true, territory, grants: readGrants(d.env || {}), enabled: readEnabled(d.env || {}) }); } catch (err) {
    if (err instanceof ProviderError) throw new MotionError(err.code, err.message);
    throw err;
  }

  // GATE 3 — the request, validated against THIS provider's ceilings. The prompt is the
  // motion direction only; the composition is the bound frame.
  const prompt = normalizeText(req.prompt || asset.provenance?.request?.prompt || 'animate the approved frame with subtle, cinematic motion');
  const initImage = { assetId: asset.id, r2Key: asset.r2Key, sha256, mime: asset.mime };
  let request;
  try {
    request = validateVideoRequest({
      prompt, category: MOTION_CATEGORY, style: MOTION_STYLE,
      duration: Number(req.duration) || caps.maxDurationSec?.value || caps.maxDurationSec || 5, initImage,
    }, caps);
  } catch (err) {
    if (err instanceof ProviderError) throw new MotionError(err.code, err.message);
    throw err;
  }

  // Idempotency — same asset, same hash, same direction, same minute → same job.
  const bucket = Math.floor((d.now ?? Date.now()) / DERIVED_KEY_BUCKET_MS);
  const idempotencyKey = req.idempotencyKey || createHash('sha256').update(JSON.stringify({
    u: req.userId, a: asset.id, h: sha256, p: request.prompt, dur: request.duration, prov: providerId, seed: req.seed ?? null, bucket,
  })).digest('hex').slice(0, 40);

  const { job, replayed } = await d.createJob({
    userId: req.userId,
    idempotencyKey,
    kind: 'generate',
    workflowId: `generate:${providerId}`,
    prompt: request.prompt,
    projectId: asset.projectId ?? null,
    params: {
      provider: providerId, prompt: request.prompt, category: request.category, style: request.style,
      duration: request.duration, territory, commercial: true, initImage,
      motion: { assetId: asset.id, sha256, workspaceId: req.workspaceId ?? null },
      ...(req.seed === undefined ? {} : { seed: Number(req.seed) }),
    },
    requiredCapabilities: ['generate'],
  });

  const presence = d.describePresence(await d.workerPresence({ requiredCapabilities: ['generate'] }));
  return {
    jobId: job.id, status: job.status, replayed, provider: providerId, attribution: caps.attribution || null,
    bound: { assetId: asset.id, sha256 },
    startable: presence.startable, workerState: presence.code, message: presence.message,
    statusUrl: `/api/content-studio/render-job/${job.id}`,
  };
}

/**
 * The agent's read ticket for a job's bound frame. The key comes from the JOB's own
 * params — the agent cannot name one — and only the lease holder may ask.
 */
export async function initImageReadTicket({ jobId, agentId }, deps = {}) {
  const d = { ...(Object.keys(deps).length ? {} : await defaultDeps()), ...deps };
  const job = await d.getJob(jobId);
  if (!job) throw new MotionError('E_JOB_NOT_FOUND', 'No such job.');
  if (job.leasedBy !== agentId) throw new MotionError('E_LEASE_CONFLICT', 'You do not hold the lease for this job.');
  const ref = job.params?.initImage;
  if (!ref || typeof ref !== 'object' || !ref.r2Key) throw new MotionError('E_BIND_NO_INIT_IMAGE', 'This job has no bound frame.');
  const url = await d.readUrl(ref.r2Key, ref.mime || 'image/png');
  return { url, sha256: ref.sha256, mime: ref.mime || 'image/png', assetId: ref.assetId };
}
