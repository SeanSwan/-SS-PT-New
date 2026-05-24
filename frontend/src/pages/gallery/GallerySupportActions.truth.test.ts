import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Gallery support action contract', () => {
  it('wires the post-enhancement tip CTA to the mounted donation modal', () => {
    const source = readFileSync(resolve(__dirname, '../GalleryPage.tsx'), 'utf8');

    expect(source).toContain(
      '<SupportBtn $variant="secondary" onClick={() => { setShowSupport(false); setShowDonationModal(true); }}>'
    );
    expect(source).not.toContain('TODO: donation modal');
  });
});
