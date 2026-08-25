import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/api.service';
import { useSessionCancellation } from './useSessionCancellation';
import type { ScheduleConfirmRequest } from '../ScheduleConfirmDialog';
import type { SessionDetail } from '../SessionDetailModal.types';

vi.mock('../../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const baseSession: SessionDetail = {
  id: 72,
  sessionDate: '2026-05-31T18:00:00.000Z',
  duration: 60,
  status: 'scheduled',
  userId: 20,
  trainerId: 7,
};

const setup = (overrides: Partial<Parameters<typeof useSessionCancellation>[0]> = {}) => {
  const setFormError = vi.fn();
  const setLoading = vi.fn();
  const setConfirmRequest = vi.fn();
  const onUpdated = vi.fn();
  const onClose = vi.fn();
  const toast = vi.fn();
  const hook = renderHook(() =>
    useSessionCancellation({
      open: true,
      session: baseSession,
      canManage: true,
      isEarlyCancelEligible: false,
      defaultFullCharge: 175,
      defaultLateFee: 88,
      pricingUnavailable: false,
      onUpdated,
      onClose,
      toast,
      setFormError,
      setLoading,
      setConfirmRequest,
      ...overrides,
    })
  );

  return {
    ...hook,
    setFormError,
    setLoading,
    setConfirmRequest,
    onUpdated,
    onClose,
    toast,
  };
};

describe('useSessionCancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens admin cancellation options with package-based late-cancel defaults', () => {
    const { result } = setup();

    act(() => {
      result.current.handleCancelClick();
    });

    expect(result.current.showCancelOptions).toBe(true);
    expect(result.current.chargeType).toBe('full');
    expect(result.current.chargeAmount).toBe('175');
    expect(result.current.restoreCredit).toBe(false);
    expect(apiService.get).not.toHaveBeenCalled();
  });

  it('loads the client late-cancel warning before showing client confirmation', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        isLateCancellation: true,
        hoursUntilSession: 4,
        warningMessage: 'Late cancellation window',
        sessionDateFormatted: 'May 31',
        cancellationPolicy: {},
      },
    });
    const { result, setFormError } = setup({ canManage: false });

    await act(async () => {
      await result.current.handleCancelClick();
    });

    expect(apiService.get).toHaveBeenCalledWith('/api/sessions/72/cancel-warning');
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(result.current.showLateCancelWarning).toBe(true);
    expect(result.current.lateCancelWarning?.lateFeeAmount).toBe(88);
  });

  it('queues a branded confirmation and submits cancellation with charge details', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          chargeAmount: 175,
          creditRestored: false,
        },
      },
    });
    const { result, setConfirmRequest, onUpdated, onClose, toast } = setup();

    act(() => {
      result.current.handleCancelClick();
    });
    act(() => {
      result.current.setCancelReason('  late notice  ');
    });
    act(() => {
      result.current.handleCancel();
    });

    const request = setConfirmRequest.mock.calls[0]?.[0] as ScheduleConfirmRequest;
    expect(request.title).toBe('Confirm cancellation charge');
    expect(request.message).toContain('FULL SESSION CHARGE ($175)');

    await act(async () => {
      await request.onConfirm();
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/72/cancel', {
      reason: 'late notice',
      notifyClient: true,
      notifyTrainer: true,
      chargeType: 'full',
      chargeAmount: 175,
      restoreCredit: false,
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Session cancelled',
      description: 'Charge applied: $175.00',
    }));
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useSessionCancellation - fail-closed when package pricing is unknown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not pre-arm a full charge when the package price could not be loaded', () => {
    const { result } = setup({ pricingUnavailable: true });

    act(() => {
      result.current.handleCancelClick();
    });

    expect(result.current.showCancelOptions).toBe(true);
    expect(result.current.chargeType).toBe('none');
    expect(result.current.chargeAmount).toBe('');
    // true, not false: no charge must still return the prepaid session credit.
    expect(result.current.restoreCredit).toBe(true);
  });

  it('still pre-arms the full charge when the package price is known', () => {
    const { result } = setup({ pricingUnavailable: false });

    act(() => {
      result.current.handleCancelClick();
    });

    expect(result.current.chargeType).toBe('full');
    expect(result.current.chargeAmount).toBe('175');
  });
});

describe('useSessionCancellation - panel-review fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Props-driven render so pricingUnavailable can transition mid-test.
  const setupRearm = () => {
    const setFormError = vi.fn();
    const setLoading = vi.fn();
    const setConfirmRequest = vi.fn();
    const hook = renderHook(
      ({ pricingUnavailable }) =>
        useSessionCancellation({
          open: true,
          session: baseSession,
          canManage: true,
          isEarlyCancelEligible: false,
          defaultFullCharge: 175,
          defaultLateFee: 88,
          pricingUnavailable,
          onUpdated: vi.fn(),
          onClose: vi.fn(),
          toast: vi.fn(),
          setFormError,
          setLoading,
          setConfirmRequest,
        }),
      { initialProps: { pricingUnavailable: true } }
    );
    return { ...hook, setFormError, setConfirmRequest };
  };

  it('restores the prepaid credit when pricing is unknown (no charge must not burn a session)', () => {
    const { result } = setup({ pricingUnavailable: true });

    act(() => {
      result.current.handleCancelClick();
    });

    expect(result.current.chargeType).toBe('none');
    expect(result.current.restoreCredit).toBe(true);
  });

  it('refuses a partial charge with no amount instead of letting the server bill 50%', () => {
    const { result, setFormError, setConfirmRequest } = setup({ pricingUnavailable: true });

    act(() => {
      result.current.handleCancelClick();
    });
    act(() => {
      result.current.setChargeType('partial');
    });
    act(() => {
      result.current.handleCancel();
    });

    expect(setFormError).toHaveBeenCalledWith(
      'Enter a custom charge amount greater than $0.'
    );
    expect(setConfirmRequest).not.toHaveBeenCalled();
  });

  it('re-arms the full charge once real pricing resolves and the admin has not chosen', () => {
    const { result, rerender } = setupRearm();

    act(() => {
      result.current.handleCancelClick();
    });
    expect(result.current.chargeType).toBe('none');

    act(() => {
      rerender({ pricingUnavailable: false });
    });

    expect(result.current.chargeType).toBe('full');
    expect(result.current.chargeAmount).toBe('175');
  });

  it('does NOT re-arm over a deliberate operator choice', () => {
    const { result, rerender } = setupRearm();

    act(() => {
      result.current.handleCancelClick();
    });
    act(() => {
      result.current.setChargeType('none');
    });

    act(() => {
      rerender({ pricingUnavailable: false });
    });

    expect(result.current.chargeType).toBe('none');
  });
});
