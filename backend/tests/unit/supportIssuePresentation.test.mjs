/**
 * Reporter response privacy and pagination contracts for the Report Room.
 */
import { describe, expect, it } from "vitest";

import {
  supportPagination,
  toReporterEvent,
  toReporterIssue,
} from "../../services/support/supportIssuePresentation.mjs";

describe("Report Room reporter presentation", () => {
  it("removes owner, reporter, idempotency, and event actor internals", () => {
    const issue = toReporterIssue({
      id: "issue-1",
      referenceCode: "SWR-20260716-A1B2C3D4",
      reporterUserId: 42,
      assignedOwnerUserId: 7,
      duplicateOfIssueId: "issue-2",
      clientRequestId: "11111111-1111-4111-8111-111111111111",
      category: "bug",
      severity: "high",
      status: "triaged",
      source: "voice",
      title: "Workout will not save",
      description: "The save action returns an error.",
      reproductionSteps: [],
      diagnostics: { path: "/workout" },
      resolutionSummary: null,
      events: [{
        id: 9,
        issueId: "issue-1",
        actorUserId: 7,
        eventType: "owner_reply",
        visibility: "reporter",
        body: "I am investigating this.",
        metadata: { internal: "never expose" },
        createdAt: "2026-07-16T18:00:00.000Z",
      }],
      createdAt: "2026-07-16T18:00:00.000Z",
      updatedAt: "2026-07-16T18:00:00.000Z",
      lastActivityAt: "2026-07-16T18:00:00.000Z",
    });

    expect(issue).not.toHaveProperty("reporterUserId");
    expect(issue).not.toHaveProperty("assignedOwnerUserId");
    expect(issue).not.toHaveProperty("duplicateOfIssueId");
    expect(issue).not.toHaveProperty("clientRequestId");
    expect(issue.events?.[0]).toEqual({
      id: 9,
      eventType: "owner_reply",
      visibility: "reporter",
      body: "I am investigating this.",
      createdAt: "2026-07-16T18:00:00.000Z",
    });
  });

  it("drops owner-only events defensively", () => {
    expect(toReporterEvent({ visibility: "owner", body: "private" })).toBeNull();
  });

  it("returns both canonical and compatibility page counts", () => {
    expect(supportPagination(2, 10, 21)).toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
      pages: 3,
    });
  });
});
