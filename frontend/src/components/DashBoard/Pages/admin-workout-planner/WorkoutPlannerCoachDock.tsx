/**
 * COMPONENT: WorkoutPlannerCoachDock
 * PURPOSE: The planner's Swan Coach dock — since CC-3b a thin wrapper over the
 * generalized presentational `SurfaceCoachDock`, preserving this module's exact
 * props API so every existing consumer and test is untouched. All state/transport
 * lives in `useWorkoutPlannerCoachDock` (blueprint 06-bans §4 still holds).
 */
import React from 'react';
import SurfaceCoachDock from '../../../CoachDock/SurfaceCoachDock';
import type { CoachDockReceiptAction } from './useWorkoutPlannerCoachDock';

export interface WorkoutPlannerCoachDockProps {
  /** Selected client display name; null = no client selected (dock disabled). */
  clientName: string | null;
  open: boolean;
  toggleOpen: () => void;
  dockText: string;
  setDockText: (t: string) => void;
  listening: boolean;
  interim: string;
  handleVoice: () => void;
  voiceOverlay: React.ReactNode;
  submitting: boolean;
  handleSubmit: () => Promise<void> | void;
  /** Fired when the single action on an actionable receipt is tapped. */
  onReceiptAction: (receiptId: string, action: CoachDockReceiptAction) => void;
  receipts: Array<{ id: string; ok: boolean; text: string; action?: CoachDockReceiptAction }>;
}

const EXAMPLE_PROMPTS =
  'Try: "Add goblet squats, three sets of twelve" · "Swap leg press for box squat" · "Make day two lighter"';

const WorkoutPlannerCoachDock: React.FC<WorkoutPlannerCoachDockProps> = ({ clientName, ...dock }) => (
  <SurfaceCoachDock
    title="Swan Coach — talk to build this plan"
    contextChip={clientName ? `client: ${clientName}` : null}
    missingContextMessage={clientName ? null : 'Select a client to talk to Swan Coach.'}
    examplePrompts={EXAMPLE_PROMPTS}
    {...dock}
  />
);

export default WorkoutPlannerCoachDock;
