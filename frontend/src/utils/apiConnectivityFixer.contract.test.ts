import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './apiConnectivityFixer.ts'), 'utf8');

describe('api connectivity notice contract', () => {
  it('keeps the backend outage notice mobile-safe and tokenized', () => {
    expect(source).toContain("const API_UNAVAILABLE_NOTICE_ID = 'swan-api-unavailable-notice'");
    expect(source).toContain("document.getElementById(API_UNAVAILABLE_NOTICE_ID)");
    expect(source).toContain("notification.style.left = 'max(12px, env(safe-area-inset-left))'");
    expect(source).toContain("notification.style.maxWidth = 'min(360px, calc(100vw - 24px))'");
    expect(source).toContain("dismissButton.textContent = 'X'");
    expect(source).toContain("dismissButton.style.minHeight = '44px'");
    expect(source).toContain('var(--accent-gold, #C6A84B)');
    expect(source).toContain('var(--bg-base, #030712)');
  });

  it('does not inject the old blocking desktop-style HTML toast', () => {
    expect(source).not.toContain('notification.innerHTML');
    expect(source).not.toContain('#f8d7da');
    expect(source).not.toContain('#721c24');
    expect(source).not.toContain('rgba(');
    expect(source).not.toContain('(Click to dismiss)');
  });
});
