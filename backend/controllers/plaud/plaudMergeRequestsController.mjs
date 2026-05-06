/**
 * plaudMergeRequestsController.mjs
 * =================================
 * Handlers for:
 *   GET    /api/plaud/merge-requests              - list (METADATA ONLY per Codex R2 MEDIUM #5)
 *   GET    /api/plaud/merge-requests/:id          - detail with decrypted payload
 *   POST   /api/plaud/merge-requests/:id/approve  - approve + purge cipher
 *   POST   /api/plaud/merge-requests/:id/discard  - reject + purge cipher
 *
 * Phase 3 Slice 3.7 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.5/§5.5b/§5.6.
 *
 * Failsafe surface: this is what the trainer hits after a browser-close
 * to recover their pending review (Sean's failsafe ask). Detail returns
 * 410 with cipherPurged:true if 24h TTL was hit; transcriptHash returned
 * for audit.
 */
import sequelize from '../../database.mjs';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { decryptPayload, CipherDecryptFailedError, CipherKeyVersionUnavailableError } from '../../services/plaudCipherService.mjs';
import { PLAUD_UUID_REGEX } from '../../utils/plaudUuidRegex.mjs';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function jsonError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function statusFilterArray(raw) {
  if (!raw) return ['processing', 'completed', 'failed'];
  const wanted = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  const allowed = new Set(['processing', 'completed', 'failed', 'approved', 'discarded', 'expired']);
  const filtered = wanted.filter((s) => allowed.has(s));
  return filtered.length > 0 ? filtered : ['processing', 'completed', 'failed'];
}

/**
 * GET /api/plaud/merge-requests?status=processing,completed,failed&limit=20
 * Metadata-only list — does NOT return decrypted transcript or parsed
 * workout. Trainer hits the detail endpoint for one merge at a time
 * (smaller PII surface per Codex Round 2 MEDIUM #5).
 */
export async function listHandler(req, res) {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
    }
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const statusFilter = statusFilterArray(req.query.status);

    const [rows] = await sequelize.query(
      `SELECT mr.merge_request_id, mr.status, mr.client_id, mr.clip_ids,
              mr.parsed_exercise_count, mr.boundary_warning,
              mr.error_code, mr.payload_cipher IS NOT NULL AS has_cipher,
              mr.cipher_purged_at IS NOT NULL AS cipher_purged,
              mr.created_at, mr.completed_at, mr.expires_at,
              u."firstName" AS client_first_name,
              u."lastName"  AS client_last_name
       FROM plaud_merge_requests mr
       LEFT JOIN "Users" u ON u.id = mr.client_id
       WHERE mr.user_id = :userId
         AND mr.status IN (:statusFilter)
       ORDER BY mr.created_at DESC
       LIMIT :limit`,
      { replacements: { userId, statusFilter, limit } },
    );

    return res.status(200).json({
      success: true,
      mergeRequests: (rows || []).map((r) => ({
        mergeRequestId: r.merge_request_id,
        status: r.status,
        clientId: r.client_id,
        clientName: [r.client_first_name, r.client_last_name].filter(Boolean).join(' ') || null,
        clipCount: Array.isArray(r.clip_ids) ? r.clip_ids.length : null,
        parsedExerciseCount: r.parsed_exercise_count,
        boundaryWarning: r.boundary_warning,
        hasCipher: !!r.has_cipher,
        cipherPurged: !!r.cipher_purged,
        errorCode: r.error_code,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        expiresAt: r.expires_at,
      })),
    });
  } catch (err) {
    logger.error('[plaudMergeRequests.listHandler] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to list merge requests');
  }
}

/**
 * GET /api/plaud/merge-requests/:mergeRequestId
 * Detail endpoint — decrypts the payload for ONE merge at a time.
 */
