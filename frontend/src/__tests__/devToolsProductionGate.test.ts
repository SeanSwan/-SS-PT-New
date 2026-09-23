import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('dev tools production gate', () => {
  it('keeps debug routes behind a dev-only lazy import', () => {
    const source = read('src/routes/main-routes.tsx');

    expect(source).not.toContain("import DebugRoutes from './debug-routes'");
    expect(source).toContain('const DebugRoutes = import.meta.env.DEV');
    expect(source).toContain("() => import('./debug-routes')");
  });

  it('keeps header debug widgets behind dev-only lazy imports', () => {
    const source = read('src/components/Header/header.tsx');

    expect(source).not.toContain("import Debug from '../Debug/Debug'");
    expect(source).not.toContain("import { UserSwitcher } from '../UserSwitcher'");
    expect(source).toContain('const Debug = import.meta.env.DEV');
    expect(source).toContain("() => import('../Debug/Debug')");
    expect(source).toContain("() => import('../UserSwitcher')");
  });

  it('uses Vite env checks instead of browser-unsafe process.env in DevToolsProvider', () => {
    const source = read('src/components/DevTools/DevToolsProvider.tsx');

    expect(source).not.toContain("import DevLoginPanel from './DevLoginPanel'");
    expect(source).not.toContain("import DevToolsErrorBoundary from './DevToolsErrorBoundary'");
    expect(source).not.toContain('process.env.NODE_ENV');
    expect(source).toContain('const DevLoginPanel = import.meta.env.DEV');
    expect(source).toContain("React.lazy(() => import('./DevLoginPanel'))");
  });

  it('keeps app-level debug utilities out of the production import graph', () => {
    const appSource = read('src/App.tsx');
    const apiServiceSource = read('src/services/api.service.ts');
    const clearCacheSource = read('src/utils/clearCache.js');
    const paymentDiagnosticsSource = read('src/utils/paymentDiagnostics.ts');

    expect(appSource).not.toContain("import './utils/clearCache'");
    expect(appSource).not.toContain("import { monitorRouting } from './utils/routeDebugger'");
    expect(appSource).toContain('if (import.meta.env.DEV)');
    expect(appSource).toContain("import('./utils/routeDebugger')");
    expect(appSource).toContain("import('./utils/clearCache')");

    expect(apiServiceSource).toContain("if (import.meta.env.DEV && typeof window !== 'undefined')");
    expect(clearCacheSource).toContain("if (import.meta.env.DEV && typeof window !== 'undefined')");
    expect(paymentDiagnosticsSource).toContain("if (import.meta.env.DEV && typeof window !== 'undefined')");
  });

  // D-03: the barrel itself must not statically re-export the ungated debug
  // components — a named import of DevToolsProvider would otherwise pull
  // DevTools.tsx (and its static DevLogin import) into the prod graph.
  it('keeps the DevTools barrel free of ungated static re-exports (D-03)', () => {
    const source = read('src/components/DevTools/index.ts');

    expect(source).not.toContain("from './DevTools'");
    expect(source).not.toContain("from './DevLoginPanel'");
    expect(source).not.toContain("from './ApiDebugger'");
    expect(source).not.toContain("from './DevLogin'");
    expect(source).not.toContain("from './CrossDashboardDebugger'");
    expect(source).toContain("from './DevToolsProvider'");
  });
});
