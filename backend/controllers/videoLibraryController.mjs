/**
 * Video Library Controller
 * ========================
 *
 * Purpose: Handle all video library CRUD operations and business logic
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Client   │─────▶│  Video Library   │─────▶│   PostgreSQL    │
 * │   (Frontend)    │      │   Controller     │      │   + YouTube API │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *
 * API Endpoints:
 * - POST   /api/admin/exercise-library           - Create exercise with video
 * - GET    /api/admin/exercise-library           - List exercises (paginated, filtered)
 * - GET    /api/admin/exercise-library/:id       - Get exercise details
 * - PUT    /api/admin/exercise-library/:id       - Update exercise
 * - DELETE /api/admin/exercise-library/:id       - Soft delete exercise
 * - GET    /api/admin/exercise-library/:id/videos - Get all videos for exercise
 * - PATCH  /api/admin/exercise-library/videos/:id - Update video metadata
 * - DELETE /api/admin/exercise-library/videos/:id - Soft delete video
 * - POST   /api/admin/exercise-library/videos/:id/restore - Restore video
 * - POST   /api/admin/exercise-library/videos/:id/track-view - Track analytics
 *
 * Business Logic:
 * WHY Soft Deletes?
 * - Maintain exercise-video relationships
 * - Preserve analytics history
 * - Allow recovery of accidentally deleted content
 *
 * Security Model:
 * - Requires admin role (RBAC check)
 * - Input validation for all endpoints
 * - Rate limiting on public endpoints
 *
 * Error Handling:
 * - Standardized error responses
 * - Detailed error logging
 * - Client-friendly error messages
 */

import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';
import { validationResult } from 'express-validator';
import { validateYouTubeUrl, extractYouTubeId } from '../services/youtubeValidationService.mjs';

/**
 * Create exercise with optional video
 * POST /api/admin/exercise-library
 */
export const createExercise = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, video_url, video_type } = req.body;

    // Create exercise first
    const [exercise] = await sequelize.query(
      `INSERT INTO exercise_library (name, description, created_at, updated_at)
       VALUES (:title, :description, NOW(), NOW())
       RETURNING *`,
      {
        replacements: { title, description },
        type: QueryTypes.INSERT
      }
    );

    // If video URL provided, fetch YouTube metadata and create video
    if (video_url && video_type === 'youtube') {
      try {
        // Validate and fetch YouTube metadata
        const youtubeData = await validateYouTubeUrl(video_url);
        const videoId = extractYouTubeId(video_url);

        if (!videoId) {
          throw new Error('Invalid YouTube URL');
        }

        // Parse ISO 8601 duration (PT1M30S -> 90 seconds)
        const durationMatch = youtubeData.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(durationMatch?.[1] || 0);
        const minutes = parseInt(durationMatch?.[2] || 0);
        const seconds = parseInt(durationMatch?.[3] || 0);
        const durationSeconds = hours * 3600 + minutes * 60 + seconds;

        // Create video with auto-fetched metadata
        await sequelize.query(
          `INSERT INTO exercise_videos
           (exercise_id, video_type, video_id, title, description, thumbnail_url, duration_seconds, uploader_id, approved, is_public, created_at, updated_at)
           VALUES (:exercise_id, :video_type, :video_id, :title, :description, :thumbnail_url, :duration_seconds, :uploader_id, true, true, NOW(), NOW())`,
          {
            replacements: {
              exercise_id: exercise.id,
              video_type: 'youtube',
              video_id: videoId,
              title: youtubeData.title,
              description: youtubeData.description,
              thumbnail_url: youtubeData.thumbnail,
              duration_seconds: durationSeconds,
              uploader_id: req.user.id
            },
            type: QueryTypes.INSERT
          }
        );

        console.log(`✅ Created exercise "${title}" with YouTube video "${youtubeData.title}"`);
      } catch (youtubeError) {
        console.warn(`⚠️ Failed to fetch YouTube metadata: ${youtubeError.message}`);
        // Continue without video if YouTube fetch fails
      }
    }

    return res.status(201).json(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    return res.status(500).json({ error: 'Failed to create exercise' });
  }
};

/**
 * Get single exercise with videos
 * GET /api/admin/exercise-library/:id
 */
