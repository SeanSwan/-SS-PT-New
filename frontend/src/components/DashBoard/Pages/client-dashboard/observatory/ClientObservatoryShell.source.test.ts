import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (path: string): string => readFileSync(resolve(__dirname, path), 'utf8');

const SHELL_SOURCE = readSource('./ClientObservatoryShell.styles.ts');
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
const HERO_SOURCE = readSource('./ClientObservatoryHero.tsx');
const FEED_SOURCE = readSource('./ClientObservatoryFeed.tsx');
const WIDGETS_SOURCE = readSource('./ClientObservatoryWidgets.tsx');
const forbiddenFragments = ['cl' + 'amp(', 'rg' + 'ba(', 'transition:' + ' all'];

describe('ClientObservatoryShell mounted source contract', () => {
  it('is shared by the canonical client overview observatory route', () => {
    expect(ROUTE_COMPONENTS_SOURCE).toContain(
      "export const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'))",
    );
    expect(ROUTES_SOURCE).toContain("{ path: '/overview', component: ClientHomeTab");
    expect(CLIENT_HOME_SOURCE).toContain("import ClientObservatoryHome from './observatory/ClientObservatoryHome'");
    expect(CLIENT_HOME_SOURCE).toContain('<ClientObservatoryHome />');
    expect(OBSERVATORY_HOME_SOURCE).toContain("from './ClientObservatoryShell.styles'");
    expect(HERO_SOURCE).toContain("from './ClientObservatoryShell.styles'");
    expect(FEED_SOURCE).toContain("from './ClientObservatoryShell.styles'");
    expect(WIDGETS_SOURCE).toContain("from './ClientObservatoryShell.styles'");
  });

  it('keeps shared observatory shell primitives fixed-format and tokenized', () => {
    forbiddenFragments.forEach((fragment) => {
      expect(SHELL_SOURCE).not.toContain(fragment);
    });
    expect(SHELL_SOURCE).toContain('color-mix(in srgb');
    expect(SHELL_SOURCE).toContain('@media (prefers-reduced-motion: reduce)');
    expect(SHELL_SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(SHELL_SOURCE).not.toMatch(/[\u00e2\uFFFD]/);
  });
});
