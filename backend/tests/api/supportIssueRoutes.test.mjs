/**
 * ============================================================================
 * FILE: supportIssueRoutes.test.mjs
 * PURPOSE: Lock authenticated reporter isolation and Sean-only owner workflows
 *          at the HTTP boundary before Report Room routes are implemented.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  createSupportIssue: vi.fn(),
  listReporterIssues: vi.fn(),
  getReporterIssue: vi.fn(),
  addReporterReply: vi.fn(),
  listOwnerIssues: vi.fn(),
  getOwnerIssue: vi.fn(),
  updateOwnerIssue: vi.fn(),
  addOwnerIssueEvent: vi.fn(),
  getIssueRepairPrompt: vi.fn(),
}));

vi.mock("../../middleware/authMiddleware.mjs", () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: "client", email: "reporter@example.com" };
    next();
  },
  rateLimiter: () => (_req, _res, next) => next(),
}));

vi.mock("../../middleware/supportOwnerOnly.mjs", () => ({
  requireSupportOwner: (req, _res, next) => {
    req.user = { id: 7, role: "admin", email: "owner@example.com" };
    next();
  },
}));

vi.mock("../../services/support/supportIssueService.mjs", () => ({
  createSupportIssue: service.createSupportIssue,
  listReporterIssues: service.listReporterIssues,
  getReporterIssue: service.getReporterIssue,
  addReporterReply: service.addReporterReply,
}));
vi.mock("../../services/support/supportIssueOwnerService.mjs", () => ({
  listOwnerIssues: service.listOwnerIssues,
  getOwnerIssue: service.getOwnerIssue,
  updateOwnerIssue: service.updateOwnerIssue,
  addOwnerIssueEvent: service.addOwnerIssueEvent,
  getIssueRepairPrompt: service.getIssueRepairPrompt,
}));

const { default: supportIssueRoutes } =
  await import("../../routes/supportIssueRoutes.mjs");
const { default: adminSupportIssueRoutes } =
  await import("../../routes/adminSupportIssueRoutes.mjs");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/support/issues", supportIssueRoutes);
  app.use("/api/admin/support/issues", adminSupportIssueRoutes);
  return app;
}

describe("reporter issue routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an issue with the authenticated reporter id and ignores a forged body id", async () => {
    service.createSupportIssue.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      referenceCode: "SWR-20260716-A1B2C3D4",
      status: "new",
    });

    const response = await request(makeApp())
      .post("/api/support/issues")
      .send({
        reporterUserId: 999,
        clientRequestId: "11111111-1111-4111-8111-111111111111",
        category: "workout",
        severity: "high",
        source: "text",
        title: "Workout will not save",
        description: "The save action returns an error.",
        expectedBehavior: "The workout saves.",
        impact: "The session cannot be completed.",
        reproductionSteps: ["Open workout logger", "Press Save"],
        diagnostics: { route: "/workout?token=private" },
      })
      .expect(201);

    expect(service.createSupportIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterUserId: 42,
        input: expect.not.objectContaining({
          reporterUserId: expect.anything(),
        }),
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      issue: { referenceCode: "SWR-20260716-A1B2C3D4", status: "new" },
    });
  });

  it("rejects malformed submissions before the service is called", async () => {
    const response = await request(makeApp())
      .post("/api/support/issues")
      .send({ category: "not-a-category", title: "x" })
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      code: "SUPPORT_ISSUE_VALIDATION_FAILED",
    });
    expect(service.createSupportIssue).not.toHaveBeenCalled();
  });

  it("scopes list, detail, and reply operations to the authenticated reporter", async () => {
    service.listReporterIssues.mockResolvedValue({
      issues: [],
      pagination: { page: 1, pageSize: 20, total: 0, pages: 0 },
    });
    service.getReporterIssue.mockResolvedValue({ id: "issue-1", events: [] });
    service.addReporterReply.mockResolvedValue({
      id: "event-1",
      visibility: "reporter",
    });

    await request(makeApp())
      .get("/api/support/issues?page=1&pageSize=20")
      .expect(200);
    await request(makeApp()).get("/api/support/issues/issue-1").expect(200);
    await request(makeApp())
      .post("/api/support/issues/issue-1/replies")
      .send({ body: "More detail" })
      .expect(201);

    expect(service.listReporterIssues).toHaveBeenCalledWith(
      expect.objectContaining({ reporterUserId: 42 }),
    );
    expect(service.getReporterIssue).toHaveBeenCalledWith({
      reporterUserId: 42,
      issueId: "issue-1",
    });
    expect(service.addReporterReply).toHaveBeenCalledWith({
      reporterUserId: 42,
      issueId: "issue-1",
      body: "More detail",
    });
  });
});

describe("owner issue routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("supports filtered pagination and owner triage without accepting arbitrary fields", async () => {
    service.listOwnerIssues.mockResolvedValue({
      issues: [],
      pagination: { page: 1, pageSize: 25, total: 0, pages: 0 },
    });
    service.updateOwnerIssue.mockResolvedValue({
      id: "issue-1",
      status: "in_progress",
      severity: "critical",
    });

    await request(makeApp())
      .get(
        "/api/admin/support/issues?status=new&severity=high&page=1&pageSize=25",
      )
      .expect(200);
    await request(makeApp())
      .patch("/api/admin/support/issues/issue-1")
      .send({
        status: "in_progress",
        severity: "critical",
        reporterUserId: 999,
        description: "forged",
      })
      .expect(200);

    expect(service.listOwnerIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          status: "new",
          severity: "high",
          page: 1,
          pageSize: 25,
        }),
      }),
    );
    expect(service.updateOwnerIssue).toHaveBeenCalledWith({
      issueId: "issue-1",
      actorUserId: 7,
      changes: { status: "in_progress", severity: "critical" },
    });
  });

  it("accepts a human-readable receipt when marking an issue duplicate", async () => {
    service.updateOwnerIssue.mockResolvedValue({ id: "issue-1", status: "duplicate" });

    await request(makeApp())
      .patch("/api/admin/support/issues/issue-1")
      .send({
        status: "duplicate",
        duplicateOfReferenceCode: "SWR-20260715-A1B2C3D4",
      })
      .expect(200);

    expect(service.updateOwnerIssue).toHaveBeenCalledWith({
      issueId: "issue-1",
      actorUserId: 7,
      changes: {
        status: "duplicate",
        duplicateOfReferenceCode: "SWR-20260715-A1B2C3D4",
      },
    });
  });

  it("creates internal notes and returns a privacy-safe repair prompt", async () => {
    service.addOwnerIssueEvent.mockResolvedValue({
      id: "event-1",
      visibility: "owner",
    });
    service.getIssueRepairPrompt.mockResolvedValue({
      referenceCode: "SWR-20260716-A1B2C3D4",
      prompt: "# Fix issue SWR-20260716-A1B2C3D4",
    });

    await request(makeApp())
      .post("/api/admin/support/issues/issue-1/notes")
      .send({ body: "Investigating route ownership." })
      .expect(201);
    const promptResponse = await request(makeApp())
      .get("/api/admin/support/issues/issue-1/repair-prompt")
      .expect(200);

    expect(service.addOwnerIssueEvent).toHaveBeenCalledWith({
      issueId: "issue-1",
      actorUserId: 7,
      eventType: "internal_note",
      visibility: "owner",
      body: "Investigating route ownership.",
    });
    expect(promptResponse.body.prompt).toContain("SWR-20260716-A1B2C3D4");
  });
});
