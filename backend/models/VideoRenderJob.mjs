/**
 * MODEL: VideoRenderJob
 * ====================
 * Durable, leasable render queue for work that executes on the home GPU agent.
 *
 * WHY THIS EXISTS: the previous AI-video endpoint returned a provider job id that
 * no route could ever poll, held only in React state, so a refresh destroyed the
 * one handle to the output. Every test passed — the defect was an ABSENCE. This
 * table makes a job a first-class, pollable, restart-surviving record.
 *
 * BOUNDARY vs BullMQ: BullMQ (Redis) owns jobs that run ON RENDER — YouTube
 * import/sync, metadata generation, analytics. THIS table owns jobs that run on
 * the HOME AGENT. The split is "where it runs", not "what it does", because
 * BullMQ's stall detection assumes workers that are supposed to be up, and the
 * home machine is legitimately offline for hours at a time. A lease that expires
 * quietly and is swept is the correct primitive for that; a stalled-job alarm is not.
 *
 * LEASING: a worker claims one row via FOR UPDATE SKIP LOCKED (see
 * videoRenderJobService.leaseNextJob). The lease is extended by HEARTBEATS, never
 * by a wall-clock guess at render duration — a 40-minute NVENC render is safe under
 * a 90-second lease so long as heartbeats flow, and a dead worker is reclaimed in
 * 90 seconds rather than 40 minutes.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/** Terminal states never lease, never sweep, and reject late agent callbacks. */
export const VIDEO_JOB_TERMINAL_STATUSES = Object.freeze(['ready', 'failed', 'cancelled']);

export const VIDEO_JOB_STATUSES = Object.freeze([
  'queued',     // waiting for an agent; the only leasable state
  'leased',     // claimed, no heartbeat yet
  'rendering',  // heartbeats flowing
  'uploading',  // render done, bytes going to R2
  ...VIDEO_JOB_TERMINAL_STATUSES,
]);

export const VIDEO_JOB_KINDS = Object.freeze([
  'generate',    // AI clip (Wan 2.2 via ComfyUI)
  'transcode',   // format/rendition conversion
  'upscale',
  'interpolate',
]);

/** Lease window. Deliberately short: reclaim speed is bounded by this, not by render length. */
export const VIDEO_JOB_LEASE_SECONDS = 90;

class VideoRenderJob extends Model {
  /** True when the job may no longer be mutated by an agent callback. */
  get isTerminal() {
    return VIDEO_JOB_TERMINAL_STATUSES.includes(this.status);
  }
}

VideoRenderJob.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

  // "Users".id is INTEGER (verified against schema-snapshot). Associations are
  // declared in associations.mjs; the FK constraint itself lives in the migration,
  // where the target is written QUOTED because Postgres folds bare identifiers to
  // lower case and a lowercase `users` table exists in production as a stale duplicate.
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  projectId: { type: DataTypes.UUID, allowNull: true, field: 'project_id' },
  exerciseId: { type: DataTypes.UUID, allowNull: true, field: 'exercise_id' },

  // Per-user idempotency. A double-clicked Generate must not occupy the GPU twice.
  idempotencyKey: { type: DataTypes.STRING(80), allowNull: false, field: 'idempotency_key' },

  kind: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'generate',
    validate: { isIn: [[...VIDEO_JOB_KINDS]] },
  },

  // workflow id + version make a render reproducible. Storing only a prompt makes
  // debugging a bad output archaeology.
  workflowId: { type: DataTypes.STRING(60), allowNull: false, field: 'workflow_id' },
  workflowVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'workflow_version' },

  prompt: { type: DataTypes.TEXT, allowNull: false },
  negativePrompt: { type: DataTypes.TEXT, allowNull: true, field: 'negative_prompt' },
  params: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

  // A job is only offered to an agent whose declared capabilities are a superset of
  // this. Keeps a text-to-video-only worker from claiming an image-to-video job.
  requiredCapabilities: {
    type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'required_capabilities',
  },

  status: {
    type: DataTypes.STRING(12),
    allowNull: false,
    defaultValue: 'queued',
    validate: { isIn: [[...VIDEO_JOB_STATUSES]] },
  },

  // Cancellation is a FLAG, not a state: an admin's click must never block on a
  // worker that may be mid-render or asleep. The agent observes it on its next
  // heartbeat and converges.
  cancelRequested: {
    type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'cancel_requested',
  },

  priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, field: 'max_attempts' },
  runAfter: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'run_after' },

  leasedBy: { type: DataTypes.STRING(60), allowNull: true, field: 'leased_by' },
  leasedAt: { type: DataTypes.DATE, allowNull: true, field: 'leased_at' },
  leaseExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'lease_expires_at' },
  heartbeatAt: { type: DataTypes.DATE, allowNull: true, field: 'heartbeat_at' },

  progress: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  progressMessage: { type: DataTypes.STRING(200), allowNull: true, field: 'progress_message' },

  // Sanitized only. Never a stack trace, never provider internals — those reach the
  // browser otherwise, and a 502 body is not a place to leak infrastructure detail.
  errorCode: { type: DataTypes.STRING(60), allowNull: true, field: 'error_code' },
  errorMessage: { type: DataTypes.STRING(500), allowNull: true, field: 'error_message' },

  // Deterministic: jobs/{id}/source.mp4. Re-delivery overwrites rather than
  // duplicating, which is what makes at-least-once delivery safe here.
  r2Key: { type: DataTypes.STRING(500), allowNull: true, field: 'r2_key' },
  posterR2Key: { type: DataTypes.STRING(500), allowNull: true, field: 'poster_r2_key' },
  durationMs: { type: DataTypes.INTEGER, allowNull: true, field: 'duration_ms' },
  width: { type: DataTypes.INTEGER, allowNull: true },
  height: { type: DataTypes.INTEGER, allowNull: true },
  sizeBytes: { type: DataTypes.BIGINT, allowNull: true, field: 'size_bytes' },
  seedUsed: { type: DataTypes.BIGINT, allowNull: true, field: 'seed_used' },
  agentVersion: { type: DataTypes.STRING(20), allowNull: true, field: 'agent_version' },
  renderTimeoutSec: {
    type: DataTypes.INTEGER, allowNull: false, defaultValue: 1800, field: 'render_timeout_sec',
  },

  startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
  finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
}, {
  sequelize,
  modelName: 'VideoRenderJob',
  tableName: 'video_render_jobs',
  timestamps: true,
  underscored: true,
});

export default VideoRenderJob;
