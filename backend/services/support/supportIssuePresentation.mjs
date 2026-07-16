/**
 * ============================================================================
 * FILE: supportIssuePresentation.mjs
 * PURPOSE: Enforce reporter-safe API shapes and shared pagination metadata.
 * SECURITY: Owner ids, reporter ids, idempotency keys, event actors, and
 *           arbitrary audit metadata never cross the reporter boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */

function plain(value) {
  return value?.toJSON ? value.toJSON() : value;
}

export function supportPagination(page, pageSize, total) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages, pages: totalPages };
}

export function toReporterEvent(value) {
  const event = plain(value);
  if (!event || event.visibility !== "reporter") return null;
  return {
    id: event.id,
    eventType: event.eventType,
    visibility: "reporter",
    body: event.body ?? null,
    createdAt: event.createdAt,
  };
}

export function toReporterIssue(value) {
  const issue = plain(value);
  if (!issue) return issue;
  const {
    reporterUserId: _reporterUserId,
    assignedOwnerUserId: _assignedOwnerUserId,
    duplicateOfIssueId: _duplicateOfIssueId,
    clientRequestId: _clientRequestId,
    events,
    ...safeIssue
  } = issue;
  return {
    ...safeIssue,
    ...(Array.isArray(events)
      ? { events: events.map(toReporterEvent).filter(Boolean) }
      : {}),
  };
}

export function toOwnerIssue(value) {
  return plain(value);
}
