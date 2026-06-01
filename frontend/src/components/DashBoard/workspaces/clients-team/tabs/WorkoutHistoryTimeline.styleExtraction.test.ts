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
    expect(styles).toMatch(/SmallBtn[\s\S]*?min-height:\s*44px/);
    expect(styles).toMatch(/SmallBtn[\s\S]*?min-width:\s*44px/);
    expect(styles).toMatch(/SmallBtn[\s\S]*?&:focus-visible/);
  });

  it('keeps workout history click controls as explicit non-submit buttons', () => {
    expect(source).not.toMatch(/<WorkoutHeader\s+onClick=/);
    expect(source).not.toMatch(/<SmallBtn(?![^>]*\btype=)[^>]*\bonClick=/);
  });
});
