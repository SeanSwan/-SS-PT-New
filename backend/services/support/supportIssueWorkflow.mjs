/**
 * ============================================================================
 * FILE: supportIssueWorkflow.mjs
 * PURPOSE: Pure, testable Report Room triage invariants and lifecycle updates.
 * SAFETY: Invalid resolution and duplicate states fail before any DB write.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
export class SupportIssueWorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SupportIssueWorkflowError";
    this.code = code;
    this.statusCode = 422;
  }
}

function requireResolutionSummary(status, summary) {
  if (!["resolved", "closed"].includes(status)) return;
  if (typeof summary !== "string" || summary.trim().length < 4) {
    throw new SupportIssueWorkflowError(
      "SUPPORT_RESOLUTION_SUMMARY_REQUIRED",
      "A resolution summary is required before resolving or closing an issue.",
    );
  }
}

function validateDuplicateState(issue, status, changes) {
  const target =
    changes.duplicateOfIssueId === undefined
      ? issue.duplicateOfIssueId
      : changes.duplicateOfIssueId;
  if (status === "duplicate") {
    if (!target) {
      throw new SupportIssueWorkflowError(
        "SUPPORT_DUPLICATE_TARGET_REQUIRED",
        "A duplicate issue target is required.",
      );
    }
    if (target === issue.id) {
      throw new SupportIssueWorkflowError(
        "SUPPORT_DUPLICATE_TARGET_SELF",
        "An issue cannot be a duplicate of itself.",
      );
    }
  } else if (changes.duplicateOfIssueId) {
    throw new SupportIssueWorkflowError(
      "SUPPORT_DUPLICATE_STATUS_REQUIRED",
      "Set the issue status to duplicate before choosing a duplicate target.",
    );
  }
  return target;
}

function eventType(previousStatus, nextStatus) {
  if (nextStatus === "resolved") return "resolved";
  if (nextStatus === "closed") return "closed";
  if (nextStatus === "duplicate") return "marked_duplicate";
  if (
    ["resolved", "closed", "duplicate"].includes(previousStatus) &&
    !["resolved", "closed", "duplicate"].includes(nextStatus)
  )
    return "reopened";
  return "triage_updated";
}

export function buildSupportTriageMutation({
  issue,
  changes,
  now = new Date(),
}) {
  const nextStatus = changes.status ?? issue.status;
  const resolutionSummary =
    changes.resolutionSummary === undefined
      ? issue.resolutionSummary
      : changes.resolutionSummary;
  requireResolutionSummary(nextStatus, resolutionSummary);
  const duplicateTarget = validateDuplicateState(issue, nextStatus, changes);

  const updates = { ...changes, lastActivityAt: now };
  if (changes.status === "resolved") {
    updates.resolvedAt = now;
    updates.closedAt = null;
    updates.duplicateOfIssueId = null;
  } else if (changes.status === "closed") {
    updates.resolvedAt = issue.resolvedAt || now;
    updates.closedAt = now;
    updates.duplicateOfIssueId = null;
  } else if (changes.status === "duplicate") {
    updates.duplicateOfIssueId = duplicateTarget;
    updates.resolvedAt = null;
    updates.closedAt = null;
  } else if (changes.status) {
    updates.duplicateOfIssueId = null;
    updates.resolvedAt = null;
    updates.closedAt = null;
  }

  return {
    updates,
    eventType: eventType(issue.status, nextStatus),
  };
}
