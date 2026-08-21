/**
 * UserSettingsHub — save contract (BEHAVIORAL).
 *
 * Replaces a source-text regex test that read this component as a STRING and
 * pattern-matched it. That test passed green while Settings shipped a P0: the
 * dashboard shell omitted `onUpdateProfile`, `UserDashboardTabsV3` coalesced the
 * missing prop to `async () => undefined`, the promise resolved, and the UI
 * reported "Saved" while writing nothing — silently discarding profileVisibility,
 * showWorkoutHistory, chartVisibility, healthConcerns and emergencyContact.
 *
 * A string-matching test cannot catch that. These render the component and assert
 * what actually happens.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, isLoading: false, tier: 'free' }),
}));
vi.mock('../../../services/api.service', () => ({
  default: { put: vi.fn(), get: vi.fn().mockResolvedValue({ data: {} }) },
}));

import apiService from '../../../services/api.service';
import UserSettingsHub from './UserSettingsHub';

const profile = {
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'user@example.test',
  profileVisibility: 'public',
} as never;

const clickSave = async () => {
  const btn = await screen.findByRole('button', { name: /save settings/i });
  fireEvent.click(btn);
  return btn;
};

describe('UserSettingsHub save contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes to /api/profile when no persistence callback is supplied', async () => {
    (apiService.put as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, data: {} });

    render(<UserSettingsHub profile={profile} />);
    await clickSave();

    await waitFor(() => expect(apiService.put).toHaveBeenCalledTimes(1));
    expect((apiService.put as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/api/profile');
  });

  it('delegates to the supplied callback and sends the privacy fields', async () => {
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);

    render(<UserSettingsHub profile={profile} onUpdateProfile={onUpdateProfile} />);
    await clickSave();

    await waitFor(() => expect(onUpdateProfile).toHaveBeenCalledTimes(1));
    const payload = onUpdateProfile.mock.calls[0][0];
    // These are the fields the P0 silently dropped.
    expect(payload).toHaveProperty('profileVisibility');
    expect(payload).toHaveProperty('showWorkoutHistory');
    expect(payload).toHaveProperty('chartVisibility');
    // Delegating must NOT also hit the endpoint — exactly one write path per save.
    expect(apiService.put).not.toHaveBeenCalled();
  });

  it('does NOT report success when the write rejects', async () => {
    const onUpdateProfile = vi.fn().mockRejectedValue(new Error('network down'));

    render(<UserSettingsHub profile={profile} onUpdateProfile={onUpdateProfile} />);
    await clickSave();

    await waitFor(() => expect(onUpdateProfile).toHaveBeenCalled());
    // The whole class of bug is a success state that outruns the truth.
    await waitFor(() => {
      expect(screen.queryByText(/saved|settings updated/i)).not.toBeInTheDocument();
    });
  });
});
