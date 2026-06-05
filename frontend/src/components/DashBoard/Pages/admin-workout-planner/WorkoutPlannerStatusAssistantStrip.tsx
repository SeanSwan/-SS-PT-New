/**
 * COMPONENT: WorkoutPlannerStatusAssistantStrip
 * PURPOSE: Renders planner status feedback, degraded-intelligence warnings,
 * and the scoped Swan Coach assistant panel outside the page shell.
 */

import React, { lazy, Suspense } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { PanelErrorBoundary } from '../../../ui/PanelErrorBoundary';
import {
  DegradedBanner,
  StatusBanner,
  TeachToggle,
} from './WorkoutPlannerStyles';

const AITerminalPanel = lazy(() => import('../../../Shared/AITerminalPanel'));

export interface WorkoutPlannerStatusMessage {
  type: 'success' | 'error';
  text: string;
}

interface WorkoutPlannerStatusAssistantStripProps {
  statusMsg: WorkoutPlannerStatusMessage | null;
  plannerReturnTo: string | null;
  selectedClientId: number | null;
  degradedIntelligence: boolean;
  hasPlanExercises: boolean;
  onReturnToClientHub: () => void;
  onDismissStatus: () => void;
}

const WorkoutPlannerStatusAssistantStrip: React.FC<WorkoutPlannerStatusAssistantStripProps> = ({
  statusMsg,
  plannerReturnTo,
  selectedClientId,
  degradedIntelligence,
  hasPlanExercises,
  onReturnToClientHub,
  onDismissStatus,
}) => (
  <>
    {statusMsg && (
      <StatusBanner $type={statusMsg.type} role="alert">
        <span className="planner-status-text">{statusMsg.text}</span>
        {plannerReturnTo && statusMsg.type === 'success' && (
          <span className="planner-status-actions">
            <TeachToggle type="button" onClick={onReturnToClientHub}>
              <ArrowLeft size={16} />
              Return to Client Hub
            </TeachToggle>
          </span>
        )}
        <button type="button" onClick={onDismissStatus} aria-label="Dismiss">
          &times;
        </button>
      </StatusBanner>
    )}

    {degradedIntelligence && hasPlanExercises && (
      <DegradedBanner role="alert">
        <AlertTriangle size={20} />
        <div>
          <strong>Limited Context Mode</strong> - Pain/injury data could not be loaded for this client.
          This workout was generated without injury exclusions. Review each exercise carefully before assigning.
        </div>
      </DegradedBanner>
    )}

    <PanelErrorBoundary panelName="Swan Coach Assistant">
      <Suspense fallback={null}>
        <AITerminalPanel
          context="workout_generation"
          clientId={selectedClientId ?? undefined}
          label="Workout Swan Coach Assistant"
          placeholder="Ask me about exercise selection, periodization, NASM protocols..."
          compact
          defaultOpen={false}
        />
      </Suspense>
    </PanelErrorBoundary>
  </>
);

export default WorkoutPlannerStatusAssistantStrip;
