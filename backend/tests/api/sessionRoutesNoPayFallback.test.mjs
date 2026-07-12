import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');

function routeBlockBefore(index) {
  const routeStart = routeSource.lastIndexOf('router.', index);
  return routeSource.slice(Math.max(0, routeStart), index);
}

describe('legacy sessionRoutes no-pay fallback guards', () => {
  it('uses centralized non-deducting policy instead of source-only booking checks', () => {
    expect(routeSource).not.toContain('NON_BOOKING_CLIENT_SOURCES.has');
    expect(routeSource).not.toContain('NON_DEDUCTING_CLIENT_SOURCES');

    const policyGuardCount = (routeSource.match(/isNonDeductingClient\((?:user|client)\)/g) || []).length;
    expect(policyGuardCount).toBeGreaterThanOrEqual(7);
  });

  it('keeps direct legacy credit mutations behind no-pay-aware guards', () => {
    const mutations = [...routeSource.matchAll(/(?:user|client)\.availableSessions -= (?:1|sessionsNeeded);/g)];
    expect(mutations.length).toBeGreaterThan(0);

    for (const mutation of mutations) {
      const mutationText = mutation[0];
      const subject = mutationText.startsWith('user.') ? 'user' : 'client';
      const precedingRouteBlock = routeBlockBefore(mutation.index ?? 0);

      expect(precedingRouteBlock).toContain(`isNonDeductingClient(${subject})`);
      expect(precedingRouteBlock).not.toContain(`NON_BOOKING_CLIENT_SOURCES.has(${subject}.clientSource)`);
    }
  });
});
