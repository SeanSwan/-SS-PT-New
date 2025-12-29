/**
 * Video Library Controller
 *
 * Purpose: Admin video library management for NASM exercise demonstrations
 * Features:
 * - Create exercises with video (YouTube or upload)
 * - List videos with filtering and pagination
 * - Update video metadata
 * - Soft delete videos
 * - Video analytics tracking
 *
 * Security:
 * - Admin-only write access (enforced by requireAdmin middleware)
 * - Transaction-based operations for data consistency
 * - Input validation via Joi schemas
 *
 * Created: 2025-11-13
 */

import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';
import Joi from 'joi';
import axios from 'axios';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_DATA_API = 'https://www.googleapis.com/youtube/v3/videos';

// ==================== VALIDATION SCHEMAS ====================

const createExerciseVideoSchema = Joi.object({
  // Exercise details
  name: Joi.string().min(3).max(200).required()
    .messages({
      'string.min': 'Exercise name must be at least 3 characters',
      'string.max': 'Exercise name cannot exceed 200 characters',
      'any.required': 'Exercise name is required',
    }),
  description: Joi.string().max(2000).optional().allow(''),
  primary_muscle: Joi.string().required()
    .valid('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques',
      'quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'adductors', 'abductors')
    .messages({
      'any.required': 'Primary muscle group is required',
      'any.only': 'Invalid primary muscle group',
    }),
  secondary_muscles: Joi.array().items(Joi.string()).optional().default([]),
  equipment: Joi.string().required()
    .valid('barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable', 'bodyweight',
      'medicine_ball', 'stability_ball', 'trx', 'bosu', 'foam_roller', 'bench', 'machine', 'other')
    .messages({
      'any.required': 'Equipment type is required',
      'any.only': 'Invalid equipment type',
    }),
  difficulty: Joi.string().required()
    .valid('beginner', 'intermediate', 'advanced')
    .messages({
      'any.required': 'Difficulty level is required',
      'any.only': 'Difficulty must be beginner, intermediate, or advanced',
    }),
  movement_patterns: Joi.array().items(
    Joi.string().valid('pushing', 'pulling', 'squatting', 'lunging', 'hinging', 'rotating', 'anti-rotation', 'gait')
  ).required().min(1)
    .messages({
      'array.min': 'At least one movement pattern is required',
      'any.required': 'Movement patterns are required',
    }),
  nasm_phases: Joi.array().items(Joi.number().integer().min(1).max(5)).required().min(1)
    .messages({
      'array.min': 'At least one NASM phase is required',
      'any.required': 'NASM phases are required',
    }),
  contraindications: Joi.array().items(Joi.string()).optional().default([]),
  acute_variables: Joi.object({
    sets: Joi.string().optional(),
    reps: Joi.string().optional(),
    tempo: Joi.string().optional(),
    rest: Joi.string().optional(),
  }).optional(),

  // Video details
  video: Joi.object({
    type: Joi.string().valid('youtube', 'upload').required()
      .messages({
        'any.required': 'Video type is required',
        'any.only': 'Video type must be youtube or upload',
      }),
    video_id: Joi.string().required()
      .messages({
        'any.required': 'Video ID is required (YouTube video ID or upload key)',
      }),
    title: Joi.string().max(200).optional(),
    description: Joi.string().max(2000).optional().allow(''),
    duration_seconds: Joi.number().integer().min(1).when('type', {
      is: 'upload',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    thumbnail_url: Joi.string().uri().max(500).optional(),
    chapters: Joi.array().items(
      Joi.object({
        timestamp: Joi.number().integer().min(0).required(),
        title: Joi.string().max(100).required(),
        description: Joi.string().max(500).optional(),
      })
    ).optional(),
    tags: Joi.array().items(Joi.string()).optional().default([]),
    is_public: Joi.boolean().optional().default(true),
  }).required(),
});

const updateVideoSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional().allow(''),
  chapters: Joi.array().items(
    Joi.object({
      timestamp: Joi.number().integer().min(0).required(),
      title: Joi.string().max(100).required(),
      description: Joi.string().max(500).optional(),
    })
  ).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  is_public: Joi.boolean().optional(),
  approved: Joi.boolean().optional(),
}).min(1); // At least one field must be updated

const listVideosSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(200).optional(),
  muscle_group: Joi.string().valid('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'adductors', 'abductors').optional(),
  equipment: Joi.string().valid('barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable',
    'bodyweight', 'medicine_ball', 'stability_ball', 'trx', 'bosu', 'foam_roller', 'bench', 'machine', 'other').optional(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  nasm_phase: Joi.number().integer().min(1).max(5).optional(),
  video_type: Joi.string().valid('youtube', 'upload', 'all').default('all'),
  approved_only: Joi.boolean().default(true),
  sort_by: Joi.string().valid('created_at', 'name', 'views', 'video_count').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Fetch YouTube video metadata from YouTube Data API v3
 */
async function fetchYouTubeMetadata(videoId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured. Set YOUTUBE_API_KEY in .env');
  }

  try {
    const response = await axios.get(YOUTUBE_DATA_API, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('YouTube video not found or unavailable');
    }

    const video = response.data.items[0];

    // Parse ISO 8601 duration (e.g., "PT4M13S" = 4 minutes 13 seconds)
    const duration = parseDuration(video.contentDetails.duration);

    return {
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      duration_seconds: duration,
    };
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('YouTube API quota exceeded or invalid API key');
    }
    if (error.response?.status === 404) {
      throw new Error('YouTube video not found');
    }
    throw new Error(`Failed to fetch YouTube metadata: ${error.message}`);
  }
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT4M13S → 253 seconds
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

// ==================== API ENDPOINTS ====================

/**
 * POST /api/admin/exercise-library
 * Create new exercise with video demonstration
 *
 * Transaction flow:
 * 1. Validate input data
 * 2. Fetch YouTube metadata (if type=youtube)
 * 3. BEGIN TRANSACTION
 * 4. Insert into exercise_library
 * 5. Insert into exercise_videos
 * 6. COMMIT TRANSACTION
 * 7. Return created exercise + video
 */
export async function createExerciseVideo(req, res) {
  const trx = await db.transaction();

  try {
    // Validate request body
    const { error, value } = createExerciseVideoSchema.validate(req.body, { abortEarly: false });

    if (error) {
      await trx.rollback();
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
      });
    }

    const { name, description, primary_muscle, secondary_muscles, equipment, difficulty,
      movement_patterns, nasm_phases, contraindications, acute_variables, video } = value;

    // Fetch YouTube metadata if needed
    let videoMetadata = {
      title: video.title || name, // Default to exercise name
      description: video.description || '',
      duration_seconds: video.duration_seconds,
      thumbnail_url: video.thumbnail_url,
    };

    if (video.type === 'youtube') {
      try {
        const youtubeData = await fetchYouTubeMetadata(video.video_id);
        videoMetadata = {
          title: video.title || youtubeData.title,
          description: video.description || youtubeData.description,
          duration_seconds: youtubeData.duration_seconds,
          thumbnail_url: video.thumbnail_url || youtubeData.thumbnail_url,
        };
      } catch (ytError) {
        await trx.rollback();
        return res.status(400).json({
          error: 'YouTube video validation failed',
          message: ytError.message,
        });
      }
    }

    // Check if exercise already exists (prevent duplicates)
    const existingExercise = await trx('exercise_library')
      .where({ name })
      .whereNull('deletedAt')
      .first();

    let exerciseId;

    if (existingExercise) {
      // Exercise exists - just add video to it
      exerciseId = existingExercise.id;
    } else {
      // Create new exercise
      const [newExercise] = await trx('exercise_library')
        .insert({
          name,
          description: description || '',
          primary_muscle,
          secondary_muscles: JSON.stringify(secondary_muscles),
          equipment,
          difficulty,
          movement_patterns: JSON.stringify(movement_patterns),
          nasm_phases: JSON.stringify(nasm_phases),
          contraindications: JSON.stringify(contraindications || []),
          acute_variables: JSON.stringify(acute_variables || {}),
          video_count: 0, // Will be updated by trigger
        })
        .returning('*');

      exerciseId = newExercise.id;
    }

    // Create video record
    const [newVideo] = await trx('exercise_videos')
      .insert({
        exercise_id: exerciseId,
        video_type: video.type,
        video_id: video.video_id,
        title: videoMetadata.title,
        description: videoMetadata.description,
        duration_seconds: videoMetadata.duration_seconds,
        thumbnail_url: videoMetadata.thumbnail_url,
        chapters: JSON.stringify(video.chapters || []),
        uploader_id: req.user.id,
        approved: true, // Admin uploads are auto-approved
        is_public: video.is_public !== undefined ? video.is_public : true,
        tags: JSON.stringify(video.tags || []),
      })
      .returning('*');

    // Set as primary video if this is the first video for this exercise
    if (!existingExercise || !existingExercise.primary_video_id) {
      await trx('exercise_library')
        .where({ id: exerciseId })
        .update({ primary_video_id: newVideo.id });
    }

    await trx.commit();

    // Fetch complete exercise with video for response
    const completeExercise = await db('exercise_library')
      .where({ 'exercise_library.id': exerciseId })
      .whereNull('exercise_library.deletedAt')
      .first();

    const videos = await db('exercise_videos')
      .where({ exercise_id: exerciseId })
      .whereNull('deletedAt')
      .orderBy('created_at', 'desc');

    return res.status(201).json({
      message: existingExercise ? 'Video added to existing exercise' : 'Exercise and video created successfully',
      exercise: {
        ...completeExercise,
        secondary_muscles: JSON.parse(completeExercise.secondary_muscles || '[]'),
        movement_patterns: JSON.parse(completeExercise.movement_patterns || '[]'),
        nasm_phases: JSON.parse(completeExercise.nasm_phases || '[]'),
        contraindications: JSON.parse(completeExercise.contraindications || '[]'),
        acute_variables: JSON.parse(completeExercise.acute_variables || '{}'),
        videos: videos.map(v => ({
          ...v,
          chapters: JSON.parse(v.chapters || '[]'),
          tags: JSON.parse(v.tags || '[]'),
        })),
      },
    });
  } catch (error) {
    await trx.rollback();
    console.error('[CREATE EXERCISE VIDEO ERROR]', error);

    return res.status(500).json({
      error: 'Failed to create exercise video',
      message: error.message,
    });
  }
}

