import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/DragDrop/DroppableSlot.tsx'),
  'utf8'
);

describe('DroppableSlot theme bridge', () => {
  it('uses schedule theme variables for drag/drop slot states', () => {
    expect(SOURCE).toContain('DROPPABLE_SLOT_THEME');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(SOURCE).toContain('var(--text-primary, #E0ECF4)');

    expect(SOURCE).not.toContain('galaxySwanTheme');
    expect(SOURCE).not.toContain('#00e5e5');
    expect(SOURCE).not.toMatch(/(?:color|background|border(?:-color)?):\s*#[0-9a-fA-F]{3,8}/);
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
