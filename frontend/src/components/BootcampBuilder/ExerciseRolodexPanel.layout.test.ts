import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONSTANTS_SOURCE = readFileSync(resolve(__dirname, './ExerciseRolodexPanel.constants.ts'), 'utf8');
const LIST_SOURCE = readFileSync(resolve(__dirname, './ExerciseRolodexList.tsx'), 'utf8');
const LIST_STYLES_SOURCE = readFileSync(resolve(__dirname, './ExerciseRolodexList.styles.ts'), 'utf8');

describe('ExerciseRolodexPanel virtual card layout', () => {
  it('reserves enough virtual row height for media previews, two-line names, and impact/equipment tags', () => {
    expect(CONSTANTS_SOURCE).toContain('ROLODEX_ROW_HEIGHT = 112;');
    expect(LIST_SOURCE).toMatch(/rowHeight=\{ROLODEX_ROW_HEIGHT\}/);
    expect(LIST_SOURCE).toMatch(/height:\s*Math\.min\(exercisePairs\.length,\s*7\)\s*\*\s*ROLODEX_ROW_HEIGHT/);
    expect(LIST_SOURCE).toContain('getExerciseMediaPreview');
  });

  it('clips metadata and media inside each exercise card instead of letting tags overlap the next row', () => {
    expect(LIST_STYLES_SOURCE).toMatch(/min-height:\s*100px/);
    expect(LIST_STYLES_SOURCE).toContain('MediaPreview');
    expect(LIST_STYLES_SOURCE).toMatch(/CardMeta[\s\S]*?max-height:\s*26px/);
    expect(LIST_STYLES_SOURCE).toMatch(/MetaTag[\s\S]*?text-overflow:\s*ellipsis/);
  });
});
