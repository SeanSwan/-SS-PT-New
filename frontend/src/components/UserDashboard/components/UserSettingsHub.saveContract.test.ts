import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/UserDashboard/components/UserSettingsHub.tsx'),
  'utf8',
);

describe('UserSettingsHub save contract', () => {
  it('performs exactly one canonical profile write and propagates failures', () => {
    const saveBranch = source.match(
      /const handleSave = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[form,/,
    )?.[1] || '';

    expect(saveBranch.match(/apiService\.put\('\/api\/profile'/g)?.length || 0).toBe(1);
    expect(saveBranch.match(/onUpdateProfile\(payload\)/g)?.length || 0).toBe(1);
    expect(saveBranch).toMatch(/if \(onUpdateProfile\)[\s\S]*else[\s\S]*apiService\.put/);
    expect(saveBranch).not.toContain('onUpdateProfile(payload).catch');
  });
});
