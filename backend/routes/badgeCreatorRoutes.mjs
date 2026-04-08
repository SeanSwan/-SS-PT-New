/**
 * ┌─── ROUTES: Badge Creator (AI Generation) ──────────────────┐
 * │ PREFIX: /api/admin/badge-creator                            │
 * │ AUTH: protect + adminOnly                                   │
 * │ PURPOSE: AI-powered badge generation via Recraft V3.       │
 * │ Extends existing Badge system with visual creation studio.  │
 * │ CEO RULING: Recraft V3, 50 gens/month, curated styles.    │
 * └────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import recraft from '../services/recraftService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect, adminOnly);

const MAX_GENERATIONS_PER_MONTH = 50;

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get remaining generations from durable storage (Badge table count).
 * Global cap: 50 custom badges per month across all admins.
 */
async function getRemainingGenerations() {
  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const { Op } = await import('sequelize');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const used = await Badge.count({
      where: {
        category: 'custom',
        createdAt: { [Op.gte]: monthStart },
      },
    });
    return Math.max(MAX_GENERATIONS_PER_MONTH - used, 0);
  } catch {
    return MAX_GENERATIONS_PER_MONTH; // Fail open if DB unavailable
  }
}

// ── Health Check ─────────────────────────────────────────────
// GET /api/admin/badge-creator/health
router.get('/health', async (_req, res) => {
  const health = await recraft.checkHealth();
  res.json({ success: true, data: health });
});

// ── Generation Credits ───────────────────────────────────────
// GET /api/admin/badge-creator/credits
router.get('/credits', async (req, res) => {
  const remaining = await getRemainingGenerations();
  res.json({
    success: true,
    data: {
      remaining,
      max: MAX_GENERATIONS_PER_MONTH,
      used: MAX_GENERATIONS_PER_MONTH - remaining,
      month: getMonthKey(),
    },
  });
});

// ── Generate Badge (AI) ──────────────────────────────────────
// POST /api/admin/badge-creator/generate
router.post('/generate', async (req, res) => {
  const { prompt, style } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, message: 'prompt is required' });
  }
  if (!style || typeof style !== 'string') {
    return res.status(400).json({ success: false, message: 'style is required' });
  }

  // Check generation credits (durable — survives deploys)
  const remaining = await getRemainingGenerations();
  if (remaining <= 0) {
    return res.status(429).json({
      success: false,
      message: `Monthly generation limit reached (${MAX_GENERATIONS_PER_MONTH}/month). Resets next month.`,
    });
  }

  try {
    const result = await recraft.generateBadge({ prompt, style, size: 256 });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    logger.info(`[AUDIT] Admin ${req.user.id} generated badge: "${prompt}" (style: ${style}). ${remaining - 1} credits left.`);

    res.json({
      success: true,
      data: {
        imageUrl: result.imageUrl,
        prompt,
        style,
        creditsRemaining: remaining, // Decrements after save, not generate
      },
    });
  } catch (err) {
    logger.error('Badge generation failed:', err.message);
    res.status(500).json({ success: false, message: 'Generation failed' });
  }
});

// ── Save Generated Badge ─────────────────────────────────────
// POST /api/admin/badge-creator/save
router.post('/save', async (req, res) => {
  const { name, description, imageUrl, prompt, style, rarity, abilityPoints, isAnimated, batchGroupId, secondaryStyle } = req.body;

  if (!name || !imageUrl) {
    return res.status(400).json({ success: false, message: 'name and imageUrl are required' });
  }

  try {
    // Use existing Badge model
    const { default: Badge } = await import('../models/Badge.mjs');

    const badge = await Badge.create({
      name,
      description: description || `AI-generated badge: ${prompt}`,
      imageUrl,
      category: 'custom',
      rarity: rarity || 'common',
      xpReward: abilityPoints || 50,
      prompt: prompt || null,
      style: style || null,
      isAnimated: isAnimated || false,
      batchGroupId: batchGroupId || null,
      secondaryStyle: secondaryStyle || null,
    });

    logger.info(`[AUDIT] Admin ${req.user.id} saved badge "${name}" (${badge.id})`);

    res.status(201).json({ success: true, data: badge });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: `Badge "${name}" already exists` });
    }
    logger.error('Failed to save badge:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save badge' });
  }
});

