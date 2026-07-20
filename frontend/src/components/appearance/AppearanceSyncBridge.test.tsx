/**
 * FUSION F1 — AppearanceSyncBridge behavior:
 * (1) on auth ready, fetches the server profile ONCE per user;
 * (2) a NEWER server profile is applied via beginPreview+commitPreview and
 *     that sync-in commit is NOT pushed back (no feedback write — M3);
 * (3) a USER-originated commit IS pushed; a failed push shows the exact
 *     offline receipt copy; the local commit is never rolled back.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchProfile = vi.fn();
const pushProfile = vi.fn();
vi.mock('../../adapters/style-lens-swan/serverAppearanceSync', () => ({
  fetchProfile: (...args: unknown[]) => fetchProfile(...args),
  pushProfile: (...args: unknown[]) => pushProfile(...args),
}));

const mockAuth = vi.hoisted(() => ({ user: { id: 42 } as { id: number } | null }));
vi.mock('../../context/authContextState', () => ({
  useAuth: () => mockAuth,
}));

const addToast = vi.fn();
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ addToast }),
}));

import { StyleLensProvider, useStyleLensAppearance } from '../../core/style-lens-os';
import { SWAN_STYLE_LENS_REGISTRY } from '../../adapters/style-lens-swan';
import AppearanceSyncBridge from './AppearanceSyncBridge';

const LOCAL_STAMP = '2026-07-16T00:00:00.000Z';
const REMOTE_STAMP = '2026-07-16T05:00:00.000Z';
const remoteProfile = {
  profileSchemaVersion: 1,
  paletteThemeId: 'crystalline-dark',
  styleLensId: 'prism-terminal',
  motionMode: 'auto' as const,
  density: 'comfortable' as const,
  updatedAt: REMOTE_STAMP,
};

const CommitButton: React.FC = () => {
  const { state, beginPreview, commitPreview } = useStyleLensAppearance();
  return (
    <>
      <output data-testid="committed-lens">{state.committed.styleLensId}</output>
      <button
        type="button"
        onClick={() =>
          beginPreview({
            ...state.committed,
            styleLensId: 'candy-glass-arcade',
            updatedAt: '2026-07-16T09:00:00.000Z',
          })
        }
      >
        stage
      </button>
      <button type="button" onClick={() => void commitPreview()}>
        user commit
      </button>
    </>
  );
};

const mount = () =>
  render(
    <StyleLensProvider registry={SWAN_STYLE_LENS_REGISTRY} sourceId="bridge-test">
      <AppearanceSyncBridge />
      <CommitButton />
    </StyleLensProvider>,
  );

describe('AppearanceSyncBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { id: 42 };
    window.localStorage.clear();
  });

  it('applies a NEWER server profile once and does NOT push it back', async () => {
    fetchProfile.mockResolvedValue({ profile: remoteProfile, overlay: null, updatedAt: REMOTE_STAMP });
    mount();
    await waitFor(() =>
      expect(screen.getByTestId('committed-lens').textContent).toBe('prism-terminal'),
    );
    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(pushProfile).not.toHaveBeenCalled();
  });

  it('a user-originated commit pushes; failure shows the EXACT offline receipt and keeps the commit', async () => {
    fetchProfile.mockResolvedValue({ profile: null, overlay: null, updatedAt: null });
    pushProfile.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(fetchProfile).toHaveBeenCalled());
    await act(async () => {
      screen.getByRole('button', { name: 'stage' }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'user commit' }).click();
    });
    await waitFor(() => expect(pushProfile).toHaveBeenCalledTimes(1));
    expect(pushProfile).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: 'candy-glass-arcade' }),
    );
    expect(addToast).toHaveBeenCalledWith(
      "Saved on this device — will sync when you're back online.",
      'info',
    );
    expect(screen.getByTestId('committed-lens').textContent).toBe('candy-glass-arcade');
  });

  it('anonymous: no fetch, no push', async () => {
    mockAuth.user = null;
    fetchProfile.mockResolvedValue(null);
    mount();
    await act(async () => {});
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(pushProfile).not.toHaveBeenCalled();
  });
});
