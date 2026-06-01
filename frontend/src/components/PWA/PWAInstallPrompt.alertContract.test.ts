import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './PWAInstallPrompt.tsx'), 'utf8');

describe('PWAInstallPrompt manual install contract', () => {
  it('shows manual install steps in-app instead of browser-native alert', () => {
    expect(source).not.toContain('alert(');
    expect(source).toContain('Manual install');
    expect(source).toContain('manualInstructions');
  });
});
