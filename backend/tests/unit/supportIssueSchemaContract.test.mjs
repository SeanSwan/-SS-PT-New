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

/**
 * Drop block and line comments so an ordering assertion cannot be defeated by a
 * comment that QUOTES the code it is talking about. Deliberately naive; it only
 * has to tell code from prose in a routes file.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
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

  it("keeps model validators and named indexes aligned with the migration", () => {
    const issueModel = readRequired(files.issueModel);
    const eventModel = readRequired(files.eventModel);

    expect(issueModel).toContain('support_issues_assignee_status_idx');
    expect(issueModel).toContain('where: { status: { [Op.ne]: "closed" } }');
    expect(issueModel).toContain('{ name: "last_activity_at", order: "DESC" }');
    expect(issueModel.match(/validate: \{ len: \[0, 4000\] \}/g)).toHaveLength(3);
    expect(eventModel).toContain('support_issue_events_actor_created_idx');
    expect(eventModel).toContain('validate: { len: [0, 8000] }');
  });

  it("keeps reporter and owner service modules below the 300-line cap", () => {
    const reporterService = readRequired(resolve(backendRoot, "services/support/supportIssueService.mjs"));
    const ownerService = readRequired(resolve(backendRoot, "services/support/supportIssueOwnerService.mjs"));
    expect(reporterService.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(ownerService.split(/\r?\n/).length).toBeLessThanOrEqual(300);
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
    expect(migration).toContain("support_issue_events_append_only");
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON support_issue_events/);
    expect(migration).toContain("DROP FUNCTION IF EXISTS prevent_support_issue_event_mutation()");
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
    // Comments must be stripped BEFORE any indexOf ordering check. core/routes.mjs
    // carries a NOTE that quotes the string "the `app.use('/api', apiRoutes)`
    // fallback further down this file" — so a raw indexOf resolved the generic mount
    // to that COMMENT, which sits far ABOVE the exact mounts, instead of to the real
    // mount far below them. The assertion then failed even though the mounts were
    // correctly ordered. It was a false positive sitting in the failing-test
    // baseline, and it meant the invariant this test exists to protect was not
    // actually being checked.
    //
    // Deliberately no line numbers here: a later commit of mine edited that very
    // comment block and shifted every line after it, which invalidated the numbers
    // an earlier version of this note quoted. The CONDITION is stable; coordinates
    // in a routes file are a timestamp, not a fact.
    const routes = stripComments(
      readFileSync(resolve(backendRoot, "core/routes.mjs"), "utf8"),
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
