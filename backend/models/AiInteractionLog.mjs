/**
 * AiInteractionLog Model
 * ======================
 * Minimal audit trail for AI provider interactions.
 * Records what was sent (payload hash), what came back (output hash),
 * and the outcome — without storing raw PII.
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 * Phase 3A — Added promptVersion, tokenUsage columns for provider router
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AiInteractionLog extends Model {}

AiInteractionLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'FK to users table — who triggered this AI call',
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'AI provider name (e.g. "openai")',
    },
    model: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Model identifier (e.g. "gpt-4")',
    },
    requestType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of AI request (e.g. "workout_generation")',
    },
    payloadHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'SHA-256 hash of the de-identified payload sent to provider',
    },
    outputHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'SHA-256 hash of the provider response (null on failure)',
    },
    promptVersion: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Prompt template version (e.g. "1.0.0")',
    },
    tokenUsage: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Structured token usage: { inputTokens, outputTokens, totalTokens, estimatedCostUsd }',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Outcome: pending, success, degraded, parse_error, validation_error, pii_leak',
    },
    errorCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Error code if the call failed (e.g. "rate_limit", "timeout")',
    },
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Round-trip time in milliseconds',
    },
  },
  {
    sequelize,
    modelName: 'AiInteractionLog',
    tableName: 'ai_interaction_logs',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['requestType'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);

AiInteractionLog.associate = (models) => {
  AiInteractionLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
};

export default AiInteractionLog;
