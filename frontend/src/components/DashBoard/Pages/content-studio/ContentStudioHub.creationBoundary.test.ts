import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');
const HUB_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'Pages',
  'content-studio',
  'ContentStudioHub.tsx',
);
const LAYOUT_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.tsx',
);

describe('ContentStudioHub creation boundary contract', () => {
  const hubSource = readFileSync(HUB_FILE, 'utf-8');
  const layoutSource = readFileSync(LAYOUT_FILE, 'utf-8');

  it('is mounted as the admin Content Studio route', () => {
    expect(layoutSource).toContain("path: '/content'");
    expect(layoutSource).toContain('component: ContentStudioHub');
  });

  it('states that Content Studio creates assets while Marketing handles distribution', () => {
    expect(hubSource).toContain('Create assets here');
    expect(hubSource).toContain('Marketing Command Center');
    expect(hubSource).toContain('publishing, distribution, lead capture, and performance tracking');
  });

  it('does not import old publishing/settings panels into the creator hub', () => {
    expect(hubSource).not.toContain('SocialDistributionPanel');
    expect(hubSource).not.toContain('DistributionHubPanel');
    expect(hubSource).not.toContain('ContentCalendarPanel');
    expect(hubSource).not.toContain('ContentStudioSettings');
  });
});
