import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const uiDir = __dirname;
const srcDir = resolve(uiDir, '../..');

const boundarySource = readFileSync(resolve(uiDir, './ErrorBoundary.tsx'), 'utf8');
const scheduleSource = readFileSync(
  resolve(srcDir, './components/UniversalMasterSchedule/UniversalMasterSchedule.tsx'),
  'utf8'
);
const routeSource = readFileSync(resolve(srcDir, './routes/main-routes.tsx'), 'utf8');

describe('shared ErrorBoundary retry contract', () => {
  it('keeps Universal Master Schedule recovery in-app instead of exposing a reload action', () => {
    expect(routeSource).toContain("() => import('../components/UniversalMasterSchedule/UniversalMasterSchedule')");
    expect(scheduleSource).toContain("import { ErrorBoundary } from '../ui/ErrorBoundary'");
    expect(scheduleSource).toContain('<ErrorBoundary>');

    expect(boundarySource).not.toContain('window.location.reload()');
    expect(boundarySource).not.toContain('handleReload');
    expect(boundarySource).not.toContain('ReloadButton');
    expect(boundarySource).not.toContain('Reload Page');
    expect(boundarySource).toContain('<RetryButton onClick={this.handleRetry}>');
  });
});
