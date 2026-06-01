/**
 * Social post deletion cleanup service
 * ====================================
 * Shared best-effort cleanup for post hard-delete paths.
 */
import { Op } from 'sequelize';

import { Hashtag, PostHashtag } from '../../models/social/index.mjs';
import { deletePhoto } from '../photoStorageService.mjs';

export function storageKeyFromMediaUrl(mediaUrl) {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('/api/serve-photo/')) {
    return mediaUrl.replace('/api/serve-photo/', '');
  }
  try {
    const url = new URL(mediaUrl);
    return url.pathname.replace(/^\/+/, '') || mediaUrl;
  } catch {
    return mediaUrl;
  }
}

async function cleanupPostMedia(post) {
  const storageKey = storageKeyFromMediaUrl(post?.mediaUrl);
  if (!storageKey) return;
  try {
    await deletePhoto(storageKey);
  } catch {
    // Media cleanup is best-effort; a storage issue must not block moderation.
  }
}

async function cleanupPostHashtags(postId, transaction) {
  try {
    const linkedHashtags = await PostHashtag.findAll({
      where: { postId },
      attributes: ['hashtagId'],
      transaction,
    });
    const hashtagIds = linkedHashtags.map((row) => row.hashtagId).filter(Boolean);
    if (hashtagIds.length > 0) {
      await Hashtag.decrement(['usageCount', 'weeklyCount'], {
        where: { id: { [Op.in]: hashtagIds } },
        transaction,
      });
    }
  } catch {
    // Non-fatal: hashtag counters can be repaired without preserving bad content.
  }
}

export async function cleanupSocialPostDeletionSideEffects(post, options = {}) {
  await cleanupPostMedia(post);
  await cleanupPostHashtags(post?.id, options.transaction);
}
