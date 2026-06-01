import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';

const layoutSourcePath = resolve(__dirname, './UniversalDashboardLayout.tsx');
const layoutLogicPath = resolve(__dirname, './UniversalDashboardLayout.logic.ts');

describe('UniversalDashboardLayout client detailed progress identity', () => {
  it('exports a strict positive integer dashboard user id parser', async () => {
    expect(existsSync(layoutLogicPath)).toBe(true);

    const logicModuleUrl = pathToFileURL(layoutLogicPath).href;
    const { parseDashboardUserId } = await import(/* @vite-ignore */ logicModuleUrl);

    expect(parseDashboardUserId('77')).toBe(77);
    expect(parseDashboardUserId(' 77 ')).toBe(77);
    expect(parseDashboardUserId(77)).toBe(77);
    expect(parseDashboardUserId('77junk')).toBeNull();
    expect(parseDashboardUserId('0')).toBeNull();
    expect(parseDashboardUserId(Number.NaN)).toBeNull();
    expect(parseDashboardUserId(null)).toBeNull();
  });

  it('does not pass zero or NaN user ids into detailed progress charts', () => {
    const source = readFileSync(layoutSourcePath, 'utf8');

    expect(source).toContain("import { parseDashboardUserId } from './UniversalDashboardLayout.logic';");
    expect(source).toContain('const clientId = parseDashboardUserId(user?.id);');
    expect(source).toContain('if (!clientId) {');
    expect(source).toContain('<NASMProgressCharts clientId={clientId} />');
    expect(source).toContain("{ path: '/progress/detailed', component: ClientProgressWrapper");
    expect(source).not.toContain('clientId={Number(user?.id || 0)}');
  });
});
