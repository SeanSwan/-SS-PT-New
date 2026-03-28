/**
 * ============================================================================
 * FILE: featureFlagRoutes.mjs
 * PURPOSE: API routes for per-user feature flag management
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  getFeatureFlags,
  toggleFeatureFlag,
  getMyFeatureFlags,
  bulkToggleFeatureFlags,
} from '../controllers/featureFlagController.mjs';

const router = Router();

// ─── Self-service: current user's flags ───────────────────────
// GET /api/feature-flags/me
router.get('/me', protect, getMyFeatureFlags);

// ─── Admin: manage flags ──────────────────────────────────────
// GET /api/feature-flags/:featureKey — list all users with flag status
router.get('/:featureKey', protect, adminOnly, getFeatureFlags);

// PUT /api/feature-flags/:featureKey/:userId — toggle one user
router.put('/:featureKey/:userId', protect, adminOnly, toggleFeatureFlag);

// POST /api/feature-flags/:featureKey/bulk — toggle multiple users
router.post('/:featureKey/bulk', protect, adminOnly, bulkToggleFeatureFlags);

export default router;
