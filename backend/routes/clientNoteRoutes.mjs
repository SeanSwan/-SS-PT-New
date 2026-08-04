/**
 * Client Note Routes
 * ==================
 * API endpoints for client trainer notes
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess, isClientEquivalentRole } from '../utils/clientAccess.mjs';
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
 * GET /api/notes/:userId
 * Get notes for a client
 */
router.get('/:userId', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientNote, User } = models;

    if (!ClientNote) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Notes feature not available'
      });
    }

    const { limit = 20, offset = 0, type } = req.query;
    const safeLimit = parseOptionalInteger(limit, 20, { min: 1, max: 100 });
    const safeOffset = parseOptionalInteger(offset, 0, { min: 0, max: 5000 });
    if (safeLimit === null || safeOffset === null) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }

    // Build where clause
    const where = { userId: clientId };

    // Filter by note type if specified
    if (type && ['observation', 'red_flag', 'achievement', 'concern', 'general'].includes(type)) {
      where.noteType = type;
    }

    // ClientNote visibility values are internal-only. Clients do not receive
    // trainer/admin notes through this endpoint.
    // Launch audit 2026-08-04: this was `role === 'client'`, which let the
    // DEFAULT public-signup role ('user') straight past the guard and return
    // every trainer/admin note written ABOUT that member — including
    // 'red_flag'/'concern' notes at 'critical' severity. No ClientNote
    // visibility value is client-facing, so all client-equivalent roles get
    // the empty set.
    if (isClientEquivalentRole(req.user?.role)) {
      return res.status(200).json({ success: true, data: [] });
    }

    const notes = await ClientNote.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset: safeOffset,
      include: User ? [{
        model: User,
        as: 'trainer',
        attributes: ['id', 'firstName', 'lastName']
      }] : []
    });

    const formattedNotes = notes.map(note => ({
      id: note.id,
      content: note.content,
      type: note.noteType,
      severity: note.severity,
      createdAt: note.createdAt,
      createdBy: note.trainer ? {
        id: note.trainer.id,
        firstName: note.trainer.firstName,
        lastName: note.trainer.lastName
      } : null,
      isPrivate: note.visibility === 'private' || note.visibility === 'admin_only',
      tags: note.tagsJson || [],
      isResolved: note.isResolved,
      followUpDate: note.followUpDate
    }));

    return res.status(200).json({
      success: true,
      data: formattedNotes
    });
  } catch (error) {
    logger.error('Error fetching client notes:', error);
    return sendInternalError(res, 'Server error fetching notes');
  }
});

/**
 * POST /api/notes/:userId
 * Create a new note (trainer/admin only)
 */
router.post('/:userId', protect, async (req, res) => {
  try {
    // Only trainers and admins can create notes
    if (!['trainer', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only trainers and admins can create notes' });
    }

    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientNote } = models;

    if (!ClientNote) {
      return res.status(500).json({ success: false, message: 'Notes model not available' });
    }

    const {
      content,
      noteType = 'general',
      severity,
      visibility = 'trainer_only',
      tags,
      relatedSessionId,
      followUpDate
    } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Note content is required' });
    }

    const note = await ClientNote.create({
      userId: clientId,
      trainerId: req.user.id,
      content: content.trim(),
      noteType,
      severity,
      visibility,
      tagsJson: tags || [],
      relatedSessionId,
      followUpDate
    });

    return res.status(201).json({
      success: true,
      data: {
        id: note.id,
        content: note.content,
        type: note.noteType,
        createdAt: note.createdAt
      },
      message: 'Note created successfully'
    });
  } catch (error) {
    logger.error('Error creating note:', error);
    return sendInternalError(res, 'Server error creating note');
  }
});

/**
 * PUT /api/notes/:userId/:noteId
 * Update an existing note
 */
router.put('/:userId/:noteId', protect, async (req, res) => {
  try {
    if (!['trainer', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only trainers and admins can update notes' });
    }

    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientNote } = models;
    const { noteId } = req.params;

    if (!ClientNote) {
      return res.status(500).json({ success: false, message: 'Notes model not available' });
    }

    const note = await ClientNote.findOne({
      where: { id: noteId, userId: clientId }
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const { content, noteType, severity, visibility, tags, isResolved, followUpDate } = req.body;

    if (content !== undefined) note.content = content.trim();
    if (noteType !== undefined) note.noteType = noteType;
    if (severity !== undefined) note.severity = severity;
    if (visibility !== undefined) note.visibility = visibility;
    if (tags !== undefined) note.tagsJson = tags;
    if (followUpDate !== undefined) note.followUpDate = followUpDate;
    if (isResolved !== undefined) {
      note.isResolved = isResolved;
      if (isResolved) note.resolvedAt = new Date();
    }

    await note.save();

    return res.status(200).json({
      success: true,
      data: note,
      message: 'Note updated successfully'
    });
  } catch (error) {
    logger.error('Error updating note:', error);
    return sendInternalError(res, 'Server error updating note');
  }
});

/**
 * DELETE /api/notes/:userId/:noteId
 * Delete a note
 */
router.delete('/:userId/:noteId', protect, async (req, res) => {
  try {
    if (!['trainer', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only trainers and admins can delete notes' });
    }

    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientNote } = models;
    const { noteId } = req.params;

    if (!ClientNote) {
      return res.status(500).json({ success: false, message: 'Notes model not available' });
    }

    const note = await ClientNote.findOne({
      where: { id: noteId, userId: clientId }
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    await note.destroy();

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting note:', error);
    return sendInternalError(res, 'Server error deleting note');
  }
});

export default router;
