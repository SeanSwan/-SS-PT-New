/**
 * ============================================================================
 * FILE: contentStudioRoutes.mjs
 * PURPOSE: API routes for Content Studio service configuration
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = Router();

// ─── GET /api/content-studio/service-status ─────────────────
// Returns which external services have API keys configured
router.get('/service-status', protect, adminOnly, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        remotion: true, // Always available (built-in)
        kling: !!process.env.KLING_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        blotato: !!process.env.BLOTATO_API_KEY,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check service status' });
  }
});

// ─── PUT /api/content-studio/api-keys ───────────────────────
// Saves API keys to environment (in production, these would go to a
// secrets manager; for now they're stored in the DB or .env)
router.put('/api-keys', protect, adminOnly, async (req, res) => {
  try {
    const { keys } = req.body;
    if (!keys || typeof keys !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid keys payload' });
    }

    const validKeys = ['kling', 'elevenlabs', 'blotato'];
    const envMap = {
      kling: 'KLING_API_KEY',
      elevenlabs: 'ELEVENLABS_API_KEY',
      blotato: 'BLOTATO_API_KEY',
    };

    const updated = [];
    for (const [key, value] of Object.entries(keys)) {
      if (validKeys.includes(key) && typeof value === 'string' && value.trim()) {
        // Set in process.env for immediate use (persists until restart)
        process.env[envMap[key]] = value.trim();
        updated.push(key);
      }
    }

    res.json({
      success: true,
      message: `Updated ${updated.length} API key(s): ${updated.join(', ')}`,
      data: {
        remotion: true,
        kling: !!process.env.KLING_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        blotato: !!process.env.BLOTATO_API_KEY,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save API keys' });
  }
});

// ─── GET /api/content-studio/coverage ────────────────────────
// Returns exercise-to-video coverage statistics for the tracker
router.get('/coverage', protect, adminOnly, async (req, res) => {
  try {
    const { getAllModels } = await import('../utils/getAllModels.mjs');
    const models = getAllModels();
    const { Exercise, VideoCatalog } = models;

    if (!Exercise) {
      return res.status(500).json({ success: false, error: 'Exercise model not available' });
    }

    // Get all active exercises with basic info
    const exercises = await Exercise.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'exerciseType', 'bodyPartCategory', 'primaryMuscles', 'difficulty', 'exercise_key', 'videoUrl', 'source'],
      order: [['bodyPartCategory', 'ASC'], ['name', 'ASC']],
      raw: true,
    });

    // Get video counts per exercise from VideoCatalog (if model exists)
    let videoCounts = {};
    if (VideoCatalog) {
      try {
        const { Sequelize } = await import('sequelize');
        const counts = await VideoCatalog.findAll({
          where: {
            exerciseId: { [Sequelize.Op.ne]: null },
            status: 'published',
          },
          attributes: [
            'exerciseId',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'videoCount'],
          ],
          group: ['exerciseId'],
          raw: true,
        });
        counts.forEach(c => {
          videoCounts[c.exerciseId] = parseInt(c.videoCount) || 0;
        });
      } catch {
        // VideoCatalog table may not exist yet — non-fatal
      }
    }

    // Build coverage data
    const coverage = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      exerciseKey: ex.exercise_key,
      exerciseType: ex.exerciseType,
      bodyPartCategory: ex.bodyPartCategory || 'Unknown',
      primaryMuscles: (() => { try { return typeof ex.primaryMuscles === 'string' ? JSON.parse(ex.primaryMuscles) : (ex.primaryMuscles || []); } catch { return []; } })(),
      difficulty: ex.difficulty || 0,
      source: ex.source || 'unknown',
      hasLegacyVideo: !!ex.videoUrl,
      catalogVideoCount: videoCounts[ex.id] || 0,
      covered: !!ex.videoUrl || (videoCounts[ex.id] || 0) > 0,
    }));

    // Summary stats
    const totalExercises = coverage.length;
    const coveredCount = coverage.filter(e => e.covered).length;
    const gapCount = totalExercises - coveredCount;
    const coveragePercent = totalExercises > 0 ? Math.round((coveredCount / totalExercises) * 1000) / 10 : 0;

    // Group by body part
    const byBodyPart = {};
    coverage.forEach(ex => {
      const bp = ex.bodyPartCategory;
      if (!byBodyPart[bp]) byBodyPart[bp] = { total: 0, covered: 0 };
      byBodyPart[bp].total++;
      if (ex.covered) byBodyPart[bp].covered++;
    });

    res.json({
      success: true,
      data: {
        summary: { totalExercises, coveredCount, gapCount, coveragePercent },
        byBodyPart,
        exercises: coverage,
      },
    });
  } catch (err) {
    console.error('[ContentStudio] Coverage query failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch coverage data' });
  }
});

export default router;
