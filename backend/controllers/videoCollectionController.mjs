/**
 * Video Collection Controller
 * ===========================
 *
 * Purpose: Admin-only CRUD for video collections (playlists, series, courses)
 *          and managing the videos within each collection.
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 *
 * Architecture:
 *   [Admin UI] --REST--> [videoCollectionController] --ORM--> [video_collections]
 *                                                              [video_collection_items]
 *                                                              [video_catalog]
 *
 * API Endpoints:
 *   - POST   /api/v2/admin/collections              - Create collection
 *   - GET    /api/v2/admin/collections              - List collections (paginated)
 *   - GET    /api/v2/admin/collections/:id          - Get single collection with videos
 *   - PUT    /api/v2/admin/collections/:id          - Update collection metadata
 *   - DELETE /api/v2/admin/collections/:id          - Soft delete collection
 *   - POST   /api/v2/admin/collections/:id/videos   - Add videos to collection
 *   - DELETE /api/v2/admin/collections/:id/videos/:videoId - Remove video from collection
 *   - PATCH  /api/v2/admin/collections/:id/reorder  - Reorder videos in collection
 *
 * Security: All endpoints require admin RBAC.
 */

import logger from '../utils/logger.mjs';
import { getVideoCollection, getVideoCollectionItem, getVideoCatalog, Op } from '../models/index.mjs';

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

/**
 * Convert a title string to a URL-safe slug.
 * @param {string} text - The text to slugify
 * @returns {string} URL-safe slug
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending -2, -3, etc. on collision.
 * @param {Object} VideoCollection - The Sequelize model
 * @param {string} baseSlug - The initial slug candidate
 * @returns {Promise<string>} A unique slug
 */
async function uniqueSlug(VideoCollection, baseSlug) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await VideoCollection.findOne({
      where: { slug: candidate },
      paranoid: false,
    });

    if (!existing) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;

    // Safety valve
    if (suffix > 100) {
      candidate = `${baseSlug}-${Date.now()}`;
      return candidate;
    }
  }
}

// ---------------------------------------------------------------------------
// Exported controller functions
// ---------------------------------------------------------------------------

/**
 * Create a new video collection.
 * POST /api/v2/admin/collections
 *
 * Body: { title, description, type, visibility, accessTier, thumbnailKey, sortOrder }
 */
export async function createCollection(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    if (!VideoCollection) {
      logger.error('[video-collections] VideoCollection model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const { title, description, type, visibility, accessTier, thumbnailKey, sortOrder } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required',
      });
    }

    // Generate unique slug
    const baseSlug = slugify(title);
    const slug = await uniqueSlug(VideoCollection, baseSlug);

    const collection = await VideoCollection.create({
      title,
      slug,
      description: description || null,
      type: type || 'playlist',
      visibility: visibility || 'public',
      accessTier: accessTier || 'free',
      thumbnailKey: thumbnailKey || null,
      creatorId: req.user.id,
      sortOrder: sortOrder || 0,
    });

    logger.info(`[video-collections] Collection created: ${collection.id}`, {
      title,
      slug,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    logger.error('[video-collections] createCollection failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to create collection',
    });
  }
}

/**
 * List all collections with pagination.
 * GET /api/v2/admin/collections?page=1&limit=20
 */
