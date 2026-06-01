import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('page-level alert contract', () => {
  it('does not use browser-native alert for signup or gallery checkout failures', () => {
    expect(readSource('src/pages/OptimizedSignupModal.tsx')).not.toContain('alert(');
    expect(readSource('src/pages/gallery/PrintStore.tsx')).not.toContain('alert(');
  });

  it('keeps those failures visible inside the app UI', () => {
    expect(readSource('src/pages/OptimizedSignupModal.tsx')).toContain('Having trouble? Please contact support for assistance.');
    expect(readSource('src/pages/gallery/PrintStore.tsx')).toContain('CheckoutError');
    expect(readSource('src/pages/gallery/PrintStore.tsx')).toContain('role="alert"');
  });
});
