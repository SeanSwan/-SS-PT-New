/**
 * VideoCollectionItem Model — M:N Join (Collection <-> Video)
 * ===========================================================
 * Links videos to collections with explicit sort ordering.
 * No soft-delete — rows are hard-deleted when removed.
 * timestamps: false (only has addedAt).
 *
 * Table: video_collection_items
 *
 * Associations are defined externally in associations.mjs.
 */

import { DataTypes, Model } from 'sequelize';
import db from '../database.mjs';

class VideoCollectionItem extends Model {}

VideoCollectionItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    collectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'video_collections', key: 'id' },
    },
    videoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'video_catalog', key: 'id' },
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    modelName: 'VideoCollectionItem',
    tableName: 'video_collection_items',
    timestamps: false, // Only addedAt, no createdAt/updatedAt
  }
);

export default VideoCollectionItem;
