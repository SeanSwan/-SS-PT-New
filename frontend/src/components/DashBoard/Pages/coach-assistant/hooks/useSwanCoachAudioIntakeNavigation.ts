import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CoachIntakeItem } from '../../../../../services/coachIntakeService';
import {
  itemReviewHref,
  pickNextItem,
  queueScopedHref,
} from '../CoachIntakeWorkspace.utils';

type DashboardUserRole = 'admin' | 'trainer' | 'client';

type UseSwanCoachAudioIntakeNavigationArgs = {
  coachIntakeItems: CoachIntakeItem[];
  coachIntakeScope?: string | null;
  refreshCoachIntakeQueue: () => Promise<CoachIntakeItem[]>;
  sendMessage: (message: string) => Promise<unknown> | unknown;
  userRole: DashboardUserRole;
};

export function useSwanCoachAudioIntakeNavigation({
  coachIntakeItems,
  coachIntakeScope,
  refreshCoachIntakeQueue,
  sendMessage,
  userRole,
}: UseSwanCoachAudioIntakeNavigationArgs) {
  const navigate = useNavigate();
  const audioReviewNextPendingRef = useRef(false);
  const [audioReviewNextPending, setAudioReviewNextPending] = useState(false);

  const handleIntakeCommand = useCallback((message: string) => {
    void sendMessage(message);
  }, [sendMessage]);

  const openNextItem = useCallback(
    (items: CoachIntakeItem[]) => {
      const nextItem = pickNextItem(items);
      if (!nextItem) return false;
      const coachWorkspaceHref = `/dashboard/${userRole}/coach-assistant`;
      navigate(queueScopedHref(itemReviewHref(nextItem, coachWorkspaceHref), coachIntakeScope));
      return true;
    },
    [coachIntakeScope, navigate, userRole],
  );

  const handleAudioIntakeReviewNext = useCallback(() => {
    if (audioReviewNextPendingRef.current) return;
    audioReviewNextPendingRef.current = true;
    setAudioReviewNextPending(true);
    void (async () => {
      try {
        let sourceItems = coachIntakeItems;
        const refreshedItems = await refreshCoachIntakeQueue();
        if (Array.isArray(refreshedItems)) sourceItems = refreshedItems;
        if (openNextItem(sourceItems)) return;
        handleIntakeCommand('review next coach intake');
      } catch {
        if (openNextItem(coachIntakeItems)) return;
        handleIntakeCommand('review next coach intake');
      } finally {
        audioReviewNextPendingRef.current = false;
        setAudioReviewNextPending(false);
      }
    })();
  }, [coachIntakeItems, handleIntakeCommand, openNextItem, refreshCoachIntakeQueue]);

  return {
    audioReviewNextPending,
    handleAudioIntakeReviewNext,
    handleIntakeCommand,
  };
}

export default useSwanCoachAudioIntakeNavigation;
