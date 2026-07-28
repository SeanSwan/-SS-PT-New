import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

const pickerPath = './EquipmentProfilePicker.tsx';
const stylesPath = './EquipmentProfilePicker.styles.ts';

describe('EquipmentProfilePicker composition contract', () => {
  it('keeps shared picker behavior separate from its style surface', () => {
    const pickerSource = read(pickerPath);

    expect(existsSync(resolve(__dirname, stylesPath))).toBe(true);
    expect(pickerSource).toContain("from './EquipmentProfilePicker.styles'");
    expect(pickerSource).not.toContain('const PickerWrapper = styled.div');
    expect(lineCount(pickerSource)).toBeLessThanOrEqual(300);
  });

  it('keeps extracted picker styles within the file cap', () => {
    expect(lineCount(read(stylesPath))).toBeLessThanOrEqual(300);
  });
});
