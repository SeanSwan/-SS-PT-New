/**
 * ============================================================================
 * FILE: TrainingTabContent.tsx
 * PURPOSE: Active Clients & Team training workspace orchestration.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the selected client's training workflow as three modes -
 * Today (log & coach the session), Plan (vault, builder, Coach drafts), and
 * History & Inputs (history, imports, PLAUD) - with Today as the default.
 * The seven legacy section ids remain the `trainingSection=` deep-link
 * contract; the mode rail is DERIVED from the active section, so every
 * existing quick action, view-as CTA, and coach handoff keeps working.
 *
 * HOW IT FITS IN THE APP:
 * UniversalDashboardLayout -> ClientsWorkspace -> ClientDetailView ->
 * renderTraining -> TrainingTabContent.
 *
 * DATA FLOW:
 * Props In: { clientId, clientName, initialSection, ... }
 * State: activeSection (workflow mode derived via trainingWorkflowModes)
 * Children: ClientTrainingCommandBar plus lazy training workflow panels.
 */

import React, { useCallback, useEffect, useId, useState } from 'react';
import { Archive, ChevronDown, ClipboardList, FileAudio, Play, Sparkles, UploadCloud, Wand2 } from 'lucide-react';
import { isNaturalWorkoutDictationCandidate } from '../../../../../hooks/aiMessageLimits';
import ClientTrainingCommandBar from '../ClientTrainingCommandBar';
import {
  CommandDisclosure,
  CommandPanel,
  CommandToggleButton,
  CommandToggleCopy,
} from '../ClientTrainingCommandBar.styles';
import {
  ContentArea,
  LayoutWrapper,
  ModeCopy,
  ModeSublabel,
  PlaceholderCard,
  SectionChip,
  SectionChipRow,
  Sidebar,
  SidebarItem,
} from './TrainingTabContent.styles';
import { getNumericClientId } from './clientTabId';
import TrainingTabSectionContent, { type TrainingSection } from './TrainingTabSectionContent';
import {
  TRAINING_SECTION_CHIPS,
  coerceTrainingSectionForAudience,
  getTrainingModeConfig,
  getTrainingModeForSection,
  getTrainingModesForAudience,
  type TrainingWorkflowMode,
} from './trainingWorkflowModes';
import type { ClientHubAudience } from '../clientHubAudience';
import ClientTrainingSaveReceipt, { type ClientTrainingSavedWorkout } from './ClientTrainingSaveReceipt';

interface TrainingTabContentProps {
  clientId: number | string;
  clientName?: string;
  audience?: ClientHubAudience;
  initialSection?: TrainingSection;
  loggerReturnTo?: string | null;
  onLoggerReturnTo?: (returnTo: string) => void;
  onSectionChange?: (section: TrainingSection) => void;
  onOpenProgress?: () => void;
  scheduledSessionCreditHint?: number | null;
  scheduledSessionDate?: string | null;
  scheduledSessionId?: string | null;
}

const MODE_ICONS: Record<TrainingWorkflowMode, React.ReactNode> = {
  today: <Play size={18} />,
  plan: <ClipboardList size={18} />,
  inputs: <Archive size={18} />,
};

