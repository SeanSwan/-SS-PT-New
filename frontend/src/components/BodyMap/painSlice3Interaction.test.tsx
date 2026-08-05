/**
 * Pain-Chart Slice 3 — interaction overhaul regressions.
 * B8 severity channels, B10 client prompt-leak, B6 dialog semantics,
 * B5 keep-mounted refetch (source contract).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getSeverityColor, getSeverityTier } from './bodyRegions';
import PainChartInsightPanel from './PainChartInsightPanel';
import type { PainEntry } from '../../services/painEntryService';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('B8 — severity is multi-channel and tokenized', () => {
  it('tiers split at 4 and 7', () => {
    expect(getSeverityTier(3)).toBe('mild');
    expect(getSeverityTier(4)).toBe('moderate');
    expect(getSeverityTier(6)).toBe('moderate');
    expect(getSeverityTier(7)).toBe('severe');
  });

  it('colors are var(--token, #fallback) and non-adjacent (no dual-blue pair)', () => {
    const severe = getSeverityColor(8);
    const moderate = getSeverityColor(5);
    const mild = getSeverityColor(2);
    for (const c of [severe, moderate, mild]) expect(c).toMatch(/^var\(--/);
    expect(new Set([severe, moderate, mild]).size).toBe(3);
    expect(moderate).not.toContain('50A0F0'); // the old near-identical blue
  });
});

const makeEntry = (overrides: Partial<PainEntry>): PainEntry => ({
  id: 1,
  userId: 42,
  bodyRegion: 'left_shoulder',
  side: 'left',
  painLevel: 8,
  painType: 'sharp',
  description: null,
  onsetDate: null,
  isActive: true,
  resolvedAt: null,
  aggravatingMovements: 'overhead pressing',
  relievingFactors: null,
  trainerNotes: null,
  aiNotes: null,
  posturalSyndrome: 'none',
  assessmentFindings: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
} as PainEntry);

describe('B10 — AI prompt fragment never renders for clients', () => {
  it('client mode hides Coach context; staff mode shows it', () => {
    const entries = [makeEntry({})];
    const client = render(
      <PainChartInsightPanel entries={entries} isClientMode onSelectRegion={() => {}} />,
    );
    expect(client.container.textContent).not.toContain('Coach context:');

    const staff = render(
      <PainChartInsightPanel entries={entries} isClientMode={false} onSelectRegion={() => {}} />,
    );
    expect(staff.container.textContent).toContain('Coach context:');
  });

  it('tabs carry complete ARIA (tabpanel + aria-controls + roving tabindex)', () => {
    const { container } = render(
      <PainChartInsightPanel entries={[makeEntry({})]} isClientMode={false} onSelectRegion={() => {}} />,
    );
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs.length).toBe(3);
    expect(container.querySelector('[role="tabpanel"]')).not.toBeNull();
    for (const tab of tabs) expect(tab.getAttribute('aria-controls')).toBe('pain-tabpanel');
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);
  });
});

describe('B6/B5 — source contracts', () => {
  it('PainEntryPanel is a real dialog: role, focus trap, Escape, inert when closed, drag-dismiss', () => {
    const src = read('src/components/BodyMap/PainEntryPanel.tsx');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain("if (e.key === 'Escape')");
    expect(src).toContain('.inert = true');
    expect(src).toContain('handleDragEnd');
  });

  it('BodyMap stays mounted during refetches (B5)', () => {
    const src = read('src/components/BodyMap/index.tsx');
    expect(src).not.toContain('{!loading && (');
    expect(src).toContain('{(hasLoadedOnce || !loading) && (');
  });

  it('BodyMapSVG uses per-panel zoom and disambiguation chips (B1/B2)', () => {
    const src = read('src/components/BodyMap/BodyMapSVG.tsx');
    expect(src).toContain("import ZoomablePanel from './ZoomablePanel'");
    expect(src).toContain('findRegionsAtPoint');
    expect(src).toContain('Which area?');
    expect(src).not.toContain('const [scale, setScale]'); // shared zoom state is gone
  });
});
