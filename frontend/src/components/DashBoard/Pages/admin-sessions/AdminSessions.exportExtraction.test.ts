import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const sourceRoot = __dirname;
const pagePath = resolve(sourceRoot, './enhanced-admin-sessions-view.tsx');
const exportHookPath = resolve(sourceRoot, './useAdminSessionsExport.ts');
const readSource = (path: string) => readFileSync(path, 'utf8');

describe('Admin sessions export extraction', () => {
  it('keeps CSV download and export toast behavior outside the canonical page', () => {
    const pageSource = readSource(pagePath);

    expect(existsSync(exportHookPath), 'useAdminSessionsExport.ts should exist').toBe(true);
    expect(pageSource).toContain("import useAdminSessionsExport from './useAdminSessionsExport'");
    expect(pageSource).not.toContain('useToast');
    expect(pageSource).not.toContain('buildAdminSessionsCsv');
    expect(pageSource).not.toContain('new Blob');
    expect(pageSource).not.toContain('document.createElement');
    expect(pageSource).not.toContain('URL.createObjectURL');
  });

  it('keeps the export hook responsible for the browser download boundary', () => {
    const hookSource = readSource(exportHookPath);

    expect(hookSource).toContain('useToast');
    expect(hookSource).toContain('buildAdminSessionsCsv');
    expect(hookSource).toContain('new Blob');
    expect(hookSource).toContain('document.createElement');
    expect(hookSource).toContain('URL.createObjectURL');
    expect(hookSource).toContain('sessions-export.csv');
  });
});
