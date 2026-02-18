/**
 * Public Video Library Routes
 * ===========================
 * Public-facing endpoints for browsing approved/public videos.
 * No authentication required.
 */

import { Router } from 'express';
import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';

const router = Router();

/**
 * GET /api/videos - Browse public videos
 * Query params: page, limit, muscle, equipment, phase, search, sort
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [`ev."deletedAt" IS NULL`, `ev.approved = true`, `ev.is_public = true`];
    const replacements = { limit, offset };

    // Optional filters
    if (req.query.muscle) {
      conditions.push(`el.primary_muscle = :muscle`);
      replacements.muscle = req.query.muscle;
    }
    if (req.query.equipment) {
      conditions.push(`el.equipment = :equipment`);
      replacements.equipment = req.query.equipment;
    }
    if (req.query.phase) {
      conditions.push(`el.nasm_phases @> :phase::jsonb`);
      replacements.phase = JSON.stringify([parseInt(req.query.phase)]);
    }
    if (req.query.search) {
      conditions.push(`(ev.title ILIKE :search OR el.name ILIKE :search OR el.description ILIKE :search)`);
      replacements.search = `%${req.query.search}%`;
    }
    if (req.query.type) {
      conditions.push(`ev.video_type = :vtype`);
      replacements.vtype = req.query.type;
    }

    const where = conditions.join(' AND ');

    // Sort options
    const sortMap = {
      newest: 'ev."createdAt" DESC',
      oldest: 'ev."createdAt" ASC',
      popular: 'ev.views DESC',
      title: 'ev.title ASC',
    };
    const orderBy = sortMap[req.query.sort] || sortMap.newest;

    const [videos, countResult] = await Promise.all([
      sequelize.query(
        `SELECT
          ev.id, ev.title, ev.description, ev.video_type, ev.video_id,
          ev.thumbnail_url, ev.duration_seconds, ev.views, ev.tags,
          ev."createdAt",
          el.name AS exercise_name, el.primary_muscle, el.equipment,
          el.difficulty, el.nasm_phases AS phases
        FROM exercise_videos ev
        JOIN exercise_library el ON ev.exercise_id = el.id AND el."deletedAt" IS NULL
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT :limit OFFSET :offset`,
        { replacements, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT COUNT(*) AS total
        FROM exercise_videos ev
        JOIN exercise_library el ON ev.exercise_id = el.id AND el."deletedAt" IS NULL
        WHERE ${where}`,
        { replacements, type: QueryTypes.SELECT }
      ),
    ]);

    const total = parseInt(countResult[0]?.total || '0');

    res.json({
      success: true,
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    // Handle missing tables gracefully
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      return res.json({ success: true, videos: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }
    console.error('[publicVideos] list error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load videos' });
  }
});

/**
 * GET /api/videos/filters - Get available filter options
 */
router.get('/filters', async (req, res) => {
  try {
    const [muscles, equipment] = await Promise.all([
      sequelize.query(
        `SELECT DISTINCT el.primary_muscle
         FROM exercise_videos ev
         JOIN exercise_library el ON ev.exercise_id = el.id
         WHERE ev.approved = true AND ev.is_public = true AND ev."deletedAt" IS NULL
         ORDER BY el.primary_muscle`,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT DISTINCT el.equipment
         FROM exercise_videos ev
         JOIN exercise_library el ON ev.exercise_id = el.id
         WHERE ev.approved = true AND ev.is_public = true AND ev."deletedAt" IS NULL
         ORDER BY el.equipment`,
        { type: QueryTypes.SELECT }
      ),
    ]);

    res.json({
      success: true,
      muscles: muscles.map(r => r.primary_muscle).filter(Boolean),
      equipment: equipment.map(r => r.equipment).filter(Boolean),
      phases: [1, 2, 3, 4, 5],
      types: ['youtube', 'upload'],
    });
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      return res.json({ success: true, muscles: [], equipment: [], phases: [1,2,3,4,5], types: ['youtube','upload'] });
    }
    console.error('[publicVideos] filters error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
});

/**
 * GET /api/videos/:id - Get single video details
 */
router.get('/:id', async (req, res) => {
  try {
    const [video] = await sequelize.query(
      `SELECT
        ev.id, ev.title, ev.description, ev.video_type, ev.video_id,
        ev.thumbnail_url, ev.duration_seconds, ev.views, ev.tags,
        ev.chapters, ev."createdAt",
        el.name AS exercise_name, el.primary_muscle, el.secondary_muscles,
        el.equipment, el.difficulty, el.nasm_phases AS phases,
        el.movement_patterns, el.contraindications
      FROM exercise_videos ev
      JOIN exercise_library el ON ev.exercise_id = el.id
      WHERE ev.id = :id AND ev.approved = true AND ev.is_public = true AND ev."deletedAt" IS NULL`,
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Increment view count (fire-and-forget)
    sequelize.query(
      `UPDATE exercise_videos SET views = views + 1 WHERE id = :id`,
      { replacements: { id: req.params.id } }
    ).catch(() => {});

    res.json({ success: true, video });
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    console.error('[publicVideos] get error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load video' });
  }
});

export default router;