// ── Badge Gallery ────────────────────────────────────────────
// GET /api/admin/badge-creator/gallery
router.get('/gallery', async (req, res) => {
  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const { rarity, category, assignedTo } = req.query;
    const where = {};
    if (rarity) where.rarity = rarity;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;

    const badges = await Badge.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json({ success: true, data: badges });
  } catch (err) {
    logger.error('Badge gallery error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load gallery' });
  }
});

// ── Assign Badge to Achievement/Milestone ────────────────────
// PATCH /api/admin/badge-creator/:badgeId/assign
router.patch('/:badgeId/assign', async (req, res) => {
  const { badgeId } = req.params;
  const { assignedTo, assignedTarget } = req.body;

  if (!assignedTo || !assignedTarget) {
    return res.status(400).json({ success: false, message: 'assignedTo and assignedTarget are required' });
  }
  const validTypes = ['achievement', 'tab', 'milestone'];
  if (!validTypes.includes(assignedTo)) {
    return res.status(400).json({ success: false, message: `assignedTo must be: ${validTypes.join(', ')}` });
  }

  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const badge = await Badge.findByPk(badgeId);
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    await badge.update({ assignedTo, assignedTarget });
    logger.info(`[AUDIT] Admin ${req.user.id} assigned badge "${badge.name}" → ${assignedTo}:${assignedTarget}`);
    res.json({ success: true, data: badge });
  } catch (err) {
    logger.error('Badge assign error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to assign badge' });
  }
});

// ── Unassign Badge ───────────────────────────────────────────
// PATCH /api/admin/badge-creator/:badgeId/unassign
router.patch('/:badgeId/unassign', async (req, res) => {
  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const badge = await Badge.findByPk(req.params.badgeId);
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    await badge.update({ assignedTo: null, assignedTarget: null });
    logger.info(`[AUDIT] Admin ${req.user.id} unassigned badge "${badge.name}"`);
    res.json({ success: true, data: badge });
  } catch (err) {
    logger.error('Badge unassign error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to unassign badge' });
  }
});

// ── Phase 3: Batch Generation (5 Variations) ────────────────
// POST /api/admin/badge-creator/generate-batch
router.post('/generate-batch', async (req, res) => {
  const { prompt, style, secondaryStyle } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, message: 'prompt is required' });
  }
  if (!style || typeof style !== 'string') {
    return res.status(400).json({ success: false, message: 'style is required' });
  }

  const remaining = await getRemainingGenerations();
  if (remaining < 5) {
    return res.status(429).json({
      success: false,
      message: `Batch requires 5 credits. Only ${remaining} remaining this month.`,
    });
  }

  const batchGroupId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const variations = [
    '', // Original prompt as-is
    'Alternate angle, different perspective.',
    'More detailed, intricate version.',
    'Simplified, cleaner minimalist take.',
    'Bold dramatic version with stronger contrast.',
  ];

  // Build combined style modifier for style mixing
  const combinedStyle = secondaryStyle
    ? `${style}. Mixed with: ${secondaryStyle}`
    : style;

  try {
    const results = await Promise.allSettled(
      variations.map((suffix, i) => {
        const varPrompt = suffix ? `${prompt}. ${suffix}` : prompt;
        return recraft.generateBadge({ prompt: varPrompt, style: combinedStyle, size: 256 });
      })
    );

    const images = results.map((r, i) => ({
      index: i,
      variation: variations[i] || 'Original',
      success: r.status === 'fulfilled' && r.value.success,
      imageUrl: r.status === 'fulfilled' && r.value.success ? r.value.imageUrl : null,
      error: r.status === 'fulfilled' ? r.value.error : r.reason?.message,
    }));

    const successCount = images.filter(i => i.success).length;
    logger.info(`[AUDIT] Admin ${req.user.id} batch-generated ${successCount}/5 badges: "${prompt}" (batchGroup: ${batchGroupId})`);

    res.json({
      success: true,
      data: {
        batchGroupId,
        images,
        creditsUsed: successCount,
        creditsRemaining: remaining - successCount,
        styleMixed: !!secondaryStyle,
      },
    });
  } catch (err) {
    logger.error('Batch generation failed:', err.message);
    res.status(500).json({ success: false, message: 'Batch generation failed' });
  }
});

