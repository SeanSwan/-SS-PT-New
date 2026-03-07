/**
 * EquipmentItem Model
 * ===================
 * Individual pieces of equipment within a profile/location.
 * Can be added manually or via AI photo recognition (Gemini Flash Vision).
 *
 * AI scan workflow:
 *   1. Trainer photographs equipment
 *   2. Gemini Flash Vision identifies: name, category, bounding box
 *   3. Trainer approves/edits/rejects (approvalStatus field)
 *   4. Approved items become canonical equipment entries
 *
 * Associations:
 *   EquipmentProfile -> hasMany EquipmentItem
 *   EquipmentItem -> hasMany EquipmentExerciseMap
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class EquipmentItem extends Model {}

EquipmentItem.init({
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
    comment: 'Which equipment profile this belongs to',
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: 'Equipment name (AI-suggested or trainer-entered)',
  },
  trainerLabel: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Custom name if different from AI suggestion',
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'other',
    validate: {
      isIn: [[
        'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
        'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
        'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx', 'other'
      ]]
    },
    comment: 'Equipment category for filtering and exercise mapping',
  },
  resistanceType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      isIn: [['bodyweight', 'dumbbell', 'barbell', 'cable', 'band', 'machine', 'kettlebell', 'other']]
    },
    comment: 'Resistance classification for variation engine',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'What this equipment does (AI pre-fills, trainer edits)',
  },
  photoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Photo of the equipment',
  },
  aiScanData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Raw AI scan result: { confidence, boundingBox: {x,y,w,h}, suggestedName, suggestedCategory, rawResponse }',
  },
  approvalStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'manual',
    validate: { isIn: [['pending', 'approved', 'rejected', 'manual']] },
    comment: 'AI scan approval workflow status',
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When trainer approved the AI suggestion',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Soft-delete flag',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'How many of this item exist at the location',
  },
}, {
  sequelize,
  tableName: 'equipment_items',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['profileId'], name: 'idx_equipment_item_profile' },
    { fields: ['profileId', 'name'], unique: true, name: 'idx_equipment_item_profile_name' },
    { fields: ['category'], name: 'idx_equipment_item_category' },
    { fields: ['approvalStatus'], name: 'idx_equipment_item_approval' },
    { fields: ['isActive'], name: 'idx_equipment_item_active' },
  ],
});

export default EquipmentItem;
