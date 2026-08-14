/**
 * RenewalAlert — churn-risk queue (SWA-138 S10).
 *
 * CONVENTION NOTE (2026-08-13): this file used to export a FACTORY,
 * `export default (sequelize) => {...}`, while ~150 sibling models import
 * sequelize themselves and export the model instance. associations.mjs only
 * knows the instance form, so this model could never be registered through it —
 * and it never was. getModel('RenewalAlert') therefore THREW on every call,
 * which killed /api/renewal-alerts (500) and made the automation cron's renewal
 * tick swallow an error every run. A model file, a migration, a service, a
 * controller, mounted routes and a cron, and the feature could not work.
 *
 * Converted to the dominant convention so the registry can hold it. Nothing
 * imported the factory form (the only reference in the repo was the
 * registration added alongside this change), so the conversion has no other
 * caller to break.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class RenewalAlert extends Model {}

RenewalAlert.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  sessionsRemaining: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lastSessionDate: {
    type: DataTypes.DATE,
  },
  daysSinceLastSession: {
    type: DataTypes.INTEGER,
  },
  urgencyScore: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 10,
    },
  },
  status: {
    type: DataTypes.ENUM('active', 'contacted', 'renewed', 'dismissed'),
    defaultValue: 'active',
  },
  contactedAt: {
    type: DataTypes.DATE,
  },
  contactedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  notes: {
    type: DataTypes.TEXT,
  },
  renewedAt: {
    type: DataTypes.DATE,
  },
  dismissedAt: {
    type: DataTypes.DATE,
  },
}, {
  sequelize,
  modelName: 'RenewalAlert',
  tableName: 'renewal_alerts',
  timestamps: true,
});

export default RenewalAlert;
