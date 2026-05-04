/**
 * plaudMergeRoutes.mjs
 * =====================
 * Routes for merge orchestration + pending review surfaces:
 *   POST /api/plaud/merge                          - merge selected clips
 *   GET  /api/plaud/merge-requests                 - metadata-only list
 *   GET  /api/plaud/merge-requests/:id             - detail with cipher decrypt
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
  discardHandler as discardMergeRequestHandler,
} from '../../controllers/plaud/plaudMergeRequestsController.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

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
  r.post('/', mergeHandler);
  r.use(handlePlaudAuthzError);
  r.use((err, req, res, next) => {
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
  r.post('/:mergeRequestId/discard', discardMergeRequestHandler);
  r.use(handlePlaudAuthzError);
  r.use((err, req, res, next) => {
    logger.error('[plaudMergeRoutes:merge-requests] unhandled: %s', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
  return r;
})();

export default router; // unused but keeps the module shape consistent
