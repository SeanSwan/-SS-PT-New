/**
 * CampaignManager contract test.
 * Locks the campaign-management surface discipline:
 *  - all CRUD goes through the SHARED authAxios transport against the campaigns API,
 *  - no ad-hoc auth / raw fetch / localStorage tokens,
 *  - the destructive archive is confirmed before it fires,
 *  - interactive controls meet the 44px touch-target minimum,
 *  - animated controls respect reduced motion.
 * Source-string contract (matches the sibling marketing contract-test style).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const mgr = readFileSync(join(__dirname, 'CampaignManager.tsx'), 'utf8');
const form = readFileSync(join(__dirname, 'CampaignForm.tsx'), 'utf8');
const styles = readFileSync(join(__dirname, 'CampaignManager.styles.ts'), 'utf8');

describe('CampaignManager contract', () => {
  it('uses the shared authAxios transport against the campaigns API', () => {
    expect(mgr).toContain('useAuth()');
    expect(mgr).toContain("'/api/admin/marketing-campaigns'");
    expect(mgr).toMatch(/authAxios\.(get|post|put|delete)/);
  });

  it('uses no ad-hoc auth or raw transport', () => {
    for (const src of [mgr, form]) {
      expect(src).not.toContain('fetch(');
      expect(src).not.toContain('localStorage');
      expect(src).not.toContain('getAuthHeaders');
      expect(src).not.toContain('Authorization');
    }
  });

  it('confirms before the destructive archive', () => {
    // Was window.confirm; converted to the branded dialog 2026-08-05. The
    // contract is that archiving is GATED, not which prompt does the gating.
    expect(mgr).toContain('<ConfirmActionDialog');
    expect(mgr).toContain('setPendingArchive');
    expect(mgr).toMatch(/authAxios\.delete/);
  });

  it('keeps interactive controls at the 44px touch-target minimum', () => {
    const count = (styles.match(/min-height:\s*44px/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it('respects reduced motion on animated controls', () => {
    expect(styles).toContain('prefers-reduced-motion');
  });
});
