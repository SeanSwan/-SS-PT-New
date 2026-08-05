/**
 * ============================================================================
 * FILE: events.mjs
 * PURPOSE: REST API routes for community events (CRUD, RSVP, discovery)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Full event management — create, list, RSVP, cancel.
 * HOW IT FITS IN THE APP: Mounted at /api/social/events via social/index.mjs
 * KEY DECISIONS: Uses SocialEvent model class methods where available.
 *   User FKs are INTEGER (matches Users table). Event IDs are UUID.
 */

import { Router } from 'express';
import { SocialEvent, EventAttendance } from '../../models/social/enhanced/EventManagement.mjs';
import { getUser } from '../../models/index.mjs';
import { Op } from 'sequelize';
import { directoryAttributes } from '../../utils/memberDirectoryAccess.mjs';

const router = Router();

// Set up associations lazily (enhanced models aren't in main associations file)
let associationsReady = false;
function ensureAssociations() {
  if (associationsReady) return;
  const User = getUser();
  if (!User) return;
  try {
    if (!SocialEvent.associations?.organizer) {
      SocialEvent.belongsTo(User, { foreignKey: 'organizerId', as: 'organizer', constraints: false });
    }
    if (!EventAttendance.associations?.event) {
      EventAttendance.belongsTo(SocialEvent, { foreignKey: 'eventId', as: 'event', constraints: false });
    }
    if (!EventAttendance.associations?.user) {
      EventAttendance.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
    }
    if (!SocialEvent.associations?.attendances) {
      SocialEvent.hasMany(EventAttendance, { foreignKey: 'eventId', as: 'attendances', constraints: false });
    }
    associationsReady = true;
  } catch (e) {
    console.warn('Event associations setup warning:', e.message);
  }
}

// Apply to all routes
router.use((req, res, next) => { ensureAssociations(); next(); });

// ─────────────────────────────────────────────────────────────
// SECTION: List / Discovery
// ─────────────────────────────────────────────────────────────

// GET / — upcoming public events
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const { category, locationType, fitnessLevel } = req.query;

    const where = {
      status: 'published',
      startDateTime: { [Op.gte]: new Date() },
      visibility: 'public',
    };
    if (category) where.category = category;
    if (locationType) where.locationType = locationType;
    if (fitnessLevel) where.fitnessLevel = fitnessLevel;

    const User = getUser();
    const { rows: events, count: total } = await SocialEvent.findAndCountAll({
      where,
      limit,
      offset,
      order: [['startDateTime', 'ASC']],
      include: [{
        model: User,
        as: 'organizer',
        attributes: directoryAttributes(req.user),
        required: false,
      }],
    });

    res.json({ success: true, events, pagination: { limit, offset, total } });
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

// GET /my — events the current user organized or is attending
router.get('/my', async (req, res) => {
  try {
    const userId = req.user.id;

    const [organized, attending] = await Promise.all([
      SocialEvent.findAll({
        where: { organizerId: userId },
        order: [['startDateTime', 'DESC']],
        limit: 20,
      }),
      EventAttendance.findAll({
        where: { userId, status: { [Op.in]: ['going', 'interested', 'maybe'] } },
        include: [{ model: SocialEvent, as: 'event' }],
        order: [['registeredAt', 'DESC']],
        limit: 20,
      }),
    ]);

    res.json({
      success: true,
      organized,
      attending: attending.map(a => ({ ...a.event?.toJSON(), myStatus: a.status })),
    });
  } catch (err) {
    console.error('My events error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch your events' });
  }
});

