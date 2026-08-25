/**
 * ============================================================================
 * FILE: renderAgentRoutes.mjs
 * PURPOSE: The surface a render worker talks to — enrol, lease, heartbeat, finish.
 * ============================================================================
 *
 * TOPOLOGY: AGENT PULLS, SERVER NEVER PUSHES. The worker runs on Sean's machine behind
 * a home NAT, alongside ComfyUI which ships with NO authentication. Any design where
 * Render initiates a connection means exposing that machine — a tunnel, an open port, or
 * a public URL fronting an unauthenticated GPU service. So the worker polls outbound and
 * nothing inbound is ever required. This is a security decision, not a convenience one.
 *
 * AUTH IS PER-AGENT BEARER, NOT THE USER SESSION. A worker is not a person: it holds a
 * long-lived credential, acts on many users' jobs, and must never carry a user's cookie.
 * Enrolment is admin-only and mints the token once.
 *
 * Every worker-facing handler re-authenticates, which also refreshes `last_seen_at` —
 * so presence is derived from actually-polling workers rather than from a promise a
 * worker made at enrolment.
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { createArtifactUploadUrl, ArtifactUploadError } from '../services/videoRenderArtifactUpload.mjs';
import {
  enrolAgent, revokeAgent, authenticateAgent, RenderAgentAuthError,
} from '../services/renderAgentAuthService.mjs';
import {
  leaseNextJob, heartbeat, completeJob, failJob, VideoRenderJobError,
} from '../services/videoRenderJobService.mjs';

const router = Router();

/** Bearer-token gate for the worker surface. */
async function agentAuth(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    req.agent = await authenticateAgent(token);
    return next();
  } catch (err) {
    if (err instanceof RenderAgentAuthError) {
      return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
    }
    console.error('[RenderAgent] auth failed:', err.message);
    return res.status(500).json({ success: false, error: 'Agent authentication failed' });
  }
}

function sendServiceError(res, err, context) {
  if (err instanceof VideoRenderJobError) {
    return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
  }
  // ArtifactUploadError carries `status` rather than `statusCode`. Without this branch it
  // fell through to a blanket 500, so "you do not hold this lease" and "that media type is
  // not accepted" both reached the agent as "upload-url failed" — losing the status the
  // agent classifies retryability from, and the sentence telling a human what to change.
  if (err instanceof ArtifactUploadError) {
    return res.status(err.status).json({ success: false, error: err.message, code: err.code });
  }
  console.error(`[RenderAgent] ${context}:`, err.message);
  return res.status(500).json({ success: false, error: `${context} failed` });
}

// ─── ADMIN: enrol / revoke ────────────────────────────────────────────────

/**
 * POST /api/render-agents/enrol — mint a worker credential.
 * The plaintext token is in THIS RESPONSE ONLY and is unrecoverable afterwards.
 */
router.post('/enrol', protect, adminOnly, async (req, res) => {
  try {
    const { id, label, capabilities, maxConcurrency, version } = req.body || {};
    const { agent, token } = await enrolAgent({ id, label, capabilities, maxConcurrency, version });
    return res.status(201).json({
      success: true,
      // Said plainly because the operator gets exactly one chance to copy it.
      message: 'Agent enrolled. Save this token now — it cannot be retrieved again.',
      data: { agent, token },
    });
  } catch (err) {
    if (err instanceof RenderAgentAuthError) {
      return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
    }
    console.error('[RenderAgent] enrol failed:', err.message);
    return res.status(500).json({ success: false, error: 'Enrolment failed' });
  }
});

/** POST /api/render-agents/:id/revoke — revoke, never delete (leases FK this row). */
router.post('/:id/revoke', protect, adminOnly, async (req, res) => {
  try {
    const revoked = await revokeAgent(req.params.id);
    if (!revoked) return res.status(404).json({ success: false, error: 'Agent not found or already revoked' });
    return res.json({ success: true, message: `Agent ${req.params.id} revoked.` });
  } catch (err) {
    console.error('[RenderAgent] revoke failed:', err.message);
    return res.status(500).json({ success: false, error: 'Revoke failed' });
  }
});

// ─── WORKER: the poll loop ────────────────────────────────────────────────

/**
 * POST /api/render-agents/lease — claim the next job this worker can do.
 * 204 means "nothing for you", which is the common case and must stay cheap.
 */
