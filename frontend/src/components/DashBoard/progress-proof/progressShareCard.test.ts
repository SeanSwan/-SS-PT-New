import { describe, expect, it } from 'vitest';
import { buildProgressShareCard } from './progressShareCard';
import { downloadProgressShareCardPng } from './progressShareCardExport';

describe('progress share card builder', () => {
  it('builds a shareable proof card from a real chart pulse', () => {
    const card = buildProgressShareCard({
      chartTitle: 'Weekly Training Volume',
      csvRows: [
        { week: 'W1', volume_lbs: 1200 },
        { week: 'W2', volume_lbs: 2400 },
      ],
      pulse: {
        label: 'Volume Pulse',
        value: '+100% vs prior',
        detail: 'Latest W2: 2,400 lbs. Best W2: 2,400 lbs.',
        target: 'Protect the new high mark: 2,400 lbs.',
        tone: 'record',
      },
      rangeLabel: 'quarter view',
      summary: 'Showing 2 verified points. Highest: W2 at 2,400 lbs.',
    });

    expect(card.isShareable).toBe(true);
    expect(card.caption).toContain('Progress Proof: Weekly Training Volume');
    expect(card.caption).toContain('Volume Pulse: +100% vs prior');
    expect(card.caption).toContain('2 verified chart rows');
    expect(card.metrics).toEqual([
      { label: 'Volume Pulse', value: '+100% vs prior' },
      { label: 'Range', value: 'quarter view' },
      { label: 'Verified rows', value: '2' },
    ]);
  });

  it('returns an honest locked card when there are no verified rows', () => {
    const card = buildProgressShareCard({
      chartTitle: 'Weekly Training Volume',
      csvRows: [],
      pulse: {
        label: 'Volume Pulse',
        value: 'Waiting on logs',
        detail: 'No verified rows exist in this range yet.',
        tone: 'empty',
      },
      rangeLabel: 'recent verified data',
      summary: 'No verified chart rows are available for this range.',
    });

    expect(card.isShareable).toBe(false);
    expect(card.tone).toBe('empty');
    expect(card.caption).not.toContain('+');
    expect(card.proofLine).toBe('Log real workouts to unlock a shareable proof card.');
  });

  it('does not include row-level private fields in generated share copy', () => {
    const card = buildProgressShareCard({
      chartTitle: 'Weekly Training Volume',
      csvRows: [
        {
          athlete: 'Jane Client',
          email: 'jane.client@example.com',
          phone: '555-123-4567',
          week: 'W1',
          volume_lbs: 1200,
        },
      ],
      pulse: {
        label: 'Volume Pulse',
        value: 'Stable',
        detail: 'Latest W1: 1,200 lbs. Best W1: 1,200 lbs.',
        tone: 'steady',
      },
      rangeLabel: 'recent verified data',
      summary: 'Showing 1 verified point.',
    });

    expect(card.caption).not.toContain('Jane Client');
    expect(card.caption).not.toContain('jane.client@example.com');
    expect(card.caption).not.toContain('555-123-4567');
    expect(card.caption).toContain('1 verified chart row');
  });

  it('does not export a generated card when the proof card is locked', async () => {
    const card = buildProgressShareCard({
      chartTitle: 'Weekly Training Volume',
      csvRows: [],
      rangeLabel: 'recent verified data',
      summary: 'No verified chart rows are available for this range.',
    });

    await expect(downloadProgressShareCardPng(card, 'locked.png')).resolves.toBe(false);
  });
});
