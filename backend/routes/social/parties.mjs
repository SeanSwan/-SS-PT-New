/**
 * ============================================================================
 * FILE: parties.mjs
 * PURPOSE: REST API routes for RPG Party/Linkshell system
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: CRUD for parties, join via invite code, HP management.
 * HOW IT FITS IN THE APP: Mounted at /api/social/parties
 */

import { Router } from 'express';
import crypto from 'crypto';
import { Party, PartyMember } from '../../models/social/index.mjs';

const router = Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Helper — generate 8-char invite code
// ─────────────────────────────────────────────────────────────

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/social/parties — Create a party
// ─────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Party name must be at least 2 characters' });
    }

    // Check if user is already leading a party
    const existingLead = await Party.findOne({
      where: { leaderId: req.user.id, isActive: true },
    });
    if (existingLead) {
      return res.status(409).json({ error: 'You already lead an active party' });
    }

    const party = await Party.create({
      name: name.trim(),
      leaderId: req.user.id,
      inviteCode: generateInviteCode(),
    });

    // Leader auto-joins as leader role
    await PartyMember.create({
      partyId: party.id,
      userId: req.user.id,
      role: 'leader',
    });

    res.status(201).json({ party });
  } catch (err) {
    console.error('[Parties] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/social/parties/my — Get user's current party
// ─────────────────────────────────────────────────────────────

router.get('/my', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const membership = await PartyMember.findOne({
      where: { userId: req.user.id },
      include: [{
        model: Party,
        as: 'party',
        include: [{
          model: PartyMember,
          as: 'members',
          attributes: ['userId', 'role', 'joinedAt'],
        }],
      }],
    });

    res.json({ party: membership?.party || null, role: membership?.role || null });
  } catch (err) {
    console.error('[Parties] GET /my error:', err.message);
    res.status(500).json({ error: 'Failed to fetch party' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/social/parties/join/:code — Join via invite
// ─────────────────────────────────────────────────────────────

router.post('/join/:code', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const party = await Party.findOne({
      where: { inviteCode: req.params.code.toUpperCase(), isActive: true },
      include: [{ model: PartyMember, as: 'members' }],
    });

    if (!party) return res.status(404).json({ error: 'Party not found or inactive' });

    // Check capacity
    if (party.members.length >= party.maxMembers) {
      return res.status(409).json({ error: 'Party is full' });
    }

    // Check already a member
    const existing = await PartyMember.findOne({
      where: { partyId: party.id, userId: req.user.id },
    });
    if (existing) return res.status(409).json({ error: 'Already in this party' });

    await PartyMember.create({
      partyId: party.id,
      userId: req.user.id,
      role: 'member',
    });

    res.status(201).json({ party });
  } catch (err) {
    console.error('[Parties] POST /join/:code error:', err.message);
    res.status(500).json({ error: 'Failed to join party' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/social/parties/leave — Leave current party
// ─────────────────────────────────────────────────────────────

router.post('/leave', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const membership = await PartyMember.findOne({ where: { userId: req.user.id } });
    if (!membership) return res.status(404).json({ error: 'Not in a party' });

    const party = await Party.findByPk(membership.partyId);

    // If leader leaves, disband the party
    if (membership.role === 'leader' && party) {
      party.isActive = false;
      await party.save();
      await PartyMember.destroy({ where: { partyId: party.id } });
      return res.json({ success: true, disbanded: true });
    }

    await membership.destroy();
    res.json({ success: true, disbanded: false });
  } catch (err) {
    console.error('[Parties] POST /leave error:', err.message);
    res.status(500).json({ error: 'Failed to leave party' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/social/parties/:id/hp — Get party HP
// ─────────────────────────────────────────────────────────────

router.get('/:id/hp', async (req, res) => {
  try {
    const party = await Party.findByPk(req.params.id, {
      attributes: ['id', 'name', 'currentHP', 'maxHP'],
    });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json({ hp: party.currentHP, maxHP: party.maxHP, name: party.name });
  } catch (err) {
    console.error('[Parties] GET /:id/hp error:', err.message);
    res.status(500).json({ error: 'Failed to fetch HP' });
  }
});

export default router;
