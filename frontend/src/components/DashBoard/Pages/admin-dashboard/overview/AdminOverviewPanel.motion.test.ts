/**
 * SWA-138 S8 — motion & a11y contract for the admin Command Center.
 * Locks: MotionConfig licence enforcement, reduced-motion CSS guards,
 * and the Rule-6 token fix on gamification badge chrome.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const panel = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');
const motionModule = read('src/components/DashBoard/Pages/admin-dashboard/overview/adminOverviewMotion.ts');
const geoStyles = read('src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.styles.ts');
const gamification = read('src/components/DashBoard/Pages/admin-dashboard/components/GamificationSummaryWidget.tsx');

describe('admin overview motion licence (S8)', () => {
  it('wraps the whole widget grid in MotionConfig driven by the M1 licence', () => {
    expect(panel).toContain('<MotionConfig reducedMotion={ADMIN_MOTION_POLICY}>');
    expect(motionModule).toContain("resolveMotionTier('dashboard.admin', 'full')");
    expect(motionModule).toContain('motionAffordances');
  });

  it('VisitorGeo keyframes carry prefers-reduced-motion guards', () => {
    const guards = geoStyles.match(/@media \(prefers-reduced-motion: reduce\)/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });

  it('gamification badge/bar chrome uses theme tokens, not raw chart hex (Rule 6)', () => {
    expect(gamification).toContain("1: 'var(--accent-gold, #C6A84B)'");
    expect(gamification).toContain("2: 'var(--accent-primary, #60C0F0)'");
    expect(gamification).toContain("3: 'var(--accent-secondary, #8B5CF6)'");
    expect(gamification).not.toContain('1: CHART_COLORS.gildedFern');
    expect(gamification).not.toContain('hexAlpha(RARITY_COLORS');
  });
});
