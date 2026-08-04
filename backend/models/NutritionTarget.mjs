/**
 * ============================================================================
 * FILE: NutritionTarget.mjs
 * PURPOSE: Per-client daily nutrition targets — the adherence denominator (S1.1)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * WHAT THIS FILE DOES: One row per target version. Exactly ONE 'active' row
 * per user (partial unique index); history is kept via supersession — when a
 * new target activates, the previous active row gets status='superseded' and
 * effectiveTo set, in the same transaction. Ranges therefore cannot overlap
 * by construction (no gist EXCLUDE / extension dependency needed).
 *
 * WHY A NEW TABLE: ClientNutritionPlan is a write-once document container with
 * drifted migrations and JSONB baggage; targets need versioning, attribution,
 * activation state, and a race-safe uniqueness guarantee. The blueprint demotes
 * ClientNutritionPlan to the meals/grocery document; THIS table is what
 * /api/macros/summary reads as the goal.
 *
 * ACTIVATION LAW: LLM-produced targets are ALWAYS created as status='draft'
 * and become active only through a human activation (Kimi P0-3: the model
 * proposes, a human activates). nutritionTargetService is the single writer.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class NutritionTarget extends Model {}

NutritionTarget.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  dailyCalories: { type: DataTypes.INTEGER, allowNull: true },
  proteinGrams: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
  carbsGrams: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
  fatGrams: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
  fiberGrams: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
  sodiumLimitMg: { type: DataTypes.INTEGER, allowNull: true },
  hydrationTargetLiters: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
  effectiveFrom: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'User-local calendar date this target takes effect',
  },
  effectiveTo: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Set at supersession; null while open-ended',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [['draft', 'active', 'superseded', 'rejected']] },
  },
  source: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'manual',
    validate: { isIn: [['manual', 'ai_generated']] },
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    comment: 'Author (trainer/admin, or the approving human for AI drafts)',
  },
  activatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    comment: 'The HUMAN who activated this target; null while draft',
  },
  activatedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'NutritionTarget',
  tableName: 'nutrition_targets',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status'] },
    { fields: ['userId', 'effectiveFrom'] },
    {
      // Race-safe one-active-per-user law: concurrent activations collide here
      // instead of producing two competing adherence denominators.
      fields: ['userId'],
      unique: true,
      name: 'nutrition_targets_one_active_per_user',
      where: { status: 'active' },
    },
  ],
});

export default NutritionTarget;
