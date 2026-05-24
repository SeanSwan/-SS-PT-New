import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/OracleInsightsWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
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
    expect(source).toContain('&:focus-visible');
    expect(source).toContain('width: 44px');
    expect(source).toContain('height: 44px');
  });
});
