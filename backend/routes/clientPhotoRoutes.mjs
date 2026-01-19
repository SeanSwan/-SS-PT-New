/**
 * Client Photo Routes
 * ===================
 * API endpoints for client progress photos
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

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
      limit: parseInt(limit)
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
    return res.status(500).json({
      success: false,
      message: 'Server error fetching photos',
      error: error.message
    });
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

    if (!url || !storageKey) {
      return res.status(400).json({ success: false, message: 'URL and storageKey are required' });
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
    return res.status(500).json({
      success: false,
      message: 'Server error uploading photo',
      error: error.message
    });
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
    return res.status(500).json({
      success: false,
      message: 'Server error deleting photo',
      error: error.message
    });
  }
});

export default router;
