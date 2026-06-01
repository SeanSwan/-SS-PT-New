import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './EnhancedAdminClientManagementView.tsx'), 'utf8');

describe('EnhancedAdminClientManagementView alert contract', () => {
  it('uses toast feedback instead of browser-native alert for missing client actions', () => {
    expect(source).not.toContain('alert(');
    expect(source).toContain('Select a client first');
    expect(source).toContain('Choose a client card before opening Swan Coach insights.');
  });
});
