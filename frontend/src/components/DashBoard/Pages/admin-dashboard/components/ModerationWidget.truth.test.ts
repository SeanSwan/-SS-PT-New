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
const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lineCount = (text: string) => text.split(/\r?\n/).length;

describe('ModerationWidget active surface truth contract', () => {
  it('is mounted by the admin overview dashboard and backed by the moderation route module', () => {
    expect(parentSource).toContain("import ModerationWidget from '../components/ModerationWidget'");
    expect(parentSource).toContain('<BentoThird><WidgetErrorBoundary name="Moderation"><ModerationWidget /></WidgetErrorBoundary></BentoThird>');
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

  it('uses theme tokens and color-mix for moderation status/action visuals', () => {
    const styles = readSource('src/components/DashBoard/Pages/admin-dashboard/components/ModerationWidget.styles.ts');

    expect(styles).toContain('export const MODERATION_COLORS = {');
    expect(styles).toContain("success: 'var(--success, #10B981)'");
    expect(styles).toContain("error: 'var(--error, #EF4444)'");
    expect(styles).toContain('background: color-mix(in srgb, ${p => p.$color} 15%, transparent);');
    expect(source).not.toContain('color="#60C0F0"');
    expect(source).not.toContain('$color="#10b981"');
    expect(source).not.toContain('$color="#ef4444"');
    expect(source).not.toContain('$color="#94a3b8"');
    expect(source).not.toContain('`${p.$color}15`');
    expect(source).not.toContain('`${p.$color}30`');
    expect(source).not.toContain('`${p.$color}20`');
  });

  it('keeps the overview moderation widget split into bounded files', () => {
    const styles = readSource('src/components/DashBoard/Pages/admin-dashboard/components/ModerationWidget.styles.ts');
    const types = readSource('src/components/DashBoard/Pages/admin-dashboard/components/ModerationWidget.types.ts');

    expect(source).toContain("from './ModerationWidget.styles'");
    expect(source).toContain("from './ModerationWidget.types'");
    expect(source).not.toContain("from 'styled-components'");
    expect(styles).toContain("from 'styled-components'");

    [source, styles, types].forEach((fileSource) => {
      expect(lineCount(fileSource)).toBeLessThanOrEqual(300);
    });
  });
});
