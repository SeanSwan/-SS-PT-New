/**
 * ============================================================================
 * FILE: supportIssueOwnerService.mjs
 * PURPOSE: Owner-only Report Room queue, triage, audit events, and prompt export.
 * SECURITY: Callers must pass through protect plus requireSupportOwner routes.
 * ============================================================================
 */
import sequelize, { Op } from "../../database.mjs";
import {
  getSupportIssue,
  getSupportIssueEvent,
  getUser,
} from "../../models/index.mjs";
import { SupportIssueServiceError } from "./supportIssueErrors.mjs";
import {
  buildAiRepairPrompt,
} from "./supportIssuePrivacy.mjs";
import {
  supportPagination,
  toOwnerIssue,
} from "./supportIssuePresentation.mjs";
import {
  buildSupportTriageMutation,
  resolveDuplicateReference,
} from "./supportIssueWorkflow.mjs";

function eventInclude() {
  return {
    model: getSupportIssueEvent(),
    as: "events",
    required: false,
  };
}

async function findOwnerIssue(issueId, options = {}) {
  const issue = await getSupportIssue().findByPk(issueId, options);
  if (!issue) {
    throw new SupportIssueServiceError(
      "SUPPORT_ISSUE_NOT_FOUND",
      "Issue not found.",
      404,
    );
  }
  return issue;
}

export async function listOwnerIssues({ query }) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 25;
  const where = {};
  for (const field of ["status", "severity", "category", "source"]) {
    if (query[field]) where[field] = query[field];
  }
  if (query.assignedOwnerUserId === null) where.assignedOwnerUserId = null;
  else if (query.assignedOwnerUserId) {
    where.assignedOwnerUserId = query.assignedOwnerUserId;
  }
  if (query.search) {
    where[Op.or] = [
      { referenceCode: { [Op.iLike]: `%${query.search}%` } },
      { title: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await getSupportIssue().findAndCountAll({
    where,
    order: [["lastActivityAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return {
    issues: rows.map(toOwnerIssue),
    pagination: supportPagination(page, pageSize, count),
  };
}

export async function getOwnerIssue({ issueId }) {
  const issue = await getSupportIssue().findByPk(issueId, {
    include: [eventInclude()],
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
  return toOwnerIssue(issue);
}

export async function updateOwnerIssue({ issueId, actorUserId, changes }) {
  return sequelize.transaction(async (transaction) => {
    const issue = await findOwnerIssue(issueId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const previous = toOwnerIssue(issue);
    const resolvedChanges = await resolveDuplicateReference({
      changes,
      findIssueByReference: (referenceCode) => getSupportIssue().findOne({
        where: { referenceCode },
        attributes: ["id"],
        transaction,
      }),
    });
    const mutation = buildSupportTriageMutation({
      issue: previous,
      changes: resolvedChanges,
    });
    await issue.update(mutation.updates, { transaction });
    await getSupportIssueEvent().create(
      {
        issueId,
        actorUserId,
        eventType: mutation.eventType,
        visibility: "reporter",
        metadata: {
          previous: resolvedChanges.status ? { status: previous.status } : {},
          changes: Object.fromEntries(
            Object.entries(resolvedChanges).filter(([key]) =>
              ["status", "severity"].includes(key),
            ),
          ),
        },
      },
      { transaction },
    );
    return toOwnerIssue(issue);
  });
}

export async function addOwnerIssueEvent({
  issueId,
  actorUserId,
  eventType,
  visibility,
  body,
}) {
  return sequelize.transaction(async (transaction) => {
    const issue = await findOwnerIssue(issueId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const event = await getSupportIssueEvent().create(
      { issueId, actorUserId, eventType, visibility, body },
      { transaction },
    );
    const updates = { lastActivityAt: new Date() };
    if (visibility === "reporter" && !issue.firstResponseAt) {
      updates.firstResponseAt = new Date();
    }
    await issue.update(updates, { transaction });
    return toOwnerIssue(event);
  });
}

export async function getIssueRepairPrompt({ issueId }) {
  const issue = await findOwnerIssue(issueId);
  const reporter = await getUser().findByPk(issue.reporterUserId, {
    attributes: ["firstName", "lastName", "email"],
  });
  return {
    referenceCode: issue.referenceCode,
    prompt: buildAiRepairPrompt({
      issue: toOwnerIssue(issue),
      reporter: toOwnerIssue(reporter) || {},
    }),
  };
}
