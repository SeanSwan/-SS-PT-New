/**
 * plaudIntakeRoutes.mjs
 * ======================
 * Unified PLAUD intake read-model route:
 *   GET /api/plaud/intake
 */
import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.mjs';
import { plaudFeatureFlag } from '../../middleware/plaudFeatureFlag.mjs';
import { handlePlaudAuthzError } from '../../middleware/plaudAuthz.mjs';
import { listPlaudIntakeHandler } from '../../controllers/plaud/plaudIntakeController.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

router.use(plaudFeatureFlag);
router.use(protect);
router.use(authorize(['admin', 'trainer']));

router.get('/', listPlaudIntakeHandler);

router.use(handlePlaudAuthzError);

router.use((err, req, res, next) => {
  logger.error('[plaudIntakeRoutes] unhandled error: %s', err.message);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

export default router;
