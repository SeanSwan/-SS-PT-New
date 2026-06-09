/**
 * LongHorizonStatusScreens
 *
 * Purpose: Renders non-editing long-horizon states so LongHorizonContent can
 * focus on state transitions, configuration, and draft review.
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { DegradedResponse } from '../../../../../services/aiWorkoutService';
import type { LongHorizonMonths } from '../../../../../services/aiWorkoutService';
import {
  CenterContent,
  InfoContent,
  InfoPanel,
  PrimaryButton,
  SecondaryButton,
  Spinner,
  SWAN_CYAN,
} from './copilot-shared-styles';
import {
  ActionRow,
  IconSlot,
  PanelCopy,
  PanelTitle,
  SavedMetaStrong,
} from './LongHorizonContent.styles';

interface LongHorizonIdleStateProps {
  clientName: string;
  isSubmitting: boolean;
  onConfigure: () => void;
}

interface LongHorizonGeneratingStateProps {
  horizonMonths: LongHorizonMonths;
}

interface LongHorizonDegradedStateProps {
  degradedData: DegradedResponse;
  isSubmitting: boolean;
  onRetry: () => void;
  onBackToConfigure: () => void;
}

interface LongHorizonSavedStateProps {
  savedPlanId: number | null;
  savedBlockCount: number;
  validationWarnings: string[];
  eligibilityWarnings: string[];
  onClose: () => void;
}

export const LongHorizonIdleState: React.FC<LongHorizonIdleStateProps> = ({
  clientName,
  isSubmitting,
  onConfigure,
}) => (
  <CenterContent>
    <Sparkles size={48} color={SWAN_CYAN} />
    <PanelTitle>Long-Horizon Planning</PanelTitle>
    <PanelCopy $maxWidth={520}>
      Generate a 3/6/9/12-month NASM-aligned mesocycle plan for {clientName}. Review and edit
      before final approval.
    </PanelCopy>
    <PrimaryButton onClick={onConfigure} disabled={isSubmitting}>
      Configure Plan
    </PrimaryButton>
  </CenterContent>
);

export const LongHorizonGeneratingState: React.FC<LongHorizonGeneratingStateProps> = ({
  horizonMonths,
}) => (
  <CenterContent>
    <Spinner size={48} color={SWAN_CYAN} />
    <PanelTitle>Generating Long-Horizon Draft...</PanelTitle>
    <PanelCopy>
      Building a {horizonMonths}-month periodization plan using profile and training context.
    </PanelCopy>
  </CenterContent>
);

export const LongHorizonDegradedState: React.FC<LongHorizonDegradedStateProps> = ({
  degradedData,
  isSubmitting,
  onRetry,
  onBackToConfigure,
}) => (
  <CenterContent>
    <AlertTriangle size={48} color="#ffaa00" />
    <PanelTitle $tone="warning">Swan Coach Temporarily Unavailable</PanelTitle>
    <PanelCopy $maxWidth={540}>{degradedData.message}</PanelCopy>
    <InfoPanel $variant="warning">
      <IconSlot><Info size={16} /></IconSlot>
      <InfoContent>
        {degradedData.fallback.reasons.map((reason, idx) => (
          <div key={`${reason}-${idx}`}>{reason}</div>
        ))}
      </InfoContent>
    </InfoPanel>
    <ActionRow>
      <PrimaryButton onClick={onRetry} disabled={isSubmitting}>
        <RefreshCw size={16} />
        Retry
      </PrimaryButton>
      <SecondaryButton onClick={onBackToConfigure}>Back to Configure</SecondaryButton>
    </ActionRow>
  </CenterContent>
);

export const LongHorizonSavedState: React.FC<LongHorizonSavedStateProps> = ({
  savedPlanId,
  savedBlockCount,
  validationWarnings,
  eligibilityWarnings,
  onClose,
}) => (
  <CenterContent>
    <CheckCircle2 size={48} color="#00ff64" />
    <PanelTitle $tone="success">Long-Horizon Plan Saved</PanelTitle>
    <PanelCopy>
      Plan ID: <SavedMetaStrong>{savedPlanId}</SavedMetaStrong> - Blocks:{' '}
      <SavedMetaStrong>{savedBlockCount}</SavedMetaStrong>
    </PanelCopy>
    {validationWarnings.length > 0 && (
      <InfoPanel $variant="warning">
        <IconSlot><Info size={16} /></IconSlot>
        <InfoContent>
          {validationWarnings.map((warning, idx) => (
            <div key={`${warning}-${idx}`}>{warning}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}
    {eligibilityWarnings.length > 0 && (
      <InfoPanel $variant="info">
        <IconSlot><Info size={16} /></IconSlot>
        <InfoContent>
          {eligibilityWarnings.map((warning, idx) => (
            <div key={`${warning}-${idx}`}>{warning}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}
    <SecondaryButton onClick={onClose}>Close</SecondaryButton>
  </CenterContent>
);
