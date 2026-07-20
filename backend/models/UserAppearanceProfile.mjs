/**
 * ============================================================================
 * FILE: UserAppearanceProfile.mjs — FUSION F1 (lens-world-fusion blueprint)
 * PURPOSE: One row per user carrying the committed Smart Lens appearance
 * profile (and, from F4, the bounded style overlay) so a member's look
 * follows them across devices.
 * ============================================================================
 * WHAT THIS FILE DOES: Sequelize model for `user_appearance_profiles`.
 * KEY DECISIONS: `profile` is validated JSONB mirroring the frontend
 * AppearanceProfile shape (profileSchemaVersion NUMBER 1, motionMode
 * auto|reduced|off) — validation lives in the controller so the model stays
 * a dumb store; NO separate schemaVersion column (it lives inside profile);
 * FK references the PascalCase "Users" table (dual-table production gotcha).
 * PRIVACY: ids/enums only — no PII ever enters this table.
 * ============================================================================
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class UserAppearanceProfile extends Model {}

UserAppearanceProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    profile: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Validated AppearanceProfile JSON (carries profileSchemaVersion: number 1 inside)',
    },
    overlay: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'F4 UserStyleOverlay JSON (bounded enum keys only); null until the Style Studio ships',
    },
  },
  {
    sequelize,
    modelName: 'UserAppearanceProfile',
    tableName: 'user_appearance_profiles',
    timestamps: true,
  },
);

export default UserAppearanceProfile;
