/**
 * MODEL: ChallengeSubmission
 * ==========================
 * Client-created challenge proposal awaiting trainer/admin moderation.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const CHALLENGE_SUBMISSION_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'archived'];
export const CHALLENGE_SUBMISSION_VISIBILITIES = ['private', 'trainer_visible', 'team', 'community'];
export const CHALLENGE_SUBMISSION_MODERATION_STATUSES = ['pending', 'approved', 'rejected', 'needs_changes'];

class ChallengeSubmission extends Model {}

ChallengeSubmission.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submittedByUserId: { type: DataTypes.INTEGER, allowNull: false, field: 'submitted_by_user_id' },
  assignedTrainerId: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_trainer_id' },
  reviewedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'reviewed_by_user_id' },
  approvedChallengeId: { type: DataTypes.UUID, allowNull: true, field: 'approved_challenge_id' },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: { len: [3, 120], notEmpty: true },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { len: [10, 2000], notEmpty: true },
  },
  challengeType: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'weekly', field: 'challenge_type' },
  archetype: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'consistency' },
  requestedVisibility: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'trainer_visible',
    field: 'requested_visibility',
    validate: { isIn: [CHALLENGE_SUBMISSION_VISIBILITIES] },
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [CHALLENGE_SUBMISSION_STATUSES] },
  },
  moderationStatus: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'pending',
    field: 'moderation_status',
    validate: { isIn: [CHALLENGE_SUBMISSION_MODERATION_STATUSES] },
  },
  reviewNotes: { type: DataTypes.TEXT, allowNull: true, field: 'review_notes' },
  proposalPayload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'proposal_payload' },
  submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'submitted_at' },
  reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
}, {
  sequelize,
  modelName: 'ChallengeSubmission',
  tableName: 'challenge_submissions',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    { fields: ['status', 'submitted_at'] },
    { fields: ['submitted_by_user_id', 'created_at'] },
    { fields: ['assigned_trainer_id', 'status'] },
    { fields: ['moderation_status'] },
  ],
});

export default ChallengeSubmission;