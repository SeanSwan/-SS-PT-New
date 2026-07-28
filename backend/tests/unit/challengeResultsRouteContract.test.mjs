import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/gamificationV1Routes.mjs'),
  'utf8',
);

const controllerSource = () => readFileSync(
  resolve(process.cwd(), 'controllers/challengeResultsController.mjs'),
  'utf8',
);

describe('managed challenge results route contract', () => {
  it('exposes trainer/admin challenge results before the public challenge detail route', () => {
    expect(routeSource).toContain("import challengeResultsController from '../controllers/challengeResultsController.mjs';");
    expect(routeSource).toContain("router.get('/challenges/:id/results', authenticate, requireTrainer, challengeResultsController.getManagedChallengeResults);");

    const resultsRouteIndex = routeSource.indexOf("router.get('/challenges/:id/results'");
    const publicDetailRouteIndex = routeSource.indexOf("router.get('/challenges/:id', challengeController.getChallengeById);");

    expect(resultsRouteIndex).toBeGreaterThan(-1);
    expect(publicDetailRouteIndex).toBeGreaterThan(-1);
    expect(resultsRouteIndex).toBeLessThan(publicDetailRouteIndex);
  });

  it('keeps results controller logic in the service layer instead of the large challenge controller', () => {
    const source = controllerSource();

    expect(source).toContain("from '../services/gamification/challengeResultsService.mjs';");
    expect(source).toContain('ChallengeResultsReadError');
    expect(source).toContain('getManagedChallengeResults({');
  });
});