// backend/models/Orientation.js
import { DataTypes, Model } from 'sequelize';
import sequelize from './../database.js';

/**
 * Orientation Model
 * Stores orientation signup information following NASM protocols.
 * Fields:
 *  - fullName: User's full name.
 *  - email: User's email address.
 *  - phone: User's phone number.
 *  - healthInfo: Important health details.
 *  - waiverInitials: User's initials as a waiver confirmation.
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
  },
  {
    sequelize,
    modelName: 'Orientation',
    tableName: 'orientations',
    timestamps: true,
  }
);

export default Orientation;