// ── Phase 3: Pet Avatar Generation ──────────────────────────
// POST /api/admin/badge-creator/generate-pet-avatar
router.post('/generate-pet-avatar', async (req, res) => {
  const { species, personality, style } = req.body;

  if (!species || typeof species !== 'string') {
    return res.status(400).json({ success: false, message: 'species is required' });
  }

  const remaining = await getRemainingGenerations();
  if (remaining <= 0) {
    return res.status(429).json({
      success: false,
      message: `Monthly generation limit reached (${MAX_GENERATIONS_PER_MONTH}/month).`,
    });
  }

  const PET_PROMPTS = {
    phoenix: 'majestic phoenix bird, fiery plumage, warm glow',
    wolf: 'loyal wolf companion, noble stance, keen eyes',
    dragon: 'friendly baby dragon, small wings, playful',
    owl: 'wise owl, scholarly, perched, gentle expression',
    swan: 'elegant crystalline swan, graceful, icy feathers',
  };

  const basePrompt = PET_PROMPTS[species.toLowerCase()] || `cute ${species} companion pet`;
  const personalityNote = personality ? `. Personality: ${personality}` : '';
  const fullPrompt = `${basePrompt}${personalityNote}. Pet avatar icon for fitness app.`;
  const styleModifier = style || 'crystalline ice, deep sapphire blue (#002060), frost white, elegant swan, premium luxury';

  try {
    const result = await recraft.generateBadge({ prompt: fullPrompt, style: styleModifier, size: 256 });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    logger.info(`[AUDIT] Admin ${req.user.id} generated pet avatar: ${species}`);

    res.json({
      success: true,
      data: {
        imageUrl: result.imageUrl,
        species,
        personality,
        creditsRemaining: remaining - 1,
      },
    });
  } catch (err) {
    logger.error('Pet avatar generation failed:', err.message);
    res.status(500).json({ success: false, message: 'Pet avatar generation failed' });
  }
});

// ── Phase 3: Badge Marketplace ──────────────────────────────
// GET /api/admin/badge-creator/marketplace
router.get('/marketplace', async (_req, res) => {
  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const shared = await Badge.findAll({
      where: { isShared: true },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json({ success: true, data: shared });
  } catch (err) {
    logger.error('Marketplace load error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load marketplace' });
  }
});

// POST /api/admin/badge-creator/marketplace/share
router.post('/marketplace/share', async (req, res) => {
  const { badgeId } = req.body;
  if (!badgeId) {
    return res.status(400).json({ success: false, message: 'badgeId is required' });
  }

  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const badge = await Badge.findByPk(badgeId);
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    await badge.update({ isShared: true, sharedBy: req.user.id });
    logger.info(`[AUDIT] Admin ${req.user.id} shared badge "${badge.name}" to marketplace`);
    res.json({ success: true, data: badge });
  } catch (err) {
    logger.error('Marketplace share error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to share badge' });
  }
});

// POST /api/admin/badge-creator/marketplace/unshare
router.post('/marketplace/unshare', async (req, res) => {
  const { badgeId } = req.body;
  if (!badgeId) {
    return res.status(400).json({ success: false, message: 'badgeId is required' });
  }

  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const badge = await Badge.findByPk(badgeId);
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    await badge.update({ isShared: false, sharedBy: null });
    logger.info(`[AUDIT] Admin ${req.user.id} unshared badge "${badge.name}" from marketplace`);
    res.json({ success: true, data: badge });
  } catch (err) {
    logger.error('Marketplace unshare error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to unshare badge' });
  }
});

