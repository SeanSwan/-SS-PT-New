/**
 * Owner-to-reporter reply contract for the private Report Room inbox.
 */
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const addOwnerIssueEvent = vi.hoisted(() => vi.fn());

vi.mock("../../middleware/authMiddleware.mjs", () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: "admin", email: "owner@example.com" };
    next();
  },
  rateLimiter: () => (_req, _res, next) => next(),
}));

vi.mock("../../middleware/supportOwnerOnly.mjs", () => ({
  requireSupportOwner: (_req, _res, next) => next(),
}));

vi.mock("../../services/support/supportIssueOwnerService.mjs", () => ({
  addOwnerIssueEvent,
  getIssueRepairPrompt: vi.fn(),
  getOwnerIssue: vi.fn(),
  listOwnerIssues: vi.fn(),
  updateOwnerIssue: vi.fn(),
}));

const { default: routes } = await import("../../routes/adminSupportIssueRoutes.mjs");

describe("owner reporter replies", () => {
  it("creates a reporter-visible owner_reply event", async () => {
    addOwnerIssueEvent.mockResolvedValue({
      id: "event-1",
      eventType: "owner_reply",
      visibility: "reporter",
      body: "I am investigating this now.",
    });
    const app = express();
    app.use(express.json());
    app.use("/api/admin/support/issues", routes);

    await request(app)
      .post("/api/admin/support/issues/issue-1/replies")
      .send({ body: "I am investigating this now." })
      .expect(201);

    expect(addOwnerIssueEvent).toHaveBeenCalledWith({
      issueId: "issue-1",
      actorUserId: 7,
      eventType: "owner_reply",
      visibility: "reporter",
      body: "I am investigating this now.",
    });
  });
});
