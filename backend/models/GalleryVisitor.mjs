import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class GalleryVisitor extends Model {}

GalleryVisitor.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: true, field: 'first_name' },
    lastName: { type: DataTypes.STRING(100), allowNull: true, field: 'last_name' },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    eventId: { type: DataTypes.INTEGER, allowNull: false, field: 'event_id' },
    newsletterOptIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'newsletter_opt_in' },
    parentalConsent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'parental_consent' },
    source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'gallery' },
    enhancementCredits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'enhancement_credits' },
    isVip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_vip' },
    freeEnhancementsUsed: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'free_enhancements_used' },
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id', comment: 'Links gallery visitor to a SwanStudios user account (VIP conversion)' },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
    country: { type: DataTypes.STRING(100), allowNull: true },
    countryCode: { type: DataTypes.STRING(2), allowNull: true, field: 'country_code' },
    region: { type: DataTypes.STRING(100), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lon: { type: DataTypes.FLOAT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'GalleryVisitor',
    tableName: 'gallery_visitors',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['event_id'] },
      { fields: ['email', 'event_id'], unique: true },
    ],
  }
);

GalleryVisitor.associate = (models) => {
  GalleryVisitor.belongsTo(models.GalleryEvent, { foreignKey: 'eventId', as: 'event' });
  GalleryVisitor.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  GalleryVisitor.hasMany(models.EnhancementRequest, { foreignKey: 'visitorId', as: 'enhancementRequests' });
  GalleryVisitor.hasMany(models.GalleryDonation, { foreignKey: 'visitorId', as: 'donations' });
  GalleryVisitor.hasMany(models.GalleryReferral, { foreignKey: 'visitorId', as: 'referrals' });
};

export default GalleryVisitor;
