import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class GalleryDonation extends Model {}

GalleryDonation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    visitorId: { type: DataTypes.INTEGER, allowNull: false, field: 'visitor_id' },
    eventId: { type: DataTypes.INTEGER, allowNull: false, field: 'event_id' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    method: {
      type: DataTypes.ENUM('stripe', 'venmo', 'zelle'),
      allowNull: false,
    },
    stripePaymentId: { type: DataTypes.STRING(255), allowNull: true, field: 'stripe_payment_id' },
    zelleConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'zelle_confirmed' },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'GalleryDonation',
    tableName: 'gallery_donations',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['visitor_id'] },
      { fields: ['event_id'] },
    ],
  }
);

GalleryDonation.associate = (models) => {
  GalleryDonation.belongsTo(models.GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
  GalleryDonation.belongsTo(models.GalleryEvent, { foreignKey: 'eventId', as: 'event' });
};

export default GalleryDonation;
