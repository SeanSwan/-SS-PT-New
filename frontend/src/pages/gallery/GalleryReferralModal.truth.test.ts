import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Gallery referral modal contract', () => {
  it('wires the support referral CTA to a mounted referral modal', () => {
    const pageSource = readFileSync(resolve(__dirname, '../GalleryPage.tsx'), 'utf8');
    const modalPath = resolve(__dirname, 'ReferralModal.tsx');

    expect(pageSource).toContain("import ReferralModal from './gallery/ReferralModal'");
    expect(pageSource).toContain('const [showReferralModal, setShowReferralModal] = useState(false)');
    expect(pageSource).toContain(
      '<SupportBtn $variant="primary" onClick={() => { setShowSupport(false); setShowReferralModal(true); }}>'
    );
    expect(pageSource).toContain('<ReferralModal');
    expect(pageSource).not.toContain('TODO: referral modal');

    expect(existsSync(modalPath)).toBe(true);
    const modalSource = readFileSync(modalPath, 'utf8');

    expect(modalSource).toContain('/api/gallery/referral');
    expect(modalSource).toContain('Authorization: `Bearer ${galleryToken}`');
    expect(modalSource).toContain('referralName: referralName.trim()');
    expect(modalSource).toContain('referralPhone: referralPhone.trim()');
    expect(modalSource).toContain('referralEmail: referralEmail.trim() || undefined');
  });

  it('wires the upgrade modal referral link to the same mounted referral modal', () => {
    const pageSource = readFileSync(resolve(__dirname, '../GalleryPage.tsx'), 'utf8');

    expect(pageSource).toContain(
      '<ReferralLink type="button" onClick={() => { setShowUpgradeModal(false); setShowReferralModal(true); }}>'
    );
    expect(pageSource).not.toContain('<ReferralLink type="button" onClick={() => { setShowUpgradeModal(false); }}>');
  });
});
