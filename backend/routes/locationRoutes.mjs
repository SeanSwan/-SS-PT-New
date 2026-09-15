/**
 * Location Routes — Gym Operations Spine (S0)
 * ===========================================
 *
 * Purpose:
 * Route definitions for physical facility management.
 * Reads require authentication; mutations are admin-only.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md §S0
 * Linear: SWA-74
 *
 * Routes:
 * - GET    /api/locations            (auth)   — active sites; ?includeInactive=true for management
 * - GET    /api/locations/slug/:slug (auth)   — resolve by public identifier
 * - GET    /api/locations/:id        (auth)
 * - POST   /api/locations            (admin)
 * - PUT    /api/locations/:id        (admin)
 * - DELETE /api/locations/:id        (admin)  — soft delete; 409 + count if sessions
 *                                              reference it, unless ?force=true
 *
 * WHY reads are not admin-gated: the class schedule, check-in kiosk, and member app all need to
 * name a site. Locations carry no member data — only addresses and hours the gym publishes anyway.
 */

import express from 'express';
import {
  listLocations,
  getLocationBySlug,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} from '../controllers/locationController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.get('/', protect, listLocations);
// MUST precede '/:id' — Express matches in registration order, and '/:id' would otherwise capture
// the literal segment 'slug' and try to look it up as a primary key.
router.get('/slug/:slug', protect, getLocationBySlug);
router.get('/:id', protect, getLocationById);

router.post('/', protect, adminOnly, createLocation);
router.put('/:id', protect, adminOnly, updateLocation);
router.delete('/:id', protect, adminOnly, deleteLocation);

export default router;
