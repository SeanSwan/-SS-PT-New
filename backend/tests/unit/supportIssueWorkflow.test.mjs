/**
 * ============================================================================
 * FILE: supportIssueWorkflow.test.mjs
 * PURPOSE: Prove Report Room triage transitions keep resolution and duplicate
 *          state internally consistent before persistence.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { describe, expect, it } from "vitest";
import {
  buildSupportTriageMutation,
  resolveDuplicateReference,
} from "../../services/support/supportIssueWorkflow.mjs";

const NOW = new Date("2026-07-16T18:00:00.000Z");
const ISSUE_ID = "11111111-1111-4111-8111-111111111111";
const DUPLICATE_ID = "22222222-2222-4222-8222-222222222222";

function issue(overrides = {}) {
  return {
    id: ISSUE_ID,
    status: "new",
    severity: "medium",
    resolutionSummary: null,
    duplicateOfIssueId: null,
    ...overrides,
  };
}

describe("resolveDuplicateReference", () => {
  it("resolves a human-readable receipt to its internal issue id", async () => {
    const changes = await resolveDuplicateReference({
      changes: {
        status: "duplicate",
        duplicateOfReferenceCode: "SWR-20260715-A1B2C3D4",
      },
      findIssueByReference: async () => ({ id: DUPLICATE_ID }),
    });

    expect(changes).toEqual({
      status: "duplicate",
      duplicateOfIssueId: DUPLICATE_ID,
    });
  });

  it("rejects an unknown duplicate receipt with a stable 422 error", async () => {
    await expect(resolveDuplicateReference({
      changes: { duplicateOfReferenceCode: "SWR-20260715-A1B2C3D4" },
      findIssueByReference: async () => null,
    })).rejects.toMatchObject({
      code: "SUPPORT_DUPLICATE_REFERENCE_NOT_FOUND",
      statusCode: 422,
    });
  });
});

describe("buildSupportTriageMutation", () => {
  it("requires a resolution summary before resolving or closing an issue", () => {
    expect(() =>
      buildSupportTriageMutation({
        issue: issue(),
        changes: { status: "resolved" },
        now: NOW,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "SUPPORT_RESOLUTION_SUMMARY_REQUIRED" }),
    );

    const result = buildSupportTriageMutation({
      issue: issue(),
      changes: {
        status: "resolved",
        resolutionSummary: "Corrected the save route ownership.",
      },
      now: NOW,
    });

    expect(result.updates).toMatchObject({
      status: "resolved",
      resolutionSummary: "Corrected the save route ownership.",
      resolvedAt: NOW,
      closedAt: null,
      lastActivityAt: NOW,
    });
    expect(result.eventType).toBe("resolved");
  });

  it("requires a distinct duplicate target and clears resolution timestamps", () => {
    expect(() =>
      buildSupportTriageMutation({
        issue: issue(),
        changes: { status: "duplicate" },
        now: NOW,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "SUPPORT_DUPLICATE_TARGET_REQUIRED" }),
    );

    expect(() =>
      buildSupportTriageMutation({
        issue: issue(),
        changes: { status: "duplicate", duplicateOfIssueId: ISSUE_ID },
        now: NOW,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "SUPPORT_DUPLICATE_TARGET_SELF" }),
    );

    const result = buildSupportTriageMutation({
      issue: issue({ resolvedAt: NOW, closedAt: NOW }),
      changes: { status: "duplicate", duplicateOfIssueId: DUPLICATE_ID },
      now: NOW,
    });
    expect(result.updates).toMatchObject({
      status: "duplicate",
      duplicateOfIssueId: DUPLICATE_ID,
      resolvedAt: null,
      closedAt: null,
    });
    expect(result.eventType).toBe("marked_duplicate");
  });

  it("rejects a duplicate target unless the resulting status is duplicate", () => {
    expect(() =>
      buildSupportTriageMutation({
        issue: issue(),
        changes: { duplicateOfIssueId: DUPLICATE_ID },
        now: NOW,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "SUPPORT_DUPLICATE_STATUS_REQUIRED" }),
    );
  });

  it("labels movement from resolved back to active work as reopened", () => {
    const result = buildSupportTriageMutation({
      issue: issue({
        status: "resolved",
        resolutionSummary: "Earlier attempt.",
        resolvedAt: new Date("2026-07-15T18:00:00.000Z"),
      }),
      changes: { status: "in_progress" },
      now: NOW,
    });

    expect(result.eventType).toBe("reopened");
    expect(result.updates).toMatchObject({
      status: "in_progress",
      resolvedAt: null,
      closedAt: null,
      duplicateOfIssueId: null,
    });
  });
});
