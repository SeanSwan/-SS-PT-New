import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'WorkoutHistoryTimeline.tsx'), 'utf8');

describe('WorkoutHistoryTimeline extraction and button semantics', () => {
  it('keeps the active workout history component under the 300-line cap', () => {
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps workout history visual chrome extracted and edit actions touch-safe', () => {
    const styles = readFileSync(resolve(__dirname, 'WorkoutHistoryTimeline.styles.ts'), 'utf8');

    expect(source).not.toContain('style={{');
    expect(styles).toContain('export const EmptyIcon');
    expect(styles).toContain('export const EmptyTitle');
    expect(styles).toContain('export const EmptyText');
    expect(styles).toContain('export const TitleIcon');
    expect(styles).toContain('export const SetHeaderRow');
    expect(styles).toContain('export const SetNote');
    expect(styles).toContain('export const AddSetButton');
    expect(styles).toContain('swanDataCardShell');
    expect(styles).toContain('swanClientActionButton');
    expect(styles).toContain('swanPill');
    expect(styles).toContain('grid-template-columns: minmax(34px, 0.55fr)');
    expect(styles).toContain('grid-template-columns: minmax(30px, 0.55fr)');
    expect(styles).toContain('box-sizing: border-box');
    expect(styles).not.toContain('white-space: nowrap');
    expect(styles).not.toContain('grid-template-columns: 40px 70px 70px 60px auto');
    expect(styles).toMatch(/SmallBtn[\s\S]*?swanClientActionButton/);
  });

  it('keeps workout history click controls as explicit non-submit buttons', () => {
    expect(source).not.toMatch(/<WorkoutHeader\s+onClick=/);
    expect(source).not.toMatch(/<SmallBtn(?![^>]*\btype=)[^>]*\bonClick=/);
  });
});
