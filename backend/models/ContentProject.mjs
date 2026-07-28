/**
 * MODEL: ContentProject
 * =====================
 * Creator workflow project record for Content Studio.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const CONTENT_PROJECT_STATUSES = [
  'idea',
  'script',
  'shot_list',
  'scheduled',
  'filmed',
  'editing',
  'qa',
  'youtube_ready',
  'uploaded',
];

export const CONTENT_PROJECT_SOURCE_TYPES = [
  'manual',
  'coverage_gap',
  'client_win',
  'campaign',
  'exercise_video',
];

class ContentProject extends Model {}

ContentProject.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'idea',
    validate: { isIn: [CONTENT_PROJECT_STATUSES] },
  },
  sourceType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'manual',
    field: 'source_type',
    validate: { isIn: [CONTENT_PROJECT_SOURCE_TYPES] },
  },
  sourceId: { type: DataTypes.STRING(120), allowNull: true, field: 'source_id' },
  priority: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'normal',
    validate: { isIn: [['low', 'normal', 'high']] },
  },
  scriptDraft: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'script_draft' },
  shotList: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'shot_list' },
  editingHandoff: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'editing_handoff' },
  youtubePackage: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'youtube_package' },
  assets: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  scheduledAt: { type: DataTypes.DATE, allowNull: true, field: 'scheduled_at' },
  filmedAt: { type: DataTypes.DATE, allowNull: true, field: 'filmed_at' },
  editingDueAt: { type: DataTypes.DATE, allowNull: true, field: 'editing_due_at' },
  publishDueAt: { type: DataTypes.DATE, allowNull: true, field: 'publish_due_at' },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' },
}, {
  sequelize,
  modelName: 'ContentProject',
  tableName: 'content_projects',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['source_type'] },
    { fields: ['publish_due_at'] },
    { fields: ['created_by'] },
  ],
});

export default ContentProject;