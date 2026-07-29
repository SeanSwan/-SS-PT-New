/**
 * launchAuditRegressions.contract.test.ts
 * =========================================
 * Locks for the 2026-07-28 wave-2 live-launch-audit fixes (source-contract
 * style, matching legalRoutes/marketingStats suites).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '..');
const read = (rel: string) =>
  readFileSync(resolve(SRC, rel), 'utf8').replace(/\r\n/g, '\n');

describe('launch-audit regressions stay fixed', () => {
  it('forgot-password background uses the R2-backed video config, not the dead /assets path', () => {
    const page = read('pages/ForgotPasswordModal.jsx');
    // /assets/movie.mp4 never existed — 404'd on every page load. Ban the
    // USAGE (src attribute), not the mention (the fix's comment cites the path).
    expect(page).not.toMatch(/src=["']\/assets\/movie\.mp4/);
    expect(page).toMatch(/VIDEO\.waves/);
    expect(page).toMatch(/config\/videoAssets/);
  });

  it('ascension never brands a card "Current Plan" for visitors with no subscription record', () => {
    const page = read('pages/AscensionPage/AscensionPage.tsx');
    // `|| 'free'` made signed-out visitors look like free-plan members.
    expect(page).not.toMatch(/subscription\?\.tier \|\| 'free'/);
    expect(page).toMatch(/subscription\?\.tier \?\? null/);
  });
});
