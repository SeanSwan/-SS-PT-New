/**
 * ============================================================================
 * FILE: PostHashtag.mjs
 * PURPOSE: Join table linking SocialPosts to Hashtags (many-to-many)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Enables posts to have multiple hashtags and hashtags
 * to be associated with multiple posts.
 * HOW IT FITS IN THE APP: SocialPost ←→ PostHashtag ←→ Hashtag
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Model Definition
// PURPOSE: Many-to-many join between SocialPosts and Hashtags
// ─────────────────────────────────────────────────────────────
const PostHashtag = db.define('PostHashtag', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'SocialPosts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  hashtagId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Hashtags',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'PostHashtags',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['postId', 'hashtagId'] },
    { fields: ['postId'] },
    { fields: ['hashtagId'] }
  ]
});

export default PostHashtag;
