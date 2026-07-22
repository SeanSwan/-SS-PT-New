import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class GalleryReferral extends Model {}

GalleryReferral.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    visitorId: { type: DataTypes.INTEGER, allowNull: false, field: 'visitor_id' },
    eventId: { type: DataTypes.INTEGER, allowNull: false, field: 'event_id' },
    referralName: { type: DataTypes.STRING(200), allowNull: false, field: 'referral_name' },
    referralPhone: { type: DataTypes.STRING(50), allowNull: false, field: 'referral_phone' },
    // Digits-only normalization of referralPhone — DB has a partial UNIQUE index on
    // (visitor_id, event_id, referral_phone_norm) so formatting tricks can't bypass dedup (survey fix #1).
    referralPhoneNorm: { type: DataTypes.STRING(20), allowNull: true, field: 'referral_phone_norm' },
    referralEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'referral_email' },
    contacted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    converted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'GalleryReferral',
    tableName: 'gallery_referrals',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['visitor_id'] },
      { fields: ['event_id'] },
    ],
  }
);

GalleryReferral.associate = (models) => {
  GalleryReferral.belongsTo(models.GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
  GalleryReferral.belongsTo(models.GalleryEvent, { foreignKey: 'eventId', as: 'event' });
};

export default GalleryReferral;
