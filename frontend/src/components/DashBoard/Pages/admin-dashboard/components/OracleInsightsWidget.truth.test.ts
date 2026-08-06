import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/OracleInsightsWidget.tsx',
);
const stylesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/OracleInsightsWidget.styles.ts',
);
const source = readFileSync(
  componentPath,
  'utf8',
);
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${source}\n${stylesSource}`;
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminTelemetrySection.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/oracleRoutes.mjs'),
  'utf8',
);

describe('OracleInsightsWidget active surface truth contract', () => {
  it('is mounted by admin overview and backed by mounted Oracle routes', () => {
    expect(parentSource).toContain("import OracleInsightsWidget from '../components/OracleInsightsWidget'");
    expect(parentSource).toContain('<OracleInsightsWidget defaultTab="news" defaultQuery="personal training fitness industry trends" />');
    expect(source).toContain('`/api/oracle/${endpoint}`');
    expect(routeSource).toContain("router.get('/news'");
    expect(routeSource).toContain("router.get('/scholar'");
    expect(routeSource).toContain("router.get('/youtube'");
  });

  it('does not double-fetch the default query on initial mount', () => {
    expect(source).toContain('lastDefaultQueryRef');
    expect(source).not.toContain('fetchData(activeTab, defaultQuery);\n    }\n  }, [defaultQuery]);');
  });

  it('does not open invalid Oracle result links as blank hash tabs', () => {
    expect(source).toContain('safeExternalHref');
    expect(source).not.toContain("a.link?.startsWith('http') ? a.link : '#'");
    expect(source).not.toContain("v.link?.startsWith('http') ? v.link : '#'");
  });

  it('keeps Oracle error and control states accessible', () => {
    expect(source).toContain('<ErrorState role="alert">');
    expect(combinedSource).toContain('&:focus-visible');
    expect(combinedSource).toContain('width: 44px');
    expect(combinedSource).toContain('height: 44px');
  });

  it('does not call trainer-only Oracle APIs for client/user social surfaces', () => {
    expect(source).toContain("const canUseOracle = user?.role === 'admin' || user?.role === 'trainer'");
    expect(source).toContain('if (!canUseOracle) return;');
    expect(source).toContain('Oracle insights are available for coaches and admins.');
  });

  it('keeps Oracle behavior split from tokenized styles below line caps', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(source).not.toContain("from 'styled-components'");
    expect(source).not.toContain('keyframes');
    expect(source).not.toContain('style={{');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(combinedSource).not.toMatch(/rgba\(/);
    expect(combinedSource).not.toContain('color: #');
    expect(combinedSource).not.toContain('background: #');
  });
});
