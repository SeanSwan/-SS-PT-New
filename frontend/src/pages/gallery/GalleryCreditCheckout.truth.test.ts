import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('GalleryPage credit checkout contract', () => {
  it('posts the backend package key and uses the backend bundle identifier', () => {
    const source = readFileSync(resolve(__dirname, '../GalleryPage.tsx'), 'utf8');

    expect(source).toContain("const handlePurchaseCredits = async (packageType: 'single' | 'bundle5' | 'vip')");
    expect(source).toContain('body: JSON.stringify({ package: packageType })');
    expect(source).toContain("handlePurchaseCredits('bundle5')");
    expect(source).toContain("purchaseLoading === 'bundle5'");

    expect(source).not.toContain('JSON.stringify({ packageType })');
    expect(source).not.toContain("handlePurchaseCredits('bundle')");
  });
});
