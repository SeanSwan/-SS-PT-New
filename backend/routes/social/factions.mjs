/**
 * ============================================================================
 * FILE: factions.mjs
 * PURPOSE: REST API routes for RPG faction system
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: CRUD for factions, join/leave, leaderboard, feed filter.
 * HOW IT FITS IN THE APP: Mounted at /api/social/factions
 * KEY DECISIONS: 3 fixed factions seeded on first request if missing.
 */

import { Router } from 'express';
import { Faction, FactionMembership } from '../../models/social/index.mjs';
import db from '../../database.mjs';
import { Op } from 'sequelize';
import { directoryAttributes } from '../../utils/memberDirectoryAccess.mjs';

const router = Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Seed Data
// PURPOSE: 3 fixed factions — created on first GET if missing
// ─────────────────────────────────────────────────────────────

const FACTION_SEEDS = [
  {
    name: 'The Black Swans',
    slug: 'black-swans',
    description: 'Rare, powerful, unexpected. The Black Swans lead from the front — heavy lifters, powerlifters, and iron warriors who believe the barbell is the ultimate teacher.',
    motto: 'Rare breeds don\'t follow — they forge.',
    color: '#8B5CF6',
    icon: 'shield',
  },
  {
    name: 'The Glacial Edge',
    slug: 'glacial-edge',
    description: 'Sharp, swift, cold precision. The Glacial Edge values functional fitness, HIIT mastery, and adaptive training. Every movement calculated, every rep deliberate.',
    motto: 'Cut through. Never melt.',
    color: '#60C0F0',
    icon: 'zap',
  },
  {
    name: 'The Crystal Flock',
    slug: 'crystal-flock',
    description: 'Balanced, clear, enduring. The Crystal Flock pursues holistic wellness — mind, body, and community. Flexibility, recovery, and longevity are their creed.',
    motto: 'Clarity endures when force fades.',
    color: '#C6A84B',
    icon: 'star',
  },
];

async function ensureFactions() {
  const count = await Faction.count();
  if (count === 0) {
    await Faction.bulkCreate(FACTION_SEEDS);
  } else {
    // Ensure current faction names match seeds (handles renames)
    const existing = await Faction.findAll();
    const existingSlugs = existing.map(f => f.slug);
    const seedSlugs = FACTION_SEEDS.map(s => s.slug);
    // If seeds don't match existing, reset (safe when no memberships exist)
    if (!seedSlugs.every(s => existingSlugs.includes(s))) {
      const memberCount = await FactionMembership.count();
      if (memberCount === 0) {
        await Faction.destroy({ where: {} });
        await Faction.bulkCreate(FACTION_SEEDS);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/social/factions
// PURPOSE: List all factions with stats
// ─────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    await ensureFactions();
    const factions = await Faction.findAll({
      where: { isActive: true },
      order: [['totalPoints', 'DESC']],
    });
    res.json({ factions });
  } catch (err) {
    console.error('[Factions] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/social/factions/my
// PURPOSE: Get current user's faction membership
// ─────────────────────────────────────────────────────────────

router.get('/my', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const membership = await FactionMembership.findOne({
      where: { userId: req.user.id },
      include: [{ model: Faction, as: 'faction' }],
    });

    res.json({ membership: membership || null });
  } catch (err) {
    console.error('[Factions] GET /my error:', err.message);
    res.status(500).json({ error: 'Failed to fetch membership' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/social/factions/:slug/join
// PURPOSE: Join a faction (one faction per user)
// ─────────────────────────────────────────────────────────────

router.post('/:slug/join', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const faction = await Faction.findOne({ where: { slug: req.params.slug } });
    if (!faction) return res.status(404).json({ error: 'Faction not found' });

    // Check existing membership
    const existing = await FactionMembership.findOne({ where: { userId: req.user.id } });
    if (existing) {
      return res.status(409).json({
        error: 'Already in a faction',
        currentFaction: existing.factionId,
      });
    }

    const membership = await FactionMembership.create({
      userId: req.user.id,
      factionId: faction.id,
    });

    // Increment member count
    await faction.increment('memberCount');

    res.status(201).json({
      membership,
      faction,
    });
  } catch (err) {
    console.error('[Factions] POST /:slug/join error:', err.message);
    res.status(500).json({ error: 'Failed to join faction' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/social/factions/leave
// PURPOSE: Leave current faction
// ─────────────────────────────────────────────────────────────

router.post('/leave', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const membership = await FactionMembership.findOne({ where: { userId: req.user.id } });
    if (!membership) return res.status(404).json({ error: 'Not in a faction' });

    const faction = await Faction.findByPk(membership.factionId);
    await membership.destroy();

    if (faction) await faction.decrement('memberCount');

    res.json({ success: true });
  } catch (err) {
    console.error('[Factions] POST /leave error:', err.message);
    res.status(500).json({ error: 'Failed to leave faction' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/social/factions/leaderboard
// PURPOSE: Faction leaderboard — top contributors per faction
// ─────────────────────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
  try {
    await ensureFactions();
    const factions = await Faction.findAll({
      where: { isActive: true },
      include: [{
        model: FactionMembership,
        as: 'memberships',
        attributes: ['userId', 'contributionPoints', 'rank'],
        order: [['contributionPoints', 'DESC']],
        limit: 10,
      }],
      order: [['totalPoints', 'DESC']],
    });

    res.json({ factions });
  } catch (err) {
    console.error('[Factions] GET /leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/social/factions/:slug/feed
// PURPOSE: Filtered social feed — posts from faction members only
// ─────────────────────────────────────────────────────────────

router.get('/:slug/feed', async (req, res) => {
  try {
    const faction = await Faction.findOne({ where: { slug: req.params.slug } });
    if (!faction) return res.status(404).json({ error: 'Faction not found' });

    // Get faction member IDs
    const memberIds = (await FactionMembership.findAll({
      where: { factionId: faction.id },
      attributes: ['userId'],
    })).map(m => m.userId);

    if (memberIds.length === 0) {
      return res.json({ posts: [], faction });
    }

    // Fetch posts from faction members
    const { SocialPost } = await import('../../models/social/index.mjs');
    const posts = await SocialPost.findAll({
      where: {
        userId: { [Op.in]: memberIds },
        visibility: 'public',
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      include: [{
        model: db.models.User || (await import('../../models/User.mjs')).default,
        as: 'user',
        attributes: directoryAttributes(req.user, ['level', 'tier', 'points']),
      }],
    });

    res.json({ posts, faction });
  } catch (err) {
    console.error('[Factions] GET /:slug/feed error:', err.message);
    res.status(500).json({ error: 'Failed to fetch faction feed' });
  }
});

export default router;
