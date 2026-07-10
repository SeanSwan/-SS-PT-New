/**
 * NutritionSourceRecord
 * Universal provenance record for one reviewed nutrition draft. The unique
 * userId + draftId pair is the idempotency boundary for atomic diary writes.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class NutritionSourceRecord extends Model {}

NutritionSourceRecord.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'nutrition_source_records_user_draft_unique',
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  loggedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  draftId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: 'nutrition_source_records_user_draft_unique',
  },
  contractVersion: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: '1.0',
  },
  source: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  sourceLabel: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  sourceConfidence: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'community',
    validate: {
      isIn: [['verified', 'provider', 'community', 'ai_estimate']],
    },
  },
  confidenceScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 1 },
  },
  workoutProximity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'none',
    validate: {
      isIn: [['none', 'pre_workout', 'intra_workout', 'post_workout']],
    },
  },
  rawPayloadRef: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Provider identifiers only; never a full raw provider payload.',
  },
  payloadDigest: {
    type: DataTypes.STRING(64),
    allowNull: true,
    validate: { is: /^[a-f0-9]{64}$/i },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'processing',
    validate: { isIn: [['processing', 'committed']] },
  },
  entryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'NutritionSourceRecord',
  tableName: 'nutrition_source_records',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['source', 'createdAt'] },
  ],
});

export default NutritionSourceRecord;
