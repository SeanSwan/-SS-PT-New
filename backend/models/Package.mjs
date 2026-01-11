/**
 * Package Model
 * =============
 * Represents training packages that can be purchased by clients
 * Used by the Package Builder admin feature
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Package extends Model {
  // Model methods can be added here if needed
}

Package.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  frequency: {
    type: DataTypes.ENUM('one-time', 'weekly', 'monthly'),
    defaultValue: 'monthly'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Package',
  tableName: 'packages',
  timestamps: true
});

export default Package;
