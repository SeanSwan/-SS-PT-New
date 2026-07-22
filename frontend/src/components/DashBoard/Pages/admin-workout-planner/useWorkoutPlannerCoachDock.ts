/**
 * HOOK: useWorkoutPlannerCoachDock
 * PURPOSE: The planner's Swan Coach dock — since CC-3b a thin wrapper over the ONE
 * generalized dock engine (`useSurfaceCoachDock`), preserving this module's exact
 * public API (hook shape, receipt types, `pushWorkoutPlannerCoachReceipt` sink) so
 * every existing consumer and test is untouched. Dictation streams finals into the
 * dock textarea; Send routes through the ONE existing command lane with
 * `surface: 'workout-planner'`; non-commands fall back to the chat lane. No new
 * transport (blueprint 06-bans §1).
 *
 * Receipt channel: `pushWorkoutPlannerCoachReceipt` is the shared sink the
 * page hands to BOTH this hook and `useWorkoutPlannerAiEvents`, so dictated
 * plan-edit receipts land in the same dock feed.
 */
import {
  pushSurfaceCoachReceipt,
  useSurfaceCoachDock,
  type CoachDockReceipt,
  type CoachDockReceiptAction,
  type CoachDockReceiptInput,
} from '../../../CoachDock/useSurfaceCoachDock';

export type { CoachDockReceipt, CoachDockReceiptAction, CoachDockReceiptInput };

const SURFACE = 'workout-planner' as const;

/** Shared receipt sink for every planner Coach surface (dock + AI events). */
export function pushWorkoutPlannerCoachReceipt(receipt: CoachDockReceiptInput): void {
  pushSurfaceCoachReceipt(SURFACE, receipt);
}

interface UseWorkoutPlannerCoachDockArgs {
  selectedClientId: number | null;
  pushReceipt: (r: CoachDockReceiptInput) => void;
}

export function useWorkoutPlannerCoachDock({ selectedClientId, pushReceipt }: UseWorkoutPlannerCoachDockArgs) {
  return useSurfaceCoachDock({
    surface: SURFACE,
    chatTitle: 'Workout Planner Coach',
    eventPrefix: 'AI_PLANNER_',
    selectedClientId,
    requireClient: true,
    pushReceipt,
  });
}
