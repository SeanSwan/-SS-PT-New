import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/api.service';
import { useSessionPackagePricing } from './useSessionPackagePricing';

vi.mock('../../../services/api.service', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('useSessionPackagePricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the package-derived cancellation defaults for an open manager session', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pricePerSession: 220,
          packageName: 'Elite PT 12-Pack',
          defaultChargeAmount: 220,
          lateFeeAmount: 110,
        },
      },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({
        open: true,
        sessionId: 42,
        canManage: true,
      })
    );

    await waitFor(() => {
      expect(result.current.defaultFullCharge).toBe(220);
    });

    expect(apiService.get).toHaveBeenCalledWith('/api/sessions/42/client-package-price');
    expect(result.current.packagePrice).toBe(220);
    expect(result.current.packageName).toBe('Elite PT 12-Pack');
    expect(result.current.defaultLateFee).toBe(110);
  });

  it('falls back to full and late charge defaults when pricing fails', async () => {
    vi.mocked(apiService.get).mockRejectedValueOnce(new Error('pricing unavailable'));

    const { result } = renderHook(() =>
      useSessionPackagePricing({
        open: true,
        sessionId: 51,
        canManage: true,
      })
    );

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('/api/sessions/51/client-package-price');
    });

    expect(result.current.packagePrice).toBeNull();
    expect(result.current.packageName).toBeNull();
    expect(result.current.defaultFullCharge).toBe(175);
    expect(result.current.defaultLateFee).toBe(88);
  });

  it('does not fetch or keep stale package metadata when pricing is not eligible', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pricePerSession: 180,
          packageName: 'Starter Pack',
          defaultChargeAmount: 180,
          lateFeeAmount: 90,
        },
      },
    });

    const { result, rerender } = renderHook(
      ({ open, sessionId, canManage }) =>
        useSessionPackagePricing({ open, sessionId, canManage }),
      {
        initialProps: {
          open: true,
          sessionId: 12 as number | null,
          canManage: true,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.packageName).toBe('Starter Pack');
    });

    rerender({
      open: false,
      sessionId: 12,
      canManage: true,
    });

    expect(result.current.packagePrice).toBeNull();
    expect(result.current.packageName).toBeNull();
    expect(result.current.defaultFullCharge).toBe(175);
    expect(result.current.defaultLateFee).toBe(88);
    expect(apiService.get).toHaveBeenCalledTimes(1);
  });

  it('clears stale package pricing when a new eligible session returns no package data', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            pricePerSession: 180,
            packageName: 'Starter Pack',
            defaultChargeAmount: 180,
            lateFeeAmount: 90,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: false,
          data: null,
        },
      });

    const { result, rerender } = renderHook(
      ({ sessionId }) =>
        useSessionPackagePricing({
          open: true,
          sessionId,
          canManage: true,
        }),
      {
        initialProps: {
          sessionId: 12,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.packageName).toBe('Starter Pack');
    });

    rerender({
      sessionId: 13,
    });

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('/api/sessions/13/client-package-price');
    });

    expect(result.current.packagePrice).toBeNull();
    expect(result.current.packageName).toBeNull();
    expect(result.current.defaultFullCharge).toBe(175);
    expect(result.current.defaultLateFee).toBe(88);
  });
});

describe('useSessionPackagePricing — fail-closed pricing signal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flags pricing as unavailable when the package fetch rejects', async () => {
    vi.mocked(apiService.get).mockRejectedValueOnce(new Error('pricing unavailable'));

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 77, canManage: true })
    );

    await waitFor(() => {
      expect(result.current.pricingUnavailable).toBe(true);
    });

    expect(result.current.packagePrice).toBeNull();
  });

  it('flags pricing as unavailable when the API returns no package data', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: { success: false, data: null },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 78, canManage: true })
    );

    await waitFor(() => {
      expect(result.current.pricingUnavailable).toBe(true);
    });
  });

  it('clears the unavailable flag once real package pricing resolves', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pricePerSession: 110,
          packageName: 'Express 30 10-Pack',
          defaultChargeAmount: 110,
          lateFeeAmount: 55,
        },
      },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 79, canManage: true })
    );

    await waitFor(() => {
      expect(result.current.defaultFullCharge).toBe(110);
    });

    expect(result.current.pricingUnavailable).toBe(false);
    expect(result.current.defaultLateFee).toBe(55);
  });
});
