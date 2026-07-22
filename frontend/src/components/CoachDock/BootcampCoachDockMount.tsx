/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BootcampCoachDockMount (CC-3b/CC-3c seam)        ║
 * ║  PURPOSE: One-line mount for the Bootcamp Builder page —      ║
 * ║           owns the dock hook + the AI-events executor wiring  ║
 * ║           so BootcampBuilderPage stays under the 300 cap.     ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Class-level surface: no client requirement (requireClient=false). The Coach
 * converses via the chat fallback lane today; structure/duration/format tool
 * calls execute through useBootcampAiEvents with real-option validation. Receipts
 * from BOTH paths land in one feed via the shared per-surface sink.
 */
import React, { useCallback } from 'react';
import SurfaceCoachDock from './SurfaceCoachDock';
import {
  pushSurfaceCoachReceipt,
  useSurfaceCoachDock,
  type CoachDockReceiptAction,
  type CoachDockReceiptInput,
} from './useSurfaceCoachDock';
import { useBootcampAiEvents, type BootcampAiEventHandlers } from '../BootcampBuilder/useBootcampAiEvents';
import { dispatchAIWorkoutEvent } from '../../utils/aiWorkoutEvents';

const SURFACE = 'bootcamp-builder' as const;

export function pushBootcampCoachReceipt(receipt: CoachDockReceiptInput): void {
  pushSurfaceCoachReceipt(SURFACE, receipt);
}

const EXAMPLE_PROMPTS =
  'Try: "Make it five stations, three exercises each" · "Forty-five minute class" · "Phase two, keep it low impact"';

export interface BootcampCoachDockMountProps {
  /** Live structure summary for the context chip, e.g. "4 stations × 4 · 40 min". */
  structureSummary: string;
  aiHandlers: Omit<BootcampAiEventHandlers, 'pushReceipt'>;
}

const BootcampCoachDockMount: React.FC<BootcampCoachDockMountProps> = ({ structureSummary, aiHandlers }) => {
  useBootcampAiEvents({ ...aiHandlers, pushReceipt: pushBootcampCoachReceipt });

  const dock = useSurfaceCoachDock({
    surface: SURFACE,
    chatTitle: 'Bootcamp Builder Coach',
    eventPrefix: 'AI_BOOTCAMP_',
    selectedClientId: null,
    requireClient: false,
    pushReceipt: pushBootcampCoachReceipt,
  });

  const onReceiptAction = useCallback((_receiptId: string, action: CoachDockReceiptAction) => {
    dispatchAIWorkoutEvent(action.eventName, action.payload ?? {});
  }, []);

  return (
    <SurfaceCoachDock
      title="Swan Coach — talk to build this class"
      contextChip={`class: ${structureSummary}`}
      examplePrompts={EXAMPLE_PROMPTS}
      onReceiptAction={onReceiptAction}
      {...dock}
    />
  );
};

export default BootcampCoachDockMount;
