/**
 * Pain-Chart Slice 4 (C5) — per-episode severity trend facts.
 * Locks the truthfulness rules: per-(region,side,episode) only, >=2 points
 * before any delta, sample size always stated (guards the "quantified noise"
 * failure mode — a 1-point 'trend' is a lie with an axis).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { entryFindAll, revisionFindAll } = vi.hoisted(() => ({
  entryFindAll: vi.fn(),
  revisionFindAll: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientPainEntry') return { findAll: entryFindAll };
    if (name === 'PainEntryRevision') return { findAll: revisionFindAll };
    throw new Error(`unexpected model ${name}`);
  },
}));

const { getPainTrendFacts, formatTrendFactsForPrompt } = await import('../../services/painTrendService.mjs');

const day = (n) => new Date(Date.UTC(2026, 6, n)).toISOString();

beforeEach(() => {
  entryFindAll.mockReset();
  revisionFindAll.mockReset();
  revisionFindAll.mockResolvedValue([]);
});

describe('getPainTrendFacts', () => {
  it('never mixes body parts into one trend (the B11 lie)', async () => {
    entryFindAll.mockResolvedValue([
      { id: 1, episodeId: 'ep-ankle', bodyRegion: 'left_ankle_front', side: 'left', painLevel: 2, isActive: false, createdAt: day(1), updatedAt: day(1) },
      { id: 2, episodeId: 'ep-shoulder', bodyRegion: 'left_shoulder', side: 'left', painLevel: 8, isActive: true, createdAt: day(20), updatedAt: day(20) },
    ]);
    const { facts } = await getPainTrendFacts(42);
    expect(facts).toHaveLength(2);
    // Single-point episodes carry NO delta — nothing claims "2 → 8".
    for (const fact of facts) {
      expect(fact.points).toBe(1);
      expect(fact.delta).toBeNull();
      expect(fact.direction).toBeNull();
    }
  });

  it('computes a delta from the revision timeline within one episode', async () => {
    entryFindAll.mockResolvedValue([
      { id: 5, episodeId: 'ep-1', bodyRegion: 'left_knee', side: 'left', painLevel: 7, isActive: true, createdAt: day(1), updatedAt: day(15) },
    ]);
    revisionFindAll.mockResolvedValue([
      { painEntryId: 5, changes: { painLevel: { from: 3, to: 5 } }, createdAt: day(8) },
      { painEntryId: 5, changes: { painLevel: { from: 5, to: 7 } }, createdAt: day(15) },
    ]);
    const { facts } = await getPainTrendFacts(42);
    expect(facts).toHaveLength(1);
    const fact = facts[0];
    expect(fact.points).toBe(3);           // creation(3) + two revisions
    expect(fact.firstLevel).toBe(3);
    expect(fact.latestLevel).toBe(7);
    expect(fact.delta).toBe(4);
    expect(fact.direction).toBe('worsening');
    expect(fact.flare).toBe(true);         // +4 within 14d
  });

  it('multi-entry episodes (flare-up re-log) chain into one timeline', async () => {
    entryFindAll.mockResolvedValue([
      { id: 1, episodeId: 'ep-x', bodyRegion: 'lower_back', side: 'center', painLevel: 4, isActive: false, createdAt: day(1), updatedAt: day(1) },
      { id: 2, episodeId: 'ep-x', bodyRegion: 'lower_back', side: 'center', painLevel: 8, isActive: true, createdAt: day(10), updatedAt: day(10) },
    ]);
    const { facts } = await getPainTrendFacts(42);
    expect(facts).toHaveLength(1);
    expect(facts[0].points).toBe(2);
    expect(facts[0].delta).toBe(4);
    expect(facts[0].flare).toBe(true);     // new >=7 entry in existing episode
  });

  it('degrades to unavailable instead of throwing', async () => {
    entryFindAll.mockRejectedValue(new Error('db down'));
    const result = await getPainTrendFacts(42);
    expect(result.status).toBe('unavailable');
    expect(result.facts).toEqual([]);
  });
});

describe('formatTrendFactsForPrompt', () => {
  it('emits only active multi-point facts, always with sample size', () => {
    const lines = formatTrendFactsForPrompt([
      { bodyRegion: 'left_knee', side: 'left', latestLevel: 7, isActive: true, points: 3, delta: 4, spanDays: 14, direction: 'worsening', flare: true },
      { bodyRegion: 'left_ankle_front', side: 'left', latestLevel: 2, isActive: false, points: 2, delta: -3, spanDays: 20, direction: 'improving', flare: false },
      { bodyRegion: 'chest', side: 'center', latestLevel: 5, isActive: true, points: 1, delta: null, spanDays: null, direction: null, flare: false },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('left_knee(left): worsening +4 over 14d (3 data points), now 7/10 [FLARE]');
  });
});
