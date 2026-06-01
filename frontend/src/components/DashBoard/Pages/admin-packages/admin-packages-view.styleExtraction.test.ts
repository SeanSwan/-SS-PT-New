import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('admin packages view style extraction', () => {
  it('keeps the canonical admin package manager focused on package behavior', () => {
    const source = read('admin-packages-view.tsx');

    expect(source).toContain("from './admin-packages-view.layoutStyles'");
    expect(source).toContain("from './admin-packages-view.formStyles'");
    expect(source).toContain("from './admin-packages-view.tableStyles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toMatch(/const FormInput\s*=\s*styled/);
    expect(source).not.toMatch(/const PackagesTable\s*=\s*styled/);
    expect(source).not.toMatch(/const ClientCheckItem\s*=\s*styled/);
    expect(source).not.toMatch(/const RowOpacityWrapper\s*=\s*styled/);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(1525);
  });

  it('keeps extracted admin package style modules below the project file cap', () => {
    [
      'admin-packages-view.layoutStyles.ts',
      'admin-packages-view.formStyles.ts',
      'admin-packages-view.tableStyles.ts',
    ].forEach((fileName) => {
      const source = read(fileName);
      expect(source).toContain('export const ');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
