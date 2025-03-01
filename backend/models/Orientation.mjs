// backend/models/Orientation.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.js';

/**
 * Orientation Model
 * Stores orientation signup information following NASM protocols.
 * Fields include:
 *  - fullName, email, phone, healthInfo, waiverInitials: Essential signup data.
 *  - trainingGoals, experienceLevel: Additional details from the orientation form.
 *  - userId: Foreign key to associate this record with a registered user.
 */
class Orientation extends Model {}

Orientation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    healthInfo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    waiverInitials: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trainingGoals: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    experienceLevel: {
      type: DataTypes.ENUM('Beginner', 'Intermediate', 'Advanced'),
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Orientation',
    tableName: 'orientations',
    timestamps: true,
  }
);

export default Orientation;

