/**
 * ============================================================================
 * FILE: CoachFact.mjs
 * PURPOSE: Durable, temporally-valid, trainer-approved facts about a client.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-31
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/FABLE-BLUEPRINT-COACH-FACTS-2026-08-31.md (S1)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: defines the `coach_facts` table — the memory layer that
 * survives the end of a chat turn. `coachContextEngine` already aggregates the
 * structured record (workouts, pain, nutrition, goals); this holds the
 * observations that have nowhere else to live: "travels alternate weeks",
 * "left-knee discomfort on lunges", "responds to competition framing".
 *
 * HOW IT FITS IN THE APP: User (client) → CoachFact (many). Written by
 * services/coachFactService.mjs; read into the prompt by coachContextEngine
 * in S3. Self-referential via invalidatedByFactId so a superseded fact points
 * at the fact that replaced it.
 *
 * KEY DECISIONS:
 *  - `status` defaults to 'proposed'. The machine-authored path must not be
 *    able to produce an active row by omitting a field. Activation requires a
 *    human actor and happens only in coachFactService.approveFact.
 *  - Bi-temporal by design: `validFrom`/`validTo` record when the fact was true
 *    about the client; `invalidatedAt` records when we learned it stopped being
 *    true. Keeping them separate is what makes point-in-time recall possible.
 *  - Rows are never deleted, only invalidated — the history IS the feature.
 *  - `statement` is de-identified prose (Rule 8); the client is identified by
 *    userId alone. `sourceRef` carries IDs only, never transcript text.
 *  - Enum members must stay byte-identical to the migration and to
 *    FACT_CATEGORIES in coachFactService.mjs; a drift guard in
 *    tests/unit/coachContextTableNames.test.mjs pins all three together.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CoachFact extends Model {}

CoachFact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    category: {
      type: DataTypes.ENUM(
        'injury_constraint',
        'preference',
        'goal_context',
        'lifestyle',
        'equipment',
        'motivation_style',
        'schedule_pattern',
        'coaching_cue',
        'milestone',
      ),
      allowNull: false,
    },
    statement: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    structured: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('proposed', 'active', 'invalidated', 'rejected'),
      allowNull: false,
      defaultValue: 'proposed',
    },
    validFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    validTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    invalidatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invalidatedByFactId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'coach_facts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    sourceType: {
      type: DataTypes.ENUM(
        'chat',
        'dictation',
        'intake',
        'workout_log',
        'client_note',
        'trainer_manual',
      ),
      allowNull: false,
    },
    sourceRef: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    approvedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // G09/S9: forget + purge + conflict columns (migration
    // 20260911000000-add-coach-fact-forget-purge.cjs).
    forgottenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When a forget operator invalidated this fact for deletion/privacy',
    },
    purgeAfterAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'forgottenAt + 24h; purgeDueFacts hard-destroys the row after this',
    },
    conflictMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'T37 conflict annotations; written only by an explicit reconcile step',
    },
  },
  {
    sequelize,
    modelName: 'CoachFact',
    tableName: 'coach_facts',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'status'] },
      { fields: ['userId', 'category', 'status'] },
    ],
  },
);

CoachFact.associate = (models) => {
  CoachFact.belongsTo(models.User, { foreignKey: 'userId', as: 'client' });
  CoachFact.belongsTo(models.User, { foreignKey: 'createdByUserId', as: 'createdBy' });
  CoachFact.belongsTo(models.User, { foreignKey: 'approvedByUserId', as: 'approvedBy' });
  CoachFact.belongsTo(models.CoachFact, { foreignKey: 'invalidatedByFactId', as: 'supersededBy' });
};

export default CoachFact;
