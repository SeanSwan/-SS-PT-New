/**
 * plaudMergeSegmentsController.mjs
 * =================================
 * Segment-level parser for deterministic PLAUD date-split review cards.
 * This endpoint does not write workout logs or approve merge requests; it
 * only turns one ready segment into the shared Swan Coach parsed shape.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import {
  decryptPayload,
  CipherDecryptFailedError,
  CipherKeyVersionUnavailableError,
} from '../../services/plaudCipherService.mjs';
import { buildPlaudMergeDateSplitCandidates } from '../../services/plaudMergeDateSplitService.mjs';
import { parseWorkoutTranscript } from '../../services/workoutLogParserService.mjs';
import { PLAUD_UUID_REGEX } from '../../utils/plaudUuidRegex.mjs';

const SEGMENT_ID_REGEX = /^segment-\d+$/;

function jsonError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function decryptMergePayload(row, res) {
  if (row.cipher_purged_at || !row.payload_cipher) {
    jsonError(res, 410, 'MERGE_CIPHER_PURGED', 'Cipher dropped after TTL or approval');
    return null;
  }

  try {
    return decryptPayload({
      cipher: Buffer.from(row.payload_cipher),
      iv: Buffer.from(row.payload_iv),
      tag: Buffer.from(row.payload_tag),
      keyId: row.cipher_key_id,
    });
  } catch (err) {
    if (err instanceof CipherKeyVersionUnavailableError) {
      jsonError(res, 500, 'CIPHER_KEY_VERSION_UNAVAILABLE', err.message);
      return null;
    }
    if (err instanceof CipherDecryptFailedError) {
      jsonError(res, 500, 'CIPHER_DECRYPT_FAILED', err.message);
      return null;
    }
    logger.error('[plaudMergeSegments] decrypt unhandled: %s', err.message);
    jsonError(res, 500, 'INTERNAL_ERROR', 'Decrypt error');
    return null;
  }
}

export async function parseSegmentHandler(req, res) {
  const userId = Number(req.user?.id);
  const role = req.user?.role;
  if (!Number.isInteger(userId) || userId <= 0) {
    return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }

  const mergeRequestId = String(req.params.mergeRequestId || '');
  const segmentId = String(req.params.segmentId || '');
  if (!PLAUD_UUID_REGEX.test(mergeRequestId)) {
    return jsonError(res, 400, 'INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format');
  }
  if (!SEGMENT_ID_REGEX.test(segmentId)) {
    return jsonError(res, 400, 'INVALID_SEGMENT_ID', 'Invalid segmentId format');
  }

  const rows = await sequelize.query(
    `SELECT *
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
  if (row.status !== 'completed') {
    return jsonError(res, 409, 'MERGE_NOT_PARSEABLE', 'Only completed merges can parse segments');
  }

  const payload = decryptMergePayload(row, res);
  if (!payload) return null;

  const candidates = buildPlaudMergeDateSplitCandidates({
    payload,
    row,
    timeZone: req.body?.timeZone || req.query?.timeZone || 'America/Los_Angeles',
  });
  const segment = (candidates.segments || []).find((item) => item.segmentId === segmentId);
  if (!segment) {
    return jsonError(res, 404, 'SEGMENT_NOT_FOUND', 'Date split segment not found');
  }
  if (segment.futureDateBlocked || segment.needsDateConfirmation) {
    return jsonError(res, 409, 'SEGMENT_DATE_UNRESOLVED', 'Confirm the segment date before parsing');
  }

  try {
    const parsedWorkout = await parseWorkoutTranscript({
      transcript: segment.text,
      clientId: Number(row.client_id),
      trainerId: Number(row.user_id),
      date: segment.date,
    });

    return res.status(200).json({
      success: true,
      mergeRequestId,
      segmentId,
      date: segment.date,
      parsedWorkout,
    });
  } catch (err) {
    logger.error('[plaudMergeSegments.parse] %s', err.message);
    return jsonError(res, 502, 'SEGMENT_PARSE_FAILED', 'Failed to parse workout segment');
  }
}