export async function listCollections(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    const VideoCollectionItem = getVideoCollectionItem();
    if (!VideoCollection) {
      logger.error('[video-collections] VideoCollection model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      where.title = { [Op.iLike]: `%${req.query.search}%` };
    }
    if (req.query.type) where.type = req.query.type;
    if (req.query.visibility) where.visibility = req.query.visibility;

    const { count, rows } = await VideoCollection.findAndCountAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Attach video count per collection
    if (VideoCollectionItem && rows.length > 0) {
      const collectionIds = rows.map((r) => r.id);
      const counts = await VideoCollectionItem.findAll({
        where: { collectionId: { [Op.in]: collectionIds } },
        attributes: [
          'collectionId',
          [VideoCollectionItem.sequelize.fn('COUNT', VideoCollectionItem.sequelize.col('id')), 'videoCount'],
        ],
        group: ['collectionId'],
        raw: true,
      });
      const countMap = {};
      for (const c of counts) {
        countMap[c.collectionId] = parseInt(c.videoCount, 10);
      }
      for (const row of rows) {
        row.dataValues.videoCount = countMap[row.id] || 0;
      }
    }

    logger.info(`[video-collections] Listed collections: page=${page}, total=${count}`, {
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('[video-collections] listCollections failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to list collections',
    });
  }
}

/**
 * Get a single collection with its videos.
 * GET /api/v2/admin/collections/:id
 */
export async function getCollection(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    const VideoCollectionItem = getVideoCollectionItem();
    const VideoCatalog = getVideoCatalog();

    if (!VideoCollection) {
      logger.error('[video-collections] VideoCollection model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const collection = await VideoCollection.findByPk(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
      });
    }

    // Fetch associated videos via join table
    let videos = [];
    if (VideoCollectionItem && VideoCatalog) {
      const items = await VideoCollectionItem.findAll({
        where: { collectionId: collection.id },
        order: [['sortOrder', 'ASC']],
        raw: true,
      });

      if (items.length > 0) {
        const videoIds = items.map((item) => item.videoId);
        const catalogVideos = await VideoCatalog.findAll({
          where: { id: { [Op.in]: videoIds } },
          raw: true,
        });

        // Build a map for O(1) lookup
        const videoMap = {};
        for (const v of catalogVideos) {
          videoMap[v.id] = v;
        }

        // Preserve sort order from collection items
        videos = items.map((item) => ({
          ...videoMap[item.videoId],
          collectionItemId: item.id,
          sortOrder: item.sortOrder,
          addedAt: item.addedAt,
        })).filter((v) => v.id); // Filter out any orphaned references
      }
    }

    logger.info(`[video-collections] Collection fetched: ${collection.id}`, {
      videoCount: videos.length,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: {
        ...collection.toJSON(),
        videos,
      },
    });
  } catch (error) {
    logger.error('[video-collections] getCollection failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch collection',
    });
  }
}

/**
 * Update collection metadata.
 * PUT /api/v2/admin/collections/:id
 *
 * Body: { title, description, type, visibility, accessTier, thumbnailKey, sortOrder }
 */
export async function updateCollection(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    if (!VideoCollection) {
      logger.error('[video-collections] VideoCollection model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const collection = await VideoCollection.findByPk(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
      });
    }

    const { title, description, type, visibility, accessTier, thumbnailKey, sortOrder } = req.body;

    // If title changed, regenerate slug
    const updates = {};
    if (title !== undefined && title !== collection.title) {
      updates.title = title;
      const baseSlug = slugify(title);
      updates.slug = await uniqueSlug(VideoCollection, baseSlug);
    }
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (visibility !== undefined) updates.visibility = visibility;
    if (accessTier !== undefined) updates.accessTier = accessTier;
    if (thumbnailKey !== undefined) updates.thumbnailKey = thumbnailKey;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    await collection.update(updates);

    logger.info(`[video-collections] Collection updated: ${collection.id}`, {
      updatedFields: Object.keys(updates),
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: collection,
    });
  } catch (error) {
    logger.error('[video-collections] updateCollection failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to update collection',
    });
  }
}

/**
 * Soft delete a collection.
 * DELETE /api/v2/admin/collections/:id
 */
export async function deleteCollection(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    if (!VideoCollection) {
      logger.error('[video-collections] VideoCollection model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const collection = await VideoCollection.findByPk(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
      });
    }

    // Soft delete (paranoid mode)
    await collection.destroy();

    logger.info(`[video-collections] Collection soft-deleted: ${collection.id}`, {
      title: collection.title,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      message: 'Collection deleted',
    });
  } catch (error) {
    logger.error('[video-collections] deleteCollection failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete collection',
    });
  }
}

/**
 * Add videos to a collection.
 * POST /api/v2/admin/collections/:id/videos
 *
 * Body: { videoIds: [uuid, uuid, ...] }
 */
