// backend/models/AdminSettings.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.js';

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
  },
  {
    sequelize,
    modelName: 'AdminSettings',
    tableName: 'admin_settings',
    timestamps: true,
  }
);

export default AdminSettings;
