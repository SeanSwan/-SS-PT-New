/**
 * Equipment Insights Routes
 * =========================
 * Slice S6: read-only equipment intelligence endpoints powering the
 * Equipment IQ panel.
 *
 *   GET /api/equipment-insights/profile/:profileId/gap-report
 *       Movement-pattern coverage + deterministic cheap-addition suggestions
 *       for one equipment profile (services/equipmentGapReport.mjs).
 *
 * AUTHZ: `protect` + explicit ownership (profile.trainerId === req.user.id OR
 * admin) — the SAME ownership rule equipmentRoutes.mjs uses. Deliberately no
 * authorize([...roles]) so this composes with the S4 role expansion: whoever
 * can own a profile can read its report.
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { getEquipmentProfile } from '../models/index.mjs';
import { buildEquipmentGapReport } from '../services/equipmentGapReport.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// All insights routes require authentication; ownership is checked per-route.
router.use(protect);

// GET /api/equipment-insights/profile/:profileId/gap-report
router.get('/profile/:profileId/gap-report', async (req, res) => {
  try {
    const profileId = parseInt(req.params.profileId, 10);
    if (isNaN(profileId) || profileId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid profile ID' });
    }

    const EquipmentProfile = getEquipmentProfile();
    const profile = await EquipmentProfile.findByPk(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    // Ownership: same rule as equipmentRoutes.getOwnedProfile — owner or admin.
    if (profile.trainerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const report = await buildEquipmentGapReport(profile.id);
    res.json({ success: true, report });
  } catch (err) {
    logger.error('[EquipmentInsightsRoutes] Gap report error:', err);
    res.status(500).json({ success: false, error: 'Failed to build gap report' });
  }
});

export default router;
