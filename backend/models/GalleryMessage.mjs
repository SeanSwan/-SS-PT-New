import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class GalleryMessage extends Model {}

GalleryMessage.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    visitorId: { type: DataTypes.INTEGER, allowNull: true, field: 'visitor_id' },
    eventId: { type: DataTypes.INTEGER, allowNull: true, field: 'event_id' },
    email: { type: DataTypes.STRING(255), allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: true, field: 'first_name' },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
    readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
  },
  {
    sequelize,
    modelName: 'GalleryMessage',
    tableName: 'gallery_messages',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['visitor_id'] },
      { fields: ['event_id'] },
      { fields: ['email'] },
      { fields: ['is_read'] },
    ],
  }
);

GalleryMessage.associate = (models) => {
  GalleryMessage.belongsTo(models.GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
  GalleryMessage.belongsTo(models.GalleryEvent, { foreignKey: 'eventId', as: 'event' });
};

export default GalleryMessage;
