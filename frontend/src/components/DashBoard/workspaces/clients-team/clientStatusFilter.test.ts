import { describe, expect, it } from 'vitest';
import { filterClientsByStatus, getClientStatusCounts } from './clientStatusFilter';
import type { ClientOption } from './ClientSelectorDropdown';

const client = (overrides: Partial<ClientOption>): ClientOption => ({
  id: 1,
  firstName: 'A',
  lastName: 'B',
  email: 'a.b@example.test',
  ...overrides,
});

const roster: ClientOption[] = [
  client({ id: 1, accountStatus: 'active', isActive: true }),
  client({ id: 2, accountStatus: 'stub', isActive: true }),
  client({ id: 3, accountStatus: 'invited', isActive: true }),
  client({ id: 4, accountStatus: 'active', isActive: false }),
  client({ id: 5 }), // legacy row: no accountStatus, isActive undefined => active
];

describe('getClientStatusCounts', () => {
  it('counts every lifecycle bucket from the roster', () => {
    expect(getClientStatusCounts(roster)).toEqual({
      all: 5,
      active: 4,
      deactivated: 1,
      unclaimed: 1,
      invited: 1,
    });
  });
});

describe('filterClientsByStatus', () => {
  it('returns everyone for all and non-deactivated accounts for active', () => {
    expect(filterClientsByStatus(roster, 'all').map(c => c.id)).toEqual([1, 2, 3, 4, 5]);
    expect(filterClientsByStatus(roster, 'active').map(c => c.id)).toEqual([1, 2, 3, 5]);
  });

  it('isolates deactivated, unclaimed, and invited clients', () => {
    expect(filterClientsByStatus(roster, 'deactivated').map(c => c.id)).toEqual([4]);
    expect(filterClientsByStatus(roster, 'unclaimed').map(c => c.id)).toEqual([2]);
    expect(filterClientsByStatus(roster, 'invited').map(c => c.id)).toEqual([3]);
  });

  it('keeps a deactivated stub out of the unclaimed bucket (deactivation wins)', () => {
    const withDeactivatedStub = [...roster, client({ id: 6, accountStatus: 'stub', isActive: false })];
    expect(filterClientsByStatus(withDeactivatedStub, 'unclaimed').map(c => c.id)).toEqual([2]);
    expect(filterClientsByStatus(withDeactivatedStub, 'deactivated').map(c => c.id)).toEqual([4, 6]);
    expect(getClientStatusCounts(withDeactivatedStub).deactivated).toBe(2);
  });
});
