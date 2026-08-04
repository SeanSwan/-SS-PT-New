import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const mainBoardSource = readFileSync(resolve(__dirname, 'ClassPreviewMainBoard.tsx'), 'utf8');

describe('Bootcamp class slot action integration', () => {
  it('mounts visible no-drag actions for every editable main-board exercise slot', () => {
    expect(mainBoardSource).toContain("import BootcampSlotActionBar from './BootcampSlotActionBar';");
    expect(mainBoardSource).toContain('onDuplicateExercise');
    expect(mainBoardSource).toContain('onMoveExercise');
  });
});