/**
 * GET /api/admin/exercise-library
 * List exercises with video library filtering
 *
 * Query params:
 * - page, limit (pagination)
 * - search (exercise name search)
 * - muscle_group, equipment, difficulty (filters)
 * - nasm_phase (filter by NASM OPT phase 1-5)
 * - video_type (youtube, upload, all)
 * - approved_only (default true)
 * - sort_by, sort_order
 */
export async function listExerciseVideos(req, res) {
  try {
    // Validate query params
    const { error, value } = listVideosSchema.validate(req.query, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
      });
    }

    const { page, limit, search, muscle_group, equipment, difficulty, nasm_phase,
      video_type, approved_only, sort_by, sort_order } = value;

    const offset = (page - 1) * limit;

    // Build query
    let query = db('exercise_library')
      .select(
        'exercise_library.*',
        db.raw('COUNT(DISTINCT exercise_videos.id) as video_count'),
        db.raw('SUM(CASE WHEN exercise_videos.video_type = ? THEN 1 ELSE 0 END) as youtube_count', ['youtube']),
        db.raw('SUM(CASE WHEN exercise_videos.video_type = ? THEN 1 ELSE 0 END) as upload_count', ['upload'])
      )
      .leftJoin('exercise_videos', function() {
        this.on('exercise_videos.exercise_id', '=', 'exercise_library.id')
          .andOn(db.raw('exercise_videos.deletedAt IS NULL'));

        if (approved_only) {
          this.andOn(db.raw('exercise_videos.approved = true'));
        }

        if (video_type !== 'all') {
          this.andOn('exercise_videos.video_type', '=', video_type);
        }
      })
      .whereNull('exercise_library.deletedAt')
      .groupBy('exercise_library.id');

    // Apply filters
    if (search) {
      query = query.where('exercise_library.name', 'ilike', `%${search}%`);
    }

    if (muscle_group) {
      query = query.where('exercise_library.primary_muscle', muscle_group);
    }

    if (equipment) {
      query = query.where('exercise_library.equipment', equipment);
    }

    if (difficulty) {
      query = query.where('exercise_library.difficulty', difficulty);
    }

    if (nasm_phase) {
      query = query.whereRaw('exercise_library.nasm_phases::jsonb @> ?', [JSON.stringify([nasm_phase])]);
    }

    // Apply sorting
    if (sort_by === 'created_at') {
      query = query.orderBy('exercise_library.created_at', sort_order);
    } else if (sort_by === 'name') {
      query = query.orderBy('exercise_library.name', sort_order);
    } else if (sort_by === 'video_count') {
      query = query.orderBy('video_count', sort_order);
    } else if (sort_by === 'views') {
      query = query.orderBy('exercise_library.views', sort_order);
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [{ total }] = await countQuery;

    // Get paginated results
    const exercises = await query.limit(limit).offset(offset);

    // Parse JSON fields
    const parsedExercises = exercises.map(ex => ({
      ...ex,
      secondary_muscles: JSON.parse(ex.secondary_muscles || '[]'),
      movement_patterns: JSON.parse(ex.movement_patterns || '[]'),
      nasm_phases: JSON.parse(ex.nasm_phases || '[]'),
      contraindications: JSON.parse(ex.contraindications || '[]'),
      acute_variables: JSON.parse(ex.acute_variables || '{}'),
      video_count: parseInt(ex.video_count, 10),
      youtube_count: parseInt(ex.youtube_count, 10),
      upload_count: parseInt(ex.upload_count, 10),
    }));

    return res.status(200).json({
      exercises: parsedExercises,
      pagination: {
        page,
        limit,
        total: parseInt(total, 10),
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[LIST EXERCISE VIDEOS ERROR]', error);

    return res.status(500).json({
      error: 'Failed to list exercises',
      message: error.message,
    });
  }
}

/**
 * GET /api/admin/exercise-library/:exerciseId/videos
 * Get all videos for a specific exercise
 */
export async function getExerciseVideos(req, res) {
  try {
    const { exerciseId } = req.params;

    // Verify exercise exists
    const exercise = await db('exercise_library')
      .where({ id: exerciseId })
      .whereNull('deletedAt')
      .first();

    if (!exercise) {
      return res.status(404).json({
        error: 'Exercise not found',
        message: `No exercise found with ID: ${exerciseId}`,
      });
    }

    // Get all videos for this exercise
    const videos = await db('exercise_videos')
      .where({ exercise_id: exerciseId })
      .whereNull('deletedAt')
      .orderBy('created_at', 'desc');

    const parsedVideos = videos.map(v => ({
      ...v,
      chapters: JSON.parse(v.chapters || '[]'),
      tags: JSON.parse(v.tags || '[]'),
    }));

    return res.status(200).json({
      exercise: {
        ...exercise,
        secondary_muscles: JSON.parse(exercise.secondary_muscles || '[]'),
        movement_patterns: JSON.parse(exercise.movement_patterns || '[]'),
        nasm_phases: JSON.parse(exercise.nasm_phases || '[]'),
        contraindications: JSON.parse(exercise.contraindications || '[]'),
        acute_variables: JSON.parse(exercise.acute_variables || '{}'),
      },
      videos: parsedVideos,
    });
  } catch (error) {
    console.error('[GET EXERCISE VIDEOS ERROR]', error);

    return res.status(500).json({
      error: 'Failed to get exercise videos',
      message: error.message,
    });
  }
}

/**
 * PATCH /api/admin/exercise-library/videos/:videoId
 * Update video metadata (title, description, chapters, tags, is_public, approved)
 */
export async function updateVideo(req, res) {
  try {
    const { videoId } = req.params;

    // Validate request body
    const { error, value } = updateVideoSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
      });
    }

    // Verify video exists
    const video = await db('exercise_videos')
      .where({ id: videoId })
      .whereNull('deletedAt')
      .first();

    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        message: `No video found with ID: ${videoId}`,
      });
    }

    // Prepare update data
    const updateData = { ...value };

    if (updateData.chapters) {
      updateData.chapters = JSON.stringify(updateData.chapters);
    }

    if (updateData.tags) {
      updateData.tags = JSON.stringify(updateData.tags);
    }

    // If approving video, record who approved and when
    if (updateData.approved === true && !video.approved) {
      updateData.approved_by = req.user.id;
      updateData.approved_at = new Date();
    }

    updateData.updated_at = new Date();

    // Update video
    const [updatedVideo] = await db('exercise_videos')
      .where({ id: videoId })
      .update(updateData)
      .returning('*');

    return res.status(200).json({
      message: 'Video updated successfully',
      video: {
        ...updatedVideo,
        chapters: JSON.parse(updatedVideo.chapters || '[]'),
        tags: JSON.parse(updatedVideo.tags || '[]'),
      },
    });
  } catch (error) {
    console.error('[UPDATE VIDEO ERROR]', error);

    return res.status(500).json({
      error: 'Failed to update video',
      message: error.message,
    });
  }
}

