/**
 * coachIntakeRouteMount.test.mjs
 * ==============================
 * Source-level guard that the canonical Coach intake API is mounted.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTES_SRC = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const PROPOSAL_ROUTES_SRC = readFileSync(resolve(__dirname, '../../routes/coachProposalRoutes.mjs'), 'utf8');

describe('Coach intake route mount', () => {
  it('mounts the canonical Coach intake API before AI chat uses its context', () => {
    expect(ROUTES_SRC).toMatch(/import coachIntakeRoutes from ['"]\.\.\/routes\/coachIntakeRoutes\.mjs['"]/);
    expect(ROUTES_SRC).toMatch(/app\.use\(['"]\/api\/coach\/intake['"], coachIntakeRoutes\)/);
  });

  it('exposes Coach intake queue health before parameterized item routes', () => {
    const intakeRoutesSrc = readFileSync(resolve(__dirname, '../../routes/coachIntakeRoutes.mjs'), 'utf8');
    const healthIndex = intakeRoutesSrc.indexOf("router.get('/health'");
    const eventsIndex = intakeRoutesSrc.indexOf("router.get('/:id/events'");
    expect(healthIndex).toBeGreaterThan(-1);
    expect(eventsIndex).toBeGreaterThan(-1);
    expect(healthIndex).toBeLessThan(eventsIndex);
  });

  it('mounts the deterministic Coach proposal approval API', () => {
    expect(ROUTES_SRC).toMatch(/import coachProposalRoutes from ['"]\.\.\/routes\/coachProposalRoutes\.mjs['"]/);
    expect(ROUTES_SRC).toMatch(/app\.use\(['"]\/api\/coach\/proposals['"], coachProposalRoutes\)/);
  });

  it('role-gates proposal approval to trainer and admin users server-side', () => {
    expect(PROPOSAL_ROUTES_SRC).toMatch(/import\s+\{\s*protect,\s*authorize\s*\}\s+from\s+['"]\.\.\/middleware\/authMiddleware\.mjs['"]/);
    expect(PROPOSAL_ROUTES_SRC).toMatch(/router\.use\(protect\)/);
    expect(PROPOSAL_ROUTES_SRC).toMatch(/router\.use\(authorize\(\['admin', 'trainer'\]\)\)/);
  });
});
