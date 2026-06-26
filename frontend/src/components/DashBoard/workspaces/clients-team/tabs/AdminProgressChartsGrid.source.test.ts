import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readLocal = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

const routeComponentsSource = readLocal('../../../UniversalDashboardLayout.routeComponents.tsx');
const routesSource = readLocal('../../../UniversalDashboardLayout.routes.tsx');
const workspaceSource = readLocal('../../ClientsWorkspace.tsx');
const workspaceTabsSource = readLocal('../../ClientsWorkspaceTabs.tsx');
const detailViewSource = readLocal('../ClientDetailView.tsx');
const progressTabSource = readLocal('./ProgressTabContent.tsx');
const gridSource = readLocal('./AdminProgressChartsGrid.tsx');
const deckSource = readLocal('./AdminProgressChartsGrid.cards.tsx');
const primaryCardsSource = readLocal('./AdminProgressChartsGrid.primaryCards.tsx');
const detailCardsSource = readLocal('./AdminProgressChartsGrid.detailCards.tsx');
const stylesSource = readLocal('./AdminProgressChartsGrid.styles.ts');

const mountedProgressSources = [
  progressTabSource,
  gridSource,
  deckSource,
  primaryCardsSource,
  detailCardsSource,
  stylesSource,
].join('\n');

describe('AdminProgressChartsGrid mounted source contract', () => {
  it('locks the canonical admin client progress route chain', () => {
    expect(routesSource).toContain("{ path: '/client-management'");
    expect(routesSource).toContain('component: ClientsWorkspace');
    expect(routeComponentsSource).toContain(
      "export const ClientsWorkspace = React.lazy(() => import('./workspaces/ClientsWorkspace'))"
    );
    expect(workspaceSource).toContain('useClientsWorkspaceTabRenderers');
    expect(workspaceSource).toContain('renderProgress={renderProgress}');
    expect(workspaceTabsSource).toContain(
      "const ProgressTabContent = lazy(() => import('./clients-team/tabs/ProgressTabContent'))"
    );
    expect(workspaceTabsSource).toContain(
      '<ProgressTabContent clientId={clientId} clientName={clientName(selectedClient)} />'
    );
    expect(detailViewSource).toContain("case 'progress':");
    expect(progressTabSource).toContain("() => import('./AdminProgressChartsGrid')");
    expect(gridSource).toContain('useAdminClientProgressCharts(clientId)');
    expect(gridSource).toContain('<ProgressChartCube');
    expect(gridSource).toContain('<ProgressChartWarRoomBoard');
    expect(gridSource).toContain('<ProgressChartRecoveryObservatory charts={charts} />');
    expect(gridSource).toContain('<ExerciseCodexMatrix loggedExercises={charts.exerciseFrequency} />');
    expect(gridSource).toContain('<AdminProgressChartDeck charts={charts} activeLensId={activeLensId} />');
  });

  it('keeps mounted admin progress source readable and tokenized', () => {
    expect(mountedProgressSources).not.toMatch(/[\x80-\uFFFF]/);
    expect(mountedProgressSources).not.toMatch(/rgba\(/);
    expect(mountedProgressSources).not.toMatch(/clamp\(/);
    expect(mountedProgressSources).not.toMatch(/transition:\s*all/);
    expect(mountedProgressSources).not.toMatch(/style=\{\{/);
    expect(mountedProgressSources).toContain('color-mix(in srgb');
    expect(progressTabSource).toContain('color: var(--text-muted, color-mix');
    expect(stylesSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(progressTabSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(120);
  });
});
