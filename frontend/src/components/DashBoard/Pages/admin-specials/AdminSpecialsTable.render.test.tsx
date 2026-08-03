/**
 * Render regression for AdminSpecialsTable (launch audit lane 2, 2026-08-03).
 * Pins the phone-width fix: the table must render inside a horizontal
 * scroll wrapper (TableScroller) so narrow viewports scroll instead of
 * clipping columns, and row actions must remain present.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminSpecialsTable from './AdminSpecialsTable';
import type { AdminSpecial, Package } from './adminSpecials.types';

const special: AdminSpecial = {
  id: 1,
  name: 'Launch Bonus',
  bonusSessions: 2,
  applicablePackageIds: [],
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: '2026-08-31T00:00:00.000Z',
  isActive: true,
} as AdminSpecial;

const packages: Package[] = [];

describe('AdminSpecialsTable', () => {
  it('wraps the table in a scroll container and renders row actions', () => {
    render(
      <AdminSpecialsTable
        specials={[special]}
        packages={packages}
        onEdit={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const table = screen.getByRole('table');
    // The direct parent must be the TableScroller div, not the page body —
    // this is what prevents 320-414px column clipping.
    expect(table.parentElement?.tagName).toBe('DIV');
    expect(screen.getByText('Launch Bonus')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('renders the empty state without a table when no specials exist', () => {
    render(
      <AdminSpecialsTable
        specials={[]}
        packages={packages}
        onEdit={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/No specials created yet/i)).toBeTruthy();
  });
});
