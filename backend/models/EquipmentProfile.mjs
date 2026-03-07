/**
 * EquipmentProfile Model
 * ======================
 * Location-based equipment inventories for trainers.
 * Default profiles (Move Fitness, Park, Home Gym, Client Home) are built-in.
 * Trainers can create unlimited custom profiles (e.g., "Hotel Gym", "John's Home").
 *
 * Associations:
 *   User (trainer) -> hasMany EquipmentProfile
 *   EquipmentProfile -> hasMany EquipmentItem
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class EquipmentProfile extends Model {}

EquipmentProfile.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Trainer who owns this equipment profile',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Profile name (e.g., "Move Fitness", "Park / Outdoor")',
  },
  locationType: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'custom',
    validate: { isIn: [['gym', 'park', 'home', 'client_home', 'custom']] },
    comment: 'Location category for filtering',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes about this location',
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Physical address of the location',
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Built-in profiles cannot be deleted',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Soft-delete flag',
  },
  equipmentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Cached count of approved equipment items',
  },
  coverPhotoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Photo of the location/gym',
  },
}, {
  sequelize,
  tableName: 'equipment_profiles',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['trainerId'], name: 'idx_equipment_profile_trainer' },
    { fields: ['trainerId', 'name'], unique: true, name: 'idx_equipment_profile_trainer_name' },
    { fields: ['isActive'], name: 'idx_equipment_profile_active' },
    { fields: ['locationType'], name: 'idx_equipment_profile_type' },
  ],
});

export default EquipmentProfile;
