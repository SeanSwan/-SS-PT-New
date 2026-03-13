import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class GalleryPhoto extends Model {}

GalleryPhoto.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    eventId: { type: DataTypes.INTEGER, allowNull: false, field: 'event_id' },
    photoNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'photo_number' },
    displayName: { type: DataTypes.STRING(100), allowNull: false, field: 'display_name' },
    storageKey: { type: DataTypes.STRING(500), allowNull: false, field: 'storage_key' },
    thumbnailKey: { type: DataTypes.STRING(500), allowNull: true, field: 'thumbnail_key' },
    url: { type: DataTypes.TEXT, allowNull: false },
    thumbnailUrl: { type: DataTypes.TEXT, allowNull: true, field: 'thumbnail_url' },
    originalFilename: { type: DataTypes.STRING(500), allowNull: true, field: 'original_filename' },
    fileSize: { type: DataTypes.INTEGER, allowNull: true, field: 'file_size' },
    width: { type: DataTypes.INTEGER, allowNull: true },
    height: { type: DataTypes.INTEGER, allowNull: true },
    mimeType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'image/jpeg', field: 'mime_type' },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    enhancedStorageKey: { type: DataTypes.STRING(500), allowNull: true, field: 'enhanced_storage_key' },
    enhancedUrl: { type: DataTypes.TEXT, allowNull: true, field: 'enhanced_url' },
    enhancementRequestCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'enhancement_request_count' },
    mediumKey: { type: DataTypes.STRING(500), allowNull: true, field: 'medium_key' },
    mediumUrl: { type: DataTypes.TEXT, allowNull: true, field: 'medium_url' },
    thumbKey: { type: DataTypes.STRING(500), allowNull: true, field: 'thumb_key' },
  },
  {
    sequelize,
    modelName: 'GalleryPhoto',
    tableName: 'gallery_photos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['event_id', 'photo_number'], unique: true },
      { fields: ['event_id'] },
    ],
  }
);

GalleryPhoto.associate = (models) => {
  GalleryPhoto.belongsTo(models.GalleryEvent, { foreignKey: 'eventId', as: 'event' });
  GalleryPhoto.hasMany(models.EnhancementRequest, { foreignKey: 'photoId', as: 'enhancementRequests' });
};

export default GalleryPhoto;
