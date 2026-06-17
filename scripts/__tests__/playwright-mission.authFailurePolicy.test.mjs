import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dashboardCrawlSource = readFileSync(
  resolve(__dirname, '../../frontend/e2e/mission/production-dashboard-crawl.mission.spec.ts'),
  'utf8',
);
const liveReadonlySource = readFileSync(
  resolve(__dirname, '../../frontend/e2e/mission/production-live-readonly.mission.spec.ts'),
  'utf8',
);

describe('production mission auth-failure policy', () => {
  it('does not whitelist authenticated subscription 401 reads as crawl noise', () => {
    for (const source of [dashboardCrawlSource, liveReadonlySource]) {
      expect(source).not.toMatch(/401[^\\n]+subscriptions\\\/status|subscriptions\\\/status[^\\n]+401/);
      expect(source).not.toContain('allowedReadFailure');
    }
  });

  it('keeps dashboard crawl read failures actionable without filtering auth failures', () => {
    expect(dashboardCrawlSource).toContain('readFailures: state.readFailures,');
    expect(dashboardCrawlSource).not.toContain('state.readFailures.filter');
  });

  it('requires zero production live read failures for authenticated routes', () => {
    expect(liveReadonlySource).toContain('expect(state.readFailures).toEqual([]);');
    expect(liveReadonlySource).not.toContain('state.readFailures.filter');
  });
});
