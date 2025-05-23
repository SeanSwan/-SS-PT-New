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
    // UserID as foreign key to User model
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
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
