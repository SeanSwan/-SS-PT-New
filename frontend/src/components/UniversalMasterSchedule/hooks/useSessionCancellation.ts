import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/api.service';
import type { ScheduleConfirmRequest } from '../ScheduleConfirmDialog';
import {
  buildCancelConfirmationMessage,
  buildCancelPanelDefaults,
  buildCancelPayload,
  getApiErrorMessage,
  mapLateCancelWarning,
  type CancellationChargeType,
  type LateCancelWarningModel,
} from '../SessionDetailModal.actions';
import type { SessionDetail } from '../SessionDetailModal.types';

type CancellationToast = (options: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;

interface UseSessionCancellationInput {
  open: boolean;
  session: SessionDetail | null;
  canManage: boolean;
  isEarlyCancelEligible: boolean;
  defaultFullCharge: number;
  defaultLateFee: number;
  pricingUnavailable: boolean;
  onUpdated: () => void;
  onClose: () => void;
  toast: CancellationToast;
  setFormError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setConfirmRequest: (request: ScheduleConfirmRequest | null) => void;
}

export const useSessionCancellation = ({
  open,
  session,
  canManage,
  isEarlyCancelEligible,
  defaultFullCharge,
  defaultLateFee,
  pricingUnavailable,
  onUpdated,
  onClose,
  toast,
  setFormError,
  setLoading,
  setConfirmRequest,
}: UseSessionCancellationInput) => {
  const [cancelReason, setCancelReason] = useState('');
  const [earlyCancel, setEarlyCancel] = useState(false);
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [chargeType, setChargeType] = useState<CancellationChargeType>('none');
  // Tracks a deliberate operator choice so the re-arm effect below never
  // clobbers one. Distinct from chargeType !== none, because the fail-closed
  // default is also 'none'.
  const [chargeTouched, setChargeTouched] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [restoreCredit, setRestoreCredit] = useState(true);
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  const [showLateCancelWarning, setShowLateCancelWarning] = useState(false);
  const [lateCancelWarning, setLateCancelWarning] = useState<LateCancelWarningModel | null>(null);
  const [lateCancelLoading, setLateCancelLoading] = useState(false);

  const resetCancellationState = useCallback(() => {
    setCancelReason('');
    setEarlyCancel(false);
    setShowCancelOptions(false);
    setChargeType('none');
    setChargeTouched(false);
    setChargeAmount('');
    setRestoreCredit(true);
    setNotifyOnCancel(true);
    setShowLateCancelWarning(false);
    setLateCancelWarning(null);
    setLateCancelLoading(false);
  }, []);

  useEffect(() => {
    if (!open || session) {
      resetCancellationState();
    }
  }, [open, resetCancellationState, session]);

  const fetchCancelWarning = useCallback(async () => {
    if (!session) {
      return;
    }

    setLateCancelLoading(true);
    setFormError(null);

    try {
      const response = await apiService.get(`/api/sessions/${session.id}/cancel-warning`);
      const result = response.data;
      if (result?.success === false) {
        setFormError(result?.message || 'Failed to check cancellation status.');
        return;
      }

      setLateCancelWarning(mapLateCancelWarning(result, defaultLateFee));
      setShowLateCancelWarning(true);
    } catch (error) {
      console.error('Error fetching cancel warning:', error);
      setFormError(getApiErrorMessage(error, 'Failed to check cancellation status. Please try again.'));
    } finally {
      setLateCancelLoading(false);
    }
  }, [defaultLateFee, session, setFormError]);

  const handleCancelClick = useCallback(async () => {
    if (canManage) {
      setShowCancelOptions(true);
      const nextDefaults = buildCancelPanelDefaults(
        isEarlyCancelEligible,
        defaultFullCharge,
        pricingUnavailable
      );
      setChargeType(nextDefaults.chargeType);
      setRestoreCredit(nextDefaults.restoreCredit);
      setChargeAmount(nextDefaults.chargeAmount);
      setChargeTouched(false);
      return;
    }

    await fetchCancelWarning();
  }, [canManage, defaultFullCharge, fetchCancelWarning, isEarlyCancelEligible, pricingUnavailable]);

  // Re-arm once real pricing lands. Without this the panel reverts to its
  // normal appearance while the submitted state is still the fail-closed
  // 'none' - a lie in the opposite direction from the one this gate fixed.
  useEffect(() => {
    if (!showCancelOptions || !canManage || pricingUnavailable || chargeTouched) {
      return;
    }
    const rearmed = buildCancelPanelDefaults(isEarlyCancelEligible, defaultFullCharge, false);
    setChargeType(rearmed.chargeType);
    setChargeAmount(rearmed.chargeAmount);
    setRestoreCredit(rearmed.restoreCredit);
  }, [
    canManage,
    chargeTouched,
    defaultFullCharge,
    isEarlyCancelEligible,
    pricingUnavailable,
    showCancelOptions,
  ]);

  const handleCancel = useCallback(() => {
    if (!session) {
      return;
    }

    // A partial charge with no positive amount reaches the server as 0, which
    // it reads as "missing" and replaces with half the session rate. Refuse it.
    if (canManage && chargeType === 'partial') {
      const parsed = Number.parseFloat(chargeAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setFormError('Enter a custom charge amount greater than $0.');
        return;
      }
    }

    setConfirmRequest({
      title: canManage ? 'Confirm cancellation charge' : 'Cancel this session?',
      message: buildCancelConfirmationMessage({
        canManage,
        chargeType,
        chargeAmount,
        defaultFullCharge,
        defaultLateFee,
        restoreCredit,
        earlyCancel,
      }),
      confirmLabel: canManage ? 'Confirm cancellation' : 'Cancel session',
      tone: 'danger',
      onConfirm: async () => {
        setFormError(null);
        setLoading(true);

        try {
          const response = await apiService.patch(
            `/api/sessions/${session.id}/cancel`,
            buildCancelPayload({
              canManage,
              cancelReason,
              notifyOnCancel,
              chargeType,
              chargeAmount,
              defaultFullCharge,
              defaultLateFee,
              restoreCredit,
              earlyCancel,
              isEarlyCancelEligible,
            })
          );
          const result = response.data;
          if (result?.success === false) {
            setFormError(result?.message || 'Failed to cancel session.');
            return;
          }

          const appliedChargeAmount = Number(result?.data?.chargeAmount || 0);
          if (appliedChargeAmount > 0) {
            toast({
              title: 'Session cancelled',
              description: `Charge applied: $${appliedChargeAmount.toFixed(2)}`,
              variant: 'default',
            });
          } else if (result?.data?.creditRestored) {
            toast({
              title: 'Session cancelled',
              description: 'Session credit has been restored.',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Session cancelled',
              description: 'The schedule has been updated.',
              variant: 'default',
            });
          }

          onUpdated();
          onClose();
        } catch (error) {
          console.error('Error cancelling session:', error);
          setFormError(getApiErrorMessage(error, 'Failed to cancel session. Please try again.'));
        } finally {
          setLoading(false);
          setShowCancelOptions(false);
        }
      },
    });
  }, [
    canManage,
    cancelReason,
    chargeAmount,
    chargeType,
    defaultFullCharge,
    defaultLateFee,
    earlyCancel,
    isEarlyCancelEligible,
    notifyOnCancel,
    onClose,
    onUpdated,
    restoreCredit,
    session,
    setConfirmRequest,
    setFormError,
    setLoading,
    toast,
  ]);

  const handleConfirmLateCancellation = useCallback(() => {
    setShowLateCancelWarning(false);
    handleCancel();
  }, [handleCancel]);

  return {
    cancelReason,
    earlyCancel,
    showCancelOptions,
    chargeType,
    chargeAmount,
    restoreCredit,
    notifyOnCancel,
    showLateCancelWarning,
    lateCancelWarning,
    lateCancelLoading,
    setCancelReason,
    setEarlyCancel,
    setChargeType: (next: CancellationChargeType) => {
      setChargeTouched(true);
      setChargeType(next);
    },
    setChargeAmount,
    setRestoreCredit,
    setNotifyOnCancel,
    handleCancelClick,
    handleHideCancelOptions: () => setShowCancelOptions(false),
    handleCancel,
    handleBackFromLateCancelWarning: () => setShowLateCancelWarning(false),
    handleConfirmLateCancellation,
  };
};
