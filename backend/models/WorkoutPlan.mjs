/**
 * ============================================================================
 * FILE: WorkoutPlan.mjs
 * PURPOSE: Sequelize model for multi-week workout programs (NASM OPT aligned)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the WorkoutPlan model for storing planned
 * workout programs that trainers/AI create for clients. The planData JSONB
 * field holds the full week-by-week, session-by-session exercise structure.
 *
 * HOW IT FITS IN THE APP:
 *   Trainer/AI creates plan → WorkoutPlan row → AI reads currentWeek/currentDay
 *   to answer "what's next?" → /advance endpoint moves the cursor forward
 *
 * KEY DECISIONS:
 *   - JSONB planData instead of normalized child tables: simpler for AI to
 *     read/write entire programs in one shot, avoids N+1 queries
 *   - UUID PK matches the live original table and prevents sequential enumeration
 *   - underscored: true + explicit field mappings for snake_case DB columns
 *
 * NASM PROTOCOL CONTEXT:
 *   nasmPhase (1-5) maps directly to OPT periodization phases. AI uses this
 *   to set correct sets/reps/tempo/rest when generating planData.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: WorkoutPlan Model Definition
// PURPOSE: Multi-week workout program storage with JSONB plan structure
// WHY: Enables AI to answer "what's next?" by reading currentWeek/currentDay
// ─────────────────────────────────────────────────────────────

class WorkoutPlan extends Model {}

// IMPORTANT: The production table has HYBRID column naming:
// - Original columns (2025): camelCase — id (UUID), userId, title, description,
//   durationWeeks, status, tags, difficulty, isTemplate, isPublic, createdAt, updatedAt
// - Added columns (2026 migration): snake_case — trainer_id, nasm_phase, start_date,
//   end_date, current_week, current_day, plan_data, content_revision, content_hash,
//   progress_notes, created_by, metadata
// We use explicit `field:` on every column to map correctly. NO underscored: true.

WorkoutPlan.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'UUID primary key (original table schema)'
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'userId',
    allowNull: false,
    comment: 'The client this workout plan is assigned to'
  },
  trainerId: {
    type: DataTypes.INTEGER,
    field: 'trainer_id',
    allowNull: true,
    comment: 'The trainer who created or assigned this plan'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Plan title, e.g. "Liz - 12 Week Phase 1 Stabilization"'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Overview of the plan goals and approach'
  },
  nasmPhase: {
    type: DataTypes.INTEGER,
    field: 'nasm_phase',
    allowNull: true,
    validate: { min: 1, max: 5 },
    comment: 'NASM OPT phase (1=Stab End, 2=Str End, 3=Hyp, 4=Max Str, 5=Power)'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    field: 'start_date',
    allowNull: true,
    comment: 'Planned start date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    field: 'end_date',
    allowNull: true,
    comment: 'Planned end date'
  },
  durationWeeks: {
    type: DataTypes.INTEGER,
    field: 'durationWeeks',
    allowNull: false,
    defaultValue: 4,
    validate: { min: 1, max: 52 },
    comment: 'Total duration of the program in weeks'
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed', 'draft', 'archived'),
    defaultValue: 'active',
    allowNull: false,
    comment: 'Current plan status'
  },
  archivedAt: {
    type: DataTypes.DATE,
    field: 'archived_at',
    allowNull: true,
    comment: 'When this plan entered its terminal archived state'
  },
  archivedBy: {
    type: DataTypes.INTEGER,
    field: 'archived_by',
    allowNull: true,
    comment: 'Authorized staff user who archived this plan'
  },
  currentWeek: {
    type: DataTypes.INTEGER,
    field: 'current_week',
    defaultValue: 1,
    allowNull: false,
    validate: { min: 1 },
    comment: 'Which week the client is currently on'
  },
  currentDay: {
    type: DataTypes.INTEGER,
    field: 'current_day',
    defaultValue: 1,
    allowNull: false,
    validate: { min: 1 },
    comment: 'Which day/session within the current week'
  },
  planData: {
    type: DataTypes.JSONB,
    field: 'plan_data',
    allowNull: true,
    defaultValue: { weeks: [] },
    comment: 'Full plan structure: weeks → sessions → exercises with sets/reps/tempo/rest'
  },
  contentRevision: {
    type: DataTypes.INTEGER,
    field: 'content_revision',
    allowNull: true,
    defaultValue: 1,
    validate: { min: 1 },
    comment: 'Monotonic revision of prescribed content; nullable during expand-phase rollout'
  },
  contentHash: {
    type: DataTypes.STRING(64),
    field: 'content_hash',
    allowNull: true,
    validate: { is: /^[a-f0-9]{64}$/ },
    comment: 'SHA-256 digest of canonical prescribed content; nullable until backfill completes'
  },
  progressNotes: {
    type: DataTypes.JSONB,
    field: 'progress_notes',
    allowNull: true,
    defaultValue: [],
    comment: 'Array of trainer notes per week: [{ week, note, date }]'
  },
  createdBy: {
    type: DataTypes.STRING(50),
    field: 'created_by',
    allowNull: true,
    defaultValue: 'trainer',
    comment: 'Who created this plan: "ai", "trainer", or "admin"'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Extra data: equipment preferences, injury notes, etc.'
  },
  // S24 (JARVIS §4.6): trainer-owned reusable templates. A template's userId
  // is the TRAINER's own id (client id is scrubbed at the API boundary).
  isTemplate: {
    type: DataTypes.BOOLEAN,
    field: 'is_template',
    allowNull: false,
    defaultValue: false,
    comment: 'True for client-scrubbed reusable templates (S24)'
  },
  templateMeta: {
    type: DataTypes.JSONB,
    field: 'template_meta',
    allowNull: true,
    comment: 'Template facets: { name, phase, split, weeks, tags[] }'
  }
}, {
  sequelize,
  modelName: 'WorkoutPlan',
  tableName: 'workout_plans',
  timestamps: true,
  // NO underscored — original columns use camelCase (createdAt, updatedAt, userId, etc.)
  indexes: [
    { fields: ['userId'], name: 'idx_workout_plans_user_id' },
    { fields: ['trainer_id'], name: 'idx_workout_plans_trainer_id' },
    { fields: ['status'], name: 'idx_workout_plans_status' },
    { fields: ['userId', 'status'], name: 'idx_workout_plans_user_status' }
  ]
});

export default WorkoutPlan;
