/**
 * ============================================================================
 * FILE: CopilotPainCheck.tsx
 * PURPOSE: Pain safety check UI — shows active pain entries before generation.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays a safety interstitial listing the client's
 * active pain/injury entries. Trainer must acknowledge before AI generation
 * proceeds. Severity is color-coded per NASM CES protocol.
 *
 * HOW IT FITS IN THE APP: WorkoutCopilotPanel → CopilotPainCheck (when state === 'pain_check')
 *
 * KEY DECISIONS: Fail-open design — if pain check API fails, generation
 * proceeds anyway (handled in orchestrator). Color coding uses theme tokens
 * (Gilded Fern for severe, Arctic Cyan for moderate, Ice Wing for mild).
 */

/**
 * ┌─── SUB-COMPONENT: CopilotPainCheck ───────────────────────┐
 * │ PARENT: WorkoutCopilotPanel                                 │
 * │ PURPOSE: Safety gate showing active pain entries            │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────┐                  │
 * │ │  ⚠ Active Pain Entries Detected        │                  │
 * │ │  ┌─ Lower Back (Left) — SEVERE 8/10 ─┐│                  │
 * │ │  ┌─ Right Knee — MODERATE 5/10 ──────┐│                  │
 * │ │  [Cancel]  [Acknowledge & Coach Plan]    │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ Props: { clientName, activePainEntries, isSubmitting, ... } │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Cancel] → setState('idle')                                 │
 * │ [Acknowledge & Coach Plan] → handlePainAcknowledgeAndGenerate │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, Shield } from 'lucide-react';
import type { PainEntry, CopilotState } from './copilot-types';
import {
  CenterContent,
  PrimaryButton,
  SecondaryButton,
  InfoPanel,
  InfoContent,
  Badge,
} from './copilot-shared-styles';

const WarningTitle = styled.h3`
  color: var(--color-warning, #ffaa00);
  margin: 0;
`;

const IntroCopy = styled.p`
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  max-width: 500px;
`;

const PainList = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 12px 0;
`;

const PainInfoPanel = styled(InfoPanel)<{ $severityColor: string }>`
  border-left-color: ${({ $severityColor }) => $severityColor};
  border-left-style: solid;
  border-left-width: 3px;
  margin-bottom: 8px;
`;

const PainInfoContent = styled(InfoContent)`
  padding: 10px 14px;
`;

const PainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`;

const PainRegion = styled.span`
  color: var(--text-primary, #e2e8f0);
  font-weight: 600;
`;

const PainDescription = styled.div`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.85rem;
  margin-top: 4px;
`;

const AggravationText = styled.div`
  color: var(--color-error-soft, #ff9999);
  font-size: 0.8rem;
  margin-top: 4px;
`;

const RestrictionNote = styled.p`
  color: var(--text-muted, #64748b);
  font-size: 0.8rem;
  margin: 0;
  max-width: 500px;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface CopilotPainCheckProps {
  clientName: string;
  activePainEntries: PainEntry[];
  isSubmitting: boolean;
  setState: (s: CopilotState) => void;
  handlePainAcknowledgeAndGenerate: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const CopilotPainCheck: React.FC<CopilotPainCheckProps> = ({
  clientName,
  activePainEntries,
  isSubmitting,
  setState,
  handlePainAcknowledgeAndGenerate,
}) => (
  <CenterContent>
    <AlertTriangle size={48} color="#ffaa00" />
    <WarningTitle>
      Active Pain Entries Detected
    </WarningTitle>
    <IntroCopy>
      {clientName} has {activePainEntries.length} active pain/injury{activePainEntries.length > 1 ? ' entries' : ' entry'}.
      Review before planning so Swan Coach applies appropriate restrictions.
    </IntroCopy>

    <PainList>
      {activePainEntries.map((entry) => {
        // Severity color mapping: Gilded Fern (severe), Arctic Cyan (moderate), Ice Wing (mild)
        const severityColor =
          entry.painLevel >= 7 ? '#C6A84B' :
          entry.painLevel >= 4 ? '#50A0F0' : '#60C0F0';
        const severityLabel =
          entry.painLevel >= 7 ? 'SEVERE' :
          entry.painLevel >= 4 ? 'MODERATE' : 'MILD';
        const regionLabel = entry.bodyRegion.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        return (
          <PainInfoPanel key={entry.id} $variant="warning" $severityColor={severityColor}>
            <PainInfoContent>
              <PainHeader>
                <PainRegion>
                  {regionLabel} ({entry.side})
                </PainRegion>
                <Badge $color={severityColor}>
                  {severityLabel} — {entry.painLevel}/10
                </Badge>
              </PainHeader>
              <PainDescription>
                Type: {entry.painType}
                {entry.description && <> — {entry.description}</>}
              </PainDescription>
              {entry.aggravatingMovements && (
                <AggravationText>
                  Aggravates: {entry.aggravatingMovements}
                </AggravationText>
              )}
            </PainInfoContent>
          </PainInfoPanel>
        );
      })}
    </PainList>

    <RestrictionNote>
      Swan Coach will automatically apply NASM CES restrictions based on these entries.
      Severe entries (7-10) will hard-restrict exercises. Moderate entries (4-6) will modify loads.
    </RestrictionNote>

    <ActionRow>
      <SecondaryButton onClick={() => setState('idle')}>
        Cancel
      </SecondaryButton>
      <PrimaryButton onClick={handlePainAcknowledgeAndGenerate} disabled={isSubmitting}>
        <Shield size={16} />
        Acknowledge &amp; Coach Plan
      </PrimaryButton>
    </ActionRow>
  </CenterContent>
);

export default React.memo(CopilotPainCheck);
