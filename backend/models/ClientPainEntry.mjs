/**
 * ClientPainEntry Model
 * =====================
 * Tracks client pain/injury reports for NASM CES + Squat University protocol integration.
 * Active entries are injected into AI workout generation prompts as safety constraints.
 *
 * Protocol references:
 * - NASM CES 4-Phase: Inhibit → Lengthen → Activate → Integrate
 * - Squat University 3-Step: Mobility → Stability → Integration
 * - Upper/Lower Crossed Syndrome detection
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientPainEntry extends Model {}

ClientPainEntry.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The client who has the pain/injury',
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Admin/trainer who recorded this entry',
  },
  bodyRegion: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Body region identifier (e.g., "left_quad", "lower_back", "right_shoulder")',
  },
  side: {
    type: DataTypes.ENUM('left', 'right', 'center', 'bilateral'),
    allowNull: false,
    defaultValue: 'center',
  },
  painLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 10 },
    comment: 'Pain severity 1-10 (1-3 mild, 4-6 moderate, 7-10 severe)',
  },
  painType: {
    type: DataTypes.ENUM('sharp', 'dull', 'aching', 'burning', 'tingling', 'numbness', 'stiffness', 'throbbing'),
    allowNull: true,
    comment: 'Type/quality of pain',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Client's own words describing the pain/discomfort",
  },
  onsetDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'When the pain/injury started',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this pain entry is currently active',
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the pain was marked as resolved',
  },
  aggravatingMovements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comma-separated movements that worsen pain (e.g., "squat, overhead press, running")',
  },
  relievingFactors: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comma-separated factors that reduce pain (e.g., "ice, stretching, rest")',
  },
  trainerNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal trainer/admin notes (NOT sent to AI)',
  },
  aiNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Guidance notes injected into AI prompt context',
  },
  posturalSyndrome: {
    type: DataTypes.ENUM('upper_crossed', 'lower_crossed', 'none'),
    allowNull: false,
    defaultValue: 'none',
    comment: 'Associated postural syndrome (UCS/LCS)',
  },
  assessmentFindings: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Structured assessment data: { testsPerformed, compensations, squidUniProtocol }',
  },
}, {
  sequelize,
  tableName: 'client_pain_entries',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['userId', 'isActive'], name: 'idx_pain_user_active' },
    { fields: ['bodyRegion'], name: 'idx_pain_body_region' },
  ],
});

export default ClientPainEntry;
