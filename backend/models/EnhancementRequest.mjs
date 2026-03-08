import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class EnhancementRequest extends Model {}

EnhancementRequest.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    visitorId: { type: DataTypes.INTEGER, allowNull: false, field: 'visitor_id' },
    photoId: { type: DataTypes.INTEGER, allowNull: false, field: 'photo_id' },
    status: {
      type: DataTypes.ENUM('requested', 'in_progress', 'completed', 'delivered'),
      allowNull: false,
      defaultValue: 'requested',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
  },
  {
    sequelize,
    modelName: 'EnhancementRequest',
    tableName: 'gallery_enhancement_requests',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['visitor_id'] },
      { fields: ['photo_id'] },
      { fields: ['status'] },
    ],
  }
);

EnhancementRequest.associate = (models) => {
  EnhancementRequest.belongsTo(models.GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
  EnhancementRequest.belongsTo(models.GalleryPhoto, { foreignKey: 'photoId', as: 'photo' });
};

export default EnhancementRequest;
