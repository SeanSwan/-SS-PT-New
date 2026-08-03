/**
 * Navigation parity — IA regression.
 *
 * The member dashboard renders TWO navigation controls. On Home only the tab
 * bar shows; on every other tab the Observatory shell renders its left rail
 * AND the tab bar. They drifted: `groups` shipped into the tab bar (position
 * 3) and was never added to the rail, so a member on any non-Home tab saw two
 * navs that disagreed about which sections exist.
 *
 * Both lists must offer the same destinations, in the same order.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBSERVATORY_NAV_ITEMS } from './ObservatoryShellAdapter';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The tab bar's list is a module-private const, so read it from source rather
 * than exporting internals purely for a test.
 */
function readTabBarIds(): string[] {
  const source = readFileSync(resolve(here, 'UserDashboardTabBarV3.tsx'), 'utf8');
  const block = source.slice(
    source.indexOf('const dashboardTabs'),
    source.indexOf('];', source.indexOf('const dashboardTabs')),
  );
  return [...block.matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((match) => match[1]);
}

describe('member dashboard navigation parity', () => {
  it('offers the same destinations in the tab bar and the Observatory rail', () => {
    const railIds = OBSERVATORY_NAV_ITEMS.map((item) => item.id);

    expect(railIds).toEqual(readTabBarIds());
  });

  it('includes Groups in the Observatory rail', () => {
    expect(OBSERVATORY_NAV_ITEMS.map((item) => item.id)).toContain('groups');
  });

  it('keeps Home first and Progress second — the Product Core Loop order', () => {
    expect(OBSERVATORY_NAV_ITEMS[0].id).toBe('home');
    expect(OBSERVATORY_NAV_ITEMS[1].id).toBe('progress');
  });

  it('gives every rail entry a label and an icon', () => {
    for (const item of OBSERVATORY_NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.Icon).toBeTruthy();
    }
  });
});
