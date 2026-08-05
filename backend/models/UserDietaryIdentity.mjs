/**
 * ============================================================================
 * FILE: UserDietaryIdentity.mjs
 * PURPOSE: USER-scoped allergy/restriction record — kills the fail-open (SWA-71 P0)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * WHY: allergies previously lived ONLY on ClientNutritionPlan as JSONB with
 * defaultValue [] — "no allergies" was indistinguishable from "never asked",
 * on a gate whose failure mode is anaphylaxis, and a client with no plan had
 * no allergy record anywhere. This table is the single user-scoped truth.
 *
 * TRI-STATE LAW (fail-closed):
 *   - NO ROW for a user            => never asked. Consumers MUST treat this
 *     as UNKNOWN, never as "no allergies".
 *   - row, allergiesDeclared=false => asked, declaration not completed (same
 *     as unknown for safety purposes; restrictions may still be recorded).
 *   - row, allergiesDeclared=true  => explicit declaration; allergies:[] now
 *     MEANS "declared none" because a human said so, with provenance.
 *
 * PRIVACY: allergen entries carry canonical taxonomy slugs stored PLAINTEXT BY
 * DESIGN — encrypting them would break deterministic ingredient matching, the
 * entire point (documented tradeoff; free-text rawText on uncoded entries is
 * the only free text and is length-capped at the taxonomy layer).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class UserDietaryIdentity extends Model {}

UserDietaryIdentity.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  allergiesDeclared: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'true only after an explicit human declaration; [] is meaningless without it',
  },
  allergies: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of { allergen: taxonomy-slug, label, rawText|null } from allergenTaxonomy',
  },
  dietaryRestrictions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of restriction strings (Vegetarian, Halal, ...)',
  },
  captureSource: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'client_settings',
    validate: { isIn: [['onboarding', 'trainer', 'client_settings', 'migration']] },
  },
  capturedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    comment: 'Who recorded the declaration (self or trainer/admin)',
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time a human confirmed this record is current',
  },
}, {
  sequelize,
  modelName: 'UserDietaryIdentity',
  tableName: 'user_dietary_identities',
  timestamps: true,
  indexes: [{ fields: ['userId'], unique: true }],
});

export default UserDietaryIdentity;
