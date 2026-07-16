/**
 * Static cross-layer contract for retry-safe support issue creation.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(resolve(backendRoot, relative), "utf8");

describe("Report Room creation idempotency", () => {
  it("binds a client request UUID to one reporter and one issue", () => {
    const model = read("models/SupportIssue.mjs");
    const migration = read("migrations/20260716030000-create-support-issues.cjs");
    const route = read("routes/supportIssueRoutes.mjs");
    const service = read("services/support/supportIssueService.mjs");

    expect(model).toContain("clientRequestId");
    expect(migration).toContain("client_request_id UUID NOT NULL");
    expect(migration).toContain("support_issues_reporter_request_key");
    expect(route).toMatch(/clientRequestId:\s*z\.string\(\)\.uuid\(\)/);
    expect(service).toContain("findOrCreate");
    expect(service).toMatch(/where:\s*\{\s*reporterUserId,\s*clientRequestId/);
  });

  it("rate-limits both new reports and reporter follow-up messages", () => {
    const route = read("routes/supportIssueRoutes.mjs");
    expect(route).toContain("supportIssueCreateLimiter");
    expect(route).toContain("supportIssueReplyLimiter");
    expect(route).toContain('router.post("/:issueId/replies", supportIssueReplyLimiter');
  });
});
