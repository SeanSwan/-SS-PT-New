import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'admin-client-progress-view.V2.tsx'), 'utf8');

describe('AdminClientProgressView rank title copy', () => {
  it('derives the visible progress badge from the Swan rank ladder', () => {
    expect(source).toContain("from '../../../../types/gamification'");
    expect(source).toContain('getTierDisplay(getTier(level)).name');
  });

  it('does not keep retired metal-tier rank labels in visible fallback logic', () => {
    expect(source).not.toContain('Bronze Forge');
    expect(source).not.toContain('Silver Edge');
    expect(source).not.toContain('Titanium Core');
    expect(source).not.toContain('Obsidian Warrior');
  });
});
