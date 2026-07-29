/**
 * legalRoutes.contract.test.ts
 * ==============================
 * Launch charter BP04 §6.3 (LAUNCH GATE): the footer shipped /privacy, /terms,
 * and /sitemap links with NO routes behind them — users silently bounced to
 * Home via the catch-all. This suite locks: real pages exist, routes resolve,
 * the dead /sitemap link is gone, and the pages carry the load-bearing
 * truth statements (no-sale-of-data, zero-PII AI posture, medical disclaimer).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('legal pages launch gate', () => {
  it('main-routes registers /privacy and /terms with lazy legal pages', () => {
    const routes = read('routes/main-routes.tsx');
    expect(routes).toMatch(/path:\s*'privacy'/);
    expect(routes).toMatch(/path:\s*'terms'/);
    expect(routes).toMatch(/pages\/legal\/PrivacyPolicyPage/);
    expect(routes).toMatch(/pages\/legal\/TermsOfServicePage/);
  });

  it('long-form legal URL aliases redirect instead of 404ing', () => {
    // External parties (payment processors, app listings) guess these shapes.
    const routes = read('routes/main-routes.tsx');
    expect(routes).toMatch(/path:\s*'privacy-policy'/);
    expect(routes).toMatch(/path:\s*'terms-of-service'/);
  });

  it('footer keeps /privacy + /terms links and drops the dead /sitemap link', () => {
    const footer = read('components/Footer/Footer.tsx');
    expect(footer).toMatch(/to="\/privacy"/);
    expect(footer).toMatch(/to="\/terms"/);
    expect(footer).not.toMatch(/to="\/sitemap"/);
  });

  it('privacy policy states the honest data posture', () => {
    const page = read('pages/legal/PrivacyPolicyPage.tsx');
    expect(page).toMatch(/never sell/i);
    expect(page).toMatch(/de-identified|identifiers only|without your name/i);
    expect(page).toMatch(/loveswanstudios@protonmail\.com/);
    expect(page).toMatch(/Stripe/);
    expect(page).toMatch(/lastUpdated=/);
  });

  it('terms of service carries the medical disclaimer and payment truth', () => {
    const page = read('pages/legal/TermsOfServicePage.tsx');
    expect(page).toMatch(/not (a substitute for )?medical advice/i);
    expect(page).toMatch(/consult (a|your) (physician|healthcare)/i);
    expect(page).toMatch(/Stripe/);
    expect(page).toMatch(/lastUpdated=/);
  });
});
