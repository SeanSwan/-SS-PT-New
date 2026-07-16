/**
 * ============================================================================
 * FILE: supportIssuePrivacy.test.mjs
 * PURPOSE: Lock Report Room diagnostics and repair prompts to a de-identified,
 *          allowlisted contract before any user text can reach another agent.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import { describe, expect, it } from "vitest";

import {
  buildAiRepairPrompt,
  redactSupportText,
  sanitizeSupportDiagnostics,
} from "../../services/support/supportIssuePrivacy.mjs";

describe("sanitizeSupportDiagnostics", () => {
  it("keeps only allowlisted technical facts and strips query strings and fragments", () => {
    const sanitized = sanitizeSupportDiagnostics({
      url: "https://sswanstudios.com/user-dashboard?token=secret#private",
      route: "/user-dashboard?clientName=Private",
      correlationId: "corr_ABC-123",
      errorCode: "WORKOUT_SAVE_FAILED",
      appVersion: "web-2026.07.16",
      viewport: { width: 414, height: 896, devicePixelRatio: 3 },
      browser: { family: "Safari", majorVersion: "18" },
      localStorage: { token: "secret" },
      userName: "Private Client",
      freeText: "must never pass",
    });

    expect(sanitized).toEqual({
      path: "/user-dashboard",
      correlationId: "corr_ABC-123",
      errorCode: "WORKOUT_SAVE_FAILED",
      appVersion: "web-2026.07.16",
      viewport: { width: 414, height: 896, devicePixelRatio: 3 },
      browser: { family: "Safari", majorVersion: "18" },
    });
    expect(JSON.stringify(sanitized)).not.toMatch(
      /secret|Private|token|localStorage/,
    );
  });

  it("drops malformed, oversized, and out-of-range diagnostic values", () => {
    expect(
      sanitizeSupportDiagnostics({
        route: "javascript:alert(1)",
        correlationId: "x".repeat(200),
        errorCode: "../../private",
        viewport: { width: -1, height: 99_999, devicePixelRatio: 50 },
        browser: { family: "<script>", majorVersion: "many" },
      }),
    ).toEqual({});
  });
});

describe("redactSupportText", () => {
  it("redacts known reporter identity, email, phone, bearer token, and URL query data", () => {
    const redacted = redactSupportText(
      "Sean Example sean@example.com called +1 (555) 222-9999. " +
        "Bearer abc.def.ghi failed at https://app.test/path?token=private.",
      { knownValues: ["Sean Example"] },
    );

    expect(redacted).not.toContain("Sean Example");
    expect(redacted).not.toContain("sean@example.com");
    expect(redacted).not.toContain("555");
    expect(redacted).not.toContain("abc.def.ghi");
    expect(redacted).not.toContain("token=private");
    expect(redacted).toContain("[REPORTER]");
    expect(redacted).toContain("[EMAIL]");
    expect(redacted).toContain("[PHONE]");
    expect(redacted).toContain("[TOKEN]");
    expect(redacted).toContain("https://app.test/path");
  });
});

describe("buildAiRepairPrompt", () => {
  it("creates a paste-ready engineering prompt without reporter identity or internal notes", () => {
    const prompt = buildAiRepairPrompt({
      issue: {
        referenceCode: "SWR-20260716-A1B2C3D4",
        category: "workout",
        severity: "high",
        title: "Sean Example cannot save a workout",
        description: "Email sean@example.com sees a save failure.",
        expectedBehavior: "The workout saves once.",
        impact: "Blocks the current session.",
        reproductionSteps: [
          "Open https://app.test/workout?client=Private",
          "Press Save",
        ],
        diagnostics: { path: "/workout", errorCode: "WORKOUT_SAVE_FAILED" },
        internalNotes: "Never send this operator-only note.",
      },
      reporter: {
        firstName: "Sean",
        lastName: "Example",
        email: "sean@example.com",
      },
    });

    expect(prompt).toContain("Issue SWR-20260716-A1B2C3D4");
    expect(prompt).toContain("## What happened");
    expect(prompt).toContain("## Expected behavior");
    expect(prompt).toContain("## Impact");
    expect(prompt).toContain("## Reproduction steps");
    expect(prompt).toContain("## Privacy-safe diagnostics");
    expect(prompt).toContain("Do not expose or request PII");
    expect(prompt).not.toMatch(/Sean|Example|sean@example\.com|operator-only/);
  });
});