export const getExercise = async (req, res) => {
  try {
    const [exercise] = await sequelize.query(
      `SELECT * FROM exercise_library
       WHERE id = :id AND "deletedAt" IS NULL`,
      {
        replacements: { id: req.params.id },
        type: QueryTypes.SELECT
      }
    );

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const videos = await sequelize.query(
      `SELECT * FROM exercise_videos
       WHERE exercise_id = :exercise_id AND "deletedAt" IS NULL
       ORDER BY created_at DESC`,
      {
        replacements: { exercise_id: exercise.id },
        type: QueryTypes.SELECT
      }
    );

    return res.json({ ...exercise, videos });
  } catch (error) {
    console.error('Error fetching exercise:', error);
    return res.status(500).json({ error: 'Failed to fetch exercise' });
  }
};

/**
 * Update exercise metadata
 * PUT /api/admin/exercise-library/:id
 */
export const updateExercise = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description } = req.body;

    const [results] = await sequelize.query(
      `UPDATE exercise_library
       SET name = :title, description = :description, updated_at = NOW()
       WHERE id = :id AND "deletedAt" IS NULL
       RETURNING *`,
      {
        replacements: { id: req.params.id, title, description },
        type: QueryTypes.UPDATE
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    return res.json(results[0]);
  } catch (error) {
    console.error('Error updating exercise:', error);
    return res.status(500).json({ error: 'Failed to update exercise' });
  }
};

/**
 * Soft delete exercise
 * DELETE /api/admin/exercise-library/:id
 */