export async function detailHandler(req, res) {
  const userId = Number(req.user?.id);
  const role = req.user?.role;
  if (!Number.isInteger(userId) || userId <= 0) {
    return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }
  const mergeRequestId = String(req.params.mergeRequestId || '');
  if (!PLAUD_UUID_REGEX.test(mergeRequestId)) {
    return jsonError(res, 400, 'INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format');
  }

  const [rows] = await sequelize.query(
    `SELECT mr.*, u."firstName" AS client_first_name, u."lastName" AS client_last_name
     FROM plaud_merge_requests mr
     LEFT JOIN "Users" u ON u.id = mr.client_id
     WHERE mr.merge_request_id = :mergeRequestId
     LIMIT 1`,
    { replacements: { mergeRequestId } },
  );
  const row = (rows || [])[0];
  if (!row) {
    return jsonError(res, 404, 'MERGE_NOT_FOUND', 'Merge request not found');
  }
  if (Number(row.user_id) !== userId && role !== 'admin') {
    return jsonError(res, 403, 'NOT_OWNED', 'Merge does not belong to caller');
  }

  // Cipher purged?
  if (row.cipher_purged_at || !row.payload_cipher) {
    return res.status(410).json({
      success: false,
      error: {
        code: 'MERGE_CIPHER_PURGED',
        message: 'Cipher dropped after TTL or approval',
        transcriptHash: row.transcript_hash,
      },
      mergeRequest: {
        mergeRequestId: row.merge_request_id,
        status: row.status,
        clientId: row.client_id,
        cipherPurged: true,
      },
    });
  }

  // Decrypt
  let payload;
  try {
    payload = decryptPayload({
      cipher: Buffer.from(row.payload_cipher),
      iv: Buffer.from(row.payload_iv),
      tag: Buffer.from(row.payload_tag),
      keyId: row.cipher_key_id,
    });
  } catch (err) {
    if (err instanceof CipherKeyVersionUnavailableError) {
      return jsonError(res, 500, 'CIPHER_KEY_VERSION_UNAVAILABLE', err.message);
    }
    if (err instanceof CipherDecryptFailedError) {
      return jsonError(res, 500, 'CIPHER_DECRYPT_FAILED', err.message);
    }
    logger.error('[plaudMergeRequests] decrypt unhandled: %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Decrypt error');
  }

  return res.status(200).json({
    success: true,
    mergeRequest: {
      mergeRequestId: row.merge_request_id,
      status: row.status,
      clientId: row.client_id,
      clientName: [row.client_first_name, row.client_last_name].filter(Boolean).join(' ') || null,
      clipIds: row.clip_ids,
      parsedExerciseCount: row.parsed_exercise_count,
      boundaryWarning: row.boundary_warning,
      transcriptHash: row.transcript_hash,
      transcript: payload.transcript,
      parsedWorkout: payload.parsedWorkout,
      clipTimeline: payload.clipTimeline || [],
      createdAt: row.created_at,
      completedAt: row.completed_at,
      expiresAt: row.expires_at,
    },
  });
}

/**
 * POST /api/plaud/merge-requests/:mergeRequestId/approve
 * Trainer confirms this merge was logged. Sets status='approved' and purges cipher.
 */
export async function approveHandler(req, res) {
  const userId = Number(req.user?.id);
  const role = req.user?.role;
  if (!Number.isInteger(userId) || userId <= 0) {
    return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }
  const mergeRequestId = String(req.params.mergeRequestId || '');
  if (!PLAUD_UUID_REGEX.test(mergeRequestId)) {
    return jsonError(res, 400, 'INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format');
  }

  const rows = await sequelize.query(
    `SELECT merge_request_id, user_id, status
     FROM plaud_merge_requests
     WHERE merge_request_id = :mergeRequestId
     LIMIT 1`,
    {
      replacements: { mergeRequestId },
      type: QueryTypes.SELECT,
    },
  );
  const row = (rows || [])[0];
  if (!row) {
    return jsonError(res, 404, 'MERGE_NOT_FOUND', 'Merge request not found');
  }
  if (Number(row.user_id) !== userId && role !== 'admin') {
    return jsonError(res, 403, 'NOT_OWNED', 'Merge does not belong to caller');
  }
  if (row.status === 'approved') {
    return res.status(200).json({ success: true, alreadyApproved: true });
  }
  if (row.status !== 'completed') {
    return jsonError(res, 409, 'MERGE_NOT_APPROVABLE', 'Only completed merges can be approved');
  }

  const updated = await sequelize.query(
    `UPDATE plaud_merge_requests
     SET status           = 'approved',
         payload_cipher   = NULL,
         payload_iv       = NULL,
         payload_tag      = NULL,
         cipher_purged_at = NOW()
     WHERE merge_request_id = :mergeRequestId
       AND status = 'completed'
     RETURNING merge_request_id`,
    {
      replacements: { mergeRequestId },
      type: QueryTypes.SELECT,
    },
  );

  if (!updated || updated.length === 0) {
    return jsonError(res, 409, 'MERGE_NOT_APPROVABLE', 'Merge moved out of completed state');
  }
  return res.status(200).json({ success: true, alreadyApproved: false });
}

/**
 * POST /api/plaud/merge-requests/:mergeRequestId/discard
 * Trainer rejects this merge. Sets status='discarded', purges cipher.
 */
export async function discardHandler(req, res) {
  const userId = Number(req.user?.id);
  const role = req.user?.role;
  if (!Number.isInteger(userId) || userId <= 0) {
    return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }
  const mergeRequestId = String(req.params.mergeRequestId || '');
  if (!PLAUD_UUID_REGEX.test(mergeRequestId)) {
    return jsonError(res, 400, 'INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format');
  }

  const [rows] = await sequelize.query(
    `UPDATE plaud_merge_requests
     SET status           = 'discarded',
         payload_cipher   = NULL,
         payload_iv       = NULL,
         payload_tag      = NULL,
         cipher_purged_at = NOW()
     WHERE merge_request_id = :mergeRequestId
       AND status IN ('processing', 'completed', 'failed')
       AND ( :role = 'admin' OR user_id = :userId )
     RETURNING merge_request_id`,
    { replacements: { mergeRequestId, userId, role: role || 'trainer' } },
  );

  if (!rows || rows.length === 0) {
    return jsonError(res, 404, 'MERGE_NOT_FOUND',
      'Merge request not found, not owned, or not in a discardable state');
  }
  return res.status(200).json({ success: true });
}
