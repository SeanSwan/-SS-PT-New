/**
 * AiPrivacyProfile Model
 * ======================
 * Per-user AI consent state for privacy governance.
 * Tracks whether a user has consented to AI-powered features,
 * which consent version they agreed to, and withdrawal state.
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AiPrivacyProfile extends Model {}

AiPrivacyProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'FK to users table — one profile per user',
    },
    aiEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether user has opted in to AI-powered features',
    },
    consentVersion: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Version of consent terms the user agreed to (e.g. "1.0")',
    },
    consentedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when consent was granted',
    },
    withdrawnAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when consent was withdrawn (null = active consent)',
    },
  },
  {
    sequelize,
    modelName: 'AiPrivacyProfile',
    tableName: 'ai_privacy_profiles',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
    ],
  }
);

AiPrivacyProfile.associate = (models) => {
  AiPrivacyProfile.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
};

export default AiPrivacyProfile;
