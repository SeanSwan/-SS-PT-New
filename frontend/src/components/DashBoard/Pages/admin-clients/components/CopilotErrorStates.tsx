/**
 * ============================================================================
 * FILE: CopilotErrorStates.tsx
 * PURPOSE: Error, approve_error, and degraded state UIs for Workout Copilot.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders three failure states — generation error,
 * approval error, and degraded (AI temporarily unavailable) — with
 * context-sensitive messaging based on error codes. Provides retry,
 * override, and back-to-editor actions.
 *
 * HOW IT FITS IN THE APP: WorkoutCopilotPanel → CopilotErrorStates
 * (when state === 'error' | 'approve_error' | 'degraded')
 *
 * KEY DECISIONS: Error classification (consent, waiver, assignment, override,
 * retryable) is computed in the orchestrator and passed as boolean props to
 * keep this component stateless and testable.
 */

/**
 * ┌─── SUB-COMPONENT: CopilotErrorStates ─────────────────────┐
 * │ PARENT: WorkoutCopilotPanel                                 │
 * │ PURPOSE: Render error/degraded states with recovery actions │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────┐                  │
 * │ │  ⚠ Generation/Approval Failed          │                  │
 * │ │  [error message]                       │                  │
 * │ │  [field-level errors if 422]           │                  │
 * │ │  [consent/assignment warning]          │                  │
 * │ │  [Retry] [Override] [Back] [Close]     │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ or                                                          │
 * │ ┌────────────────────────────────────────┐                  │
 * │ │  ⚠ AI Temporarily Unavailable          │                  │
 * │ │  [fallback reasons]                    │                  │
 * │ │  [template suggestions]                │                  │
 * │ │  [Retry AI Generation] [Close]         │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Retry] → handleGenerate                                   │
 * │ [Override] → setOverrideReasonRequired(true); setState idle │
 * │ [Back to Editor] → setState('draft_review')                 │
 * │ [Close] → onClose                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import {
  AlertTriangle, Shield, Info, FileWarning, RefreshCw,
} from 'lucide-react';
import type { CopilotState, DegradedResponse, ValidationError, WorkoutPlan } from './copilot-types';
import {
  CenterContent,
  PrimaryButton,
  SecondaryButton,
  InfoPanel,
  InfoContent,
  SectionTitle,
  TemplateList,
  TemplateItem,
  Badge,
} from './copilot-shared-styles';

const StateTitle = styled.h3<{ $tone: 'error' | 'warning' }>`
  color: ${({ $tone }) => ($tone === 'error' ? 'var(--color-error, #ff6b6b)' : 'var(--color-warning, #ffaa00)')};
  margin: 0;
`;

const StateCopy = styled.p`
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  max-width: 500px;
`;

const FieldErrorList = styled.div`
  width: 100%;
  max-width: 500px;
`;

const PanelIconSlot = styled.span`
  flex-shrink: 0;
  margin-top: 2px;
`;

const ActionRow = styled.div<{ $withTopMargin?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: ${({ $withTopMargin }) => ($withTopMargin ? '8px' : 0)};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface CopilotErrorStatesProps {
  state: CopilotState;
  errorMessage: string;
  approveErrors: ValidationError[];
  degradedData: DegradedResponse | null;
  isConsentError: boolean;
  isWaiverError: boolean;
  isAssignmentError: boolean;
  isOverrideError: boolean;
  isRetryable: boolean;
  handleGenerate: () => void;
  isSubmitting: boolean;
  onClose: () => void;
  setState: (s: CopilotState) => void;
  editedPlan: WorkoutPlan | null;
  setOverrideReasonRequired: (val: boolean) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Error/Approve Error sub-view
// ─────────────────────────────────────────────────────────────

const ErrorView: React.FC<CopilotErrorStatesProps> = ({
  state,
  errorMessage,
  approveErrors,
  isConsentError,
  isWaiverError,
  isAssignmentError,
  isOverrideError,
  isRetryable,
  handleGenerate,
  isSubmitting,
  onClose,
  setState,
  editedPlan,
  setOverrideReasonRequired,
}) => (
  <CenterContent>
    <AlertTriangle size={48} color="#ff6b6b" />
    <StateTitle $tone="error">
      {state === 'approve_error' ? 'Approval Failed' : 'Generation Failed'}
    </StateTitle>
    <StateCopy>{errorMessage}</StateCopy>

    {/* Field-level errors for 422 */}
    {approveErrors.length > 0 && (
      <FieldErrorList>
        {approveErrors.map((e, i) => (
          <InfoPanel key={i} $variant="error">
            <PanelIconSlot>
              <FileWarning size={16} />
            </PanelIconSlot>
            <InfoContent>
              <strong>{e.field || e.code}:</strong> {e.message}
            </InfoContent>
          </InfoPanel>
        ))}
      </FieldErrorList>
    )}

    {isConsentError && (
      <InfoPanel $variant="warning">
        <PanelIconSlot>
          <Shield size={16} />
        </PanelIconSlot>
        <InfoContent>
          {isWaiverError
            ? 'This client\'s waiver consent is missing or outdated. The client must sign the current waiver before Swan Coach features can be used.'
            : 'This client has not granted Swan Coach consent. The client must enable Swan Coach features from their own account settings before Swan Coach workout generation can be used.'}
        </InfoContent>
      </InfoPanel>
    )}

    {isAssignmentError && (
      <InfoPanel $variant="warning">
        <PanelIconSlot>
          <Shield size={16} />
        </PanelIconSlot>
        <InfoContent>
          You are not currently assigned to this client. Please contact an
          administrator to update your client assignments.
        </InfoContent>
      </InfoPanel>
    )}

    <ActionRow>
      {isRetryable && (
        <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
          <RefreshCw size={16} />
          Retry
        </PrimaryButton>
      )}
      {isOverrideError && (
        <PrimaryButton onClick={() => { setOverrideReasonRequired(true); setState('idle'); }}>
          Provide Override Reason
        </PrimaryButton>
      )}
      {state === 'approve_error' && editedPlan && (
        <SecondaryButton onClick={() => setState('draft_review')}>
          Back to Editor
        </SecondaryButton>
      )}
      <SecondaryButton onClick={onClose}>Close</SecondaryButton>
    </ActionRow>
  </CenterContent>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Degraded sub-view
