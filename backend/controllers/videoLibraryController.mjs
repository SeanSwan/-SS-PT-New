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
import path from 'path';
import fs from 'fs';

/**
 * Create exercise with video (YouTube or upload)
 * POST /api/admin/exercise-library
 */
export const createExerciseVideo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const trx = await sequelize.transaction();

  try {
    const {
      name,
      description,
      primary_muscle,
      secondary_muscles,
      equipment,
      difficulty,
      movement_patterns,
      nasm_phases,
      contraindications,
      acute_variables,
      video
    } = req.body;

    // Handle uploaded file if present
    let uploadedFileInfo = null;
    if (req.file) {
      uploadedFileInfo = {
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };
    }

    // Guard: reject uploads without file
    if (video.type === 'upload' && !req.file) {
      return res.status(400).json({
        error: 'File upload required',
        message: 'Video file is required when video type is "upload"'
      });
    }

    // Prepare video metadata
    let videoMetadata = {
      title: video.title || name,
      description: video.description || '',
      duration_seconds: video.duration_seconds,
      thumbnail_url: video.thumbnail_url,
    };

    // Handle YouTube video
    if (video.type === 'youtube') {
      try {
        const youtubeData = await validateYouTubeUrl(`https://www.youtube.com/watch?v=${video.video_id}`);
        videoMetadata = {
          title: video.title || youtubeData.title,
          description: video.description || youtubeData.description,
          duration_seconds: youtubeData.duration ? parseDuration(youtubeData.duration) : video.duration_seconds,
          thumbnail_url: video.thumbnail_url || youtubeData.thumbnail,
        };
      } catch (ytError) {
        console.warn(`⚠️ Failed to fetch YouTube metadata: ${ytError.message}`);
        // Continue with provided metadata
      }
    }

    // Handle uploaded video
    if (video.type === 'upload' && uploadedFileInfo) {
      // For uploads, video_id is the filename
      video.video_id = uploadedFileInfo.filename;
      videoMetadata.title = video.title || uploadedFileInfo.originalFilename;
      videoMetadata.thumbnail_url = null; // Will be generated later
    }

    // Check if exercise already exists
    const existingExercise = await trx.query(
      `SELECT * FROM exercise_library
       WHERE name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { name },
        type: QueryTypes.SELECT,
        transaction: trx
      }
    );

    let exerciseId;

    if (existingExercise && existingExercise.length > 0) {
      // Exercise exists - just add video to it
      exerciseId = existingExercise[0].id;
    } else {
      // Create new exercise
      const [newExercise] = await trx.query(
        `INSERT INTO exercise_library
         (name, description, primary_muscle, secondary_muscles, equipment, difficulty,
          movement_patterns, nasm_phases, contraindications, acute_variables, created_at, updated_at)
         VALUES (:name, :description, :primary_muscle, :secondary_muscles::jsonb, :equipment, :difficulty,
                 :movement_patterns::jsonb, :nasm_phases::jsonb, :contraindications::jsonb, :acute_variables::jsonb, NOW(), NOW())
         RETURNING *`,
        {
          replacements: {
            name,
            description: description || '',
            primary_muscle,
            secondary_muscles: JSON.stringify(secondary_muscles || []),
            equipment,
            difficulty,
            movement_patterns: JSON.stringify(movement_patterns),
            nasm_phases: JSON.stringify(nasm_phases),
            contraindications: JSON.stringify(contraindications || []),
            acute_variables: JSON.stringify(acute_variables || {}),
          },
          type: QueryTypes.INSERT,
          transaction: trx
        }
      );
      exerciseId = newExercise.id;
    }

    // Create video record
    const [newVideo] = await trx.query(
      `INSERT INTO exercise_videos
       (exercise_id, video_type, video_id, title, description, thumbnail_url, duration_seconds,
        uploader_id, approved, is_public, tags, chapters, original_filename, file_size_bytes,
        created_at, updated_at)
       VALUES (:exercise_id, :video_type, :video_id, :title, :description, :thumbnail_url, :duration_seconds,
               :uploader_id, true, :is_public, :tags::jsonb, :chapters::jsonb, :original_filename, :file_size_bytes,
               NOW(), NOW())
       RETURNING *`,
      {
        replacements: {
          exercise_id: exerciseId,
          video_type: video.type,
          video_id: video.video_id,
          title: videoMetadata.title,
          description: videoMetadata.description,
          thumbnail_url: videoMetadata.thumbnail_url,
          duration_seconds: videoMetadata.duration_seconds,
          uploader_id: req.user.id,
          is_public: video.is_public !== undefined ? video.is_public : true,
          tags: JSON.stringify(video.tags || []),
          chapters: JSON.stringify(video.chapters || []),
          original_filename: uploadedFileInfo?.originalFilename || null,
          file_size_bytes: uploadedFileInfo?.size || null,
        },
        type: QueryTypes.INSERT,
        transaction: trx
      }
    );

    // Set as primary video if this is the first video for this exercise
    const videoCount = await trx.query(
      `SELECT COUNT(*) as count FROM exercise_videos
       WHERE exercise_id = :exercise_id AND "deletedAt" IS NULL`,
      {
        replacements: { exercise_id: exerciseId },
        type: QueryTypes.SELECT,
        transaction: trx
      }
    );

    if (Number(videoCount[0].count) === 1) {
      await trx.query(
        `UPDATE exercise_library
         SET primary_video_id = :video_id
         WHERE id = :exercise_id`,
        {
          replacements: { video_id: newVideo.id, exercise_id: exerciseId },
          type: QueryTypes.UPDATE,
          transaction: trx
        }
      );
    }

    await trx.commit();

    // Fetch complete exercise with video for response
    const completeExercise = await sequelize.query(
      `SELECT * FROM exercise_library WHERE id = :id`,
      {
        replacements: { id: exerciseId },
        type: QueryTypes.SELECT
      }
    );

    const videos = await sequelize.query(
      `SELECT * FROM exercise_videos
       WHERE exercise_id = :exercise_id AND "deletedAt" IS NULL
       ORDER BY created_at DESC`,
      {
        replacements: { exercise_id: exerciseId },
        type: QueryTypes.SELECT
      }
    );

    return res.status(201).json({
      message: existingExercise && existingExercise.length > 0 ? 'Video added to existing exercise' : 'Exercise and video created successfully',
      exercise: {
        ...completeExercise[0],
        secondary_muscles: JSON.parse(completeExercise[0].secondary_muscles || '[]'),
        movement_patterns: JSON.parse(completeExercise[0].movement_patterns || '[]'),
        nasm_phases: JSON.parse(completeExercise[0].nasm_phases || '[]'),
        contraindications: JSON.parse(completeExercise[0].contraindications || '[]'),
        acute_variables: JSON.parse(completeExercise[0].acute_variables || '{}'),
        videos: videos.map(v => ({
          ...v,
          chapters: JSON.parse(v.chapters || '[]'),
          tags: JSON.parse(v.tags || '[]'),
          // Add playback URL for uploaded videos
          playbackUrl: v.video_type === 'upload' ? `/uploads/videos/${v.video_id}` : null,
        })),
      },
    });

  } catch (error) {
    await trx.rollback();

    // Clean up uploaded file if transaction failed
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    console.error('Error creating exercise video:', error);
    return res.status(500).json({ error: 'Failed to create exercise video' });
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

    // Parse JSON fields for consistent API response
    const parsedExercise = {
      ...exercise,
      secondary_muscles: JSON.parse(exercise.secondary_muscles || '[]'),
      movement_patterns: JSON.parse(exercise.movement_patterns || '[]'),
      nasm_phases: JSON.parse(exercise.nasm_phases || '[]'),
      contraindications: JSON.parse(exercise.contraindications || '[]'),
      acute_variables: JSON.parse(exercise.acute_variables || '{}'),
      videos: videos.map(v => ({
        ...v,
        chapters: JSON.parse(v.chapters || '[]'),
        tags: JSON.parse(v.tags || '[]'),
        // Add playback URL for uploaded videos
        playbackUrl: v.video_type === 'upload' ? `/uploads/videos/${v.video_id}` : null,
      }))
    };

    return res.json(parsedExercise);
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
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(isoDuration) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);

  if (!matches) return 0;

  const hours = parseInt(matches[1] || 0, 10);
  const minutes = parseInt(matches[2] || 0, 10);
  const seconds = parseInt(matches[3] || 0, 10);

  return hours * 3600 + minutes * 60 + seconds;
}


/**
 * List exercises with video library filtering
 * GET /api/admin/exercise-library?page=1&limit=20&video_type=youtube&approved=true
 */
export const listExerciseVideos = async (req, res) => {
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
