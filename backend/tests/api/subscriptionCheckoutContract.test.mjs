import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (relativePath) =>
  readFileSync(resolve(__dirname, '..', '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

const routeSource = readBackendFile('routes/subscriptionRoutes.mjs');
const modelSource = readBackendFile('models/Subscription.mjs');
const migrationSource = readBackendFile('migrations/20260322000000-create-subscriptions-table.cjs');

function recurringActivationBranch() {
  const match = routeSource.match(
    /if\s*\(\s*session\.mode\s*===\s*['"]subscription['"]\s*\)\s*\{([\s\S]*?)\n\s*\}\n\s*break;/,
  );
  expect(match).toBeTruthy();
  return match?.[1] || '';
}

describe('subscription checkout and recurring activation contract', () => {
  it('documents that subscriptions.userId is indexed but not unique', () => {
    const userIndexBlock = migrationSource.match(
      /addIndex\('subscriptions',\s*\['userId'\],[\s\S]*?\}\);/,
    )?.[0] || '';

    expect(userIndexBlock).toContain("name: 'idx_subscriptions_userId'");
    expect(userIndexBlock).not.toMatch(/unique:\s*true/);
    expect(modelSource).toMatch(/stripeSubscriptionId:\s*\{[\s\S]{0,180}unique:\s*true/);
  });

  it('updates the current user subscription without Subscription.upsert in the recurring webhook branch', () => {
    const branch = recurringActivationBranch();

    expect(branch).not.toContain('Subscription.upsert');
    expect(branch).toMatch(/await\s+sequelize\.transaction\(async\s*\(\s*t\s*\)/);
    expect(branch).toMatch(
      /Subscription\.findOne\(\{\s*where:\s*\{\s*userId\s*\}[\s\S]{0,160}order:\s*\[\['createdAt',\s*'DESC'\]\]/,
    );
    expect(branch).toMatch(/await\s+Subscription\.create\(/);
    expect(branch).toMatch(/UserModel\.update\([\s\S]{0,180}transaction:\s*t/);
  });

  it('keeps subscription checkout server-priced and Stripe-idempotent', () => {
    expect(routeSource).toContain('const tierDef = TIER_DEFINITIONS[tier]');
    expect(routeSource).toContain('unit_amount: Math.round(donationAmount * 100)');
    expect(routeSource).toContain('unit_amount: Math.round(checkoutAmount * 100)');
    expect(routeSource).toContain('subscription-donation-checkout');
    expect(routeSource).toContain('subscription-checkout');
  });

  it('recovers deleted Stripe customers and makes customer creation retry-safe', () => {
    expect(routeSource).toContain('async function ensureSubscriptionStripeCustomer');
    expect(routeSource).toContain('stripeClient.customers.retrieve(user.stripeCustomerId)');
    expect(routeSource).toContain('existingCustomer?.deleted !== true');
    expect(routeSource).toContain("buildStripeIdempotencyKey('subscription-customer'");
    expect(routeSource).toMatch(
      /stripeClient\.customers\.create\(\{[\s\S]*?\},\s*\{\s*idempotencyKey:\s*customerIdempotencyKey\s*\}\)/
    );
    expect(routeSource.match(/ensureSubscriptionStripeCustomer\(/g)?.length).toBe(3);
    expect(routeSource).toContain("if (error?.code !== 'resource_missing') throw error");
  });

  it('blocks overlapping recurring subscriptions and makes paid activation transactional', () => {
    expect(routeSource).toContain("code: 'ACTIVE_SUBSCRIPTION_EXISTS'");
    expect(routeSource).toMatch(
      /stripeSubscriptionId:\s*\{\s*\[Op\.ne\]:\s*null\s*\}[\s\S]*status:\s*\{\s*\[Op\.in\]:\s*\['active',\s*'past_due',\s*'paused'\]/
    );
    expect(routeSource).toContain("if (session.payment_status !== 'paid')");
    expect(routeSource).toContain('async function claimSubscriptionCheckoutSession');
    expect(routeSource).toMatch(
      /INSERT INTO processed_stripe_sessions[\s\S]*transaction,\s*\n\s*\}\s*\);/
    );
    expect(routeSource.match(/claimSubscriptionCheckoutSession\(/g)?.length).toBe(3);
    expect(routeSource.match(/lock:\s*t\.LOCK\.UPDATE/g)?.length).toBeGreaterThanOrEqual(2);

    const guardianMarker = routeSource.indexOf("tier: 'pro',\n                status: 'active'");
    const recurringMarker = routeSource.indexOf('const subscriptionValues = {');

    expect(routeSource.lastIndexOf('claimSubscriptionCheckoutSession', guardianMarker)).toBeGreaterThan(-1);
    expect(routeSource.lastIndexOf('claimSubscriptionCheckoutSession', recurringMarker)).toBeGreaterThan(-1);
  });

  it('derives paid fulfillment values from Stripe objects instead of mutable checkout metadata', () => {
    const recurringBranch = recurringActivationBranch();
    const guardianBranch = routeSource.match(
      /if\s*\(\s*session\.mode\s*===\s*['"]payment['"]\s*\)\s*\{([\s\S]*?)\n\s*\}\n\s*\n\s*\/\/ Crystalline subscription/,
    )?.[1] || '';

    expect(routeSource).toContain('where: { stripeCustomerId }');
    expect(routeSource).toContain('checkoutUser.id !== metadataUserId');
    expect(routeSource).toContain('const userId = checkoutUser.id');
    expect(routeSource).not.toContain('stripeCustomerId: session.customer');
    expect(routeSource).not.toContain('sub.stripeCustomerId = session.customer');
    expect(guardianBranch).toContain('Number(session.amount_total)');
    expect(guardianBranch).not.toContain('session.metadata?.amount');
    expect(recurringBranch).toContain('s.subscriptions.retrieve(stripeSubscriptionId)');
    expect(recurringBranch).toContain("const tier = 'elite'");
    expect(recurringBranch).toContain('price?.unit_amount');
    expect(recurringBranch).toContain('price?.recurring?.interval');
    expect(recurringBranch).toContain('stripeSubscription.current_period_start');
    expect(recurringBranch).toContain('stripeSubscription.current_period_end');
    expect(recurringBranch).not.toContain('session.metadata?.tier');
    expect(recurringBranch).not.toContain('session.metadata?.amount');
    expect(recurringBranch).not.toContain('session.metadata?.billingInterval');
  });

  it('uses Stripe invoice period timestamps instead of guessing renewal dates', () => {
    const renewalBranch = routeSource.match(
      /case 'invoice\.payment_succeeded': \{([\s\S]*?)case 'invoice\.payment_failed':/,
    )?.[1] || '';

    expect(renewalBranch).toContain('lineItem?.period?.start');
    expect(renewalBranch).toContain('lineItem?.period?.end');
    expect(renewalBranch).toContain('new Date(periodStartSeconds * 1000)');
    expect(renewalBranch).toContain('new Date(periodEndSeconds * 1000)');
    expect(renewalBranch).not.toContain('periodEnd.setMonth');
    expect(renewalBranch).not.toContain('periodEnd.setFullYear');
  });

  it('serializes manual grants and never upserts on non-unique userId', () => {
    const grantBranch = routeSource.match(
      /router\.post\('\/admin\/grant'[\s\S]*?export default router/,
    )?.[0] || '';

    expect(grantBranch).not.toContain('Subscription.upsert');
    expect(grantBranch).toContain('Number.isInteger(parsedUserId)');
    expect(grantBranch).toContain('Number.isInteger(parsedDurationMonths)');
    expect(grantBranch).toMatch(/sequelize\.transaction\(async \(t\)/);
    expect(grantBranch).toMatch(/UserModel\.findByPk\(parsedUserId,[\s\S]*lock: t\.LOCK\.UPDATE/);
    expect(grantBranch).toMatch(/Subscription\.findOne\([\s\S]*lock: t\.LOCK\.UPDATE/);
  });

  it('clamps manual grant periods to the last valid day of the target UTC month', () => {
    const helperSource = routeSource.match(
      /function addUtcCalendarMonthsClamped\(startDate, months\) \{[\s\S]*?\n\}/,
    )?.[0] || '';
    expect(helperSource).toContain('result.setUTCDate(1)');
    expect(helperSource).toContain('result.setUTCMonth(result.getUTCMonth() + months)');
    expect(helperSource).toContain('Math.min(originalDay, lastDay)');

    const addMonths = Function(`"use strict"; return (${helperSource});`)();
    expect(addMonths(new Date('2025-01-31T12:34:56.000Z'), 1).toISOString())
      .toBe('2025-02-28T12:34:56.000Z');
    expect(addMonths(new Date('2024-01-31T12:34:56.000Z'), 1).toISOString())
      .toBe('2024-02-29T12:34:56.000Z');
    expect(addMonths(new Date('2025-12-31T12:34:56.000Z'), 2).toISOString())
      .toBe('2026-02-28T12:34:56.000Z');

    const grantBranch = routeSource.match(
      /router\.post\('\/admin\/grant'[\s\S]*?export default router/,
    )?.[0] || '';
    expect(grantBranch).toContain('addUtcCalendarMonthsClamped(now, parsedDurationMonths)');
    expect(grantBranch).not.toContain('periodEnd.setMonth');
  });
});
