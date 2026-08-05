/**
 * Active social challenge route truth contract
 * ============================================
 * Locks two production boundaries on GET /api/social/challenges/active:
 * only a genuinely missing relation may degrade to an empty list, and hostile
 * pagination input can never reach Sequelize as a negative limit or offset.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/social/challenges.mjs'),
  'utf8',
);

describe('active social challenge route truth', () => {
  it('uses the shared missing-table classifier instead of swallowing missing-column drift', () => {
    expect(routeSource).toContain("import { isMissingTableError } from '../featureAvailability.mjs';");
    const activeStart = routeSource.indexOf("router.get('/active'");
    const nextRoute = routeSource.indexOf("router.get('/my-challenges'", activeStart);
    const activeRoute = routeSource.slice(activeStart, nextRoute);

    expect(activeRoute).toContain('if (isMissingTableError(error))');
    expect(activeRoute).not.toContain("error.message?.includes('does not exist')");
  });

  it('bounds limit and offset before passing them to Sequelize', () => {
    expect(routeSource).toContain('const parseBoundedInteger =');
    const activeStart = routeSource.indexOf("router.get('/active'");
    const nextRoute = routeSource.indexOf("router.get('/my-challenges'", activeStart);
    const activeRoute = routeSource.slice(activeStart, nextRoute);

    expect(activeRoute).toContain('parseBoundedInteger(req.query.limit, 10, { min: 1, max: 50 })');
    expect(activeRoute).toContain('parseBoundedInteger(req.query.offset, 0, { min: 0, max: 10000 })');
  });
});