export async function addVideos(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    const VideoCollectionItem = getVideoCollectionItem();
    const VideoCatalog = getVideoCatalog();

    if (!VideoCollection || !VideoCollectionItem) {
      logger.error('[video-collections] Required models not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const { id } = req.params;
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'videoIds must be a non-empty array of UUIDs',
      });
    }

    // Verify collection exists
    const collection = await VideoCollection.findByPk(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
      });
    }

    // Verify all video IDs exist in catalog
    if (VideoCatalog) {
      const existingVideos = await VideoCatalog.findAll({
        where: { id: { [Op.in]: videoIds } },
        attributes: ['id'],
        raw: true,
      });
      const existingIds = new Set(existingVideos.map((v) => v.id));
      const missing = videoIds.filter((vid) => !existingIds.has(vid));
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Videos not found: ${missing.join(', ')}`,
        });
      }
    }

    // Find current max sortOrder for this collection
    const maxItem = await VideoCollectionItem.findOne({
      where: { collectionId: id },
      order: [['sortOrder', 'DESC']],
      attributes: ['sortOrder'],
    });
    let nextSortOrder = (maxItem ? maxItem.sortOrder : -1) + 1;

    // Filter out videos already in collection to avoid duplicates
    const existingItems = await VideoCollectionItem.findAll({
      where: {
        collectionId: id,
        videoId: { [Op.in]: videoIds },
      },
      attributes: ['videoId'],
      raw: true,
    });
    const alreadyInCollection = new Set(existingItems.map((item) => item.videoId));
    const newVideoIds = videoIds.filter((vid) => !alreadyInCollection.has(vid));

    if (newVideoIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All videos are already in this collection',
        data: [],
      });
    }

    // Create VideoCollectionItem entries with auto-incrementing sortOrder
    const itemsToCreate = newVideoIds.map((videoId) => ({
      collectionId: id,
      videoId,
      sortOrder: nextSortOrder++,
    }));

    const createdItems = await VideoCollectionItem.bulkCreate(itemsToCreate);

    logger.info(`[video-collections] Videos added to collection ${id}`, {
      added: newVideoIds.length,
      skipped: alreadyInCollection.size,
      userId: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      data: createdItems,
      meta: {
        added: newVideoIds.length,
        skippedDuplicates: alreadyInCollection.size,
      },
    });
  } catch (error) {
    logger.error('[video-collections] addVideos failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to add videos to collection',
    });
  }
}

/**
 * Remove a video from a collection (hard delete the join table entry).
 * DELETE /api/v2/admin/collections/:id/videos/:videoId
 */
export async function removeVideo(req, res) {
  try {
    const VideoCollectionItem = getVideoCollectionItem();
    if (!VideoCollectionItem) {
      logger.error('[video-collections] VideoCollectionItem model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const { id, videoId } = req.params;

    const item = await VideoCollectionItem.findOne({
      where: {
        collectionId: id,
        videoId,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Video not found in this collection',
      });
    }

    // Hard delete — VideoCollectionItem has no paranoid mode
    await item.destroy();

    logger.info(`[video-collections] Video removed from collection ${id}`, {
      videoId,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      message: 'Video removed from collection',
    });
  } catch (error) {
    logger.error('[video-collections] removeVideo failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to remove video from collection',
    });
  }
}

/**
 * Reorder videos in a collection.
 * PATCH /api/v2/admin/collections/:id/reorder
 *
 * Body: { videoIds: [uuid1, uuid2, ...] } (in desired order)
 */
export async function reorderVideos(req, res) {
  try {
    const VideoCollectionItem = getVideoCollectionItem();
    if (!VideoCollectionItem) {
      logger.error('[video-collections] VideoCollectionItem model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const { id } = req.params;
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'videoIds must be a non-empty array of UUIDs in desired order',
      });
    }

    // Update sortOrder for each VideoCollectionItem
    const updatePromises = videoIds.map((videoId, index) =>
      VideoCollectionItem.update(
        { sortOrder: index },
        {
          where: {
            collectionId: id,
            videoId,
          },
        }
      )
    );

    const results = await Promise.all(updatePromises);

    // Count how many rows were actually updated
    const updatedCount = results.reduce((sum, [affectedRows]) => sum + affectedRows, 0);

    logger.info(`[video-collections] Videos reordered in collection ${id}`, {
      requested: videoIds.length,
      updated: updatedCount,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      message: 'Videos reordered',
      meta: {
        requested: videoIds.length,
        updated: updatedCount,
      },
    });
  } catch (error) {
    logger.error('[video-collections] reorderVideos failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to reorder videos',
    });
  }
}
