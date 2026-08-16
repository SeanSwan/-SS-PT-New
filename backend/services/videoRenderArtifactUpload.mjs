/**
 * videoRenderArtifactUpload.mjs — presigned upload for a render agent's artifact.
 *
 * ── WHY PRESIGNED, AND NOT THE AGENT TALKING TO R2 DIRECTLY ─────────────────
 * The render agent runs on Sean's workstation and is PROVEN to run from a fresh
 * checkout with zero `npm install` — it imports only repo files and node builtins.
 * Importing the S3 SDK into it would destroy that property and turn "clone and run"
 * into "clone, install 40MB of AWS SDK, then run".
 *
 * So the server signs (it already has the SDK and the credentials) and the agent
 * does a plain `fetch(url, { method: 'PUT', body })`. This also means R2 credentials
 * never leave Render — the agent holds a short-lived URL for one object, not a key.
 *
 * ── THE SECURITY PROPERTY THAT MATTERS ──────────────────────────────────────
 * THE OBJECT KEY IS DERIVED FROM THE JOB, NEVER FROM THE CLIENT. If an agent could
 * name its own key it could obtain a signed PUT for `videos/someone-elses-file.mp4`
 * and overwrite it. The agent supplies a filename; this module reduces that to a
 * sanitised leaf and prefixes it with the job's own namespace.
 *
 * Lease ownership is checked by the caller against the same rule the heartbeat and
 * complete endpoints use — an agent may only touch a job it currently holds.
 */

import { generateUploadUrl, r2Configured } from './r2StorageService.mjs';
import { getJob } from './videoRenderJobService.mjs';

class ArtifactUploadError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ArtifactUploadError';
    this.status = status;
    this.code = code;
  }
}

/** 2 GB. A render that exceeds this is a bug or a misconfiguration, not a video. */
export const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'image/gif',
]);

/**
 * Reduce a client-supplied filename to a safe leaf.
 *
 * Everything about this function is about what it REMOVES. `../../etc/passwd`,
 * `C:\windows\x`, a leading dot, and a 400-character name are all inputs a caller
 * can send, and none of them may survive into a key.
 */
export function safeLeafName(filename) {
  const raw = String(filename || '').trim();
  // Take the last path segment under BOTH separators before sanitising, so a Windows
  // agent sending a backslash path cannot smuggle a directory through a POSIX basename.
  const leaf = raw.split(/[\\/]/).pop() || '';
  const cleaned = leaf
    .replace(/[^A-Za-z0-9._-]/g, '_')   // anything exotic becomes an underscore
    .replace(/^\.+/, '');                // no leading dots: no hidden files, no ".."

  const m = cleaned.match(/\.([A-Za-z0-9]{2,5})$/);
  if (!m) {
    throw new ArtifactUploadError(400, 'VALIDATION_ERROR',
      'Artifact filename must carry a recognisable extension.');
  }

  // Truncate the STEM and reattach the extension. Slicing the whole string first cut the
  // extension off any long name and then rejected it for having none — and ComfyUI emits
  // long names by default (`ComfyUI_00042_<prompt fragment>.mp4`), so the "too long"
  // path is the common one, not the exotic one.
  const ext = m[0];
  const stem = cleaned.slice(0, cleaned.length - ext.length);
  const maxStem = Math.max(1, 120 - ext.length);
  return stem.slice(0, maxStem) + ext;
}

/** The key an artifact for this job is allowed to occupy. Job-namespaced, always. */
export function artifactObjectKey(jobId, filename) {
  // Leading dots are stripped here for the same reason as in the filename: a job id of
  // ".." would otherwise yield `renders/../<file>`, which object storage treats as a
  // literal key but anything that later syncs those keys to a filesystem does not.
  const safeJob = String(jobId)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^\.+/, '_')
    .slice(0, 64);
  if (!safeJob) {
    throw new ArtifactUploadError(400, 'VALIDATION_ERROR', 'jobId is required.');
  }
  return `renders/${safeJob}/${safeLeafName(filename)}`;
}

/**
 * Issue a presigned PUT for one render artifact.
 *
 * @param {object} p
 * @param {string} p.jobId
 * @param {string} p.agentId    from agentAuth — the caller, never the body
 * @param {string} p.filename   agent-supplied, sanitised here
 * @param {string} p.contentType
 * @param {string} p.sha256     hex; forwarded so R2 VERIFIES the upload
 * @param {number} p.bytes
 */
export async function createArtifactUploadUrl({ jobId, agentId, filename, contentType, sha256, bytes }) {
  if (!r2Configured) {
    // Fail-closed and say so. Silently returning no URL would let the agent report a
    // successful upload to a bucket that was never configured.
    throw new ArtifactUploadError(503, 'R2_NOT_CONFIGURED',
      'Object storage is not configured on this server; artifact upload is unavailable.');
  }
  if (!agentId) throw new ArtifactUploadError(401, 'UNAUTHENTICATED', 'agentId is required.');

  const job = await getJob(jobId);
  if (!job) throw new ArtifactUploadError(404, 'NOT_FOUND', `Job ${jobId} not found.`);

  // The same ownership rule heartbeat and complete enforce. Without it, any enrolled
  // agent could obtain a signed PUT into any job's namespace.
  if (job.leasedBy !== agentId) {
    throw new ArtifactUploadError(409, 'LEASE_LOST',
      'This agent does not hold the lease on that job.');
  }

  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    throw new ArtifactUploadError(400, 'VALIDATION_ERROR', 'A positive byte count is required.');
  }
  if (size > MAX_ARTIFACT_BYTES) {
    throw new ArtifactUploadError(413, 'ARTIFACT_TOO_LARGE',
      `Artifact is ${size} bytes; the ceiling is ${MAX_ARTIFACT_BYTES}.`);
  }

  const mime = String(contentType || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new ArtifactUploadError(415, 'UNSUPPORTED_MEDIA_TYPE',
      `"${contentType}" is not an accepted render artifact type.`);
  }

  const hex = String(sha256 || '').toLowerCase();
  if (hex && !/^[0-9a-f]{64}$/.test(hex)) {
    throw new ArtifactUploadError(400, 'VALIDATION_ERROR', 'sha256 must be 64 hex characters.');
  }

  const objectKey = artifactObjectKey(jobId, filename);

  // Passing the hash makes R2 itself reject a corrupted or substituted body, so
  // "uploaded" means the bytes that arrived are the bytes that were rendered.
  const { uploadUrl, mode } = await generateUploadUrl({
    objectKey, contentType: mime, sha256hex: hex || undefined, fileSize: size,
  });

  return { uploadUrl, objectKey, mode, checksumEnforced: Boolean(hex) };
}

export { ArtifactUploadError, ALLOWED_MIME };
