import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewMetrics.tsx'),
  'utf8',
);

const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);

const stylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverview.styles.ts'),
  'utf8',
);

describe('AdminOverviewMetrics active surface theme contract', () => {
  it('is mounted by the active admin overview dashboard', () => {
    expect(parentSource).toContain("import AdminOverviewMetrics from './AdminOverviewMetrics'");
    expect(parentSource).toContain('<AdminOverviewMetrics metrics={metrics} />');
  });

  it('uses color-mix for CSS-variable metric colors instead of alpha suffixes', () => {
    expect(source).toContain('const CHANGE_COLORS = {');
    expect(source).toContain('const metricAccentWash = (color: string) => `color-mix(in srgb, ${color} 20%, transparent)`;');
    expect(source).toContain('style={{ background: metricAccentWash(accent), color: accent }}');
    expect(source).not.toContain('`${metric.color}20`');
    expect(source).not.toContain('color="#60C0F0"');
    expect(source).not.toContain('color="#C92A54"');
    expect(source).not.toContain("p.$type === 'increase' ? '#60C0F0'");
    expect(source).not.toContain("p.$type === 'decrease' ? '#C92A54'");
    expect(source).not.toContain('rgba(');
  });

  it('keeps KPI card accents controlled by active theme variables', () => {
    expect(source).toContain('const getMetricAccent = (metric: AdminDashboardMetric): string');
    expect(source).toContain("'--admin-metric-accent': accent");
    expect(source).toContain('<MetricCommandCard key={metric.id} style={metricCardStyle(accent)}');
    expect(source).not.toContain('accentColor={metric.color}');
    expect(source).not.toContain('style={{ color: metric.color }}');
    expect(source).not.toContain('background: metric.color');
    expect(stylesSource).toContain('background: var(--admin-metric-accent');
    expect(stylesSource).not.toContain('accentColor?: string');
  });
});
