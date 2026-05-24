import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('GalleryPage VIP CTA contract', () => {
  it('opens the in-gallery VIP modal instead of bouncing unauthenticated visitors to signup', () => {
    const source = readFileSync(resolve(__dirname, '../GalleryPage.tsx'), 'utf8');

    expect(source).not.toContain("localStorage.getItem('token')");
    expect(source).not.toContain("navigate('/signup'");
    expect(source).toContain('setShowVipModal(true)');
  });
});
