/**
 * Gallery vNext — money-path truth contracts. Mirrors the five shipped `pages/gallery/*.truth.test.ts`
 * (which lock the untouched GalleryPage.tsx): source-string assertions that the vNext binds the SAME
 * money contracts — the `{ package }` body with the `bundle5` key, the in-gallery VIP flow (no signup
 * bounce, no localStorage token read), the referral/donation support chains, and a REAL gate form.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dir = resolve(__dirname);
const read = (name: string): string => readFileSync(join(dir, name), 'utf8');

const sourceFiles = readdirSync(dir).filter(
  (f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f),
);
const allSource = sourceFiles.map((f) => read(f)).join('\n');

describe('vNext credit checkout contract (mirror of GalleryCreditCheckout.truth)', () => {
  it('posts the backend package key and uses the backend bundle identifier', () => {
    const api = read('gallery.api.ts');
    expect(api).toContain('JSON.stringify({ package: pkg })');
    expect(api).not.toContain('JSON.stringify({ packageType })');

    const types = read('gallery.types.ts');
    expect(types).toContain("'single' | 'bundle5' | 'vip'");

    const modal = read('UpgradeModal.tsx');
    expect(modal).toContain("onPurchase('bundle5')");
    expect(modal).toContain("purchaseLoading === 'bundle5'");
    expect(modal).not.toContain("onPurchase('bundle')");
  });

  it('keeps the shipped pricing copy', () => {
    const modal = read('UpgradeModal.tsx');
    expect(modal).toContain('$15');
    expect(modal).toContain('$50');
    expect(modal).toContain('$175');
    expect(modal).toContain('Enhance Your Photos');
  });
});

describe('vNext VIP CTA contract (mirror of GalleryPageVipCta.truth)', () => {
  it('opens the in-gallery VIP modal instead of bouncing visitors to signup', () => {
    expect(allSource).not.toContain("navigate('/signup'");
    expect(allSource).not.toContain("localStorage.getItem('token')");
    expect(allSource).toContain('setShowVip(true)');
  });

  it('routes the upgrade-modal VIP card through the VIP chain, not checkout', () => {
    const modals = read('GalleryVNextModals.tsx');
    expect(modals).toContain('<VIPConversionModal');
    expect(modals).toContain('onVipActivated');
    const shell = read('GalleryVNext.tsx');
    expect(shell).toContain('onUpgradeVip={() => { setShowUpgrade(false); setShowVip(true); }}');
  });
});

describe('vNext referral + support chains (mirror of GalleryReferralModal/SupportActions.truth)', () => {
  it('mounts the referral modal and refreshes credits on submission', () => {
    const modals = read('GalleryVNextModals.tsx');
    expect(modals).toContain('<ReferralModal');
    expect(modals).toContain('onReferralSubmitted={onCreditsRefresh}');
  });

  it('wires the post-enhancement support sheet to referral and donation', () => {
    const shell = read('GalleryVNext.tsx');
    expect(shell).toContain('onSupportRefer={() => { setShowSupport(false); setShowReferral(true); }}');
    expect(shell).toContain('onSupportTip={() => { setShowSupport(false); setShowDonation(true); }}');
  });

  it('wires the upgrade-modal referral link through the referral chain', () => {
    const shell = read('GalleryVNext.tsx');
    expect(shell).toContain('onUpgradeReferral={() => { setShowUpgrade(false); setShowReferral(true); }}');
  });
});

describe('vNext checkout-return contract (mirror of GalleryCheckoutReturnFeedback.truth)', () => {
  it('surfaces credit/donation/print return states and strips the params', () => {
    const credits = read('useGalleryCredits.ts');
    expect(credits).toContain("params.get('credits')");
    expect(credits).toContain("params.get('donation')");
    expect(credits).toContain("params.get('print')");
    expect(credits).toContain('Enhancement credits are ready. Select your photos when you are ready.');
    expect(credits).toContain('Thank you for supporting SwanStudios.');
    expect(credits).toContain("['credits', 'donation', 'package', 'print', 'orderId']");
  });
});

describe('vNext gate is a REAL form (Kimi fake-form fix)', () => {
  it('submits via form onSubmit with proper input semantics', () => {
    const gate = read('GateCard.tsx');
    expect(gate).toContain('<form onSubmit={handleSubmit}');
    expect(gate).toContain('type="email"');
    expect(gate).toContain('autoComplete="email"');
    expect(gate).toContain('autoComplete="current-password"');
    expect(gate).toContain('aria-invalid');
    expect(gate).toContain('aria-describedby');
  });
});

describe('vNext money-path privacy', () => {
  it('never persists the visitor email to any storage', () => {
    // The email may live in React state only; the ONLY sessionStorage writes are the opaque gallery token,
    // keyed through the tokenKey() helper whose prefix is asserted here (write → helper → prefix chain).
    const sessionWrites = allSource.match(/sessionStorage\.setItem\([^)]*\)/g) ?? [];
    expect(sessionWrites.length).toBeGreaterThan(0);
    for (const w of sessionWrites) expect(w).toContain('tokenKey(');
    const sessionHook = read('useGallerySession.ts');
    expect(sessionHook).toContain("`gallery-token-${slug || ''}`");
    expect(sessionHook).not.toMatch(/setItem\([^)]*[eE]mail/);
    expect(allSource).not.toMatch(/localStorage\.setItem\(/);
  });
});
