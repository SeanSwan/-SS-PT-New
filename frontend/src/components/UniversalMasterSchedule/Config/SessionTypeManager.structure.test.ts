import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const readConfigFile = (file: string) =>
  readFileSync(resolve(process.cwd(), `src/components/UniversalMasterSchedule/Config/${file}`), 'utf8');

describe('SessionTypeManager structure', () => {
  const files = [
    'SessionTypeManager.tsx',
    'SessionTypeManager.logic.ts',
    'SessionTypeManager.sections.tsx',
    'SessionTypeManager.styles.ts',
    'SessionTypeManager.types.ts'
  ];

  it('keeps the canonical session type manager split into focused files under the line cap', () => {
    const source = readConfigFile('SessionTypeManager.tsx');

    expect(source).toContain("from './SessionTypeManager.logic'");
    expect(source).toContain("from './SessionTypeManager.sections'");
    expect(source).toContain("from './SessionTypeManager.types'");

    files.forEach((file) => {
      const fullPath = resolve(process.cwd(), `src/components/UniversalMasterSchedule/Config/${file}`);
      expect(existsSync(fullPath), `${file} should exist`).toBe(true);
      expect(readConfigFile(file).split(/\r?\n/).length, `${file} should stay under 300 lines`).toBeLessThanOrEqual(300);
    });
  });

  it('keeps schedule configuration styling on theme variables without inline JSX styles', () => {
    const combined = files.map(readConfigFile).join('\n');

    expect(combined).toContain('var(--text-primary, #E0ECF4)');
    expect(combined).toContain('var(--feedback-error, #ef4444)');
    expect(combined).not.toContain('#00FFFF');
    expect(combined).not.toContain('#0a0a1a');
    expect(combined).not.toContain('#7851A9');
    expect(combined).not.toContain('style={{');
  });
});
