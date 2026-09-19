import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

/**
 * CoachSignal — a coach-only, rationed recognition on a member's feed post.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.3
 * Deliberately a dedicated model (NOT a SocialLike reactionType value) so the
 * SocialLikes ENUM never drifts (CLAUDE.md rule 58 incident class).
 * FK targets are PascalCase canonical tables ("Users", "SocialPosts").
 */
const CoachSignal = db.define('CoachSignal', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  coachId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  memberId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Feed-anchored v1: signals attach to a SocialPosts row. Nullable so a
  // future workout-session target can land without a migration.
  postId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'SocialPosts',
      key: 'id'
    }
  },
  // Optional coach note (<=120 chars, enforced in the route layer).
  note: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'CoachSignals',
  // updatedAt is intentionally NOT disabled: the migration creates the column as
  // NOT NULL (20260916-create-coach-signals.cjs:46-50), and a model that omits a
  // NOT NULL column is the schema-drift class rule 58 exists to catch
  // (hostile review F3.1, 2026-09-18). Immutability is enforced at the route layer —
  // no PUT/PATCH exists for this resource — not by an ORM flag.
  timestamps: true,
  indexes: [
    // Daily per-coach cap queries (max 5 / coach / UTC day).
    { fields: ['coachId', 'createdAt'] },
    // Feed batch-attach queries (signals for visible postIds, today).
    { fields: ['postId', 'createdAt'] },
    // Member history ("signals I received").
    { fields: ['memberId', 'createdAt'] },
    // One signal per coach per post — second attempt is a 409, not spam.
    { unique: true, fields: ['coachId', 'postId'] }
  ]
});

export default CoachSignal;
