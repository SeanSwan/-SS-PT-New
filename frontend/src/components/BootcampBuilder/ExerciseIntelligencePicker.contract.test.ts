import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('ExerciseIntelligencePicker contract', () => {
  it('routes Bootcamp picker surfaces through the canonical Rolodex library picker', () => {
    const pickerSource = read('./ExerciseIntelligencePicker.tsx');
    const sidePanelsSource = read('./BootcampBuilderSidePanels.tsx');

    expect(pickerSource).toContain("from './ExerciseRolodexPanel'");
    expect(pickerSource).not.toContain('ExercisePickerPanel');
    expect(pickerSource).not.toContain('/api/exercises/search');
    expect(sidePanelsSource).toContain("from './ExerciseIntelligencePicker'");
    expect(sidePanelsSource).toContain('<ExerciseIntelligencePicker');
    expect(sidePanelsSource).not.toContain('<ExerciseRolodexPanel');
  });
});
