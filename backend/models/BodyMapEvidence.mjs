import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class BodyMapEvidence extends Model {}

BodyMapEvidence.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  painEntryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'client_pain_entries', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  uploadedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  mediaKey: { type: DataTypes.TEXT, allowNull: false },
  thumbnailKey: { type: DataTypes.TEXT, allowNull: true },
  originalFilename: { type: DataTypes.STRING(255), allowNull: true },
  mimeType: { type: DataTypes.STRING(80), allowNull: false },
  fileSize: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  mediaType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'image',
    validate: { isIn: [['image', 'video']] },
  },
  captureContext: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  analysisStatus: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'processing', 'needs_review', 'approved', 'rejected', 'failed']],
    },
  },
  aiAnalysis: { type: DataTypes.JSONB, allowNull: true },
  trainerReview: { type: DataTypes.JSONB, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: 'body_map_evidence',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['painEntryId', 'isDeleted'], name: 'idx_body_map_evidence_entry_active' },
    { fields: ['userId', 'createdAt'], name: 'idx_body_map_evidence_user_created' },
    { fields: ['analysisStatus'], name: 'idx_body_map_evidence_analysis_status' },
  ],
});

export default BodyMapEvidence;
