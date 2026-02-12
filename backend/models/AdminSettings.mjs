// backend/models/AdminSettings.mjs
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
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Category key: 'system', 'notifications', 'security'
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AdminSettings',
    tableName: 'admin_settings',
    timestamps: true,
  }
);

export default AdminSettings;
