/**
 * Admin Design Studio source contracts.
 *
 * These locks keep parked redesigns browsable only through admin preview routes and prevent the retired
 * the retired build-time playground environment gate from returning.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function resolveSrcRoot(): string {
  for (const candidate of [resolve(process.cwd(), 'src'), resolve(process.cwd(), 'frontend/src')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot locate frontend/src from cwd=${process.cwd()}`);
}

const SRC_ROOT = resolveSrcRoot();
const readSource = (path: string): string => {
  const target = resolve(SRC_ROOT, path);
  return existsSync(target) ? readFileSync(target, 'utf8') : '';
};

const mainRoutes = readSource('routes/main-routes.tsx');
const appLayout = readSource('components/Layout/layout.tsx');
const roleRoutes = readSource('components/DashBoard/UniversalDashboardLayout.routes.tsx');
const routeComponents = readSource('components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const dashboardTabs = readSource('config/dashboard-tabs.ts');
const studio = readSource('pages/DesignPlayground/DesignPlaygroundLayout.tsx');
const studioStyles = readSource('pages/DesignPlayground/DesignPlaygroundLayout.styles.ts');
const legacyViewer = readSource('pages/DesignPlayground/LegacyConceptPreviewPage.tsx');
const parkedPreview = studio;
const registry = readSource('pages/DesignPlayground/playgroundRegistry.ts');

const PARKED_IDS = ['home', 'store', 'about', 'contact', 'video', 'gallery', 'dashboard'] as const;
const RETIRED_PLAYGROUND_ENV = ['VITE', 'DESIGN', 'PLAYGROUND'].join('_');

describe('admin Design Studio restoration', () => {
  it('mounts the Studio in the live admin dashboard and sidebar', () => {
    expect(routeComponents).toContain("import('../../pages/DesignPlayground/DesignPlaygroundLayout')");
    expect(roleRoutes).toMatch(/path:\s*'\/design-playground',[^\n]*component:\s*DesignPlaygroundLayout/);
    expect(dashboardTabs).toMatch(/label:\s*'Design Studio'[^\n]*prefix:\s*'\/dashboard\/admin\/design-playground'/);
  });

  it('removes the build-time playground gate and protects both full-page viewers as admin-only', () => {
    expect(mainRoutes).not.toContain(RETIRED_PLAYGROUND_ENV);
    expect(mainRoutes).toMatch(/path:\s*'designs\/:id',[\s\S]*?<ProtectedRoute requiredRole="admin">[\s\S]*?<LegacyConceptPreviewPage/);
    expect(mainRoutes).toMatch(/path:\s*'design-previews\/:id',[\s\S]*?<ProtectedRoute requiredRole="admin">[\s\S]*?<ParkedPreviewPage/);
    expect(legacyViewer).toContain("'/dashboard/admin/design-playground'");
  });

  it('registers all seven parked surfaces in the one preview-only manifest', () => {
    expect(registry).toContain("status: 'parked'");
    expect(registry).toContain('mobbinRefs: []');
    for (const id of PARKED_IDS) {
      expect(registry, `missing parked registry id ${id}`).toContain(`id: '${id}'`);
    }
    expect(registry.match(/status:\s*'parked'/g)).toHaveLength(PARKED_IDS.length);
    expect(mainRoutes).not.toContain('playgroundRegistry');
  });

  it('labels previews honestly and exposes desktop, tablet, and mobile viewport controls', () => {
    expect(studio).toContain('PREVIEW — not live');
    for (const viewport of ['Desktop', 'Tablet', 'Mobile']) {
      expect(studio).toContain(viewport);
    }
    expect(studio).toContain('/design-previews/');
    expect(parkedPreview).toContain('getPlaygroundEntry');
  });

  it('makes parked previews mechanically read-only on both iframe and direct routes', () => {
    expect(studio).toContain('READ-ONLY PREVIEW');
    expect(studio).toContain("setAttribute('inert', '')");
    expect(studio).toContain('onClickCapture={blockPreviewInteraction}');
    expect(studio).toContain('onSubmitCapture={blockPreviewInteraction}');
    expect(studio).toMatch(/<PreviewReadOnlyBoundary>[\s\S]*?<Preview \/>[\s\S]*?<\/PreviewReadOnlyBoundary>/);
    expect(studio).toMatch(/<PreviewReadOnlyRoot[\s\S]*?\{children\}[\s\S]*?<\/PreviewReadOnlyRoot>/);
    expect(studioStyles).toMatch(/PreviewReadOnlyRoot[\s\S]*?pointer-events:\s*none/);
    expect(studioStyles).toMatch(/PreviewReadOnlyNotice[\s\S]*?position:\s*sticky/);
    expect(appLayout).toContain("location.pathname.startsWith('/design-previews/')");
    expect(appLayout).toContain('!isDesignPreviewRoute && <Header />');
    expect(appLayout).toContain('!isDesignPreviewRoute && <Footer />');
  });
});