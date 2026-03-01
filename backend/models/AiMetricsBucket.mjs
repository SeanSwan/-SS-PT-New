/**
 * AiMetricsBucket Model — Phase 10
 * ==================================
 * Pre-aggregated AI metrics bucketed by feature + granularity (hourly/daily).
 * Counters are updated atomically via raw SQL UPSERT — no read-modify-write races.
 *
 * Unique users are tracked in a separate ai_metrics_bucket_users table
 * (bucketId + userId UNIQUE constraint) to avoid JSONB concurrency issues.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AiMetricsBucket extends Model {}

AiMetricsBucket.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    feature: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'AI feature name (e.g. "workoutGeneration", "longHorizonGeneration")',
    },
    granularity: {
      type: DataTypes.ENUM('hourly', 'daily'),
      allowNull: false,
      comment: 'Bucket time granularity',
    },
    bucketStart: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Truncated hour/day timestamp for this bucket',
    },
    totalRequests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    successCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalTokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    sumResponseTime: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Sum of all response times in ms (divide by totalRequests for avg)',
    },
    minResponseTime: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Minimum response time in ms for this bucket',
    },
    maxResponseTime: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Maximum response time in ms for this bucket',
    },
  },
  {
    sequelize,
    modelName: 'AiMetricsBucket',
    tableName: 'ai_metrics_buckets',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['feature', 'granularity', 'bucketStart'] },
      { fields: ['feature', 'granularity'] },
      { fields: ['bucketStart'] },
      { fields: ['feature', 'bucketStart'] },
    ],
  }
);

export default AiMetricsBucket;
