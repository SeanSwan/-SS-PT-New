/**
 * ============================================================================
 * FILE: TrainingTabContent.tsx
 * PURPOSE: Active Clients & Team training workspace orchestration.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the selected client's training sub-sections with the workout logger as
 * the default daily workflow, then hands completed/canceled logs to history.
 *
 * HOW IT FITS IN THE APP:
 * UniversalDashboardLayout -> ClientsWorkspace -> ClientDetailView ->
 * renderTraining -> TrainingTabContent.
 *
 * DATA FLOW:
 * Props In: { clientId, clientName }
 * State: activeSection
 * Children: ClientTrainingCommandBar plus lazy training workflow panels.
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Archive, ClipboardList, FileAudio, Play, Sparkles, Wand2 } from 'lucide-react';
import { isNaturalWorkoutDictationCandidate } from '../../../../../hooks/aiMessageLimits';
import ClientTrainingCommandBar from '../ClientTrainingCommandBar';
import {
  ContentArea,
  LayoutWrapper,
  PlaceholderCard,
  ShimmerLoader,
  Sidebar,
  SidebarItem,
} from './TrainingTabContent.styles';
import { getNumericClientId } from './clientTabId';

const WorkoutPlanBuilder = React.lazy(
  () => import('../../../../WorkoutManagement/WorkoutPlanBuilder')
);

const ClientWorkoutPlansPanel = React.lazy(
  () => import('./ClientWorkoutPlansPanel')
);

const WorkoutLogger = React.lazy(
  () => import('../../../../WorkoutLogger/WorkoutLogger')
);

const PlaudMergeWorkspace = React.lazy(
  () => import('../../../../PlaudClipMerge/PlaudMergeWorkspace')
    .then((m) => ({ default: m.PlaudMergeWorkspace }))
);

const WorkoutCopilotPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel')
);

const WorkoutHistoryPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel')
);

export type TrainingSection = 'architect' | 'plans' | 'logger' | 'plaud' | 'copilot' | 'history';

interface TrainingTabContentProps {
  clientId: number | string;
  clientName?: string;
  initialSection?: TrainingSection;
}

const SECTIONS: {
  id: TrainingSection;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  { id: 'architect', label: 'Program Architect', shortLabel: 'Architect', icon: <Wand2 size={18} /> },
  { id: 'plans', label: 'Training Plans', shortLabel: 'Plans', icon: <ClipboardList size={18} /> },
  { id: 'logger', label: 'Workout Logger', shortLabel: 'Logger', icon: <Play size={18} /> },
  { id: 'plaud', label: 'PLAUD Uploads', shortLabel: 'PLAUD', icon: <FileAudio size={18} /> },
  { id: 'copilot', label: 'Swan Coach Copilot', shortLabel: 'Copilot', icon: <Sparkles size={18} /> },
  { id: 'history', label: 'Workout History', shortLabel: 'History', icon: <Archive size={18} /> },
];

function shouldOpenLoggerForCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  const formVerb =
    /^(add|check|complete|done|finish|include|load|log|mark|put|record|save|set|start with|submit|update|use)\b/;
  const workoutSignal =
    /\b(workout|exercise|session|set|sets|rep|reps|rpe|weight|tempo|warmup|cooldown|balance|core|phase|template|bench|squat|deadlift|row|rows|push|pull|curl|press|lunge|plank|burpee|cardio|treadmill|bike|elliptical)\b/;
  const submitPhrase = /^(complete and save|done with the session|finish workout|save the workout|submit this workout)\b/;
  return isNaturalWorkoutDictationCandidate(normalized)
    || (formVerb.test(normalized) && (workoutSignal.test(normalized) || submitPhrase.test(normalized)));
}

const SuspenseFallback: React.FC = () => (
  <ShimmerLoader role="status" aria-live="polite" aria-label="Loading content">
    <div />
    <div />
    <div />
  </ShimmerLoader>
);

const TrainingTabContent: React.FC<TrainingTabContentProps> = ({
  clientId,
  clientName,
  initialSection,
}) => {
  const [activeSection, setActiveSection] = useState<TrainingSection>(initialSection ?? 'logger');
  const numericClientId = getNumericClientId(clientId);

  useEffect(() => {
    setActiveSection(initialSection ?? 'logger');
  }, [clientId, initialSection]);

  const handleSectionChange = useCallback((section: TrainingSection) => {
    setActiveSection(section);
  }, []);

  const handleCommandLaneStart = useCallback((message: string) => {
    if (shouldOpenLoggerForCommand(message)) setActiveSection('logger');
  }, []);

  const renderContent = (safeClientId: number) => {
    switch (activeSection) {
      case 'architect':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutPlanBuilder
              clientId={String(safeClientId)}
              clientName={clientName}
            />
          </Suspense>
        );
      case 'plans':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <ClientWorkoutPlansPanel
              clientId={safeClientId}
              clientName={clientName}
            />
          </Suspense>
        );
      case 'logger':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutLogger
              clientId={safeClientId}
              onComplete={() => {
                setActiveSection('history');
              }}
              onCancel={() => {
                setActiveSection('history');
              }}
            />
          </Suspense>
        );
      case 'plaud':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <PlaudMergeWorkspace
              initialClientId={safeClientId}
              initialClientName={clientName}
              embedded={true}
            />
          </Suspense>
        );
      case 'copilot':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutCopilotPanel
              inline={true}
              open={true}
              onClose={() => undefined}
              clientId={safeClientId}
              clientName={clientName || 'Client'}
            />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<PlaceholderCard><p>Loading workout history...</p></PlaceholderCard>}>
            <WorkoutHistoryPanel
              clientId={safeClientId}
              clientName={clientName || 'Client'}
              variant="embedded"
              active={true}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <LayoutWrapper>
      <Sidebar role="tablist" aria-label="Training sub-sections">
        {SECTIONS.map((section) => (
          <SidebarItem
            type="button"
            key={section.id}
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`training-panel-${section.id}`}
            $active={activeSection === section.id}
            onClick={() => handleSectionChange(section.id)}
            title={section.label}
          >
            {section.icon}
            <span className="full-label">{section.label}</span>
            <span className="short-label">{section.shortLabel}</span>
          </SidebarItem>
        ))}
      </Sidebar>

      <ContentArea
        role="tabpanel"
        id={`training-panel-${activeSection}`}
        aria-label={SECTIONS.find((section) => section.id === activeSection)?.label}
      >
        {numericClientId === null ? (
          <PlaceholderCard role="alert" aria-live="assertive">
            <p>Select a valid client before opening training tools.</p>
          </PlaceholderCard>
        ) : (
          <>
            <ClientTrainingCommandBar
              clientId={numericClientId}
              clientName={clientName}
              onCommandLaneStart={handleCommandLaneStart}
            />
            {renderContent(numericClientId)}
          </>
        )}
      </ContentArea>
    </LayoutWrapper>
  );
};

export default React.memo(TrainingTabContent);
