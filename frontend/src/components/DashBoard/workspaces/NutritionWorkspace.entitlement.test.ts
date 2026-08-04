/**
 * Nutrition entitlement gate — do not accuse a paying customer.
 *
 * `useSubscription().loading` initialises TRUE and `subscription` stays null if
 * the status call fails. NutritionWorkspace read only {isPro, isElite, isTrial},
 * so a PAYING Pro/Elite member was shown "Upgrade to Swan Guardian" over Speak
 * a Meal, Meal Planning and Nutrition Intelligence for the entire pending
 * window of every page load — and permanently after a failed fetch — with the
 * CTA pointing at /ascension to re-buy what they already own.
 *
 * Source-level because the workspace mounts ~15 hooks; the derivation is the
 * defect, and it is what this pins.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'NutritionWorkspace.tsx'), 'utf8');

describe('nutrition entitlement gate', () => {
  it('reads the subscription fetch state, not just the entitlement booleans', () => {
    expect(source).toMatch(/loading:\s*subscriptionLoading/);
    expect(source).toMatch(/error:\s*subscriptionError/);
    expect(source).toContain('const entitlementKnown = !subscriptionLoading && !subscriptionError');
  });

  it('never locks a member while entitlement is unknown', () => {
    // The lock may only assert a LACK of access, and only once known.
    expect(source).toContain('hasGuardianAccess || !entitlementKnown');
  });

  it('uses the hook\'s own derivation instead of re-deriving the policy', () => {
    // `isPro || isElite || isTrial` duplicated useSubscription's
    // hasGuardianAccess — two copies of one entitlement rule drift.
    expect(source).not.toMatch(/const hasAINutrition = isPro \|\| isElite \|\| isTrial/);
    expect(source).toContain('hasGuardianAccess');
  });

  it('still locks a member who is genuinely on the free tier', () => {
    // hasAINutrition must be false when entitlement IS known and absent —
    // i.e. the expression must depend on hasGuardianAccess, not be a constant.
    const match = source.match(/const hasAINutrition = ([^;]+);/);
    expect(match).toBeTruthy();
    expect(match?.[1]).toContain('hasGuardianAccess');
    expect(match?.[1]).not.toMatch(/^\s*true\s*$/);
  });
});
