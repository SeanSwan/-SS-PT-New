/**
 * ============================================================================
 * FILE: Hashtag.mjs
 * PURPOSE: Hashtag model for social content discovery and categorization
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the Hashtag table for the hashtag-driven
 * content discovery system. Hashtags replace rigid category tabs with
 * flexible, user-created tags that auto-classify into broad categories.
 *
 * HOW IT FITS IN THE APP: SocialPost → PostHashtag (join) → Hashtag
 * KEY DECISIONS: Auto-classification via keyword matching; usageCount
 * and weeklyCount for trending algorithm; isOfficial for curated tags.
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Category Classification
// PURPOSE: Auto-classify hashtags into broad categories by keyword
// ─────────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  fitness: ['workout', 'fitness', 'gym', 'lift', 'squat', 'deadlift', 'bench',
    'cardio', 'hiit', 'pr', 'personalrecord', 'transformation', 'gains',
    'legday', 'chestday', 'backday', 'armday', 'shoulderday', 'nutrition',
    'mealprep', 'macros', 'stretching', 'flexibility', 'mobility',
    'bootcamp', 'strength', 'endurance', 'bodyweight', 'nasm',
    'warmup', 'cooldown', 'recovery', 'protein', 'reps', 'sets'],
  creative: ['dance', 'choreography', 'music', 'beats', 'singing', 'vocals',
    'art', 'drawing', 'photography', 'gaming', 'streaming', 'comedy',
    'standup', 'skits', 'producer', 'hiphop', 'freestyle', 'cover',
    'original', 'digitalart', 'painting', 'film', 'video', 'content'],
  community: ['meetup', 'event', 'community', 'welcome', 'introduction',
    'accountability', 'goals', 'motivation', 'challenge', 'groupworkout',
    'swanfam', 'swanstudios', 'newmember', 'teamwork', 'support']
};

/**
 * Classify a hashtag name into a broad category.
 * Falls back to 'general' if no keyword match found.
 */
export function classifyHashtag(name) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'general';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Model Definition
// ─────────────────────────────────────────────────────────────
const Hashtag = db.define('Hashtag', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-z0-9_]{2,30}$/i
    },
    comment: 'Lowercase, alphanumeric + underscores, 2-30 chars'
  },
  slug: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: 'URL-safe version (same as name for hashtags)'
  },
  category: {
    type: DataTypes.ENUM('fitness', 'creative', 'community', 'general'),
    defaultValue: 'general',
    allowNull: false,
    comment: 'Auto-classified or admin-overridden broad category'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total number of posts using this hashtag'
  },
  weeklyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Posts this week — reset weekly for trending algorithm'
  },
  isOfficial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Admin-curated hashtags get special styling'
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Admin can ban inappropriate hashtags'
  }
}, {
  tableName: 'Hashtags',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['name'] },
    { unique: true, fields: ['slug'] },
    { fields: ['category'] },
    { fields: ['weeklyCount'] },
    { fields: ['usageCount'] }
  ]
});

export default Hashtag;
