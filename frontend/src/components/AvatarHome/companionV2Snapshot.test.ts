import { describe, expect, it } from 'vitest';
import { normalizeCompanionV2Snapshot } from './companionV2Snapshot';

describe('companionV2Snapshot', () => {
  it('returns a safe empty snapshot when no pet exists', () => {
    const snapshot = normalizeCompanionV2Snapshot({ hasPet: false });
    expect(snapshot.hasPet).toBe(false);
    expect(snapshot.stageLabel).toBe('Egg');
    expect(snapshot.moodLabel).toBe('content');
  });

  it('normalizes a populated pet snapshot for dashboard surfaces', () => {
    const snapshot = normalizeCompanionV2Snapshot({
      hasPet: true,
      pet: {
        name: 'Astra',
        species: 'frost_swan',
        evolution: { stage: 3, label: 'Adult' },
        health: 91,
        happiness: 82,
        mood: { label: 'happy' },
        totalInteractions: 12,
      },
    });

    expect(snapshot).toMatchObject({
      hasPet: true,
      name: 'Astra',
      species: 'frost_swan',
      stage: 3,
      stageLabel: 'Adult',
      health: 91,
      happiness: 82,
      moodLabel: 'happy',
      totalInteractions: 12,
    });
  });

  it('clamps unknown evolution stages into supported display labels', () => {
    const snapshot = normalizeCompanionV2Snapshot({
      hasPet: true,
      pet: {
        name: '',
        species: '',
        evolution: { stage: 99 },
        health: 'bad',
        happiness: null,
        mood: {},
      },
    });

    expect(snapshot.name).toBe('Companion');
    expect(snapshot.stage).toBe(5);
    expect(snapshot.stageLabel).toBe('Mythic');
    expect(snapshot.health).toBe(0);
    expect(snapshot.happiness).toBe(0);
  });
});
