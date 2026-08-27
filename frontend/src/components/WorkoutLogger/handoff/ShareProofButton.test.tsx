import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShareProofButton from './ShareProofButton';
import type { ShareEligibility } from './workoutHandoff.types';

const owner: ShareEligibility = { eligible: true, reason: 'owner' };

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const renderBtn = (over: Partial<Parameters<typeof ShareProofButton>[0]> = {}) =>
  render(
    <ShareProofButton share={owner} exerciseName="Barbell Back Squat" todayE1rm={263} pr onEvent={vi.fn()} {...over} />,
  );

describe('ShareProofButton', () => {
  it('withholds the button and shows a note when not the owner', () => {
    for (const share of [{ eligible: false, reason: 'not-owner' }, { eligible: true, reason: 'not-owner' }] as ShareEligibility[]) {
      const { unmount } = renderBtn({ share });
      expect(screen.queryByRole('button', { name: 'Share this win' })).not.toBeInTheDocument();
      expect(screen.getByText('Sharing is available to the client.')).toBeInTheDocument();
      unmount();
    }
  });

  it('shares via navigator.share with PR text and fires the analytics event', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareSpy });
    const onEvent = vi.fn();
    renderBtn({ onEvent });
    fireEvent.click(screen.getByRole('button', { name: 'Share this win' }));
    expect(onEvent).toHaveBeenCalledWith('proof_share_tapped', { pr: true, referral: false });
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    expect(shareSpy.mock.calls[0][0].text).toMatch(/New best on Barbell Back Squat: 263 lb/);
  });

  it('attaches the owner referral link so a signup from the share attributes back', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareSpy });
    const onEvent = vi.fn();
    renderBtn({ share: { eligible: true, reason: 'owner', referralCode: '42.abcdefghijklmnop' }, onEvent });
    fireEvent.click(screen.getByRole('button', { name: 'Share this win' }));
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    expect(shareSpy.mock.calls[0][0].url).toBe(`${window.location.origin}/?ref=42.abcdefghijklmnop`);
    expect(onEvent).toHaveBeenCalledWith('proof_share_tapped', { pr: true, referral: true });
  });

  it('still shares a plain homepage link when no referral code was issued (secret unset)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderBtn({ share: { eligible: true, reason: 'owner', referralCode: null } });
    fireEvent.click(screen.getByRole('button', { name: 'Share this win' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain(`${window.location.origin}/`);
    expect(writeText.mock.calls[0][0]).not.toContain('?ref=');
  });

  it('falls back to clipboard when navigator.share is unavailable, showing the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderBtn({ pr: false });
    fireEvent.click(screen.getByRole('button', { name: 'Share this win' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toMatch(/Logged a Barbell Back Squat session/); // non-PR text
    expect(await screen.findByRole('button', { name: 'Copied to clipboard' })).toBeInTheDocument();
  });
});
