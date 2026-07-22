/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: PainChartCoachDockMount (CC-4)                    ║
 * ║  PURPOSE: One-line mount for the Body Map / Pain Chart —      ║
 * ║           conversational Swan Coach + region-select tool.     ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Second consumer of the generalized dock — proves the contract reuses cleanly
 * (CC-4's whole point). v1 tool: AI_PAINCHART_SELECT_REGION, validated against the
 * REAL ALL_BODY_REGIONS ids/labels (unknown region → ack(false) → honest inline
 * receipt). Pain-entry writes stay in the existing PainEntryPanel — the Coach
 * selects and discusses; the human records (client data discipline).
 */
import React, { useCallback, useEffect, useRef } from 'react';
import SurfaceCoachDock from './SurfaceCoachDock';
import {
  pushSurfaceCoachReceipt,
  useSurfaceCoachDock,
  type CoachDockReceiptAction,
  type CoachDockReceiptInput,
} from './useSurfaceCoachDock';
import { AI_PAINCHART_SELECT_REGION, dispatchAIWorkoutEvent, type AIWorkoutEventAck } from '../../utils/aiWorkoutEvents';
import { ALL_BODY_REGIONS } from '../BodyMap/bodyRegions';

const SURFACE = 'pain-chart' as const;

export function pushPainChartCoachReceipt(receipt: CoachDockReceiptInput): void {
  pushSurfaceCoachReceipt(SURFACE, receipt);
}

const EXAMPLE_PROMPTS =
  'Try: "Select the left shoulder" · "What should this client avoid with knee pain?" · "Show the lower back"';

export interface PainChartCoachDockMountProps {
  /** Target client display context, e.g. "client: #84"; null → dock asks for a client first. */
  contextChip: string | null;
  selectedClientId: number | null;
  onSelectRegion: (regionId: string) => void;
}

const PainChartCoachDockMount: React.FC<PainChartCoachDockMountProps> = ({
  contextChip, selectedClientId, onSelectRegion,
}) => {
  const selectRef = useRef(onSelectRegion);
  selectRef.current = onSelectRegion;

  useEffect(() => {
    const onSelect = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, unknown> & AIWorkoutEventAck>).detail || {};
      const raw = String(detail.region ?? '').trim().toLowerCase();
      const match = ALL_BODY_REGIONS.find(
        (r) => r.id === raw || r.label.toLowerCase() === raw,
      );
      if (!match) { detail.acknowledgeAIWorkoutEvent?.(false); return; }
      selectRef.current(match.id);
      pushPainChartCoachReceipt({ ok: true, text: `Selected — ${match.label}` });
      detail.acknowledgeAIWorkoutEvent?.(true);
    };
    window.addEventListener(AI_PAINCHART_SELECT_REGION, onSelect);
    return () => window.removeEventListener(AI_PAINCHART_SELECT_REGION, onSelect);
  }, []);

  const dock = useSurfaceCoachDock({
    surface: SURFACE,
    chatTitle: 'Pain Chart Coach',
    eventPrefix: 'AI_PAINCHART_',
    selectedClientId,
    requireClient: true,
    pushReceipt: pushPainChartCoachReceipt,
  });

  const onReceiptAction = useCallback((_id: string, action: CoachDockReceiptAction) => {
    dispatchAIWorkoutEvent(action.eventName, action.payload ?? {});
  }, []);

  return (
    <SurfaceCoachDock
      title="Swan Coach — talk through this pain chart"
      contextChip={contextChip}
      missingContextMessage={selectedClientId == null ? 'Select a client to talk to Swan Coach.' : null}
      examplePrompts={EXAMPLE_PROMPTS}
      onReceiptAction={onReceiptAction}
      {...dock}
    />
  );
};

export default PainChartCoachDockMount;