/**
 * DELETE /api/admin/exercise-library/videos/:videoId
 * Soft delete a video (sets deletedAt timestamp)
 */
export async function deleteVideo(req, res) {
  try {
    const { videoId } = req.params;

    // Verify video exists and is not already deleted
    const video = await db('exercise_videos')
      .where({ id: videoId })
      .whereNull('deletedAt')
      .first();

    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        message: `No video found with ID: ${videoId} or video is already deleted`,
      });
    }

    // Soft delete (set deletedAt timestamp)
    await db('exercise_videos')
      .where({ id: videoId })
      .update({ deletedAt: new Date() });

    // If this was the primary video, clear primary_video_id on exercise
    await db('exercise_library')
      .where({ primary_video_id: videoId })
      .update({ primary_video_id: null });

    return res.status(200).json({
      message: 'Video soft deleted successfully',
      video_id: videoId,
      note: 'Video is hidden but preserved in database. Use restore endpoint to recover.',
    });
  } catch (error) {
    console.error('[DELETE VIDEO ERROR]', error);

    return res.status(500).json({
      error: 'Failed to delete video',
      message: error.message,
    });
  }
}

/**
 * POST /api/admin/exercise-library/videos/:videoId/restore
 * Restore a soft-deleted video (sets deletedAt to NULL)
 */
