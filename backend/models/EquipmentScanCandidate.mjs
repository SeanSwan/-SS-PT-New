/**
 * EquipmentScanCandidate Model
 * ============================
 * Durable child ledger for each detected, duplicate, or possible scan item.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class EquipmentScanCandidate extends Model {}

EquipmentScanCandidate.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'equipment_scan_sessions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  profileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'equipment_profiles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  equipmentItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'equipment_items', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  duplicateOfItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'equipment_items', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  candidateIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['created_item', 'duplicate', 'possible', 'approved', 'rejected']] },
  },
  suggestedName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  suggestedCategory: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  resistanceType: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  visibility: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  boundingBox: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  dedupeKey: {
    type: DataTypes.STRING(180),
    allowNull: true,
  },
  matchType: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  candidateData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  trainerCorrection: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'equipment_scan_candidates',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['sessionId'], name: 'idx_equipment_scan_candidate_session' },
    { fields: ['profileId'], name: 'idx_equipment_scan_candidate_profile' },
    { fields: ['equipmentItemId'], name: 'idx_equipment_scan_candidate_item' },
    { fields: ['duplicateOfItemId'], name: 'idx_equipment_scan_candidate_duplicate' },
    { fields: ['status'], name: 'idx_equipment_scan_candidate_status' },
    { fields: ['reviewedBy'], name: 'idx_equipment_scan_candidate_reviewer' },
    { fields: ['reviewedAt'], name: 'idx_equipment_scan_candidate_reviewed_at' },
    { fields: ['dedupeKey'], name: 'idx_equipment_scan_candidate_dedupe' },
  ],
});

export default EquipmentScanCandidate;