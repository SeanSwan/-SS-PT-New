import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './AdminOnboardingPanel.tsx'), 'utf8');

describe('AdminOnboardingPanel confirmation contract', () => {
  it('uses an in-app reset confirmation instead of browser-native confirm', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain('Reset onboarding draft?');
    expect(source).toContain('Cancel reset');
  });
});