router.post('/lease', agentAuth, async (req, res) => {
  try {
    // Capabilities come from the ENROLLED record, not the request body. A worker must
    // not be able to widen its own eligibility by claiming a capability at poll time.
    const job = await leaseNextJob({ agentId: req.agent.id, capabilities: req.agent.capabilities });
    if (!job) return res.status(204).end();
    return res.json({ success: true, data: { job } });
  } catch (err) {
    return sendServiceError(res, err, 'lease');
  }
});

/** POST /api/render-agents/jobs/:jobId/heartbeat — extend the lease, report progress. */
router.post('/jobs/:jobId/heartbeat', agentAuth, async (req, res) => {
  try {
    const { progress, message } = req.body || {};
    const job = await heartbeat({
      jobId: req.params.jobId, agentId: req.agent.id, progress, message,
    });
    return res.json({ success: true, data: { job } });
  } catch (err) {
    return sendServiceError(res, err, 'heartbeat');
  }
});

/**
 * POST /api/render-agents/jobs/:jobId/upload-url — a short-lived PUT for one artifact.
 *
 * The agent cannot reach R2 itself: it runs from a fresh checkout with no SDK and no
 * credentials, and keeping it that way is deliberate. So the server signs and the agent
 * does a plain PUT.
 *
 * The object key is derived from the JOB, never from the request body. An agent that
 * could name its own key could obtain a signed PUT for someone else's object.
 */
router.post('/jobs/:jobId/upload-url', agentAuth, async (req, res) => {
  try {
    const { filename, contentType, sha256, bytes } = req.body || {};
    const out = await createArtifactUploadUrl({
      jobId: req.params.jobId, agentId: req.agent.id, filename, contentType, sha256, bytes,
    });
    return res.json({ success: true, data: out });
  } catch (err) {
    return sendServiceError(res, err, 'upload-url');
  }
});

/**
 * POST /api/render-agents/jobs/:jobId/init-image — a short-lived READ URL for the frame a
 * Motion job is bound to. The key is taken from the JOB's own params; the agent cannot
 * name one, and only the lease holder may ask. The agent re-hashes what it downloads
 * before the graph ever sees it (handlers/initImageBind.mjs).
 */
router.post('/jobs/:jobId/init-image', agentAuth, async (req, res) => {
  try {
    const { initImageReadTicket } = await import('../services/atelier/motionBind.mjs');
    const out = await initImageReadTicket({ jobId: req.params.jobId, agentId: req.agent.id });
    return res.json({ success: true, data: out });
  } catch (err) {
    const status = err?.code === 'E_LEASE_CONFLICT' ? 409 : err?.code === 'E_JOB_NOT_FOUND' ? 404 : err?.code === 'E_BIND_NO_INIT_IMAGE' ? 400 : 500;
    if (err?.code) return res.status(status).json({ success: false, error: err.message, code: err.code });
    return sendServiceError(res, err, 'init-image');
  }
});

/** POST /api/render-agents/jobs/:jobId/complete — hand back the artifact. */
router.post('/jobs/:jobId/complete', agentAuth, async (req, res) => {
  try {
    const { r2Key, mime, ...meta } = req.body || {};
    if (!r2Key) {
      return res.status(400).json({ success: false, error: 'r2Key is required', code: 'VALIDATION_ERROR' });
    }
    const job = await completeJob({
      jobId: req.params.jobId, agentId: req.agent.id, r2Key, mime, ...meta,
    });
    return res.json({ success: true, data: { job } });
  } catch (err) {
    return sendServiceError(res, err, 'complete');
  }
});

/** POST /api/render-agents/jobs/:jobId/fail — report failure, with retry intent. */
router.post('/jobs/:jobId/fail', agentAuth, async (req, res) => {
  try {
    const { errorCode, errorMessage, retryable } = req.body || {};
    const job = await failJob({
      jobId: req.params.jobId,
      agentId: req.agent.id,
      errorCode: errorCode || 'AGENT_ERROR',
      errorMessage: errorMessage || 'Agent reported a failure.',
      // Default TRUE: a worker that cannot say whether an error is permanent should not
      // silently burn the job's only chance. The attempt counter still bounds retries.
      retryable: retryable !== false,
    });
    return res.json({ success: true, data: { job } });
  } catch (err) {
    return sendServiceError(res, err, 'fail');
  }
});

export default router;
