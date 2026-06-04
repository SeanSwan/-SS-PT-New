import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const pagePath = resolve(__dirname, './ClientProgressDashboardPage.tsx');
const stylesPath = resolve(__dirname, './ClientProgressDashboardPage.styles.ts');
const layoutPath = resolve(__dirname, '../../UniversalDashboardLayout.tsx');

const read = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('ClientProgressDashboardPage theme bridge', () => {
  it('keeps the canonical progress page wired to extracted theme styles', () => {
    const source = read(pagePath);
    const layoutSource = read(layoutPath);
    const styleSource = existsSync(stylesPath) ? read(stylesPath) : '';

    expect(layoutSource).toContain("path: '/progress', component: ClientProgressDashboardPage");
    expect(source).toContain("from './ClientProgressDashboardPage.styles'");
    expect(source).not.toMatch(/styled\./);
    expect(source).not.toContain('keyframes`');
    expect(styleSource).toContain('var(--bg-elevated');
    expect(styleSource).toContain('var(--accent-primary');
    expect(lineCount(source)).toBeLessThanOrEqual(300);
  });

  it('preserves the client-safe chart grid and progress API endpoints', () => {
    const source = read(pagePath);

    expect(source).toContain("import('./CanonicalProgressChartsGrid')");
    expect(source).toContain('authAxios.get(`/api/gamification/users/${user.id}/weekly-recap`)');
    expect(source).toContain('authAxios.get(`/api/client/analytics/personal-records`)');
    expect(source).toContain('<CanonicalProgressChartsGrid userId={user.id} />');
  });
});
