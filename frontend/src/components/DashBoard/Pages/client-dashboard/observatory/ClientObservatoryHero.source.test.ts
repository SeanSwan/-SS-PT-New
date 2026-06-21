import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (path: string): string => readFileSync(resolve(__dirname, path), 'utf8');

const SOURCE = readSource('./ClientObservatoryHero.tsx');
const STYLES_SOURCE = readSource('./ClientObservatoryHero.styles.ts');
const ROUTES_SOURCE = readFileSync(
  resolve(__dirname, '../../../UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const ROUTE_COMPONENTS_SOURCE = readFileSync(
  resolve(__dirname, '../../../UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const CLIENT_HOME_SOURCE = readSource('../ClientHomeTab.tsx');
const OBSERVATORY_HOME_SOURCE = readSource('./ClientObservatoryHome.tsx');

describe('ClientObservatoryHero mounted style contract', () => {
  it('is the mounted first-screen hero on the client overview route', () => {
    expect(ROUTE_COMPONENTS_SOURCE).toContain(
      "export const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'))",
    );
    expect(ROUTES_SOURCE).toContain("{ path: '/overview', component: ClientHomeTab");
    expect(CLIENT_HOME_SOURCE).toContain("import ClientObservatoryHome from './observatory/ClientObservatoryHome'");
    expect(CLIENT_HOME_SOURCE).toContain('<ClientObservatoryHome />');
    expect(OBSERVATORY_HOME_SOURCE).toContain("import ClientObservatoryHero from './ClientObservatoryHero'");
    expect(OBSERVATORY_HOME_SOURCE).toContain('<ClientObservatoryHero');
    expect(SOURCE).toContain('<HeroCard aria-label="Client dashboard observatory">');
  });

  it('uses fixed-format hero dimensions instead of viewport-scaled clamp sizing', () => {
    expect(STYLES_SOURCE).not.toContain('clamp(');
    expect(STYLES_SOURCE).toContain("font: 900 4.25rem/0.92 'Plus Jakarta Sans', sans-serif;");
    expect(STYLES_SOURCE).toContain("font: 900 1.55rem/1 'Fira Code', monospace;");
    expect(STYLES_SOURCE).toContain('@media (max-width: 520px)');
  });

  it('keeps the hero motion and source hygiene bounded', () => {
    expect(STYLES_SOURCE).toContain('@media (prefers-reduced-motion: reduce)');
    expect(STYLES_SOURCE).not.toContain('transition: all');
    expect(STYLES_SOURCE).not.toContain('rgba(');
    [SOURCE, STYLES_SOURCE, readSource('./ClientObservatoryHero.source.test.ts')].forEach((source) => {
      expect(source.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
      expect(source).not.toMatch(/[\u00e2\uFFFD]/);
    });
  });
});
