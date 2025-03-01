import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import stripe from 'stripe';

const router = express.Router();
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

/**
 * ADMIN: Create Available Session Slots
 * POST /api/sessions/admin/create
 * Admins create open slots for booking.
 */
router.post('/admin/create', protect, adminOnly, async (req, res) => {
  try {
    const { sessionDate, notes } = req.body;

    // Ensure sessionDate is in the future
    if (new Date(sessionDate) < new Date()) {
      return res.status(400).json({ message: 'Cannot create past session slots.' });
    }

    // Create available session slot (unbooked)
    const newSession = await Session.create({
      sessionDate,
      notes,
      status: 'available',
      userId: null, // Not booked yet
    });

    res.status(201).json({ message: 'Session slot created.', session: newSession });
  } catch (error) {
    console.error('Error creating session:', error.message);
    res.status(500).json({ message: 'Server error creating session.' });
  }
});

/**
 * CLIENT: Book a Session Slot
 * POST /api/sessions/book/:userId
 * Clients book an available session.
 */
router.post('/book/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body;

    // Find the available session
    const session = await Session.findOne({ where: { id: sessionId, status: 'available' } });
    if (!session) {
      return res.status(400).json({ message: 'Session is not available for booking.' });
    }

    // Assign the session to the user and update status
    session.userId = userId;
    session.status = 'scheduled';
    await session.save();

    res.status(200).json({ message: 'Session booked successfully.', session });
  } catch (error) {
    console.error('Error booking session:', error.message);
    res.status(500).json({ message: 'Server error booking session.' });
  }
});

/**
 * STRIPE: Checkout for One-Time & Subscription Payments
 * POST /api/sessions/checkout
 */
router.post('/checkout', protect, async (req, res) => {
  try {
    const { sessionId, price, isSubscription } = req.body;
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(400).json({ message: 'Invalid session.' });
    }

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: price * 100, // Convert to cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: { sessionId, userId: req.user.id, isSubscription },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error processing payment:', error.message);
    res.status(500).json({ message: 'Payment processing failed.' });
  }
});

/**
 * GET Available Sessions (For Clients to View & Book)
 * GET /api/sessions/available
 */
router.get('/available', protect, async (req, res) => {
  try {
    const sessions = await Session.findAll({ where: { status: 'available' } });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching available sessions:', error.message);
    res.status(500).json({ message: 'Server error fetching sessions.' });
  }
});

/**
 * GET User's Scheduled Sessions
 * GET /api/sessions/:userId
 */
router.get('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.findAll({ where: { userId, status: 'scheduled' } });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error.message);
    res.status(500).json({ message: 'Server error fetching sessions.' });
  }
});

/**
 * ADMIN: Cancel a Scheduled Session
 * DELETE /api/sessions/:id
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await Session.destroy({ where: { id } });
    res.json({ message: 'Session canceled successfully.' });
  } catch (error) {
    console.error('Error deleting session:', error.message);
    res.status(500).json({ message: 'Server error canceling session.' });
  }
});

export default router;
