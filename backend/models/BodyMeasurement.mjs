import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class BodyMeasurement extends Model {
  // Instance methods can be added here
}

BodyMeasurement.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  recordedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  measurementDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
  },
  weightUnit: {
    type: DataTypes.ENUM('lbs', 'kg'),
    defaultValue: 'lbs',
  },
  bodyFatPercentage: {
    type: DataTypes.DECIMAL(4, 2),
  },
  muscleMassPercentage: {
    type: DataTypes.DECIMAL(4, 2),
  },
  bmi: {
    type: DataTypes.DECIMAL(4, 2),
  },
  circumferenceUnit: {
    type: DataTypes.ENUM('inches', 'cm'),
    defaultValue: 'inches',
  },
  neck: DataTypes.DECIMAL(4, 2),
  shoulders: DataTypes.DECIMAL(5, 2),
  chest: DataTypes.DECIMAL(5, 2),
  upperChest: DataTypes.DECIMAL(5, 2),
  underChest: DataTypes.DECIMAL(5, 2),
  rightBicep: DataTypes.DECIMAL(4, 2),
  leftBicep: DataTypes.DECIMAL(4, 2),
  rightForearm: DataTypes.DECIMAL(4, 2),
  leftForearm: DataTypes.DECIMAL(4, 2),
  naturalWaist: DataTypes.DECIMAL(5, 2),
  umbilicus: DataTypes.DECIMAL(5, 2),
  lowerWaist: DataTypes.DECIMAL(5, 2),
  hips: DataTypes.DECIMAL(5, 2),
  rightThigh: DataTypes.DECIMAL(5, 2),
  leftThigh: DataTypes.DECIMAL(5, 2),
  rightCalf: DataTypes.DECIMAL(4, 2),
  leftCalf: DataTypes.DECIMAL(4, 2),
  visceralFatLevel: DataTypes.INTEGER,
  metabolicAge: DataTypes.INTEGER,
  boneMass: DataTypes.DECIMAL(4, 2),
  waterPercentage: DataTypes.DECIMAL(4, 2),
  comparisonData: {
    type: DataTypes.JSONB,
    comment: 'Stores auto-calculated comparisons to historical data.',
  },
  hasProgress: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  progressScore: {
    type: DataTypes.INTEGER,
  },
  milestonesAchieved: {
    type: DataTypes.JSONB,
  },
  notes: DataTypes.TEXT,
  clientNotes: DataTypes.TEXT,
  measurementMethod: {
    type: DataTypes.ENUM('manual_tape', 'smart_scale', 'dexa_scan', 'caliper', 'import'),
  },
  photoUrls: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verifiedBy: DataTypes.UUID,
  verifiedAt: DataTypes.DATE,
}, {
  sequelize,
  modelName: 'BodyMeasurement',
  tableName: 'body_measurements',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'measurementDate'] },
    { fields: ['userId', 'createdAt'] },
  ],
});

export default BodyMeasurement;
