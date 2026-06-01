import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(__dirname);
const pagePath = resolve(sourceRoot, './enhanced-admin-sessions-view.tsx');
const mutationHookPath = resolve(sourceRoot, './useAdminSessionsMutations.ts');

const readSource = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('Admin sessions mutation extraction', () => {
  it('keeps session mutation workflows outside the canonical page', () => {
    const pageSource = readSource(pagePath);

    expect(existsSync(mutationHookPath), 'useAdminSessionsMutations.ts should exist').toBe(true);
    expect(pageSource).toContain("import useAdminSessionsMutations from './useAdminSessionsMutations'");
    expect(pageSource).toContain('useAdminSessionsMutations({');
    expect(pageSource).not.toContain("apiService.put(`/api/sessions/${selectedSession.id}`");
    expect(pageSource).not.toContain("apiService.post('/api/sessions'");
    expect(pageSource).not.toContain('services.session.addSessionsToClient');
    expect(pageSource).not.toContain("apiService.delete(`/api/sessions/${sessionToDelete.id}`");
    expect(pageSource).not.toContain("apiService.delete('/api/admin/sessions/bulk'");
    expect(pageSource).not.toContain("apiService.delete('/api/sessions/bulk'");
    expect(pageSource).not.toContain('services.session.checkAllocationHealth');
    expect(pageSource).not.toContain('getAdminSessionsErrorMessage');
    expect(lineCount(pageSource)).toBeLessThanOrEqual(450);
  });

  it('keeps the mutation hook focused on admin session write paths and refresh orchestration', () => {
    const hookSource = readSource(mutationHookPath);

    expect(hookSource).toContain("apiService.put(`/api/sessions/${selectedSession.id}`");
    expect(hookSource).toContain("apiService.post('/api/sessions'");
    expect(hookSource).toContain('services.session.addSessionsToClient');
    expect(hookSource).toContain("apiService.delete(`/api/sessions/${sessionToDelete.id}`");
    expect(hookSource).toContain("getAdminSessionsErrorMessage(error, 'Failed to delete session')");
    expect(hookSource).toContain("apiService.delete('/api/sessions/bulk'");
    expect(hookSource).toContain('data: { sessionIds: state.selectedIds, reason: state.bulkDeleteReason }');
    expect(hookSource).not.toContain("apiService.delete('/api/admin/sessions/bulk'");
    expect(hookSource).toContain('services.session.checkAllocationHealth');
    expect(hookSource).not.toContain("import styled from 'styled-components'");
    expect(hookSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(hookSource)).toBeLessThanOrEqual(300);
  });
});
