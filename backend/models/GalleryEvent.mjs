import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class GalleryEvent extends Model {}

GalleryEvent.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    sport: { type: DataTypes.STRING(100), allowNull: true },
    eventDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'event_date' },
    location: { type: DataTypes.STRING(255), allowNull: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
    coverPhotoId: { type: DataTypes.INTEGER, allowNull: true, field: 'cover_photo_id' },
    photoCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'photo_count' },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_published' },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'GalleryEvent',
    tableName: 'gallery_events',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['is_published'] },
      { fields: ['event_date'] },
    ],
  }
);

GalleryEvent.associate = (models) => {
  GalleryEvent.hasMany(models.GalleryPhoto, { foreignKey: 'eventId', as: 'photos' });
  GalleryEvent.hasMany(models.GalleryVisitor, { foreignKey: 'eventId', as: 'visitors' });
  GalleryEvent.hasMany(models.GalleryDonation, { foreignKey: 'eventId', as: 'donations' });
  GalleryEvent.hasMany(models.GalleryReferral, { foreignKey: 'eventId', as: 'referrals' });
  GalleryEvent.belongsTo(models.GalleryPhoto, { foreignKey: 'coverPhotoId', as: 'coverPhoto', constraints: false });
};

export default GalleryEvent;
