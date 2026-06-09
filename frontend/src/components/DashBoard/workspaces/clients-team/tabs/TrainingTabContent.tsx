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

import React, { useCallback, useEffect, useState } from 'react';
import { Archive, ClipboardList, FileAudio, Play, Sparkles, Wand2 } from 'lucide-react';
import { isNaturalWorkoutDictationCandidate } from '../../../../../hooks/aiMessageLimits';
import ClientTrainingCommandBar from '../ClientTrainingCommandBar';
import {
  ContentArea,
  LayoutWrapper,
  PlaceholderCard,
  Sidebar,
  SidebarItem,
} from './TrainingTabContent.styles';
import { getNumericClientId } from './clientTabId';
import TrainingTabSectionContent, { type TrainingSection } from './TrainingTabSectionContent';
import type { ClientTrainingSavedWorkout } from './ClientTrainingSaveReceipt';

interface TrainingTabContentProps {
  clientId: number | string;
  clientName?: string;
  initialSection?: TrainingSection;
  onSectionChange?: (section: TrainingSection) => void;
  onOpenProgress?: () => void;
  scheduledSessionCreditHint?: number | null;
  scheduledSessionDate?: string | null;
  scheduledSessionId?: string | null;
}

const SECTIONS: {
  id: TrainingSection;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  { id: 'architect', label: 'Swan Coach Architect', shortLabel: 'Architect', icon: <Wand2 size={18} /> },
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

const TrainingTabContent: React.FC<TrainingTabContentProps> = ({
  clientId,
  clientName,
  initialSection,
  onSectionChange,
  onOpenProgress,
  scheduledSessionCreditHint = null,
  scheduledSessionDate = null,
  scheduledSessionId = null,
}) => {
  const [activeSection, setActiveSection] = useState<TrainingSection>(initialSection ?? 'logger');
  const [lastSavedWorkout, setLastSavedWorkout] = useState<ClientTrainingSavedWorkout | null>(null);
  const [loadTodayPlanSignal, setLoadTodayPlanSignal] = useState(0);
  const [planVaultRefreshSignal, setPlanVaultRefreshSignal] = useState(0);
  const numericClientId = getNumericClientId(clientId);

  useEffect(() => {
    setActiveSection(initialSection ?? 'logger');
  }, [clientId, initialSection]);

  useEffect(() => {
    setLastSavedWorkout(null);
  }, [clientId]);

  const handleSectionChange = useCallback((section: TrainingSection) => {
    setActiveSection(section);
    onSectionChange?.(section);
  }, [onSectionChange]);

  const handleCommandLaneStart = useCallback((message: string) => {
    if (shouldOpenLoggerForCommand(message)) handleSectionChange('logger');
  }, [handleSectionChange]);

  const handleLogTodayFromPlan = useCallback(() => {
    setLoadTodayPlanSignal((signal) => signal + 1);
    handleSectionChange('logger');
  }, [handleSectionChange]);

  const handlePlanCreated = useCallback(() => {
    setPlanVaultRefreshSignal((signal) => signal + 1);
    handleSectionChange('plans');
  }, [handleSectionChange]);

  const handleWorkoutComplete = useCallback((savedWorkout: unknown) => {
    setLastSavedWorkout((savedWorkout ?? {}) as ClientTrainingSavedWorkout);
    handleSectionChange('history');
  }, [handleSectionChange]);

  const handleWorkoutCancel = useCallback(() => {
    handleSectionChange('history');
  }, [handleSectionChange]);

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
            <TrainingTabSectionContent
              activeSection={activeSection}
              clientName={clientName}
              lastSavedWorkout={lastSavedWorkout}
              loadTodayPlanSignal={loadTodayPlanSignal}
              planVaultRefreshSignal={planVaultRefreshSignal}
              safeClientId={numericClientId}
              scheduledSessionCreditHint={scheduledSessionCreditHint}
              scheduledSessionDate={scheduledSessionDate}
              scheduledSessionId={scheduledSessionId}
              onArchitectPlanCreated={handlePlanCreated}
              onLogTodayFromPlan={handleLogTodayFromPlan}
              onOpenProgress={onOpenProgress}
              onWorkoutCancel={handleWorkoutCancel}
              onWorkoutComplete={handleWorkoutComplete}
            />
          </>
        )}
      </ContentArea>
    </LayoutWrapper>
  );
};

export default React.memo(TrainingTabContent);