export async function restoreVideo(req, res) {
  try {
    const { videoId } = req.params;

    // Verify video exists and is deleted
    const video = await db('exercise_videos')
      .where({ id: videoId })
      .whereNotNull('deletedAt')
      .first();

    if (!video) {
      return res.status(404).json({
        error: 'Deleted video not found',
        message: `No deleted video found with ID: ${videoId}`,
      });
    }

    // Restore video (clear deletedAt)
    const [restoredVideo] = await db('exercise_videos')
      .where({ id: videoId })
      .update({ deletedAt: null, updated_at: new Date() })
      .returning('*');

    return res.status(200).json({
      message: 'Video restored successfully',
      video: {
        ...restoredVideo,
        chapters: JSON.parse(restoredVideo.chapters || '[]'),
        tags: JSON.parse(restoredVideo.tags || '[]'),
      },
    });
  } catch (error) {
    console.error('[RESTORE VIDEO ERROR]', error);

    return res.status(500).json({
      error: 'Failed to restore video',
      message: error.message,
    });
  }
}

/**
 * POST /api/admin/exercise-library/videos/:videoId/track-view
 * Track video view analytics
 */
export async function trackVideoView(req, res) {
  try {
    const { videoId } = req.params;
    const { watch_duration_seconds, completion_percentage, chapters_viewed,
      device_type, view_context, workout_id } = req.body;

    // Verify video exists
    const video = await db('exercise_videos')
      .where({ id: videoId })
      .whereNull('deletedAt')
      .first();

    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        message: `No video found with ID: ${videoId}`,
      });
    }

    // Increment view count on exercise_videos
    await db('exercise_videos')
      .where({ id: videoId })
      .increment('views', 1);

    // Create analytics record
    await db('video_analytics').insert({
      video_id: videoId,
      user_id: req.user?.id || null,
      watch_duration_seconds: watch_duration_seconds || 0,
      completion_percentage: completion_percentage || 0,
      completed: (completion_percentage || 0) >= 90,
      chapters_viewed: JSON.stringify(chapters_viewed || []),
      device_type,
      view_context,
      workout_id,
      user_agent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Video view tracked successfully',
    });
  } catch (error) {
    console.error('[TRACK VIDEO VIEW ERROR]', error);

    return res.status(500).json({
      error: 'Failed to track video view',
      message: error.message,
    });
  }
}

export default {
  createExerciseVideo,
  listExerciseVideos,
  getExerciseVideos,
  updateVideo,
  deleteVideo,
  restoreVideo,
  trackVideoView,
};
