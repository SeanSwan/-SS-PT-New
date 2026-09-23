/**
 * ============================================================================
 * FILE: supportIssueSharedSchema.test.mjs
 * PURPOSE: The BACKEND half of the one-contract-both-ends control (SWA-225 EX-5).
 *
 * WHY IT EXISTS — it was written because the control FAILED HALF-WAY. Loosening
 * `title.min(4)` in packages/swan-schemas/supportIssue.mjs correctly broke the
 * Report Room form's suite, and the backend's ten support test files stayed
 * green at 43/43: nothing on this side had ever exercised that rule. The
 * schema was genuinely shared, but only one end could PROVE it, and a control
 * that fires on one end is not the control the slice claimed.
 *
 * These assertions run the shared object the route actually uses, so the pair
 * of suites now behaves as one: change a rule in the package and BOTH ends go
 * red, which is the entire point of moving it there.
 *
 * THE CONTROL, to re-run any time:
 *   loosen a rule in packages/swan-schemas/supportIssue.mjs, then
 *     backend:  npx vitest run tests/unit/supportIssueSharedSchema.test.mjs
 *     frontend: npx vitest run src/pages/support/SupportReportComposer.sharedSchema.test.tsx
 *   Both must fail. Restore afterwards.
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import { supportIssueCreateSchema } from '@swan/schemas';

describe('Report Room create contract — the backend end of the shared schema', () => {
  it('resolves the shared package from the backend at all', () => {
    // If the file: dependency or the export surface ever breaks, this is the
    // first thing to fail, and it says so plainly instead of surfacing as a
    // confusing validation error three layers up.
    expect(typeof supportIssueCreateSchema?.safeParse).toBe('function');
  });

  it('enforces the title floor the form promises the user', () => {
    const base = {
      clientRequestId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      category: 'bug',
      description: 'Ten or more characters of description.',
    };
    expect(supportIssueCreateSchema.safeParse({ ...base, title: 'abc' }).success).toBe(false);
    expect(supportIssueCreateSchema.safeParse({ ...base, title: 'abcd' }).success).toBe(true);
  });

  it('enforces the description floor', () => {
    const base = {
      clientRequestId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      category: 'bug',
      title: 'A valid title',
    };
    expect(supportIssueCreateSchema.safeParse({ ...base, description: '123456789' }).success).toBe(false);
    expect(supportIssueCreateSchema.safeParse({ ...base, description: '1234567890' }).success).toBe(true);
  });

  it('caps reproduction steps at 12, and each step at 500 characters', () => {
    const base = {
      clientRequestId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      category: 'bug',
      title: 'A valid title',
      description: 'Ten or more characters of description.',
    };
    const step = 'do the thing';
    expect(supportIssueCreateSchema.safeParse({ ...base, reproductionSteps: Array(12).fill(step) }).success).toBe(true);
    expect(supportIssueCreateSchema.safeParse({ ...base, reproductionSteps: Array(13).fill(step) }).success).toBe(false);
    expect(supportIssueCreateSchema.safeParse({ ...base, reproductionSteps: ['x'.repeat(501)] }).success).toBe(false);
  });

  it('applies the documented defaults so an omitted optional never reaches the DB as undefined', () => {
    const parsed = supportIssueCreateSchema.parse({
      clientRequestId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      category: 'bug',
      title: 'A valid title',
      description: 'Ten or more characters of description.',
    });
    expect(parsed.severity).toBe('medium');
    expect(parsed.source).toBe('text');
    expect(parsed.expectedBehavior).toBe('');
    expect(parsed.impact).toBe('');
    expect(parsed.reproductionSteps).toEqual([]);
    expect(parsed.diagnostics).toEqual({});
  });
});