export const deleteExercise = async (req, res) => {
  try {
    const [results] = await sequelize.query(
      `UPDATE exercise_library
       SET "deletedAt" = NOW()
       WHERE id = :id AND "deletedAt" IS NULL
       RETURNING *`,
      {
        replacements: { id: req.params.id },
        type: QueryTypes.UPDATE
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return res.status(500).json({ error: 'Failed to delete exercise' });
  }
};

/**
 * List exercises with pagination and filtering
 * GET /api/admin/exercise-library?page=1&limit=20&video_type=youtube&approved=true
 */
export const listExercises = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = ['"deletedAt" IS NULL'];
    const replacements = { limit, offset };

    // Filter by video type
    if (req.query.video_type) {
      conditions.push('EXISTS (SELECT 1 FROM exercise_videos WHERE exercise_id = exercise_library.id AND video_type = :video_type AND "deletedAt" IS NULL)');
      replacements.video_type = req.query.video_type;
    }

    // Filter by approval status
    if (req.query.approved !== undefined) {
      conditions.push('EXISTS (SELECT 1 FROM exercise_videos WHERE exercise_id = exercise_library.id AND approved = :approved AND "deletedAt" IS NULL)');
      replacements.approved = req.query.approved === 'true';
    }

    const whereClause = conditions.join(' AND ');

    // Get total count for pagination
    const [{ count }] = await sequelize.query(
      `SELECT COUNT(*) as count FROM exercise_library WHERE ${whereClause}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    // Get exercises with video count
    const exercises = await sequelize.query(
      `SELECT el.*,
              COALESCE(el.video_count, 0) as video_count,
              COALESCE((
                SELECT json_agg(ev.*)
                FROM exercise_videos ev
                WHERE ev.exercise_id = el.id AND ev."deletedAt" IS NULL
              ), '[]'::json) as videos
       FROM exercise_library el
       WHERE ${whereClause}
       ORDER BY el.created_at DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    return res.json({
      data: exercises,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error listing exercises:', error);
    return res.status(500).json({ error: 'Failed to list exercises' });
  }
};

/**
 * Get all videos for specific exercise
 * GET /api/admin/exercise-library/:id/videos
 */
export const getExerciseVideos = async (req, res) => {
  try {
    const videos = await sequelize.query(
      `SELECT * FROM exercise_videos
       WHERE exercise_id = :exercise_id AND "deletedAt" IS NULL
       ORDER BY created_at DESC`,
      {
        replacements: { exercise_id: req.params.id },
        type: QueryTypes.SELECT
      }
    );

    return res.json(videos);
  } catch (error) {
    console.error('Error fetching exercise videos:', error);
    return res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

/**
 * Update video metadata
 * PATCH /api/admin/exercise-library/videos/:id
 */
export const updateVideo = async (req, res) => {
  try {
    const { title, description, tags, chapters, approved, is_public } = req.body;

    const updates = [];
    const replacements = { id: req.params.id };

    if (title !== undefined) {
      updates.push('title = :title');
      replacements.title = title;
    }
    if (description !== undefined) {
      updates.push('description = :description');
      replacements.description = description;
    }
    if (tags !== undefined) {
      updates.push('tags = :tags::jsonb');
      replacements.tags = JSON.stringify(tags);
    }
    if (chapters !== undefined) {
      updates.push('chapters = :chapters::jsonb');
      replacements.chapters = JSON.stringify(chapters);
    }
    if (approved !== undefined) {
      updates.push('approved = :approved');
      replacements.approved = approved;
      if (approved) {
        updates.push('approved_by = :approved_by');
        updates.push('approved_at = NOW()');
        replacements.approved_by = req.user.id;
      }
    }
    if (is_public !== undefined) {
      updates.push('is_public = :is_public');
      replacements.is_public = is_public;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    const [results] = await sequelize.query(
      `UPDATE exercise_videos
       SET ${updates.join(', ')}
       WHERE id = :id AND "deletedAt" IS NULL
       RETURNING *`,
      {
        replacements,
        type: QueryTypes.UPDATE
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.json(results[0]);
  } catch (error) {
    console.error('Error updating video:', error);
    return res.status(500).json({ error: 'Failed to update video' });
  }
};

/**
 * Soft delete video
 * DELETE /api/admin/exercise-library/videos/:id
 */
export const deleteVideo = async (req, res) => {
  try {
    const [results] = await sequelize.query(
      `UPDATE exercise_videos
       SET "deletedAt" = NOW()
       WHERE id = :id AND "deletedAt" IS NULL
       RETURNING *`,
      {
        replacements: { id: req.params.id },
        type: QueryTypes.UPDATE
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error deleting video:', error);
    return res.status(500).json({ error: 'Failed to delete video' });
  }
};

/**
 * Restore soft-deleted video
 * POST /api/admin/exercise-library/videos/:id/restore
 */
export const restoreVideo = async (req, res) => {
  try {
    const [results] = await sequelize.query(
      `UPDATE exercise_videos
       SET "deletedAt" = NULL, updated_at = NOW()
       WHERE id = :id AND "deletedAt" IS NOT NULL
       RETURNING *`,
      {
        replacements: { id: req.params.id },
        type: QueryTypes.UPDATE
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Video not found or not deleted' });
    }

    return res.json(results[0]);
  } catch (error) {
    console.error('Error restoring video:', error);
    return res.status(500).json({ error: 'Failed to restore video' });
  }
};

/**
 * Track video view analytics
 * POST /api/admin/exercise-library/videos/:id/track-view
 */
export const trackVideoView = async (req, res) => {
  try {
    const {
      watch_duration_seconds,
      completion_percentage,
      completed,
      chapters_viewed,
      replay_count,
      pause_count,
      session_id,
      device_type,
      user_agent,
      view_context,
      workout_id
    } = req.body;

    // Insert analytics record
    const [analytics] = await sequelize.query(
      `INSERT INTO video_analytics
       (video_id, user_id, watch_duration_seconds, completion_percentage, completed, chapters_viewed, replay_count, pause_count, session_id, device_type, user_agent, view_context, workout_id, viewed_at, created_at, updated_at)
       VALUES (:video_id, :user_id, :watch_duration_seconds, :completion_percentage, :completed, :chapters_viewed::jsonb, :replay_count, :pause_count, :session_id, :device_type, :user_agent, :view_context, :workout_id, NOW(), NOW(), NOW())
       RETURNING *`,
      {
        replacements: {
          video_id: req.params.id,
          user_id: req.user?.id || null,
          watch_duration_seconds: watch_duration_seconds || 0,
          completion_percentage: completion_percentage || 0,
          completed: completed || false,
          chapters_viewed: chapters_viewed ? JSON.stringify(chapters_viewed) : '[]',
          replay_count: replay_count || 0,
          pause_count: pause_count || 0,
          session_id: session_id || null,
          device_type: device_type || null,
          user_agent: user_agent || null,
          view_context: view_context || null,
          workout_id: workout_id || null
        },
        type: QueryTypes.INSERT
      }
    );

    // Increment view count on video
    await sequelize.query(
      `UPDATE exercise_videos
       SET views = views + 1, updated_at = NOW()
       WHERE id = :video_id`,
      {
        replacements: { video_id: req.params.id },
        type: QueryTypes.UPDATE
      }
    );

    return res.status(201).json(analytics);
  } catch (error) {
    console.error('Error tracking video view:', error);
    return res.status(500).json({ error: 'Failed to track view' });
  }
};
