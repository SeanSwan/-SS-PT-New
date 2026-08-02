import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(resolve(__dirname, 'BootcampBuilderPage.tsx'), 'utf8');

describe('Bootcamp V3 always-editable draft contract', () => {
  it('does not make AI provenance a permission boundary for class editing', () => {
    expect(pageSource).not.toContain("if (buildMode === 'ai') return;");
    expect(pageSource).toContain('onDeleteExercise={handleDeleteExercise}');
    expect(pageSource).toContain('onSelectStation={setActiveStation}');
  });
});
