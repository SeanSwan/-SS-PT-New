/**
 * ============================================================================
 * FILE: supportIssueService.mjs
 * PURPOSE: Transactional reporter filing, isolation, replies, and history.
 * PRIVACY: Every public return value passes through reporter-safe serializers.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { randomBytes } from "node:crypto";
import sequelize from "../../database.mjs";
import { getSupportIssue, getSupportIssueEvent } from "../../models/index.mjs";
import { sanitizeSupportDiagnostics } from "./supportIssuePrivacy.mjs";
import { SupportIssueServiceError } from "./supportIssueErrors.mjs";
import { notifySupportOwners } from "./supportIssueNotification.mjs";
import {
  supportPagination,
  toOwnerIssue,
  toReporterEvent,
  toReporterIssue,
} from "./supportIssuePresentation.mjs";

export { SupportIssueServiceError };

function referenceCode(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `SWR-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function eventInclude({ reporterOnly = false } = {}) {
  const include = {
    model: getSupportIssueEvent(),
    as: "events",
    required: false,
  };
  if (reporterOnly) include.where = { visibility: "reporter" };
  return include;
}

async function findReporterIssue(reporterUserId, issueId, transaction) {
  const issue = await getSupportIssue().findOne({
    where: { id: issueId, reporterUserId },
    transaction,
  });
  if (!issue) {
    throw new SupportIssueServiceError(
      "SUPPORT_ISSUE_NOT_FOUND",
      "Issue not found.",
      404,
    );
  }
  return issue;
}

export async function createSupportIssue({ reporterUserId, input }) {
  const result = await sequelize.transaction(async (transaction) => {
    const [issue, created] = await getSupportIssue().findOrCreate({
      where: {
        reporterUserId,
        clientRequestId: input.clientRequestId,
      },
      defaults: {
        referenceCode: referenceCode(),
        reporterUserId,
        clientRequestId: input.clientRequestId,
        category: input.category,
        severity: input.severity,
        source: input.source,
        title: input.title,
        description: input.description,
        expectedBehavior: input.expectedBehavior || null,
        impact: input.impact || null,
        reproductionSteps: input.reproductionSteps || [],
        diagnostics: sanitizeSupportDiagnostics(input.diagnostics),
        lastActivityAt: new Date(),
      },
      transaction,
    });

    if (created) {
      await getSupportIssueEvent().create(
        {
          issueId: issue.id,
          actorUserId: reporterUserId,
          eventType: "created",
          visibility: "reporter",
          metadata: { source: issue.source },
        },
        { transaction },
      );
    }

    return { issue: toOwnerIssue(issue), created };
  });

  if (result.created) await notifySupportOwners({ issue: result.issue });
  return toReporterIssue(result.issue);
}
export async function listReporterIssues({ reporterUserId, query }) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const { rows, count } = await getSupportIssue().findAndCountAll({
    where: { reporterUserId },
    order: [["lastActivityAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return {
    issues: rows.map(toReporterIssue),
    pagination: supportPagination(page, pageSize, count),
  };
}

export async function getReporterIssue({ reporterUserId, issueId }) {
  const issue = await getSupportIssue().findOne({
    where: { id: issueId, reporterUserId },
    include: [eventInclude({ reporterOnly: true })],
    order: [
      [{ model: getSupportIssueEvent(), as: "events" }, "createdAt", "ASC"],
    ],
  });
  if (!issue) {
    throw new SupportIssueServiceError(
      "SUPPORT_ISSUE_NOT_FOUND",
      "Issue not found.",
      404,
    );
  }
  return toReporterIssue(issue);
}

export async function addReporterReply({ reporterUserId, issueId, body }) {
  return sequelize.transaction(async (transaction) => {
    const issue = await findReporterIssue(reporterUserId, issueId, transaction);
    if (["closed", "duplicate"].includes(issue.status)) {
      throw new SupportIssueServiceError(
        "SUPPORT_ISSUE_REPLY_CLOSED",
        "This issue no longer accepts replies.",
        409,
      );
    }
    const event = await getSupportIssueEvent().create(
      {
        issueId,
        actorUserId: reporterUserId,
        eventType: "reporter_reply",
        visibility: "reporter",
        body,
      },
      { transaction },
    );
    await issue.update({ lastActivityAt: new Date() }, { transaction });
    return toReporterEvent(event);
  });
}
