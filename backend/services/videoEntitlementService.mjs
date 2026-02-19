/**
 * Video Entitlement Service
 * =========================
 * Resolves whether a user can access a given video and generates signed URLs
 * for R2-hosted content when access is granted.
 *
 * Entitlement hierarchy:
 *   1. Unpublished videos are invisible to non-admins.
 *   2. Public videos are always accessible (DB constraint guarantees access_tier='free').
 *   3. Unlisted videos follow access_tier rules when discovered via direct link.
 *   4. Members-only videos require authenticated member role, with premium tier
 *      gated behind video_access_grants.
 *
 * Signed URL generation:
 *   - Only for source='upload' videos (YouTube embeds don't need signing).
 *   - Uses hostedKey for playback and captionsKey for WebVTT captions.
 */

import logger from '../utils/logger.mjs';
import { generatePlaybackUrl, generateThumbnailUrl } from './r2StorageService.mjs';
import { getVideoAccessGrant, Op } from '../models/index.mjs';

// Roles considered "members" for visibility checks
const MEMBER_ROLES = ['client', 'trainer', 'admin'];

/**
 * Build the signed URL payload for an R2-hosted video.
 * Returns null fields for YouTube-sourced videos (no signing needed).
 *
 * @param {Object} video - VideoCatalog model instance
 * @returns {Promise<{ signedUrl: string|null, captionsUrl: string|null }>}
 */
async function buildSignedUrls(video) {
  if (video.source !== 'upload' || !video.hostedKey) {
    return { signedUrl: null, captionsUrl: null };
  }

  const signedUrl = await generatePlaybackUrl({ objectKey: video.hostedKey, mimeType: video.mimeType });
  const captionsUrl = video.captionsKey
    ? await generatePlaybackUrl({ objectKey: video.captionsKey, mimeType: 'text/vtt' })
    : null;

  return { signedUrl, captionsUrl };
}

/**
 * Check whether a user holds an active access grant for a specific video.
 *
 * Queries the video_access_grants table for a row matching:
 *   - user_id = userId
 *   - video_id = videoId
 *   - grant_status = 'active'
 *   - expires_at IS NULL  OR  expires_at > NOW()
 *
 * @param {number} userId  - The user's primary key (Users.id)
 * @param {string} videoId - The video's UUID (video_catalog.id)
 * @returns {Promise<boolean>}
 */
async function hasAccessGrant(userId, videoId) {
  try {
    const VideoAccessGrant = getVideoAccessGrant();

    const grant = await VideoAccessGrant.findOne({
      where: {
        user_id: userId,
        video_id: videoId,
        grant_status: 'active',
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } },
        ],
      },
    });

    return !!grant;
  } catch (err) {
    logger.error('hasAccessGrant query failed', {
      userId,
      videoId,
      error: err.message,
    });
    return false;
  }
}

/**
 * Determine whether a user is allowed to access a video and, if so,
 * return the signed playback URL(s).
 *
 * @param {Object|null} user  - Authenticated user (null for anonymous visitors)
 * @param {Object}      video - VideoCatalog model instance
 * @returns {Promise<{
 *   allowed: boolean,
 *   reason?: string,
 *   signedUrl?: string|null,
 *   captionsUrl?: string|null
 * }>}
 */
export async function canAccessVideo(user, video) {
  // ── Step 0: Status gate ──────────────────────────────────────────────
  if (video.status !== 'published') {
    if (user?.role === 'admin') {
      // Admin preview — allow but still generate URLs
      logger.info('Admin previewing unpublished video', {
        videoId: video.id,
        userId: user.id,
        status: video.status,
      });
      const urls = await buildSignedUrls(video);
      return { allowed: true, ...urls };
    }
    return { allowed: false, reason: 'not_found' };
  }

  // ── Step 1: PUBLIC visibility ────────────────────────────────────────
  if (video.visibility === 'public') {
    // DB CHECK constraint guarantees access_tier='free' for public videos
    const urls = await buildSignedUrls(video);
    return { allowed: true, ...urls };
  }

  // ── Step 2: UNLISTED visibility ──────────────────────────────────────
  if (video.visibility === 'unlisted') {
    if (video.accessTier === 'member') {
      if (!user) {
        return { allowed: false, reason: 'login_required' };
      }
      if (!MEMBER_ROLES.includes(user.role)) {
        return { allowed: false, reason: 'not_member' };
      }
    }
    // accessTier 'free' or member check passed
    const urls = await buildSignedUrls(video);
    return { allowed: true, ...urls };
  }

  // ── Step 3: MEMBERS_ONLY visibility ──────────────────────────────────
  if (video.visibility === 'members_only') {
    if (!user) {
      return { allowed: false, reason: 'login_required' };
    }
    if (!MEMBER_ROLES.includes(user.role)) {
      return { allowed: false, reason: 'not_member' };
    }

    // Free and member tiers — any authenticated member can access
    if (video.accessTier === 'free' || video.accessTier === 'member') {
      const urls = await buildSignedUrls(video);
      return { allowed: true, ...urls };
    }

    // Premium tier — admin always, others need an active grant
    if (video.accessTier === 'premium') {
      if (user.role === 'admin') {
        const urls = await buildSignedUrls(video);
        return { allowed: true, ...urls };
      }

      const granted = await hasAccessGrant(user.id, video.id);
      if (granted) {
        const urls = await buildSignedUrls(video);
        return { allowed: true, ...urls };
      }

      return { allowed: false, reason: 'premium_required' };
    }
  }

  // ── Default: deny ────────────────────────────────────────────────────
  logger.warn('canAccessVideo fell through to default deny', {
    videoId: video.id,
    visibility: video.visibility,
    accessTier: video.accessTier,
    userId: user?.id,
  });
  return { allowed: false };
}
