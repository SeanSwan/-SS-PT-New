import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './ExerciseRolodexPanel.tsx'), 'utf8');

describe('ExerciseRolodexPanel virtual card layout', () => {
  it('reserves enough virtual row height for two-line names plus impact/equipment tags', () => {
    expect(SOURCE).toContain('const ROLODEX_ROW_HEIGHT = 76;');
    expect(SOURCE).toMatch(/rowHeight=\{ROLODEX_ROW_HEIGHT\}/);
    expect(SOURCE).toMatch(/height:\s*Math\.min\(exercisePairs\.length,\s*7\)\s*\*\s*ROLODEX_ROW_HEIGHT/);
  });

  it('clips metadata inside each exercise card instead of letting tags overlap the next row', () => {
    expect(SOURCE).toMatch(/min-height:\s*64px/);
    expect(SOURCE).toMatch(/CardMeta[\s\S]*?max-height:\s*26px/);
    expect(SOURCE).toMatch(/MetaTag[\s\S]*?text-overflow:\s*ellipsis/);
  });
});
