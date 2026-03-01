/**
 * AiMonitoringAlert Model — Phase 10
 * ====================================
 * Threshold-crossing events with active/resolved/acknowledged lifecycle.
 * Created by the alert engine when metrics exceed configurable thresholds.
 * Auto-resolved when the condition clears.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AiMonitoringAlert extends Model {}

AiMonitoringAlert.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    alertType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Alert type (e.g. "high_error_rate", "high_latency", "token_budget")',
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'critical'),
      allowNull: false,
      comment: 'Alert severity level',
    },
    feature: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'AI feature name (null for system-wide alerts)',
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Human-readable alert description',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Structured data: threshold value, current value, etc.',
    },
    status: {
      type: DataTypes.ENUM('active', 'resolved', 'acknowledged'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Alert lifecycle status',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when alert was resolved',
    },
  },
  {
    sequelize,
    modelName: 'AiMonitoringAlert',
    tableName: 'ai_monitoring_alerts',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['alertType', 'status'] },
      { fields: ['feature', 'status'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default AiMonitoringAlert;
