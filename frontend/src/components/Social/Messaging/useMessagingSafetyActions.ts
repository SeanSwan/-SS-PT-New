/**
 * FILE: useMessagingSafetyActions.ts
 * PURPOSE: Message report and user block actions for the messaging surface.
 */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { encodeMessagingPathSegment } from './messagingApiAdapters';
import { apiFetch } from './messagingApiFetch';
import { createMessagingErrorState, type MessagingErrorState } from './messagingSafeErrors';

interface UseMessagingSafetyActionsParams {
  enabled: boolean;
  mountedRef: MutableRefObject<boolean>;
  setError: Dispatch<SetStateAction<MessagingErrorState | null>>;
}

export function useMessagingSafetyActions({ enabled, mountedRef, setError }: UseMessagingSafetyActionsParams) {
  const failAction = useCallback(() => {
    if (mountedRef.current) setError(createMessagingErrorState('request'));
  }, [mountedRef, setError]);

  const reportMessage = useCallback(async (messageId: string | number, reason: string, details = ''): Promise<boolean> => {
    const normalizedReason = reason.trim().toLowerCase();
    if (!enabled || !messageId || !normalizedReason) return false;
    try {
      const id = encodeMessagingPathSegment(messageId);
      await apiFetch<unknown>(`/messages/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: normalizedReason, details: details.trim() }),
      });
      return true;
    } catch {
      failAction();
      return false;
    }
  }, [enabled, failAction]);

  const blockUser = useCallback(async (userId: string | number): Promise<boolean> => {
    if (!enabled || !userId) return false;
    try {
      const id = encodeMessagingPathSegment(userId);
      await apiFetch<unknown>(`/users/${id}/block`, { method: 'POST' });
      return true;
    } catch {
      failAction();
      return false;
    }
  }, [enabled, failAction]);

  return { blockUser, reportMessage };
}
