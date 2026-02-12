// backend/models/AdminSettings.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AdminSettings extends Model {}

AdminSettings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Store admin settings as JSON.
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Category key (e.g. 'system', 'notifications', 'security') or actual userId
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'AdminSettings',
    tableName: 'admin_settings',
    timestamps: true,
    underscored: true,
  }
);

export default AdminSettings;
