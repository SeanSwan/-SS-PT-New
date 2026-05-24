import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/ModerationWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminContentModerationRoutes.mjs'),
  'utf8',
);

describe('ModerationWidget active surface truth contract', () => {
  it('is mounted by the admin overview dashboard and backed by the moderation route module', () => {
    expect(parentSource).toContain("import ModerationWidget from '../components/ModerationWidget'");
    expect(parentSource).toContain('<BentoThird><ModerationWidget /></BentoThird>');
    expect(source).toContain("authAxios.get('/api/admin/content/posts'");
    expect(source).toContain("authAxios.get('/api/admin/content/stats'");
    expect(routeSource).toContain("router.get('/posts'");
    expect(routeSource).toContain("router.get('/stats'");
  });

  it('does not convert failed moderation fetches into a false empty queue', () => {
    expect(source).not.toContain(".catch(() => ({ data: { posts: [] } }))");
    expect(source).not.toContain('pending: 0, approved: 0, flagged: 0, rejected: 0 } } }))');
    expect(source).not.toContain('silently fail');
    expect(source).toContain('loadError');
    expect(source).toContain('Moderation data unavailable');
  });
});
