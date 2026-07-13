import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(__dirname, './NASMExerciseRolodex.tsx');
const stylesPath = resolve(__dirname, './NASMExerciseRolodex.styles.ts');
const filterChipsPath = resolve(__dirname, './ExerciseFilterChips.tsx');
const previewPath = resolve(__dirname, './NASMExerciseRolodexPreview.tsx');
// Slice 11 extraction: the More-Filters chip rows moved verbatim into their
// own component — the explicit-button contract follows them there.
const filterRowsPath = resolve(__dirname, './RolodexFilterRows.tsx');
const recentRowPath = resolve(__dirname, './RolodexRecentRow.tsx');

const read = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const componentSource = read(componentPath);
const stylesSource = read(stylesPath);
const filterChipsSource = read(filterChipsPath);
const previewSource = read(previewPath);
const filterRowsSource = read(filterRowsPath);
const recentRowSource = read(recentRowPath);

describe('NASMExerciseRolodex touch target and extraction contract', () => {
  it('keeps the active component under the project line cap after style extraction', () => {
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps every rolodex button explicit and mobile-touchable', () => {
    const rolodexButtonTypes = `${componentSource}\n${previewSource}\n${filterRowsSource}\n${recentRowSource}`.match(/type="button"/g)?.length ?? 0;
    expect(rolodexButtonTypes).toBeGreaterThanOrEqual(4);
    expect(filterChipsSource).toMatch(/type="button"/);
    expect(filterRowsSource).toMatch(/type="button"/);
    expect(recentRowSource).toMatch(/type="button"/);
    expect(stylesSource).toMatch(/const FilterToggle = styled\.button[\s\S]*min-height: 44px;/);
    expect(stylesSource).toMatch(/const MiniChip = styled\.button[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
    expect(stylesSource).toMatch(/const AddButton = styled\.button[\s\S]*min-height: 44px;/);
  });

  it('keeps the rolodex shell on shared Crystalline Swan tokens', () => {
    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(/rgba\((20, 20, 25|0, 0, 0|224, 236, 244)/);
    expect(stylesSource).not.toMatch(/color:\s*white;/);
  });

  it('keeps the Lens v2 token seams live (panel radius + highlight accent)', () => {
    expect(stylesSource).toContain('var(--world-panel-radius, 1rem)');
    expect(stylesSource).toContain('var(--world-accent,');
  });
});
