/**
 * CoachIntent Model
 * =================
 * Durable, PII-free receipt for one Swan Coach command intent.
 *
 * AiCommandAuditLog remains append-only telemetry. This table owns the mutable
 * lifecycle needed to distinguish claimed, completed, failed, and unknown
 * outcomes after a lost response. `actorId + requestKey` is unique so a retry
 * can replay a receipt without dispatching the domain effect twice.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CoachIntent extends Model {}

CoachIntent.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  actorId: { type: DataTypes.INTEGER, allowNull: false },
  requestKey: { type: DataTypes.STRING(128), allowNull: false },
  requestHash: { type: DataTypes.STRING(64), allowNull: false },
  commandType: { type: DataTypes.STRING(100), allowNull: false },
  targetClientId: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'claimed',
    validate: { isIn: [['claimed', 'completed', 'failed', 'unknown', 'cancelled']] },
  },
  operationId: { type: DataTypes.STRING(64), allowNull: true },
  proposalId: { type: DataTypes.STRING(64), allowNull: true },
  result: { type: DataTypes.JSONB, allowNull: true },
  errorCode: { type: DataTypes.STRING(100), allowNull: true },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'CoachIntent',
  tableName: 'coach_intents',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['actorId', 'requestKey'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['operationId'] },
  ],
});

CoachIntent.associate = (models) => {
  CoachIntent.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor' });
};

export default CoachIntent;
