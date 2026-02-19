/**
 * VideoCollection Model — Playlists / Series / Courses
 * =====================================================
 * Organises videos into ordered collections with visibility
 * and access-tier gating.  Soft-deletable (paranoid).
 *
 * Table: video_collections
 *
 * Associations are defined externally in associations.mjs.
 */

import { DataTypes, Model } from 'sequelize';
import db from '../database.mjs';

class VideoCollection extends Model {}

VideoCollection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(300),
      allowNull: false,
      comment: 'URL-safe slug; uniqueness enforced via partial index (WHERE deletedAt IS NULL)',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('playlist', 'series', 'course'),
      allowNull: false,
      defaultValue: 'playlist',
    },
    visibility: {
      type: DataTypes.ENUM('public', 'members_only', 'unlisted'),
      allowNull: false,
      defaultValue: 'public',
    },
    accessTier: {
      type: DataTypes.ENUM('free', 'member', 'premium'),
      allowNull: false,
      defaultValue: 'free',
    },
    thumbnailKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'R2 object key — signed at read time, never stored as URL',
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    modelName: 'VideoCollection',
    tableName: 'video_collections',
    timestamps: true,
    paranoid: true, // deletedAt for soft-delete
  }
);

export default VideoCollection;
