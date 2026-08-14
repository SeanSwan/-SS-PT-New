/**
 * MarketingReadinessCockpit contract test.
 * Locks the read-only truth-surface discipline for the readiness cockpit:
 *  - reads state via the SHARED authAxios transport (no ad-hoc auth / raw fetch),
 *  - is strictly read-only (no write/publish verbs — it can never send or publish),
 *  - surfaces all six marketing subsystems,
 *  - keeps the refresh control at the 44px touch-target minimum.
 * Source-string contract (matches the sibling MarketingWorkspace command-center test style).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(join(__dirname, 'MarketingReadinessCockpit.tsx'), 'utf8');
const styles = readFileSync(join(__dirname, 'MarketingReadinessCockpit.styles.ts'), 'utf8');

describe('MarketingReadinessCockpit contract', () => {
  it('reads the admin readiness endpoint via the shared authAxios transport', () => {
    expect(src).toContain("authAxios.get('/api/admin/marketing-readiness')");
    expect(src).toMatch(/useAuth\(\)/);
  });

  it('uses no ad-hoc auth or raw transport (shared-auth discipline)', () => {
    expect(src).not.toContain('fetch(');
    expect(src).not.toContain('localStorage');
    expect(src).not.toContain('getAuthHeaders');
    expect(src).not.toContain('Authorization');
  });

  it('is strictly read-only — no write / publish verbs', () => {
    expect(src).not.toMatch(/\.post\(/);
    expect(src).not.toMatch(/\.put\(/);
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toContain('/publish');
  });

  it('surfaces all eight marketing subsystems', () => {
    for (const key of ['socialPublishing', 'automation', 'email', 'speedToLead', 'leadCapture', 'calendar', 'campaigns', 'contentTools']) {
      expect(src).toContain(key);
    }
  });

  it('renders speed-to-lead state without ever rendering a credential value', () => {
    // The card may report PRESENCE booleans and may NAME env vars in guidance,
    // but the from-address, API key, postal address and consult URL values must
    // never reach the DOM. Assert the component reads only the boolean fields.
    expect(src).toContain('s2l.enabled');
    expect(src).toContain('s2l.fromEmailOnBrandDomain');
    expect(src).not.toMatch(/fromEmail\s*\}/);       // no raw address interpolation
    expect(src).not.toContain('sendgridApiKey');
    expect(src).not.toContain('businessAddress}');   // presence flag only, never the value
  });

  it('treats dark speed-to-lead as a safe resting state, not a failure', () => {
    // Regression guard: an intentionally-dark feature must not render as an
    // alarm, or the cockpit trains the operator to ignore real alarms.
    expect(src).toContain("'Dark (safe)'");
  });

  it('keeps the refresh control at the 44px touch-target minimum', () => {
    expect(styles).toMatch(/min-height:\s*44px/);
    expect(styles).toMatch(/min-width:\s*44px/);
  });
});
