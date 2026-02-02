import { describe, it, expect } from 'vitest';

const isSpecialActive = (special, now = new Date()) => {
  const start = new Date(special.startDate);
  const end = new Date(special.endDate);
  return special.isActive && start <= now && end >= now;
};

const getApplicableSpecial = (specials, packageId) => {
  const activeSpecials = specials.filter((special) => isSpecialActive(special));
  return activeSpecials.find((special) =>
    !special.applicablePackageIds?.length ||
    special.applicablePackageIds.includes(packageId)
  );
};

describe('Admin Specials Logic', () => {
  const mockSpecials = [
    {
      id: 1,
      name: 'New Year Kickstart',
      bonusSessions: 2,
      applicablePackageIds: [100, 101],
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-31T23:59:59Z',
      isActive: true
    },
    {
      id: 2,
      name: 'All Packages Bonus',
      bonusSessions: 1,
      applicablePackageIds: [],
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      isActive: true
    },
    {
      id: 3,
      name: 'Inactive Special',
      bonusSessions: 5,
      applicablePackageIds: [],
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      isActive: false
    }
  ];

  it('identifies active specials within date range', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    expect(isSpecialActive(mockSpecials[0], now)).toBe(true);
    expect(isSpecialActive(mockSpecials[1], now)).toBe(true);
  });

  it('excludes inactive specials', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    expect(isSpecialActive(mockSpecials[2], now)).toBe(false);
  });

  it('excludes expired specials', () => {
    const now = new Date('2026-02-15T12:00:00Z');
    expect(isSpecialActive(mockSpecials[0], now)).toBe(false);
  });

  it('applies special to specific packages only', () => {
    const special = getApplicableSpecial(mockSpecials, 100);
    expect(special?.name).toBe('New Year Kickstart');
  });

  it('applies universal special to any package', () => {
    const special = getApplicableSpecial(mockSpecials, 999);
    expect(special?.name).toBe('All Packages Bonus');
  });

  it('returns correct bonus sessions', () => {
    const special = getApplicableSpecial(mockSpecials, 100);
    expect(special?.bonusSessions).toBe(2);
  });
});
