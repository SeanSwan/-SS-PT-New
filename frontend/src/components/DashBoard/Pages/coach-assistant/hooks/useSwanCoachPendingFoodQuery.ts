import { useEffect, useRef } from 'react';
import { usePaywall } from '../../../../../context/PaywallContext';
import {
  hasLivePublication,
  isPublicationTokenLive,
  readPublicationScope,
  type PublicationBinding,
  type PublicationSnapshot,
} from '../../../../../hooks/coachPublicationScope';

export const PENDING_COACH_FOOD_STORAGE_KEY = 'swan:pending-coach-food';

type SendMessageWithFood = (
  text: string,
  foodContext: Record<string, unknown>,
) => Promise<unknown>;

type PendingFoodResult = {
  code?: unknown;
  failed?: unknown;
  message?: unknown;
  paywallRequired?: unknown;
  requiredTier?: unknown;
  role?: unknown;
  upgradeUrl?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function requiredTierOrPro(value: unknown): 'pro' | 'elite' {
  return value === 'elite' ? 'elite' : 'pro';
}

export function useSwanCoachPendingFoodQuery(
  sendMessageWithFood: SendMessageWithFood,
  /**
   * Plan 55 C4 — the stored payload has no actor/target envelope of its own, so
   * it cannot prove ownership. With a binding present it is only consumed while
   * the surface has a live, enabled admission, and never published after that
   * admission retires. Absent keeps today's behaviour (dormant until C3 wires
   * the controller).
   */
  options?: { binding?: PublicationBinding },
) {
  const { showPaywall } = usePaywall();
  const sendMessageWithFoodRef = useRef(sendMessageWithFood);
  const showPaywallRef = useRef(showPaywall);
  const bindingRef = useRef(options?.binding);
  bindingRef.current = options?.binding;

  useEffect(() => {
    sendMessageWithFoodRef.current = sendMessageWithFood;
    showPaywallRef.current = showPaywall;
  }, [sendMessageWithFood, showPaywall]);

  useEffect(() => {
    // Unadmitted: leave the payload exactly where it is for explicit review.
    // Never delete it to make the queue look clean, and never rebind it to
    // whatever target happens to be selected now.
    if (!hasLivePublication(bindingRef.current)) return;

    const pending = sessionStorage.getItem(PENDING_COACH_FOOD_STORAGE_KEY);
    if (!pending) return;

    let cancelled = false;
    try {
      const parsed = JSON.parse(pending) as unknown;
      if (!isRecord(parsed) || typeof parsed.message !== 'string' || !isRecord(parsed.foodContext)) {
        sessionStorage.removeItem(PENDING_COACH_FOOD_STORAGE_KEY);
        return;
      }

      const { message, foodContext } = parsed as {
        message: string;
        foodContext: Record<string, unknown>;
      };

      const captured: PublicationSnapshot | null = readPublicationScope(bindingRef.current);

      (async () => {
        if (cancelled) return;
        const result = await sendMessageWithFoodRef.current(message, foodContext);
        if (cancelled) return;
        if (!isPublicationTokenLive(bindingRef.current, captured)) return;

        const resultRecord: PendingFoodResult | null = isRecord(result) ? result : null;
        if (resultRecord?.paywallRequired) {
          showPaywallRef.current('Swan Coach', {
            requiredTier: requiredTierOrPro(resultRecord.requiredTier),
            message: stringOrUndefined(resultRecord.message),
            code: stringOrUndefined(resultRecord.code),
            upgradeUrl: stringOrUndefined(resultRecord.upgradeUrl),
          });
          return;
        }

        const succeeded = resultRecord
          && resultRecord.failed !== true
          && resultRecord.role === 'assistant';
        if (succeeded) sessionStorage.removeItem(PENDING_COACH_FOOD_STORAGE_KEY);
      })();
    } catch {
      sessionStorage.removeItem(PENDING_COACH_FOOD_STORAGE_KEY);
    }

    return () => { cancelled = true; };
  }, []);
}

export default useSwanCoachPendingFoodQuery;
