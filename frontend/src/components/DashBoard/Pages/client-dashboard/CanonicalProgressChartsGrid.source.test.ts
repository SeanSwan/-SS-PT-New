import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readLocal = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

const routeComponentsSource = readLocal('../../UniversalDashboardLayout.routeComponents.tsx');
const dashboardRoutesSource = readLocal('../../UniversalDashboardLayout.routes.tsx');
const pageSource = readLocal('./ClientProgressDashboardPage.tsx');
const gridSource = readLocal('./CanonicalProgressChartsGrid.tsx');
const stylesSource = readLocal('./CanonicalProgressChartsGrid.styles.ts');
const primaryCardsSource = readLocal('./CanonicalProgressChartsGrid.primaryCards.tsx');
const detailCardsSource = readLocal('./CanonicalProgressChartsGrid.detailCards.tsx');
const interactiveCardsSource = readLocal('./CanonicalProgressChartsGrid.interactiveCards.tsx');
const recoveryObservatorySource = readLocal('../../progress/ProgressChartRecoveryObservatory.tsx');
const recoveryObservatoryStylesSource = readLocal('../../progress/ProgressChartRecoveryObservatory.styles.ts');
const framerGestureProps = new RegExp(['while' + 'Hover', 'while' + 'Tap'].join('|'));

const mountedProgressSources = [
  pageSource,
  gridSource,
  stylesSource,
  primaryCardsSource,
  detailCardsSource,
  interactiveCardsSource,
  recoveryObservatorySource,
  recoveryObservatoryStylesSource,
].join('\n');

describe('CanonicalProgressChartsGrid mounted source contract', () => {
  it('locks the canonical client progress route chain', () => {
    expect(routeComponentsSource).toContain('export const ClientProgressDashboardPage = React.lazy(');
    expect(routeComponentsSource).toContain(
      "() => import('./Pages/client-dashboard/ClientProgressDashboardPage')"
    );
    expect(dashboardRoutesSource).toContain(
      "{ path: '/progress', component: ClientProgressDashboardPage"
    );
    expect(pageSource).toContain("const CanonicalProgressChartsGrid = React.lazy(");
    expect(pageSource).toContain("() => import('./CanonicalProgressChartsGrid')");
    expect(pageSource).toContain('<CanonicalProgressChartsGrid />');
    expect(gridSource).toContain('useClientProgressCharts()');
    expect(gridSource).toContain('data-testid="canonical-progress-charts-grid"');
    expect(gridSource).toContain('<ProgressChartRecoveryObservatory charts={charts} />');
  });

  it('keeps mounted client progress chart source tokenized and fixed-format', () => {
    expect(mountedProgressSources).not.toMatch(/rgba\(/);
    expect(mountedProgressSources).not.toMatch(/clamp\(/);
    expect(mountedProgressSources).not.toMatch(/transition:\s*all/);
    expect(mountedProgressSources).not.toMatch(/style=\{\{/);
    expect(mountedProgressSources).not.toMatch(framerGestureProps);
    expect(stylesSource).toContain('color-mix(in srgb');
    expect(recoveryObservatoryStylesSource).toContain('color-mix(in srgb');
    expect(stylesSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(gridSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(recoveryObservatorySource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(recoveryObservatoryStylesSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
