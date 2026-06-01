import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(__dirname);
const pagePath = resolve(sourceRoot, './enhanced-admin-sessions-view.tsx');
const dataHookPath = resolve(sourceRoot, './useAdminSessionsData.ts');

const readSource = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('Admin sessions data sync extraction', () => {
  it('keeps fetch and socket synchronization outside the canonical page', () => {
    const pageSource = readSource(pagePath);

    expect(existsSync(dataHookPath), 'useAdminSessionsData.ts should exist').toBe(true);
    expect(pageSource).toContain("import useAdminSessionsData from './useAdminSessionsData'");
    expect(pageSource).toContain('useAdminSessionsData()');
    expect(pageSource).not.toContain('useSocket');
    expect(pageSource).not.toContain('services.sessionService.getSessions');
    expect(pageSource).not.toContain("apiService.get('/api/auth/clients')");
    expect(pageSource).not.toContain("apiService.get('/api/auth/trainers')");
    expect(pageSource).not.toContain("socket.on('user_purchased_sessions'");
    expect(pageSource).not.toContain("socket.on('dashboard:update'");
  });

  it('keeps the data hook focused on API fetches, purchase events, and session refreshes', () => {
    const hookSource = readSource(dataHookPath);

    expect(hookSource).toContain('services.sessionService.getSessions');
    expect(hookSource).toContain("apiService.get('/api/auth/clients')");
    expect(hookSource).toContain("apiService.get('/api/auth/trainers')");
    expect(hookSource).toContain("socket.on('user_purchased_sessions'");
    expect(hookSource).toContain("socket.on('dashboard:update'");
    expect(hookSource).toContain("socket.on('schedule:update'");
    expect(hookSource).toContain("socket.on('schedule:sync_required'");
    expect(hookSource).not.toContain("import styled from 'styled-components'");
    expect(hookSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(hookSource)).toBeLessThanOrEqual(300);
  });
});
