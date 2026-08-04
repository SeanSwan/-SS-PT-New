/**
 * Client Photo Routes
 * ===================
 * API endpoints for client progress photos
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import { validatePhotoRecord } from '../utils/photoRecordValidation.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR,
  });
}

function parseOptionalInteger(value, fallback, { min, max }) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed) || parsed < min) return null;
  return Math.min(parsed, max);
}

/**
 * GET /api/photos/:userId
 * Get client's progress photos
 */
router.get('/:userId', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientPhoto } = models;

    if (!ClientPhoto) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Photo tracking not available'
      });
    }

    const { type, limit = 20 } = req.query;
    const safeLimit = parseOptionalInteger(limit, 20, { min: 1, max: 100 });
    if (safeLimit === null) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }

    // Build where clause
    const where = {
      userId: clientId,
      isDeleted: false
    };

    // Filter by photo type if specified
    if (type && ['front', 'side', 'back', 'other'].includes(type)) {
      where.photoType = type;
    }

    // For clients, only show their own photos
    // For trainers/admins, show all including trainer_only
    if (req.user?.role === 'client') {
      where.visibility = ['public', 'private'];
    }

    const photos = await ClientPhoto.findAll({
      where,
      order: [['takenAt', 'DESC'], ['uploadedAt', 'DESC']],
      limit: safeLimit
    });

    const formattedPhotos = photos.map(photo => ({
      id: photo.id,
      url: photo.url,
      type: photo.photoType,
      takenAt: photo.takenAt || photo.uploadedAt,
      uploadedAt: photo.uploadedAt,
      tags: photo.tagsJson || [],
      visibility: photo.visibility,
      notes: photo.aiAnalysisJson?.notes || null
    }));

    return res.status(200).json({
      success: true,
      data: formattedPhotos
    });
  } catch (error) {
    logger.error('Error fetching client photos:', error);
    return sendInternalError(res, 'Server error fetching photos');
  }
});

/**
 * POST /api/photos/:userId
 * Upload a new progress photo (simplified - actual upload handled separately)
 */
router.post('/:userId', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientPhoto } = models;

    if (!ClientPhoto) {
      return res.status(500).json({ success: false, message: 'Photo model not available' });
    }

    const { url, storageKey, photoType, takenAt, tags, visibility } = req.body;

    // SWA-129 (Kimi upload audit RANK-1/2, CRITICAL): bind the client-supplied
    // storageKey + url to THIS authorized client. Without this a client could
    // record a row pointing at another user's (a minor's) R2 object, or at an
    // arbitrary external URL (stored phishing / XSS-on-view / SSRF-on-fetch).
    const validation = validatePhotoRecord({ url, storageKey, clientId });
    if (!validation.ok) {
      logger.warn('[ClientPhoto] rejected photo record submission', {
        uploadedBy: req.user?.id, clientId, reason: validation.message,
      });
      return res.status(400).json({ success: false, message: validation.message });
    }

    const photo = await ClientPhoto.create({
      userId: clientId,
      url,
      storageKey,
      photoType: photoType || 'other',
      takenAt: takenAt || new Date(),
      tagsJson: tags || [],
      visibility: visibility || 'private',
      uploadedBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      data: {
        id: photo.id,
        url: photo.url,
        type: photo.photoType,
        takenAt: photo.takenAt
      },
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    logger.error('Error uploading photo:', error);
    return sendInternalError(res, 'Server error uploading photo');
  }
});

/**
 * DELETE /api/photos/:userId/:photoId
 * Soft delete a photo
 */
router.delete('/:userId/:photoId', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientPhoto } = models;
    const { photoId } = req.params;

    if (!ClientPhoto) {
      return res.status(500).json({ success: false, message: 'Photo model not available' });
    }

    const photo = await ClientPhoto.findOne({
      where: { id: photoId, userId: clientId }
    });

    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    // Soft delete
    photo.isDeleted = true;
    await photo.save();

    return res.status(200).json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting photo:', error);
    return sendInternalError(res, 'Server error deleting photo');
  }
});

export default router;
