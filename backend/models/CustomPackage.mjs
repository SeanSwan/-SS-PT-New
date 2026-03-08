// /backend/models/CustomPackage.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * CustomPackage Model — "SwanStudios Special"
 *
 * Admin-created per-client custom packages that appear only in that
 * specific client's store page. Includes pricing guardrails:
 * - Base price per session: $175 minimum
 * - Warning threshold: $120/hr effective rate
 * - Absolute minimum: $100/hr effective rate
 * - Approval required below $120/hr
 */
class CustomPackage extends Model {}

CustomPackage.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Which client this package is for (FK → Users)
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Which admin created this (FK → Users)
  createdByAdminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Base package template used (e.g., '10-pack', '24-pack', '6-month', '12-month', 'express')
  basePackageType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: {
        args: [['10-pack', '24-pack', '3-month', '6-month', '12-month', 'express']],
        msg: 'Invalid base package type'
      }
    }
  },
  // Display name (default: "SwanStudios Special")
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'SwanStudios Special',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Total paid sessions in the package
  paidSessions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  // Free bonus sessions added by admin
  bonusSessions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  },
  // Total sessions (paid + bonus)
  totalSessions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  // Price per session for the PAID sessions
  pricePerSession: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: [100],
        msg: 'Price per session cannot be below $100 (absolute minimum)'
      }
    }
  },
  // Total price (paidSessions × pricePerSession)
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  // Effective rate per hour including bonus sessions: totalPrice / totalSessions
  effectiveHourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  // Whether admin approved going below $120/hr threshold
  belowThresholdApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Admin's note about the deal
  adminNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Status: active (visible to client), redeemed, expired, cancelled
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: {
        args: [['active', 'redeemed', 'expired', 'cancelled']],
        msg: 'Invalid status'
      }
    }
  },
  // When the package expires (optional)
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Reference to storefront item if this was linked to one
  storefrontItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'CustomPackage',
  tableName: 'custom_packages',
  timestamps: true,
  hooks: {
    beforeValidate: (pkg) => {
      // Auto-calculate totalSessions
      pkg.totalSessions = (pkg.paidSessions || 0) + (pkg.bonusSessions || 0);
      // Auto-calculate totalPrice
      pkg.totalPrice = (pkg.paidSessions || 0) * parseFloat(pkg.pricePerSession || 0);
      // Auto-calculate effective hourly rate
      if (pkg.totalSessions > 0) {
        pkg.effectiveHourlyRate = parseFloat(pkg.totalPrice) / pkg.totalSessions;
      }
    }
  }
});

export default CustomPackage;
