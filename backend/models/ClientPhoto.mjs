import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientPhoto extends Model {}

ClientPhoto.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    takenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    storageKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    photoType: {
      type: DataTypes.ENUM('front', 'side', 'back', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    tagsJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    aiAnalysisJson: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private', 'trainer_only'),
      allowNull: false,
      defaultValue: 'private',
    },
  },
  {
    sequelize,
    modelName: 'ClientPhoto',
    tableName: 'client_photos',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['takenAt'] },
    ],
  }
);

ClientPhoto.associate = (models) => {
  ClientPhoto.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  ClientPhoto.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploadedByUser' });
};

export default ClientPhoto;
