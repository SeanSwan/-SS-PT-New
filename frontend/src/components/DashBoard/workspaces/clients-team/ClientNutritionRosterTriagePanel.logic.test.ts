import { describe, expect, it } from 'vitest';
import {
  buildNutritionRosterRows,
  ROSTER_TRIAGE_COLLAPSED_COUNT,
  selectRosterClientIds,
  selectVisibleRosterRows,
  type NutritionRosterClient,
  type NutritionRosterRow,
  type RosterTriageRecord,
} from './ClientNutritionRosterTriagePanel.logic';

const clients: NutritionRosterClient[] = [
  { id: 101, displayName: 'Alpha Client' },
  { id: 202, displayName: 'Beta Client' },
  { id: 303, displayName: 'Gamma Client' },
];

const records: RosterTriageRecord[] = [
  {
    userId: 101,
    mealCountToday: 2,
    weeklyLoggedDays: 4,
    totalProtein: 55,
    flags: {
      noMealsToday: false,
      sodiumAttention: true,
      sugarAttention: false,
      sparseWeekly: false,
    },
  },
  {
    userId: 202,
    mealCountToday: 0,
    weeklyLoggedDays: 0,
    totalProtein: 0,
    flags: {
      noMealsToday: true,
      sodiumAttention: false,
      sugarAttention: false,
      sparseWeekly: true,
    },
  },
];

describe('ClientNutritionRosterTriagePanel logic', () => {
  it('sorts attention rows first and keeps honest labels', () => {
    const rows = buildNutritionRosterRows(clients, records);

    expect(rows.map((row) => row.clientName)).toEqual(['Beta Client', 'Alpha Client', 'Gamma Client']);
    expect(rows[0]).toMatchObject({
      statusLabel: 'No meals today',
      weeklyLabel: '0/7 days',
      proteinLabel: '0g protein',
      flags: ['No meals today', 'Sparse weekly logging'],
    });
    expect(rows[1].flags).toEqual(['Sodium attention']);
    expect(rows[2].flags).toEqual(['No nutrition data']);
  });

  it('caps batch requests to the first twelve positive client ids', () => {
    const many = [
      { id: 1, displayName: 'Client 1 duplicate' },
      ...Array.from({ length: 16 }, (_, index) => ({ id: index + 1, displayName: `Client ${index + 1}` })),
    ];

    expect(selectRosterClientIds(many)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('rejects coercive roster totals before rendering coach-facing labels', () => {
    const rows = buildNutritionRosterRows([clients[0]], [{
      userId: 101,
      mealCountToday: ['2'] as unknown as number,
      weeklyLoggedDays: '1e2' as unknown as number,
      totalProtein: { valueOf: () => 88 } as unknown as number,
      flags: {},
    }]);

    expect(rows[0]).toMatchObject({
      statusLabel: 'No meals today',
      weeklyLabel: '0/7 days',
      proteinLabel: '0g protein',
      flags: ['No attention flags'],
    });
  });

  it('rejects fractional and out-of-range count fields before rendering coach-facing labels', () => {
    const rows = buildNutritionRosterRows([clients[0]], [{
      userId: 101,
      mealCountToday: 1.5,
      weeklyLoggedDays: 9,
      totalProtein: 88.6,
      flags: {},
    }]);

    expect(rows[0]).toMatchObject({
      statusLabel: 'No meals today',
      weeklyLabel: '7/7 days',
      proteinLabel: '89g protein',
      flags: ['No attention flags'],
    });
  });

  it('rejects coercive record user ids before joining roster records to visible clients', () => {
    const rows = buildNutritionRosterRows([clients[0]], [{
      userId: [101] as unknown as number,
      mealCountToday: 2,
      weeklyLoggedDays: 4,
      totalProtein: 88,
      flags: {},
    }]);

    expect(rows[0]).toMatchObject({
      statusLabel: 'No nutrition data',
      weeklyLabel: '0/7 days',
      proteinLabel: '0g protein',
      flags: ['No nutrition data'],
    });
  });

  it('normalizes visible client ids before joining records and skips invalid client rows', () => {
    const rows = buildNutritionRosterRows([
      { id: '101' as unknown as number, displayName: 'Alpha Client' },
      { id: ['202'] as unknown as number, displayName: 'Coerced Client' },
    ], records);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      clientId: 101,
      clientName: 'Alpha Client',
      statusLabel: '2 meals today',
      weeklyLabel: '4/7 days',
      proteinLabel: '55g protein',
    });
  });

  it('collapses to four visible rows by default and shows all when expanded', () => {
    const rows: NutritionRosterRow[] = Array.from({ length: 6 }, (_, index) => ({
      clientId: index + 1,
      clientName: `Client ${index + 1}`,
      statusLabel: 'No meals today',
      weeklyLabel: '0/7 days',
      proteinLabel: '0g protein',
      flags: ['No attention flags'],
      attentionScore: 0,
    }));

    expect(selectVisibleRosterRows(rows, false)).toHaveLength(ROSTER_TRIAGE_COLLAPSED_COUNT);
    expect(selectVisibleRosterRows(rows, true)).toHaveLength(6);
    expect(selectVisibleRosterRows(rows.slice(0, 3), false)).toHaveLength(3);
  });
});
