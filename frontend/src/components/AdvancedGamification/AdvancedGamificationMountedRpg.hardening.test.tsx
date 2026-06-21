import React from 'react';
import { act, cleanup, render, renderHook, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompanionPet from './components/CompanionPet/CompanionPet';
import { useCompanionPet } from './components/CompanionPet/useCompanionPet';
import NeedBarComponent from './components/AegisHud/NeedBarComponent';
import useAegisHud from './components/AegisHud/useAegisHud';
import { useVaultDecryption } from './components/VaultDecryption/useVaultDecryption';
import apiService from '../../services/api.service';
import type { AegisHudData, NeedBar } from './components/AegisHud/AegisHudTypes';
import type { VaultDrop } from './components/VaultDecryption/VaultDecryptionTypes';

vi.mock('./components/CompanionPet/useCompanionPet', () => ({
  useCompanionPet: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockUseCompanionPet = vi.mocked(useCompanionPet);
const apiServiceMock = vi.mocked(apiService);

const makeNeed = (overrides: Partial<NeedBar> = {}): NeedBar => ({
  key: 'athletic',
  label: 'Athletic Power',
  icon: 'dumbbell',
  value: 75,
  maxValue: 100,
  color: 'var(--accent-primary, #60C0F0)',
  decayRate: 1,
  lastUpdated: '2026-06-20T00:00:00.000Z',
  ...overrides,
});

const makeAegisData = (overrides: Partial<AegisHudData> = {}): AegisHudData => ({
  needs: [makeNeed()],
  moodlet: { id: 'ready', label: 'Ready', icon: 'sparkles' },
  overallHealth: 75,
  userId: 42,
  jobClass: 'paladin',
  ...overrides,
});

const makePetHookState = (overrides: Partial<ReturnType<typeof useCompanionPet>> = {}) => ({
  pet: null,
  hasPet: false,
  loading: false,
  error: null,
  interacting: false,
  adoptPet: vi.fn(),
  interact: vi.fn(),
  renamePet: vi.fn(),
  releasePet: vi.fn(),
  refetch: vi.fn(),
  ...overrides,
});

const makeVaultDrop = (overrides: Partial<VaultDrop> = {}): VaultDrop => ({
  id: 'vault-drop-1',
  userId: 42,
  rarity: 'rare',
  rarityLabel: 'Rare',
  rarityColor: 'var(--accent-primary, #60C0F0)',
  glowColor: 'var(--accent-primary, #60C0F0)',
  decryptionTime: 1200,
  xpBonus: 25,
  trigger: 'workout_logged',
  actionType: 'workout_logged',
  timestamp: '2026-06-20T00:00:00.000Z',
  item: {
    id: 'item-1',
    type: 'badge',
    name: 'Training Spark',
    description: 'Logged a workout.',
    rarity: 'rare',
  },
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('mounted advanced gamification RPG hardening', () => {
  it('renders a safe companion retry state instead of adoption when pet fetch fails', () => {
    const refetch = vi.fn();
    mockUseCompanionPet.mockReturnValue(makePetHookState({
      error: 'SQL failed for private table',
      refetch,
    }));

    render(<CompanionPet userId={42} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Companion data is temporarily unavailable.');
    expect(screen.queryByText(/SQL failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adopt Your Companion/i)).not.toBeInTheDocument();

    const retry = screen.getByRole('button', { name: /retry/i });
    expect(retry).toHaveAttribute('type', 'button');
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('clamps malformed Aegis HUD need values before rendering labels and progress', () => {
    render(<NeedBarComponent need={makeNeed({ value: Number.NaN, maxValue: 0 })} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();

    cleanup();

    render(<NeedBarComponent need={makeNeed({ value: 130, maxValue: 100 })} />);
    expect(screen.getByText('100/100')).toBeInTheDocument();
  });

  it('rejects coerced Aegis HUD need numbers from array, hex, and scientific strings', () => {
    render(<NeedBarComponent need={makeNeed({ value: [75] as unknown as number, maxValue: 100 })} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();

    cleanup();

    render(<NeedBarComponent need={makeNeed({ value: '0x64' as unknown as number, maxValue: 100 })} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();

    cleanup();

    render(<NeedBarComponent need={makeNeed({ value: '1e2' as unknown as number, maxValue: 100 })} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('settles Aegis HUD loading when no user is available', async () => {
    const { result } = renderHook(() => useAegisHud(null, { refreshInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('clears stale Aegis HUD data when user context becomes unavailable', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      status: 200,
      data: { success: true, data: makeAegisData() },
    });

    const { result, rerender } = renderHook(
      ({ userId }: { userId: number | null }) => useAegisHud(userId, { refreshInterval: 0 }),
      { initialProps: { userId: 42 } },
    );

    await waitFor(() => expect(result.current.data?.userId).toBe(42));

    rerender({ userId: null });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('keeps Aegis HUD backend failures behind safe copy', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      status: 500,
      data: { message: 'private nutrition table exploded' },
    });

    const { result } = renderHook(() => useAegisHud(42, { refreshInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Gamification system is temporarily unavailable.');
    expect(result.current.error).not.toContain('private nutrition table');
  });

  it('keeps 2xx Aegis HUD failure payloads behind safe copy', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      status: 200,
      data: { success: false, message: 'private aegis table exploded' },
    });

    const { result } = renderHook(() => useAegisHud(42, { refreshInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Gamification system is temporarily unavailable.');
    expect(result.current.error).not.toContain('private aegis table');
  });

  it('treats malformed Aegis HUD success payloads as safe unavailable state', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        data: {
          needs: null,
          overallHealth: 'private malformed value',
        },
      },
    });

    const { result } = renderHook(() => useAegisHud(42, { refreshInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Gamification system is temporarily unavailable.');
    expect(result.current.error).not.toContain('private malformed value');
  });

  it('keeps 2xx Aegis HUD replenish failures behind safe copy', async () => {
    apiServiceMock.get.mockResolvedValueOnce({
      status: 200,
      data: { success: true, data: makeAegisData() },
    });
    apiServiceMock.post.mockResolvedValueOnce({
      status: 200,
      data: { success: false, message: 'private replenish failed' },
    });

    const { result } = renderHook(() => useAegisHud(42, { refreshInterval: 0 }));

    await waitFor(() => expect(result.current.data?.userId).toBe(42));

    await act(async () => {
      await result.current.replenish('stretching');
    });

    expect(result.current.error).toBe('Gamification system is temporarily unavailable.');
    expect(result.current.error).not.toContain('private replenish');
  });

  it('treats 2xx vault roll failure payloads as failed rolls', async () => {
    apiServiceMock.post.mockResolvedValueOnce({
      status: 200,
      data: {
        success: false,
        message: 'private vault roll failed',
        data: { dropped: true, drop: makeVaultDrop() },
      },
    });

    const { result } = renderHook(() => useVaultDecryption(42));
    let rollResult: Awaited<ReturnType<typeof result.current.rollForDrop>> | undefined;

    await act(async () => {
      rollResult = await result.current.rollForDrop('workout_logged');
    });

    expect(rollResult).toBeNull();
    expect(result.current.currentDrop).toBeNull();
    expect(result.current.isAnimating).toBe(false);
  });

  it('clears stale vault inventory on 2xx inventory failure payloads', async () => {
    const cachedDrop = makeVaultDrop();
    const { result } = renderHook(() => useVaultDecryption(42));

    act(() => {
      result.current.triggerTestDrop(cachedDrop);
    });

    await waitFor(() => expect(result.current.currentDrop).toEqual(cachedDrop));

    act(() => {
      result.current.onCollect();
    });

    await waitFor(() => expect(result.current.inventory).toHaveLength(1));

    apiServiceMock.get.mockResolvedValueOnce({
      status: 200,
      data: {
        success: false,
        message: 'private vault inventory failed',
        data: { inventory: [makeVaultDrop({ id: 'should-not-render' })] },
      },
    });

    await act(async () => {
      await result.current.fetchInventory();
    });

    expect(result.current.inventory).toEqual([]);
    expect(apiServiceMock.get).toHaveBeenCalledWith(
      '/api/gamification/users/42/vault/inventory',
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );
  });
});
