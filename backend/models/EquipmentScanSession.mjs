/**
 * EquipmentScanSession Model
 * ==========================
 * Durable parent ledger for one AI equipment scan review pass.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class EquipmentScanSession extends Model {}

EquipmentScanSession.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  profileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'equipment_profiles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  photoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  schemaVersion: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  promptVersion: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  imageQuality: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  sceneSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  latencyMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  candidateCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  reviewableCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  possibleItemCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  duplicateCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  createdItemCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  approvedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  rejectedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pending_review',
    validate: { isIn: [['pending_review', 'reviewed', 'failed']] },
  },
  rawResponse: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'equipment_scan_sessions',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['profileId'], name: 'idx_equipment_scan_session_profile' },
    { fields: ['trainerId'], name: 'idx_equipment_scan_session_trainer' },
    { fields: ['status'], name: 'idx_equipment_scan_session_status' },
    { fields: ['createdAt'], name: 'idx_equipment_scan_session_created' },
  ],
});

export default EquipmentScanSession;