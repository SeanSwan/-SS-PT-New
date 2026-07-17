/**
 * ============================================================================
 * FILE: SupportIssueEvent.mjs
 * PURPOSE: Append-only Report Room conversation and audit history.
 * SECURITY: Reporter-visible events and owner-only notes share one ordered log
 *           with explicit visibility; mutation and deletion are blocked.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { DataTypes, Model } from "sequelize";
import sequelize from "../database.mjs";
import {
  SUPPORT_EVENT_TYPES,
  SUPPORT_EVENT_VISIBILITIES,
} from "../domain/supportIssueConstants.mjs";

const APPEND_ONLY_MESSAGE = "SupportIssueEvent is append-only.";
const rejectMutation = () => {
  throw new Error(APPEND_ONLY_MESSAGE);
};

class SupportIssueEvent extends Model {}

SupportIssueEvent.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    issueId: { type: DataTypes.UUID, allowNull: false },
    actorUserId: { type: DataTypes.INTEGER, allowNull: true },
    eventType: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { isIn: [SUPPORT_EVENT_TYPES] },
    },
    visibility: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { isIn: [SUPPORT_EVENT_VISIBILITIES] },
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: { len: [0, 8000] },
    },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  {
    sequelize,
    modelName: "SupportIssueEvent",
    tableName: "support_issue_events",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        name: "support_issue_events_issue_created_idx",
        fields: ["issue_id", "created_at"],
      },
      {
        name: "support_issue_events_actor_created_idx",
        fields: ["actor_user_id", "created_at"],
      },
    ],
    hooks: {
      beforeUpdate: rejectMutation,
      beforeDestroy: rejectMutation,
      beforeBulkUpdate: rejectMutation,
      beforeBulkDestroy: rejectMutation,
    },
  },
);

export default SupportIssueEvent;
