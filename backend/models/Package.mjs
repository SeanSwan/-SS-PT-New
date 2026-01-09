/**
 * Package Model
 * =============
 * Represents training packages that can be purchased by clients
 * Used by the Package Builder admin feature
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

export default (sequelizeInstance = sequelize) => {
  const Package = sequelizeInstance.define('Package', {
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
    timestamps: true,
    tableName: 'packages'
  });

  // Define associations method (called by associations.mjs)
  Package.associate = (models) => {
    Package.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return Package;
};