// POST /api/admin/badge-creator/marketplace/claim/:badgeId
router.post('/marketplace/claim/:badgeId', async (req, res) => {
  try {
    const { default: Badge } = await import('../models/Badge.mjs');
    const original = await Badge.findByPk(req.params.badgeId);
    if (!original) return res.status(404).json({ success: false, message: 'Badge not found' });
    if (!original.isShared) return res.status(400).json({ success: false, message: 'Badge is not shared' });

    // Clone badge for the claiming admin (per-admin uniqueness)
    const adminId = req.user.id;
    const cloneName = `${original.name} (${adminId.slice(0, 8)})`;
    const existing = await Badge.findOne({ where: { name: cloneName } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already claimed this badge' });
    }

    const clone = await Badge.create({
      name: cloneName,
      description: original.description,
      imageUrl: original.imageUrl,
      category: 'custom',
      rarity: original.rarity,
      xpReward: original.xpReward,
      prompt: original.prompt,
      style: original.style,
      isAnimated: original.isAnimated,
    });

    logger.info(`[AUDIT] Admin ${req.user.id} claimed badge "${original.name}" from marketplace`);
    res.status(201).json({ success: true, data: clone });
  } catch (err) {
    logger.error('Marketplace claim error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to claim badge' });
  }
});

// ── List Art Styles ──────────────────────────────────────────
// GET /api/admin/badge-creator/styles
router.get('/styles', (_req, res) => {
  // Return the curated style library
  // In production, this could come from a DB or CDN-cached JSON
  res.json({
    success: true,
    data: CURATED_STYLES,
  });
});

