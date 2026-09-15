/**
 * plaudMergeRoutes.mjs
 * =====================
 * Routes for merge orchestration + pending review surfaces:
 *   POST /api/plaud/merge                          - merge selected clips
 *   GET  /api/plaud/merge-requests                 - metadata-only list
 *   GET  /api/plaud/merge-requests/:id             - detail with cipher decrypt
 *   POST /api/plaud/merge-requests/:id/approve     - approve + purge cipher
 *   POST /api/plaud/merge-requests/:id/discard     - reject + purge cipher
 *
 * Phase 3 Slice 3.7 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 */
import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.mjs';
import { plaudFeatureFlag } from '../../middleware/plaudFeatureFlag.mjs';
import { handlePlaudAuthzError } from '../../middleware/plaudAuthz.mjs';
import { mergeHandler } from '../../controllers/plaud/plaudMergeController.mjs';
import {
  listHandler as listMergeRequestsHandler,
  detailHandler as detailMergeRequestHandler,
  approveHandler as approveMergeRequestHandler,
  discardHandler as discardMergeRequestHandler,
} from '../../controllers/plaud/plaudMergeRequestsController.mjs';
import {
  parseSegmentHandler as parseMergeSegmentHandler,
} from '../../controllers/plaud/plaudMergeSegmentsController.mjs';
import { requireSubjectAiConsent } from '../../middleware/aiConsent.mjs';
import { getAiPrivacyProfile } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

/**
 * `POST /api/plaud/merge` transcribes merged client session audio via Gemini
 * (`plaudMergeController` → `transcribeAudio`), so the CLIENT is the data
 * subject and the client's consent governs — not the merging trainer's.
 *
 * Fail-open on a MISSING profile only (no backfill migration exists); an
 * explicit opt-out or withdrawal blocks the merge. `skipWhenUnresolved` leaves
 * the missing/invalid-clientId case to the controller, which rejects it with
 * `INVALID_CLIENT_ID` in this router's error envelope before any egress.
 */
const clientConsentGate = requireSubjectAiConsent(
  getAiPrivacyProfile,
  (req) => req.body?.clientId,
  { failOpenWhenMissing: true, skipWhenUnresolved: true, label: 'plaud-merge' },
);

// Feature flag (returns 503 PLAUD_DISABLED when off) + auth + role
router.use(plaudFeatureFlag);
router.use(protect);
router.use(authorize(['admin', 'trainer']));
router.use(express.json({ limit: '64kb' }));

// Note: separate router per mount path because they live under different
// URL prefixes (/api/plaud/merge vs /api/plaud/merge-requests).
// We expose two router exports.
export const mergeActionRouter = (() => {
  const r = express.Router();
  r.use(plaudFeatureFlag);
  r.use(protect);
  r.use(authorize(['admin', 'trainer']));
  r.use(express.json({ limit: '64kb' }));
  r.post('/', clientConsentGate, mergeHandler);
  r.use(handlePlaudAuthzError);
  r.use((err, req, res, _next) => {
    logger.error('[plaudMergeRoutes:merge] unhandled: %s', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
  return r;
})();

export const mergeRequestsRouter = (() => {
  const r = express.Router();
  r.use(plaudFeatureFlag);
  r.use(protect);
  r.use(authorize(['admin', 'trainer']));
  r.use(express.json({ limit: '64kb' }));
  r.get('/', listMergeRequestsHandler);
  r.get('/:mergeRequestId', detailMergeRequestHandler);
  r.post('/:mergeRequestId/segments/:segmentId/parse', parseMergeSegmentHandler);
  r.post('/:mergeRequestId/approve', approveMergeRequestHandler);
  r.post('/:mergeRequestId/discard', discardMergeRequestHandler);
  r.use(handlePlaudAuthzError);
  r.use((err, req, res, _next) => {
    logger.error('[plaudMergeRoutes:merge-requests] unhandled: %s', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
  return r;
})();

export default router; // unused but keeps the module shape consistent
