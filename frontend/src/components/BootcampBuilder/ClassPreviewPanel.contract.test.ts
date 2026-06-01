import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(resolve(__dirname, './ClassPreviewMainBoard.tsx'), 'utf8');

describe('ClassPreviewPanel interaction contract', () => {
  it('lets manual full-group classes delete exercises from the flat Board 1 branch', () => {
    expect(SOURCE).toContain('const deleteIdx = globalIdx >= 0 ? globalIdx : idx;');
    expect(SOURCE).toContain('onDeleteExercise(deleteIdx)');
    expect(SOURCE).not.toContain('b1-flat-delete');
  });
});