// ── Curated Art Styles (from MidLibrary.io research) ─────────
const CURATED_STYLES = [
  // Flat & Minimal
  { id: 'flat_2', name: 'Flat 2.0', category: 'Minimal', promptModifier: 'flat design, clean lines, minimal shading' },
  { id: 'material', name: 'Material Design', category: 'Minimal', promptModifier: 'material design, subtle shadows, bold colors' },
  { id: 'geometric', name: 'Geometric', category: 'Minimal', promptModifier: 'geometric shapes, angular, low-poly style' },
  { id: 'line_art', name: 'Line Art', category: 'Minimal', promptModifier: 'clean line art, monoline, minimal' },
  { id: 'monochrome', name: 'Monochrome', category: 'Minimal', promptModifier: 'monochrome, single color, high contrast' },

  // Classic & Ornate
  { id: 'art_deco', name: 'Art Deco', category: 'Classic', promptModifier: 'art deco style, gold accents, geometric luxury' },
  { id: 'heraldic', name: 'Heraldic', category: 'Classic', promptModifier: 'heraldic shield, coat of arms, medieval' },
  { id: 'vintage_badge', name: 'Vintage Badge', category: 'Classic', promptModifier: 'vintage emblem, retro typography, worn texture' },
  { id: 'art_nouveau', name: 'Art Nouveau', category: 'Classic', promptModifier: 'art nouveau, organic curves, ornamental' },
  { id: 'celtic', name: 'Celtic Knot', category: 'Classic', promptModifier: 'celtic knot pattern, interlacing, medieval' },

  // Gaming & Digital
  { id: 'pixel_art', name: 'Pixel Art', category: 'Gaming', promptModifier: '16-bit pixel art, retro gaming, 8-bit palette' },
  { id: 'neon_glow', name: 'Neon Glow', category: 'Gaming', promptModifier: 'neon glow, cyberpunk, dark background, electric' },
  { id: 'rpg_icon', name: 'RPG Icon', category: 'Gaming', promptModifier: 'RPG game icon, fantasy item, clean silhouette' },
  { id: 'esports', name: 'Esports', category: 'Gaming', promptModifier: 'esports logo, aggressive angles, bold typography' },
  { id: 'vaporwave', name: 'Vaporwave', category: 'Gaming', promptModifier: 'vaporwave aesthetic, pink/purple/cyan, retro grid' },

  // Nature & Organic
  { id: 'watercolor', name: 'Watercolor', category: 'Nature', promptModifier: 'watercolor painting, soft edges, organic feel' },
  { id: 'botanical', name: 'Botanical', category: 'Nature', promptModifier: 'botanical illustration, detailed leaves, scientific drawing' },
  { id: 'crystal', name: 'Crystalline', category: 'Nature', promptModifier: 'crystal formation, gemstone, translucent, faceted' },
  { id: 'ice', name: 'Frozen Ice', category: 'Nature', promptModifier: 'frozen ice, frost, glacial blue, crystalline' },
  { id: 'wood_carving', name: 'Wood Carving', category: 'Nature', promptModifier: 'wood carving, relief sculpture, natural grain' },

  // Premium & Luxury
  { id: 'gold_foil', name: 'Gold Foil', category: 'Luxury', promptModifier: 'gold foil stamping, metallic, premium, embossed' },
  { id: 'enamel_pin', name: 'Enamel Pin', category: 'Luxury', promptModifier: 'enamel pin design, hard enamel, polished metal border' },
  { id: 'engraved', name: 'Engraved', category: 'Luxury', promptModifier: 'engraved metal, etched, intaglio, silver plate' },
  { id: 'wax_seal', name: 'Wax Seal', category: 'Luxury', promptModifier: 'wax seal stamp, royal, parchment, deep red' },
  { id: 'diamond', name: 'Diamond Cut', category: 'Luxury', promptModifier: 'diamond facets, brilliant cut, light refraction, precious' },

  // Sports & Fitness
  { id: 'medal', name: 'Medal', category: 'Sports', promptModifier: 'olympic medal, gold/silver/bronze, ribbon, competition' },
  { id: 'trophy', name: 'Trophy', category: 'Sports', promptModifier: 'championship trophy, victory cup, engraved plate' },
  { id: 'muscle', name: 'Muscle Badge', category: 'Sports', promptModifier: 'fitness badge, strong physique silhouette, gym' },
  { id: 'shield', name: 'Shield Crest', category: 'Sports', promptModifier: 'sports shield crest, team emblem, laurel wreath' },
  { id: 'flame', name: 'Flame', category: 'Sports', promptModifier: 'flame emblem, fire, intense energy, ember glow' },

  // 3D & Rendered
  { id: '3d_render', name: '3D Render', category: '3D', promptModifier: '3D rendered, smooth shading, studio lighting, glossy' },
  { id: 'isometric', name: 'Isometric', category: '3D', promptModifier: 'isometric 3D, diorama style, cute, miniature' },
  { id: 'glass', name: 'Glass', category: '3D', promptModifier: 'glass material, transparent, refractive, caustics' },
  { id: 'clay', name: 'Clay', category: '3D', promptModifier: 'clay render, soft matte, Pixar style, rounded' },
  { id: 'holographic', name: 'Holographic', category: '3D', promptModifier: 'holographic, iridescent, rainbow shimmer, foil' },

  // SwanStudios Brand
  { id: 'crystalline_swan', name: 'Crystalline Swan', category: 'Brand', promptModifier: 'crystalline ice, deep sapphire blue (#002060), frost white, elegant swan, premium luxury' },
  { id: 'swan_gold', name: 'Swan Gold', category: 'Brand', promptModifier: 'gilded fern gold (#C6A84B), deep midnight blue, luxury emblem, premium' },
  { id: 'swan_purple', name: 'Swan Purple', category: 'Brand', promptModifier: 'wing purple (#8B5CF6), cosmic glow, cyber-crystalline, gaming' },
  { id: 'arctic_cyan', name: 'Arctic Cyan', category: 'Brand', promptModifier: 'arctic cyan (#60C0F0), ice wing, frozen energy, data-driven' },
  { id: 'obsidian', name: 'Obsidian', category: 'Brand', promptModifier: 'obsidian black (#0A0A0F), dark luxury, deep shadow, mysterious' },
];

export default router;
