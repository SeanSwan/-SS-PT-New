import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/SocialOverviewWidget.tsx'),
  'utf8',
);
const stylePath = resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/SocialOverviewWidget.styles.ts');
const styleSource = existsSync(stylePath) ? readFileSync(stylePath, 'utf8') : '';
const combinedSource = `${source}\n${styleSource}`;
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const moderationRouteSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminContentModerationRoutes.mjs'),
  'utf8',
);
const lineCount = (value: string) => value.split(/\r?\n/).length;

describe('SocialOverviewWidget active surface truth contract', () => {
  it('is mounted by the admin overview and backed by the admin content posts route', () => {
    expect(parentSource).toContain("import SocialOverviewWidget from '../components/SocialOverviewWidget'");
    expect(parentSource).toContain('<BentoThird><WidgetErrorBoundary name="Social overview"><SocialOverviewWidget /></WidgetErrorBoundary></BentoThird>');
    expect(source).toContain("authAxios.get('/api/admin/content/posts'");
    expect(source).not.toContain("authAxios.get('/api/social/posts/feed");
    expect(moderationRouteSource).toContain("router.get('/posts'");
  });

  it('reads the nested admin content posts response shape', () => {
    expect(source).toContain('response.data?.data?.posts');
    expect(source).toContain('normalizeSocialPost');
  });

  it('routes the command button to the active admin content surface', () => {
    expect(source).toContain("navigate('/dashboard/admin/content')");
    expect(source).not.toContain("navigate('/dashboard/admin/client-management')");
    expect(dashboardRoutesSource).toContain("{ path: '/content'");
  });

  it('keeps widget buttons at the required minimum touch target size', () => {
    expect(combinedSource).toContain('min-height: 44px');
    expect(combinedSource).not.toContain('min-height: 36px');
  });

  it('keeps behavior separate from extracted dashboard styling', () => {
    expect(source).toContain("from './SocialOverviewWidget.styles'");
    expect(existsSync(stylePath)).toBe(true);
    expect(lineCount(source)).toBeLessThanOrEqual(300);
    expect(lineCount(styleSource)).toBeLessThanOrEqual(300);
  });

  it('uses dashboard theme tokens instead of the retired local color object', () => {
    expect(combinedSource).toContain("const SOCIAL_ICE = 'var(--accent-primary, #60C0F0)'");
    expect(combinedSource).toContain("const SOCIAL_GOLD = 'var(--accent-gold, #C6A84B)'");
    expect(combinedSource).toContain('color-mix(in srgb, ${({ $status }) => statusColor($status)}');
    expect(combinedSource).not.toContain('const T = {');
    expect(combinedSource).not.toContain("royalDepth: '#003080'");
    expect(combinedSource).not.toContain("iceWing: '#60C0F0'");
    expect(combinedSource).not.toContain('rgba(96, 192, 240, 0.2)');
    expect(combinedSource).not.toContain('rgba(0, 32, 96, 0.35)');
  });
});
