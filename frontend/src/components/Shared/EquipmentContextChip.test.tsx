/**
 * EquipmentContextChip — F11 derivation, mismatch, and render contracts.
 * Locks the Kimi #1 / HY3 #1 locked directives: derive-don't-ask, corrective
 * mismatch, always-visible context.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import {
  deriveActiveProfile,
  evaluateEquipmentMismatch,
  type ChipProfile,
} from './EquipmentContextChip.helpers';
import EquipmentContextChip, { MismatchNotice } from './EquipmentContextChip';

vi.mock('../../services/api.service', () => ({
  default: { get: vi.fn() },
}));
import apiService from '../../services/api.service';

const profile = (id: number, overrides: Partial<ChipProfile> = {}): ChipProfile => ({
  id,
  name: `Profile ${id}`,
  locationType: 'gym',
  equipmentCount: 5,
  isDefault: false,
  ...overrides,
});

describe('deriveActiveProfile', () => {
  it('explicit selection wins over everything', () => {
    const result = deriveActiveProfile({
      profiles: [profile(1), profile(2)],
      selectedId: 2,
      planProfileId: 1,
      userHasInteracted: false,
    });
    expect(result).toEqual({ profileId: 2, source: 'selection' });
  });

  it('plan-provided id wins when nothing is selected', () => {
    const result = deriveActiveProfile({
      profiles: [profile(1), profile(2)],
      selectedId: null,
      planProfileId: 1,
      userHasInteracted: false,
    });
    expect(result).toEqual({ profileId: 1, source: 'plan' });
  });

  it('a single profile is silently active', () => {
    const result = deriveActiveProfile({
      profiles: [profile(7)],
      selectedId: null,
      userHasInteracted: false,
    });
    expect(result).toEqual({ profileId: 7, source: 'only-profile' });
  });

  it('the default-flagged profile wins among many', () => {
    const result = deriveActiveProfile({
      profiles: [profile(1), profile(2, { isDefault: true }), profile(3)],
      selectedId: null,
      userHasInteracted: false,
    });
    expect(result).toEqual({ profileId: 2, source: 'default-profile' });
  });

  it('ambiguous (many profiles, no default, no plan) stays unset', () => {
    const result = deriveActiveProfile({
      profiles: [profile(1), profile(2)],
      selectedId: null,
      userHasInteracted: false,
    });
    expect(result).toEqual({ profileId: null, source: 'unset' });
  });

  it('a user-cleared chip is NOT re-derived', () => {
    const result = deriveActiveProfile({
      profiles: [profile(1)],
      selectedId: null,
      userHasInteracted: true,
    });
    expect(result).toEqual({ profileId: null, source: 'unset' });
  });

  it('a stale selection id not in the list falls back to derivation', () => {
    const result = deriveActiveProfile({
      profiles: [profile(1)],
      selectedId: 99,
      userHasInteracted: false,
    });
    expect(result).toEqual({ profileId: 1, source: 'only-profile' });
  });
});

describe('evaluateEquipmentMismatch', () => {
  it('ok when required equipment is in inventory (case/format tolerant)', () => {
    expect(evaluateEquipmentMismatch(['Dumbbells'], ['Adjustable Dumbbells 5-50'])).toBe('ok');
    expect(evaluateEquipmentMismatch(['flat bench'], ['Flat Bench'])).toBe('ok');
  });

  it('mismatch when required equipment is absent', () => {
    expect(evaluateEquipmentMismatch(['Cable Machine'], ['Dumbbells', 'Bench'])).toBe('mismatch');
  });

  it('bodyweight/none/empty requirements are always ok', () => {
    expect(evaluateEquipmentMismatch(['Bodyweight'], [])).toBe('ok');
    expect(evaluateEquipmentMismatch(['none'], [])).toBe('ok');
    expect(evaluateEquipmentMismatch([], [])).toBe('ok');
  });

  it('all requirements must be satisfied', () => {
    expect(evaluateEquipmentMismatch(['Dumbbells', 'Bench'], ['Dumbbells'])).toBe('mismatch');
  });
});

describe('EquipmentContextChip render', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockReset();
  });

  it('shows the active profile and pushes silent derivation to the parent', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: { success: true, profiles: [profile(7, { name: 'Main Gym' })] },
    });
    const onSelect = vi.fn();
    render(<EquipmentContextChip selectedProfileId={null} onSelect={onSelect} />);
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(7));
  });

  it('opens the sheet and switches profiles in one tap', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        profiles: [profile(1, { name: 'Main Gym' }), profile(2, { name: 'Park', locationType: 'park' })],
      },
    });
    const onSelect = vi.fn();
    render(<EquipmentContextChip selectedProfileId={1} onSelect={onSelect} />);
    await waitFor(() => expect(screen.getByText(/Planning from: Main Gym/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Planning from/ }));
    fireEvent.click(screen.getByRole('button', { name: /Park/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('renders the client-context ribbon for client-owned gear', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ data: { success: true, profiles: [] } });
    render(
      <EquipmentContextChip
        selectedProfileId={null}
        onSelect={() => {}}
        contextOwner={{ kind: 'client', label: 'Client #1042 · Home' }}
      />,
    );
    await waitFor(() => expect(screen.getByText(/read-only/)).toBeTruthy());
  });
});

describe('MismatchNotice', () => {
  it('is corrective, not blocking — offers the switch action', () => {
    const onSwitch = vi.fn();
    render(<MismatchNotice profileName="Main Gym" onSwitchProfile={onSwitch} />);
    expect(screen.getByText(/Not in Main Gym — log anyway\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Switch profile/ }));
    expect(onSwitch).toHaveBeenCalled();
  });
});
