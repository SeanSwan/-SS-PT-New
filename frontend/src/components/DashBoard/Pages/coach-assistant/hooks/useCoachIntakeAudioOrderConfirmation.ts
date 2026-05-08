/**
 * useCoachIntakeAudioOrderConfirmation.ts
 * =======================================
 * Local UI state for confirming Coach intake audio ordering. The backend
 * action clears only the review gate; final writes remain separately approved.
 */
import { useCallback, useState } from 'react';
import { confirmCoachIntakeAudioOrder } from '../../../../../services/coachIntakeService';

interface ConfirmationState {
  intakeId: string | null;
  message: string | null;
  isConfirming: boolean;
}

export function useCoachIntakeAudioOrderConfirmation(refresh: () => Promise<unknown>) {
  const [state, setState] = useState<ConfirmationState>({
    intakeId: null,
    message: null,
    isConfirming: false,
  });

  const confirmAudioOrder = useCallback(async (intakeId: string) => {
    setState({ intakeId, message: null, isConfirming: true });
    try {
      await confirmCoachIntakeAudioOrder({ intakeId });
      setState({
        intakeId,
        message: 'Audio order confirmed. Final write still requires approval.',
        isConfirming: false,
      });
      try {
        await refresh();
      } catch {
        setState({
          intakeId,
          message: 'Audio order confirmed. Refresh the queue to see the cleared gate.',
          isConfirming: false,
        });
      }
    } catch (err) {
      setState({
        intakeId,
        message: err instanceof Error
          ? err.message
          : 'Audio order confirmation failed. Try again from the active intake.',
        isConfirming: false,
      });
    }
  }, [refresh]);

  const statusFor = useCallback((intakeId: string) => (
    state.intakeId === intakeId ? state.message : null
  ), [state.intakeId, state.message]);

  return {
    confirmAudioOrder,
    confirmingId: state.isConfirming ? state.intakeId : null,
    statusFor,
  };
}

export default useCoachIntakeAudioOrderConfirmation;
