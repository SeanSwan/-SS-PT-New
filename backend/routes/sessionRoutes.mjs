// backend/routes/sessionRoutes.js
import express from 'express';
import Session from '../models/Session.js';

const router = express.Router();

/**
 * GET /api/sessions/:userId
 * Retrieves all sessions for a user.
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.findAll({ where: { userId } });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error.message);
    res.status(500).json({ message: 'Server error fetching sessions.' });
  }
});

/**
 * POST /api/sessions/:userId
 * Creates a new session (scheduling a purchased session) for a user.
 */
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionDate, notes } = req.body;
    const newSession = await Session.create({ userId, sessionDate, notes });
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error.message);
    res.status(500).json({ message: 'Server error creating session.' });
  }
});

/**
 * PUT /api/sessions/:id
 * Updates a session (admin or user, depending on permissions).
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Session.update(req.body, { where: { id } });
    res.json({ message: 'Session updated successfully.' });
  } catch (error) {
    console.error('Error updating session:', error.message);
    res.status(500).json({ message: 'Server error updating session.' });
  }
});

/**
 * DELETE /api/sessions/:id
 * Deletes a session (admin only).
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Session.destroy({ where: { id } });
    res.json({ message: 'Session deleted successfully.' });
  } catch (error) {
    console.error('Error deleting session:', error.message);
    res.status(500).json({ message: 'Server error deleting session.' });
  }
});

export default router;
