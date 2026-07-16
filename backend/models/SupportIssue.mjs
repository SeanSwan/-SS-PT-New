/**
 * ============================================================================
 * FILE: SupportIssue.mjs
 * PURPOSE: Authoritative Report Room issue record and current triage state.
 * DATA: User-authored content stays in PostgreSQL and is never automatically
 *       forwarded to an LLM or notification payload.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { DataTypes, Model } from "sequelize";
import sequelize from "../database.mjs";
import {
  SUPPORT_ISSUE_CATEGORIES,
  SUPPORT_ISSUE_SEVERITIES,
  SUPPORT_ISSUE_SOURCES,
  SUPPORT_ISSUE_STATUSES,
} from "../domain/supportIssueConstants.mjs";

class SupportIssue extends Model {}

SupportIssue.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    referenceCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      validate: { is: /^SWR-\d{8}-[A-F0-9]{8}$/ },
    },
    reporterUserId: { type: DataTypes.INTEGER, allowNull: false },
    assignedOwnerUserId: { type: DataTypes.INTEGER, allowNull: true },
    duplicateOfIssueId: { type: DataTypes.UUID, allowNull: true },
    category: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { isIn: [SUPPORT_ISSUE_CATEGORIES] },
    },
    severity: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "medium",
      validate: { isIn: [SUPPORT_ISSUE_SEVERITIES] },
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "new",
      validate: { isIn: [SUPPORT_ISSUE_STATUSES] },
    },
    source: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "text",
      validate: { isIn: [SUPPORT_ISSUE_SOURCES] },
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [4, 160] },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [10, 8000] },
    },
    expectedBehavior: { type: DataTypes.TEXT, allowNull: true },
    impact: { type: DataTypes.TEXT, allowNull: true },
    reproductionSteps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    diagnostics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    resolutionSummary: { type: DataTypes.TEXT, allowNull: true },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    firstResponseAt: { type: DataTypes.DATE, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    closedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "SupportIssue",
    tableName: "support_issues",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "support_issues_reporter_created_idx",
        fields: ["reporter_user_id", "created_at"],
      },
      {
        name: "support_issues_owner_queue_idx",
        fields: ["status", "severity", "last_activity_at"],
      },
    ],
  },
);

export default SupportIssue;
