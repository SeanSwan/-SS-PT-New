import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(file: string) {
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}

const OBSERVATORY_FILES = [
  'src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryFeed.tsx',
  'src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryWidgets.tsx',
  'src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryWidgetModels.ts',
  'src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryFeed.styles.ts',
  'src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryWidgets.styles.ts',
];

describe('Client observatory prototype merge contract', () => {
  it('keeps the active observatory files under the local file-size rule', () => {
    OBSERVATORY_FILES.forEach((file) => {
      const lineCount = source(file).split(/\r?\n/).length;
      expect(lineCount, `${file} has ${lineCount} lines`).toBeLessThanOrEqual(300);
    });
  });

  it('restores the richer right-rail observatory modules on the canonical surface', () => {
    const widgets = source('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryWidgets.tsx');

    expect(widgets).toContain('Stories from the Garden');
    expect(widgets).toContain('Live Activity');
    expect(widgets).toContain('Active Challenge');
    expect(widgets).toContain('Weekly Momentum');
    expect(widgets).toContain('Next Best Action');
  });

  it('keeps Quick Post as the only create surface inside the feed preview', () => {
    const feed = source('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryFeed.tsx');

    expect(feed).toContain('Quick Post');
    expect(feed).toContain('Reel composer');
    expect(feed).not.toContain('Open Feed');
    expect(feed).not.toContain('View All');
    expect(feed).not.toContain('Create More');
    expect(feed).not.toContain('Dashboard quick actions');
  });
});
