import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(__dirname, './RecentSessions.tsx');
const logicPath = resolve(__dirname, './RecentSessions.logic.ts');

const componentSource = readFileSync(componentPath, 'utf8');
const logicSource = readFileSync(logicPath, 'utf8');

describe('RecentSessions protected workout contract', () => {
  it('uses authenticated dashboard requests instead of raw axios', () => {
    expect(componentSource).toContain('const { authAxios } = useAuth()');
    expect(componentSource).not.toContain("import axios from 'axios'");
    expect(componentSource).not.toContain('axios.get');
    expect(componentSource).not.toContain('axios.put');
  });

  it('uses the staff client-history route and canonical backend response envelopes', () => {
    expect(componentSource).toContain('getRecentSessionsUrl(clientId, userRole)');
    expect(logicSource).toContain('/api/workout/sessions/user/${clientId}');
    expect(logicSource).toContain('root?.sessions');
    expect(logicSource).toContain('root?.session');
  });

  it('matches backend workout status values and keeps the component under the line cap', () => {
    expect(componentSource).toContain('<option value="planned">Planned</option>');
    expect(componentSource).toContain('<option value="skipped">Skipped</option>');
    expect(componentSource).not.toContain('value="scheduled"');
    expect(componentSource).not.toContain('value="missed"');
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