// GET /:id — event detail
router.get('/:id', async (req, res) => {
  try {
    const User = getUser();
    const event = await SocialEvent.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'organizer',
        attributes: directoryAttributes(req.user),
        required: false,
      }],
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check user's attendance status
    let myAttendance = null;
    if (req.user?.id) {
      myAttendance = await EventAttendance.findOne({
        where: { eventId: event.id, userId: req.user.id },
      });
    }

    // Increment views
    await event.increment('views');

    res.json({
      success: true,
      event: { ...event.toJSON(), myStatus: myAttendance?.status || null },
    });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch event' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Create / Update / Cancel
// ─────────────────────────────────────────────────────────────

// POST / — create event
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title, description, category, locationType, startDateTime,
      endDateTime, duration, address, venue, maxAttendees,
      fitnessLevel, isFree, tags, equipmentNeeded, visibility,
    } = req.body;

    if (!title || !description || !category || !locationType || !startDateTime || !endDateTime || !duration) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const event = await SocialEvent.create({
      organizerId: userId,
      title, description, category, locationType,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      duration: parseInt(duration),
      address: address || null,
      venue: venue || {},
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      fitnessLevel: fitnessLevel || 'all_levels',
      isFree: isFree !== false,
      tags: tags || [],
      equipmentNeeded: equipmentNeeded || [],
      visibility: visibility || 'public',
      status: 'published',
      publishedAt: new Date(),
    });

    // Auto-register organizer as going
    await EventAttendance.create({
      eventId: event.id,
      userId,
      status: 'going',
      checkInMethod: 'automatic',
    });
    await event.increment('currentAttendees');

    res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

// PUT /:id — update event (organizer only)
router.put('/:id', async (req, res) => {
  try {
    const event = await SocialEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowedFields = [
      'title', 'description', 'category', 'locationType', 'startDateTime',
      'endDateTime', 'duration', 'address', 'venue', 'maxAttendees',
      'fitnessLevel', 'isFree', 'tags', 'equipmentNeeded', 'visibility',
      'coverImage', 'status',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await event.update(updates);
    res.json({ success: true, event });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
});

// POST /:id/cancel — cancel event (organizer only)
router.post('/:id/cancel', async (req, res) => {
  try {
    const event = await SocialEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await event.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: req.body.reason || null,
    });

    res.json({ success: true, event });
  } catch (err) {
    console.error('Cancel event error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel event' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: RSVP / Attendance
// ─────────────────────────────────────────────────────────────

// POST /:id/rsvp — register/change RSVP status
router.post('/:id/rsvp', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body; // 'going', 'interested', 'maybe', 'not_going'

    if (!['going', 'interested', 'maybe', 'not_going'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid RSVP status' });
    }

    const event = await SocialEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Event is cancelled' });
    }

    let attendance = await EventAttendance.findOne({ where: { eventId: event.id, userId } });

    if (attendance) {
      const previousStatus = attendance.status;
      await attendance.update({ status, previousStatus });

      // Update attendee count
      if (previousStatus === 'going' && status !== 'going') {
        await event.decrement('currentAttendees');
      } else if (previousStatus !== 'going' && status === 'going') {
        // Check capacity
        if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
          return res.status(400).json({ success: false, message: 'Event is full' });
        }
        await event.increment('currentAttendees');
      }
    } else {
      // Check capacity for new 'going' RSVP
      if (status === 'going' && event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
        return res.status(400).json({ success: false, message: 'Event is full' });
      }

      attendance = await EventAttendance.create({
        eventId: event.id,
        userId,
        status,
      });

      if (status === 'going') {
        await event.increment('currentAttendees');
      }
      if (status === 'interested') {
        await event.increment('interested');
      }
    }

    res.json({ success: true, attendance });
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ success: false, message: 'Failed to RSVP' });
  }
});

// GET /:id/attendees — list attendees
router.get('/:id/attendees', async (req, res) => {
  try {
    const User = getUser();
    const attendees = await EventAttendance.findAll({
      where: {
        eventId: req.params.id,
        status: { [Op.in]: ['going', 'interested', 'maybe', 'attended'] },
      },
      include: [{
        model: User,
        as: 'user',
        attributes: directoryAttributes(req.user),
        required: false,
      }],
      order: [['registeredAt', 'ASC']],
    });

    res.json({ success: true, attendees });
  } catch (err) {
    console.error('Get attendees error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendees' });
  }
});

export default router;
