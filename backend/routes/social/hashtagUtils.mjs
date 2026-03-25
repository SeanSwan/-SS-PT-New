/**
 * ============================================================================
 * FILE: hashtagUtils.mjs
 * PURPOSE: Hashtag extraction, processing, and weekly reset utilities
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides pure utility functions for hashtag operations:
 * extracting tags from text, processing/linking tags to posts, and resetting
 * weekly trending counters.
 *
 * HOW IT FITS IN THE APP: Called by posts.mjs (on post create) and hashtags.mjs
 * (route handlers). Weekly reset called by cron or admin endpoint.
 *
 * KEY DECISIONS: Extracted from hashtags.mjs to comply with 300-line monolith
 * rule and separate concerns (utils vs route handlers).
 */

import Hashtag, { classifyHashtag } from '../../models/social/Hashtag.mjs';
import PostHashtag from '../../models/social/PostHashtag.mjs';
import logger from '../../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Hashtag Extraction
// PURPOSE: Parse and normalize hashtags from user-generated content
// ─────────────────────────────────────────────────────────────

// Matches #hashtag (alphanumeric + underscores, 2-30 chars)
const HASHTAG_REGEX = /#([a-zA-Z0-9_]{2,30})/g;

/**
 * Extract unique hashtag names from text content.
 * Limits to 10 tags per post to prevent spam.
 * @param {string} content - Post text content
 * @returns {string[]} Array of lowercase hashtag names (without #), max 10
 */
export function extractHashtags(content) {
  if (!content || typeof content !== 'string') return [];
  const matches = content.match(HASHTAG_REGEX) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))].slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hashtag Processing
// PURPOSE: Find-or-create hashtags, link to posts, update counters
// ─────────────────────────────────────────────────────────────

/**
 * Process extracted hashtags: find-or-create, link to post, update counts.
 * Non-fatal — individual tag failures don't break the post creation.
 * @param {number} postId - The post ID to link hashtags to
 * @param {string[]} tagNames - Array of normalized tag names
 * @param {object} [transaction] - Optional Sequelize transaction
 * @returns {object[]} Array of linked Hashtag records
 */
export async function processHashtags(postId, tagNames, transaction = null) {
  if (!tagNames || tagNames.length === 0) return [];

  const linkedTags = [];

  for (const name of tagNames) {
    try {
      // Find or create the hashtag with auto-classification
      const [hashtag] = await Hashtag.findOrCreate({
        where: { name },
        defaults: {
          name,
          slug: name,
          category: classifyHashtag(name),
          isOfficial: false,
          isBanned: false
        },
        ...(transaction ? { transaction } : {})
      });

      // Skip banned hashtags silently
      if (hashtag.isBanned) continue;

      // Create the join record (ignore duplicates via findOrCreate)
      // Only increment counts if the join record was actually created (Issue #1 fix)
      const [, created] = await PostHashtag.findOrCreate({
        where: { postId, hashtagId: hashtag.id },
        defaults: { postId, hashtagId: hashtag.id },
        ...(transaction ? { transaction } : {})
      });

      // Increment usage counts only for new associations (prevents double-counting)
      if (created) {
        await hashtag.increment(['usageCount', 'weeklyCount'], {
          ...(transaction ? { transaction } : {})
        });
      }

      linkedTags.push(hashtag);
    } catch (err) {
      // Non-fatal: log and continue with other tags
      const log = logger?.warn ? logger : console;
      log.warn(`Failed to process hashtag "${name}": ${err.message}`);
    }
  }

  return linkedTags;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Weekly Counter Reset
// PURPOSE: Reset weeklyCount to 0 for all hashtags (run weekly via cron)
// WHY: Trending algorithm uses weeklyCount for recency-weighted scoring.
//   Without resets, old popular tags dominate forever.
// ─────────────────────────────────────────────────────────────

/**
 * Reset all hashtag weekly counters to zero.
 * Should be called once per week (e.g., Sunday midnight UTC).
 * @returns {{ affected: number }} Count of hashtags reset
 */
export async function resetWeeklyCounters() {
  const { Op } = await import('sequelize');
  const [affected] = await Hashtag.update(
    { weeklyCount: 0 },
    { where: { weeklyCount: { [Op.gt]: 0 } } }
  );
  const log = logger?.info ? logger : console;
  log.info(`[Hashtag Weekly Reset] Reset weeklyCount for ${affected} hashtags`);
  return { affected };
}
