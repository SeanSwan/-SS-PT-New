/**
 * ============================================================================
 * FILE: supportIssueService.mjs
 * PURPOSE: Transactional Report Room persistence, reporter isolation, owner
 *          triage, append-only history, and privacy-safe repair prompts.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { randomBytes } from "node:crypto";
import sequelize, { Op } from "../../database.mjs";
import {
  getSupportIssue,
  getSupportIssueEvent,
  getUser,
} from "../../models/index.mjs";
import {
  buildAiRepairPrompt,
  sanitizeSupportDiagnostics,
} from "./supportIssuePrivacy.mjs";
import { buildSupportTriageMutation } from "./supportIssueWorkflow.mjs";

export class SupportIssueServiceError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "SupportIssueServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function referenceCode(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `SWR-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function pagination(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

function plain(value) {
  return value?.toJSON ? value.toJSON() : value;
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

export async function createSupportIssue({ reporterUserId, input }) {
  return sequelize.transaction(async (transaction) => {
    const issue = await getSupportIssue().create(
      {
        referenceCode: referenceCode(),
        reporterUserId,
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
      { transaction },
    );

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

    return plain(issue);
  });
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
    issues: rows.map(plain),
    pagination: pagination(page, pageSize, count),
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
  return plain(issue);
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
    return plain(event);
  });
}

export async function listOwnerIssues({ query }) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 25;
  const where = {};
  for (const field of ["status", "severity", "category", "source"]) {
    if (query[field]) where[field] = query[field];
  }
  if (query.assignedOwnerUserId === null) where.assignedOwnerUserId = null;
  else if (query.assignedOwnerUserId)
    where.assignedOwnerUserId = query.assignedOwnerUserId;
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
    issues: rows.map(plain),
    pagination: pagination(page, pageSize, count),
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
  return plain(issue);
}

export async function updateOwnerIssue({ issueId, actorUserId, changes }) {
  return sequelize.transaction(async (transaction) => {
    const issue = await findOwnerIssue(issueId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const previous = plain(issue);
    const mutation = buildSupportTriageMutation({ issue: previous, changes });
    await issue.update(mutation.updates, { transaction });
    await getSupportIssueEvent().create(
      {
        issueId,
        actorUserId,
        eventType: mutation.eventType,
        visibility: "reporter",
        metadata: {
          previous: changes.status ? { status: previous.status } : {},
          changes: Object.fromEntries(
            Object.entries(changes).filter(([key]) =>
              ["status", "severity"].includes(key),
            ),
          ),
        },
      },
      { transaction },
    );
    return plain(issue);
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
      {
        issueId,
        actorUserId,
        eventType,
        visibility,
        body,
      },
      { transaction },
    );
    const updates = { lastActivityAt: new Date() };
    if (visibility === "reporter" && !issue.firstResponseAt)
      updates.firstResponseAt = new Date();
    await issue.update(updates, { transaction });
    return plain(event);
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
      issue: plain(issue),
      reporter: plain(reporter) || {},
    }),
  };
}
