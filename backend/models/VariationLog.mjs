/**
 * VariationLog Model
 * ==================
 * Phase 8: Tracks BUILD vs SWITCH rotation per workout session.
 *
 * The 2-Week Rotation Principle:
 *   BUILD -> BUILD -> SWITCH -> BUILD -> BUILD -> SWITCH...
 *
 * BUILD workouts: Same exercises (progressive overload, strength building)
 * SWITCH workouts: Different exercises targeting SAME muscles (shock the system)
 *
 * Associations:
 *   User (client) -> hasMany VariationLog
 *   WorkoutTemplate -> hasMany VariationLog (optional)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class VariationLog extends Model {}

VariationLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Client this rotation applies to',
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Trainer who manages this rotation',
  },
  templateCategory: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Body part category (e.g., "chest", "back", "legs", "full_body")',
  },
  sessionType: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['build', 'switch']] },
    comment: 'Whether this was a BUILD or SWITCH session',
  },
  rotationPattern: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'standard',
    validate: { isIn: [['standard', 'aggressive', 'conservative']] },
    comment: 'Rotation pattern: standard (2:1), aggressive (1:1), conservative (3:1)',
  },
  sessionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Session number within current rotation cycle',
  },
  exercisesUsed: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of exercise keys used in this session',
  },
  swapDetails: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'For SWITCH sessions: [{ original, replacement, muscleMatch, nasmConfidence }]',
  },
  equipmentProfileId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'equipment_profiles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Equipment profile used for this session',
  },
  nasmPhase: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'NASM OPT phase for this session (1-5)',
  },
  sessionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When this session occurred',
  },
  accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the trainer accepted the AI suggestions',
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'variation_logs',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['clientId'], name: 'idx_variation_log_client' },
    { fields: ['trainerId'], name: 'idx_variation_log_trainer' },
    { fields: ['clientId', 'templateCategory'], name: 'idx_variation_log_client_category' },
    { fields: ['sessionDate'], name: 'idx_variation_log_date' },
    { fields: ['sessionType'], name: 'idx_variation_log_type' },
  ],
});

export default VariationLog;
