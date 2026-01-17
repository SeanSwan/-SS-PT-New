import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientNote extends Model {}

ClientNote.init(
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
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    relatedSessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sessions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    noteType: {
      type: DataTypes.ENUM('observation', 'red_flag', 'achievement', 'concern', 'general'),
      allowNull: false,
      defaultValue: 'general',
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tagsJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    visibility: {
      type: DataTypes.ENUM('private', 'trainer_only', 'admin_only'),
      allowNull: false,
      defaultValue: 'trainer_only',
    },
  },
  {
    sequelize,
    modelName: 'ClientNote',
    tableName: 'client_notes',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['trainerId'] },
      { fields: ['noteType'] },
    ],
  }
);

ClientNote.associate = (models) => {
  ClientNote.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  ClientNote.belongsTo(models.User, { foreignKey: 'trainerId', as: 'trainer' });
  ClientNote.belongsTo(models.Session, { foreignKey: 'relatedSessionId', as: 'session' });
};

export default ClientNote;
