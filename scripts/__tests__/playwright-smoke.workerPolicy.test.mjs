import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const smokeSource = readFileSync(resolve(__dirname, '../qa/playwright-smoke.mjs'), 'utf8');

describe('playwright smoke launcher worker policy', () => {
  it('uses the shared local frontend port guard instead of a private probe', () => {
    expect(smokeSource).toContain("from './local-frontend-server.mjs'");
    expect(smokeSource).toContain('await chooseFrontendPort');
    expect(smokeSource).not.toContain('function canListenOnPort');
  });

  it('defaults production and external smoke to one worker while allowing explicit overrides', () => {
    expect(smokeSource).toContain("const workersArg = ownArgs.find(arg => arg.startsWith('--workers='));");
    expect(smokeSource).toContain(
      "const selectedWorkersArg = workersArg || (prod || baseUrlArg || process.env.BASE_URL ? '--workers=1' : '--workers=2');"
    );
    expect(smokeSource).toContain('selectedWorkersArg,');
    expect(smokeSource).toContain('Workers: ${selectedWorkersArg.slice');
  });

  it('chains production smoke into the authenticated dashboard crawl gate', () => {
    expect(smokeSource).toContain("const dashboardCrawlRequiredRoles = 'admin,trainer,client,user';");
    expect(smokeSource).toContain("const shouldRunDashboardCrawl = prod && !ownArgs.includes('--skip-dashboard-crawl');");
    expect(smokeSource).toContain("'playwright-mission.mjs'");
    expect(smokeSource).toContain('`--require-prod-auth-roles=${dashboardCrawlRequiredRoles}`');
    expect(smokeSource).toContain("'--grep=@dashboard-crawl'");
    expect(smokeSource).toContain('SwanStudios authenticated dashboard crawl');
  });
});
