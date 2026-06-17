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
});
