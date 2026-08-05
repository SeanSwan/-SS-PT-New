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
    comment: 'Owner user id (generic since S4/20260804120000 — any role; name kept as deprecated alias)',
  },
  ownerRole: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'trainer',
    validate: { isIn: [['trainer', 'client', 'user', 'admin']] },
    comment: 'Role of the owning user at creation time (S4 all-roles ownership)',
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
    // Partial + case-insensitive: only ACTIVE profiles are unique per trainer
    // on ("trainerId", lower("name")) — archived (soft-deleted) profile names
    // must be re-creatable. Managed by migration 20260712010000; expressed via
    // fn for documentation — the migration owns the schema.
    { fields: ['trainerId', sequelize.fn('lower', sequelize.col('name'))], unique: true, where: { isActive: true }, name: 'idx_equipment_profile_trainer_lower_name_active' },
    { fields: ['isActive'], name: 'idx_equipment_profile_active' },
    { fields: ['locationType'], name: 'idx_equipment_profile_type' },
  ],
});

export default EquipmentProfile;
