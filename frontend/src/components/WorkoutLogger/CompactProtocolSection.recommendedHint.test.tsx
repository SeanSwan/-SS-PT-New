/**
 * Collapsed-state "N recommended" nudge (2026-06-18).
 * Surfaces that phase quick-adds are waiting in an untouched, collapsed
 * section WITHOUT defaulting it open (which would revive the page-swallowing
 * checklist the 2026-04-17 compaction removed).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import CompactProtocolSection, { type ProtocolSelection } from './CompactProtocolSection';
import type { NASMDefaultItem } from './NASMProtocolDefaults';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES_SOURCE = readFileSync(resolve(__dirname, './CompactProtocolSection.styles.ts'), 'utf8');

const RECS: NASMDefaultItem[] = [
  { id: 'w1', name: 'Foam Roll', category: 'smr', phases: [1, 2, 3, 4, 5], completed: false },
  { id: 'w2', name: 'Static Stretch', category: 'static_stretch', phases: [1, 2, 3, 4, 5], completed: false },
];

const baseProps = {
  title: 'Warmup & Corrective',
  icon: <span>icon</span>,
  sectionKey: 'warmup' as const,
  recommendedItems: RECS,
  onToggleOpen: vi.fn(),
  onAddFromRolodex: vi.fn(),
  onQuickAddPreset: vi.fn(),
  onRemoveSelected: vi.fn(),
};

describe('CompactProtocolSection recommended hint', () => {
  it('shows "N recommended" when collapsed and untouched', () => {
    render(<CompactProtocolSection {...baseProps} isOpen={false} selectedItems={[]} />);
    expect(screen.getByText('2 recommended')).toBeTruthy();
  });

  it('hides the hint when the section is open (body shows the chips instead)', () => {
    render(<CompactProtocolSection {...baseProps} isOpen selectedItems={[]} />);
    expect(screen.queryByText('2 recommended')).toBeNull();
  });

  it('hides the hint once the trainer has selected something', () => {
    const selected: ProtocolSelection[] = [{ id: 'w1', name: 'Foam Roll', source: 'preset' }];
    render(<CompactProtocolSection {...baseProps} isOpen={false} selectedItems={selected} />);
    expect(screen.queryByText(/recommended/)).toBeNull();
  });

  it('does not hide the collapsed recommendation cue on phone widths', () => {
    const recommendedHintBlock = STYLES_SOURCE.slice(
      STYLES_SOURCE.indexOf('export const RecommendedHint'),
      STYLES_SOURCE.indexOf('export const AddButton'),
    );
    expect(recommendedHintBlock).toContain('@media (max-width: 480px)');
    expect(recommendedHintBlock).not.toContain('display: none');
  });
});