// ─────────────────────────────────────────────────────────────

const DegradedView: React.FC<{
  degradedData: DegradedResponse;
  handleGenerate: () => void;
  isSubmitting: boolean;
  onClose: () => void;
}> = ({ degradedData, handleGenerate, isSubmitting, onClose }) => (
  <CenterContent>
    <AlertTriangle size={48} color="#ffaa00" />
    <StateTitle $tone="warning">Swan Coach Temporarily Unavailable</StateTitle>
    <StateCopy>
      {degradedData.message}
    </StateCopy>

    {degradedData.fallback.reasons.length > 0 && (
      <InfoPanel $variant="warning">
        <PanelIconSlot>
          <Info size={16} />
        </PanelIconSlot>
        <InfoContent>
          {degradedData.fallback.reasons.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}

    {degradedData.fallback.templateSuggestions.length > 0 && (
      <>
        <SectionTitle>Available Templates (Manual Mode)</SectionTitle>
        <TemplateList>
          {degradedData.fallback.templateSuggestions.map((t) => (
            <TemplateItem key={t.id}>
              <Badge $color="#ffaa00">{t.category}</Badge>
              <span>{t.label}</span>
            </TemplateItem>
          ))}
        </TemplateList>
      </>
    )}

    <ActionRow $withTopMargin>
      <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
        <RefreshCw size={16} />
        Retry Swan Coach Generation
      </PrimaryButton>
      <SecondaryButton onClick={onClose}>Close</SecondaryButton>
    </ActionRow>
  </CenterContent>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Dispatcher component
// PURPOSE: Routes to ErrorView or DegradedView based on state
// ─────────────────────────────────────────────────────────────

const CopilotErrorStates: React.FC<CopilotErrorStatesProps> = (props) => {
  if (props.state === 'degraded' && props.degradedData) {
    return (
      <DegradedView
        degradedData={props.degradedData}
        handleGenerate={props.handleGenerate}
        isSubmitting={props.isSubmitting}
        onClose={props.onClose}
      />
    );
  }

  if (props.state === 'error' || props.state === 'approve_error') {
    return <ErrorView {...props} />;
  }

  return null;
};

export default React.memo(CopilotErrorStates);
