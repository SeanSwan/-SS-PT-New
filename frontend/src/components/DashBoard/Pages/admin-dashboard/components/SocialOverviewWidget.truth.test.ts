import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/SocialOverviewWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const layoutSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const moderationRouteSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminContentModerationRoutes.mjs'),
  'utf8',
);

describe('SocialOverviewWidget active surface truth contract', () => {
  it('is mounted by the admin overview and backed by the admin content posts route', () => {
    expect(parentSource).toContain("import SocialOverviewWidget from '../components/SocialOverviewWidget'");
    expect(parentSource).toContain('<BentoThird><SocialOverviewWidget /></BentoThird>');
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
    expect(layoutSource).toContain("{ path: '/content'");
  });

  it('keeps widget buttons at the required minimum touch target size', () => {
    expect(source).toContain('min-height: 44px');
    expect(source).not.toContain('min-height: 36px');
  });
});
