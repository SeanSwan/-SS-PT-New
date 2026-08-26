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

describe('useSessionPackagePricing — a 200 carrying a placeholder is not pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats isFallback data as unavailable rather than as this client\'s package', async () => {
    // The endpoint returns isFallback when cancellationPricing could not find a
    // completed order and is returning its OWN hardcoded 175. Clearing the gate
    // on that response is how the original defect reached the panel.
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pricePerSession: 175,
          packageName: 'Standard (Fallback)',
          defaultChargeAmount: 175,
          lateFeeAmount: 88,
          isFallback: true,
        },
      },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 91, canManage: true })
    );

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('/api/sessions/91/client-package-price');
    });

    expect(result.current.pricingUnavailable).toBe(true);
    expect(result.current.packagePrice).toBeNull();
    expect(result.current.packageName).toBeNull();
  });

  it('still accepts real package data that happens to price at the fallback rate', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pricePerSession: 175,
          packageName: 'Signature 60 Pack',
          defaultChargeAmount: 175,
          lateFeeAmount: 87.5,
          isFallback: false,
        },
      },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 92, canManage: true })
    );

    await waitFor(() => {
      expect(result.current.pricingUnavailable).toBe(false);
    });

    expect(result.current.packagePrice).toBe(175);
    expect(result.current.defaultLateFee).toBe(87.5);
  });
});

describe('useSessionPackagePricing — no app-side invented numbers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a legitimate zero late fee instead of substituting half-charge', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pricePerSession: 110,
          packageName: 'Express 30',
          lateFeeAmount: 0,
          isFallback: false,
        },
      },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 93, canManage: true })
    );

    await waitFor(() => {
      expect(result.current.pricingUnavailable).toBe(false);
    });

    // || would have turned a waived fee into 55.
    expect(result.current.defaultLateFee).toBe(0);
  });

  it('treats a non-fallback payload with no price as unavailable, not as 175', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: { packageName: 'Mystery', isFallback: false },
      },
    });

    const { result } = renderHook(() =>
      useSessionPackagePricing({ open: true, sessionId: 94, canManage: true })
    );

    await waitFor(() => {
      expect(result.current.pricingUnavailable).toBe(true);
    });

    expect(result.current.packagePrice).toBeNull();
  });
});
