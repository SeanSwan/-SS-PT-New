/**
 * ============================================================================
 * FILE: supportIssueSchemaContract.test.mjs
 * PURPOSE: Prove the Report Room schema, append-only history, centralized model
 *          registry, and exact backend mount order stay aligned.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "../..");

const files = {
  issueModel: resolve(backendRoot, "models/SupportIssue.mjs"),
  eventModel: resolve(backendRoot, "models/SupportIssueEvent.mjs"),
  migration: resolve(
    backendRoot,
    "migrations/20260716030000-create-support-issues.cjs",
  ),
};

function readRequired(path) {
  expect(existsSync(path), `Missing required file: ${path}`).toBe(true);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("Report Room schema contract", () => {
  it("defines an opaque issue record with constrained workflow fields and indexed access paths", () => {
    const model = readRequired(files.issueModel);
    const migration = readRequired(files.migration);

    for (const field of [
      "referenceCode",
      "reporterUserId",
      "assignedOwnerUserId",
      "duplicateOfIssueId",
      "category",
      "severity",
      "status",
      "source",
      "title",
      "description",
      "expectedBehavior",
      "impact",
      "reproductionSteps",
      "diagnostics",
      "firstResponseAt",
      "resolvedAt",
      "closedAt",
    ]) {
      expect(model).toContain(field);
    }
    expect(model).toMatch(/type:\s*DataTypes\.UUID/);
    expect(migration).toMatch(/REFERENCES\s+"Users"|model:\s*'Users'/);
    expect(migration).not.toMatch(/REFERENCES\s+users\b|model:\s*'users'/);
    expect(migration).toContain("support_issues_reporter_created_idx");
    expect(migration).toContain("support_issues_owner_queue_idx");
    expect(migration).toContain("support_issues_reference_code_key");
    expect(migration).toMatch(/CHECK.*status|status.*CHECK/s);
    expect(migration).toMatch(/CHECK.*category|category.*CHECK/s);
  });

  it("defines append-only reporter-visible and owner-only issue history", () => {
    const model = readRequired(files.eventModel);
    const migration = readRequired(files.migration);

    for (const hook of [
      "beforeUpdate",
      "beforeDestroy",
      "beforeBulkUpdate",
      "beforeBulkDestroy",
    ]) {
      expect(model).toContain(hook);
    }
    expect(model).toMatch(/updatedAt:\s*false/);
    expect(model).toContain("visibility");
    expect(model).toContain("eventType");
    expect(migration).toContain("support_issue_events_issue_created_idx");
  });

  it("registers both models in the centralized association cache", () => {
    const associations = readFileSync(
      resolve(backendRoot, "models/associations.mjs"),
      "utf8",
    );
    const index = readFileSync(
      resolve(backendRoot, "models/index.mjs"),
      "utf8",
    );

    expect(associations).toContain("import('./SupportIssue.mjs')");
    expect(associations).toContain("import('./SupportIssueEvent.mjs')");
    expect(associations).toMatch(
      /SupportIssueEvent[\s\S]*belongsTo\(SupportIssue/,
    );
    expect(index).toContain("getModel('SupportIssue')");
    expect(index).toContain("getModel('SupportIssueEvent')");
  });

  it("mounts exact user and owner issue routers before the generic API router", () => {
    const routes = readFileSync(
      resolve(backendRoot, "core/routes.mjs"),
      "utf8",
    );
    const userMount = "app.use('/api/support/issues', supportIssueRoutes)";
    const ownerMount =
      "app.use('/api/admin/support/issues', adminSupportIssueRoutes)";
    const genericMount = "app.use('/api', apiRoutes)";

    expect(routes).toContain(userMount);
    expect(routes).toContain(ownerMount);
    expect(routes.indexOf(userMount)).toBeLessThan(
      routes.indexOf(genericMount),
    );
    expect(routes.indexOf(ownerMount)).toBeLessThan(
      routes.indexOf(genericMount),
    );
  });
});
