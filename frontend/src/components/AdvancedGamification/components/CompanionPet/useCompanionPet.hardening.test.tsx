import { act, render, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../../services/api.service';
import { GAMIFICATION_SAFE_ERROR_COPY } from '../../utils/gamificationPath';
import type { PetData } from './CompanionPetTypes';
import PetSprite from './PetSprite';
import { useCompanionPet } from './useCompanionPet';

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiService);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const makePet = (name: string): PetData => ({
  species: 'frost_swan',
  speciesInfo: {
    name: 'Frost Swan',
    element: 'Ice',
    affinity: 'Recovery',
    baseColor: 'var(--swan-frost-white, #E0ECF4)',
    accentColor: 'var(--swan-ice-wing, #60C0F0)',
    description: 'A recovery companion',
  },
  name,
  level: 4,
  evolution: { stage: 1, name: 'Hatchling', minLevel: 1, bodyScale: 1, features: [] },
  health: 88,
  mood: { id: 'happy', minAvg: 70, emoji: ':)', animation: 'idle', description: 'Happy' },
  happiness: 90,
  birthDate: '2026-01-01',
  lastInteraction: '2026-06-20T12:00:00Z',
  hoursSinceInteraction: 1,
  appearanceMods: [],
  equippedMods: [],
  unlockedMods: [],
  activityCounters: {},
  totalInteractions: 3,
});

const petResponse = (pet: PetData | null) => ({
  status: 200,
  data: { success: true, data: { hasPet: pet !== null, pet } },
});

describe('useCompanionPet hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears stale pet state when the user id becomes invalid', async () => {
    mockedApi.get.mockResolvedValueOnce(petResponse(makePet('Nova')));

    const { result, rerender } = renderHook(
      ({ userId }: { userId: number | null }) => useCompanionPet(userId),
      { initialProps: { userId: 7 } },
    );

    await waitFor(() => expect(result.current.pet?.name).toBe('Nova'));

    rerender({ userId: null });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPet).toBe(false);
    expect(result.current.pet).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('ignores older pet fetch responses after the mounted user changes', async () => {
    const stale = deferred<ReturnType<typeof petResponse>>();
    const current = deferred<ReturnType<typeof petResponse>>();
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/users/1/pet')) return stale.promise;
      if (url.includes('/users/2/pet')) return current.promise;
      return Promise.reject(new Error('unexpected url'));
    });

    const { result, rerender } = renderHook(
      ({ userId }: { userId: number }) => useCompanionPet(userId),
      { initialProps: { userId: 1 } },
    );

    rerender({ userId: 2 });

    await act(async () => {
      current.resolve(petResponse(makePet('Current')));
      await current.promise;
    });
    await waitFor(() => expect(result.current.pet?.name).toBe('Current'));

    await act(async () => {
      stale.resolve(petResponse(makePet('Stale')));
      await stale.promise;
    });

    expect(result.current.pet?.name).toBe('Current');
  });

  it('guards rapid duplicate pet mutations before React disabled state commits', async () => {
    const mutation = deferred<{ status: number; data: unknown }>();
    mockedApi.get.mockResolvedValue(petResponse(makePet('Nova')));
    mockedApi.post.mockReturnValue(mutation.promise);

    const { result } = renderHook(() => useCompanionPet(7));
    await waitFor(() => expect(result.current.pet?.name).toBe('Nova'));

    await act(async () => {
      void result.current.interact('feed');
      void result.current.interact('feed');
      await Promise.resolve();
    });

    expect(mockedApi.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      mutation.resolve({ status: 200, data: { success: true } });
      await mutation.promise;
    });
  });

  it('keeps failed pet mutations on safe public error copy', async () => {
    mockedApi.get.mockResolvedValue(petResponse(makePet('Nova')));
    mockedApi.post.mockResolvedValue({ status: 500, data: { message: 'database host leaked' } });

    const { result } = renderHook(() => useCompanionPet(7));
    await waitFor(() => expect(result.current.pet?.name).toBe('Nova'));

    await act(async () => {
      await result.current.interact('play');
    });

    expect(result.current.error).toBe(GAMIFICATION_SAFE_ERROR_COPY);
  });

  it('treats 2xx failed pet fetch payloads as safe public errors', async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: { success: false, message: 'private pet table leaked' },
    });

    const { result } = renderHook(() => useCompanionPet(7));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(GAMIFICATION_SAFE_ERROR_COPY);
    expect(result.current.hasPet).toBe(false);
    expect(result.current.pet).toBeNull();
  });

  it('treats 2xx failed pet mutations as safe public errors', async () => {
    mockedApi.get.mockResolvedValue(petResponse(makePet('Nova')));
    mockedApi.post.mockResolvedValue({
      status: 200,
      data: { success: false, message: 'private mutation failed' },
    });

    const { result } = renderHook(() => useCompanionPet(7));
    await waitFor(() => expect(result.current.pet?.name).toBe('Nova'));

    await act(async () => {
      await result.current.interact('play');
    });

    expect(result.current.error).toBe(GAMIFICATION_SAFE_ERROR_COPY);
  });

  it('renders malformed pet health as depleted sprite state', () => {
    const { container } = render(
      <PetSprite pet={{ ...makePet('Nova'), health: [80] as unknown as number }} />,
    );

    expect(container.querySelector('.pet-body')).toHaveAttribute('opacity', '0.5');
  });
});
