import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

const detailPanelPath = './ExerciseDetailPanel.tsx';
const teachMePath = './ExerciseDetailTeachMe.tsx';

describe('ExerciseDetailPanel composition contract', () => {
  it('keeps the detail panel thin by extracting the Teach Me surface', () => {
    const detailPanelSource = read(detailPanelPath);

    expect(existsSync(resolve(__dirname, teachMePath))).toBe(true);
    expect(detailPanelSource).toContain("from './ExerciseDetailTeachMe'");
    expect(detailPanelSource).toContain('<ExerciseDetailTeachMe selectedExercise={selectedExercise} />');
    expect(detailPanelSource).not.toContain('const TeachMeWrap = styled.div');
    expect(lineCount(detailPanelSource)).toBeLessThanOrEqual(300);
  });

  it('keeps the extracted Teach Me component within the file cap', () => {
    expect(lineCount(read(teachMePath))).toBeLessThanOrEqual(300);
  });
});
