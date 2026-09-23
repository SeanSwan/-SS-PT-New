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
  it("binds a client request UUID to one reporter and one issue", async () => {
    const model = read("models/SupportIssue.mjs");
    const migration = read("migrations/20260716030000-create-support-issues.cjs");
    const service = read("services/support/supportIssueService.mjs");

    expect(model).toContain("clientRequestId");
    expect(migration).toContain("client_request_id UUID NOT NULL");
    expect(migration).toContain("support_issues_reporter_request_key");
    expect(service).toContain("findOrCreate");
    expect(service).toMatch(/where:\s*\{\s*reporterUserId,\s*clientRequestId/);

    // The UUID rule used to be grepped out of the route's source. It now lives in
    // @swan/schemas (SWA-225 EX-5), shared with the Report Room form — so this
    // asserts the rule by EXECUTING it rather than by matching the text of
    // whichever file happens to host it. A source-grep would have gone green on
    // a commented-out line and red on a pure relocation; this cannot do either.
    const { supportIssueCreateSchema } = await import("@swan/schemas");
    const field = supportIssueCreateSchema.shape.clientRequestId;
    expect(field.safeParse("not-a-uuid").success).toBe(false);
    expect(field.safeParse("3f2504e0-4f89-11d3-9a0c-0305e82c3301").success).toBe(true);
  });

  it("rate-limits both new reports and reporter follow-up messages", () => {
    const route = read("routes/supportIssueRoutes.mjs");
    expect(route).toContain("supportIssueCreateLimiter");
    expect(route).toContain("supportIssueReplyLimiter");
    expect(route).toContain('router.post("/:issueId/replies", supportIssueReplyLimiter');
  });
});