const SECTION_ICONS: Record<TrainingSection, React.ReactNode> = {
  logger: <Play size={15} />,
  plans: <ClipboardList size={15} />,
  architect: <Wand2 size={15} />,
  copilot: <Sparkles size={15} />,
  history: <Archive size={15} />,
  import: <UploadCloud size={15} />,
  plaud: <FileAudio size={15} />,
};

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
  audience = 'admin',
  initialSection,
  loggerReturnTo = null,
  onLoggerReturnTo,
  onSectionChange,
  onOpenProgress,
  scheduledSessionCreditHint = null,
  scheduledSessionDate = null,
  scheduledSessionId = null,
}) => {
  const [activeSection, setActiveSection] = useState<TrainingSection>(
    coerceTrainingSectionForAudience(audience, initialSection ?? 'logger'),
  );
  const [lastSavedWorkout, setLastSavedWorkout] = useState<ClientTrainingSavedWorkout | null>(null);
  const [loadTodayPlanSignal, setLoadTodayPlanSignal] = useState(0);
  const [planVaultRefreshSignal, setPlanVaultRefreshSignal] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const commandPanelId = useId();
  const numericClientId = getNumericClientId(clientId);
  const visibleModes = getTrainingModesForAudience(audience);
  const activeMode = getTrainingModeForSection(activeSection);
  const activeModeConfig = getTrainingModeConfig(activeMode);

  useEffect(() => {
    setActiveSection(coerceTrainingSectionForAudience(audience, initialSection ?? 'logger'));
  }, [audience, clientId, initialSection]);

  useEffect(() => {
    setLastSavedWorkout(null);
    setCommandOpen(false);
  }, [clientId]);

  const handleSectionChange = useCallback((section: TrainingSection) => {
    setActiveSection(section);
    onSectionChange?.(section);
  }, [onSectionChange]);

  const handleModeChange = useCallback((mode: TrainingWorkflowMode) => {
    if (mode === activeMode) return;
    handleSectionChange(getTrainingModeConfig(mode).defaultSection);
  }, [activeMode, handleSectionChange]);

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
    handleSectionChange(coerceTrainingSectionForAudience(audience, 'history'));
  }, [audience, handleSectionChange]);

  const handleWorkoutCancel = useCallback(() => {
    if (loggerReturnTo && onLoggerReturnTo) {
      onLoggerReturnTo(loggerReturnTo);
      return;
    }
    handleSectionChange(coerceTrainingSectionForAudience(audience, 'history'));
  }, [audience, handleSectionChange, loggerReturnTo, onLoggerReturnTo]);

  const handleOpenHistoryImport = useCallback(() => {
    handleSectionChange('import');
  }, [handleSectionChange]);

  return (
    <LayoutWrapper>
      <Sidebar role="tablist" aria-label="Training workflow modes">
        {visibleModes.map((mode) => (
          <SidebarItem
            type="button"
            key={mode.id}
            role="tab"
            aria-selected={activeMode === mode.id}
            aria-controls={`training-panel-${activeMode === mode.id ? activeSection : mode.defaultSection}`}
            $active={activeMode === mode.id}
            onClick={() => handleModeChange(mode.id)}
            title={mode.label}
          >
            {MODE_ICONS[mode.id]}
            <ModeCopy>
              <span className="full-label">{mode.label}</span>
              <span className="short-label">{mode.shortLabel}</span>
              <ModeSublabel>{mode.sublabel}</ModeSublabel>
            </ModeCopy>
          </SidebarItem>
        ))}
      </Sidebar>

      <ContentArea>
        {numericClientId === null ? (
          <PlaceholderCard role="alert" aria-live="assertive">
            <p>Select a valid client before opening training tools.</p>
          </PlaceholderCard>
        ) : (
          <>
            <CommandDisclosure>
              <CommandToggleButton
                type="button"
                $open={commandOpen}
                aria-expanded={commandOpen}
                aria-controls={commandPanelId}
                onClick={() => setCommandOpen((open) => !open)}
              >
                <Sparkles size={17} />
                <CommandToggleCopy>
                  <span>Ask Coach</span>
                  <small>Use dictation, AI commands, or a review-gated training draft from any mode.</small>
                </CommandToggleCopy>
                <ChevronDown size={16} />
              </CommandToggleButton>
              <CommandPanel id={commandPanelId} hidden={!commandOpen}>
                {commandOpen && (
                  <ClientTrainingCommandBar
                    clientId={numericClientId}
                    clientName={clientName}
                    scheduledSessionCreditHint={scheduledSessionCreditHint}
                    scheduledSessionDate={scheduledSessionDate}
                    scheduledSessionId={scheduledSessionId}
                    onCommandLaneStart={handleCommandLaneStart}
                  />
                )}
              </CommandPanel>
            </CommandDisclosure>
            {audience === 'trainer' && lastSavedWorkout && activeSection === 'logger' && (
              <ClientTrainingSaveReceipt
                clientName={clientName || 'Client'}
                savedWorkout={lastSavedWorkout}
                onOpenProgress={onOpenProgress}
              />
            )}
            {activeModeConfig.sections.length > 1 && (
              <SectionChipRow role="tablist" aria-label={`${activeModeConfig.label} lanes`}>
                {activeModeConfig.sections.map((sectionId) => (
                  <SectionChip
                    type="button"
                    key={sectionId}
                    role="tab"
                    aria-selected={activeSection === sectionId}
                    aria-controls={`training-panel-${sectionId}`}
                    $active={activeSection === sectionId}
                    onClick={() => handleSectionChange(sectionId)}
                    title={TRAINING_SECTION_CHIPS[sectionId].label}
                  >
                    {SECTION_ICONS[sectionId]}
                    <span className="full-label">{TRAINING_SECTION_CHIPS[sectionId].label}</span>
                    <span className="short-label">{TRAINING_SECTION_CHIPS[sectionId].shortLabel}</span>
                  </SectionChip>
                ))}
              </SectionChipRow>
            )}
            <div
              role="tabpanel"
              id={`training-panel-${activeSection}`}
              aria-label={TRAINING_SECTION_CHIPS[activeSection].label}
            >
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
                onOpenHistoryImport={handleOpenHistoryImport}
                onOpenProgress={onOpenProgress}
                onWorkoutCancel={handleWorkoutCancel}
                onWorkoutComplete={handleWorkoutComplete}
              />
            </div>
          </>
        )}
      </ContentArea>
    </LayoutWrapper>
  );
};

export default React.memo(TrainingTabContent);
