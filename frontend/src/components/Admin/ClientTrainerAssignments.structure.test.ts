import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');
const MAIN_SOURCE = readSource('./ClientTrainerAssignments.tsx');

const SPLIT_FILES = [
  './ClientTrainerAssignments.tsx',
  './ClientTrainerAssignments.logic.ts',
  './ClientTrainerAssignments.styles.ts',
  './ClientTrainerAssignments.styles.tail.ts',
  './ClientTrainerAssignments.types.ts',
  './ClientTrainerAssignments.panels.tsx',
];

describe('ClientTrainerAssignments structure', () => {
  it('keeps the active assignment board split into focused files under the project line cap', () => {
    expect(MAIN_SOURCE).toContain("from './ClientTrainerAssignments.logic'");
    expect(MAIN_SOURCE).toContain("from './ClientTrainerAssignments.styles'");
    expect(MAIN_SOURCE).toContain("from './ClientTrainerAssignments.types'");
    expect(MAIN_SOURCE).toContain("from './ClientTrainerAssignments.panels'");

    SPLIT_FILES.forEach((fileName) => {
      const absolutePath = resolve(__dirname, fileName);
      expect(existsSync(absolutePath), `${fileName} should exist`).toBe(true);
      expect(readSource(fileName).split(/\r?\n/).length, `${fileName} should stay under 300 lines`).toBeLessThanOrEqual(300);
    });
  });

  it('uses the backend-owned trainer endpoint for the assignment board', () => {
    expect(MAIN_SOURCE).toContain("authAxios.get('/api/admin/finance/trainers')");
    expect(MAIN_SOURCE).not.toContain("authAxios.get('/api/admin/trainers')");
  });
});
