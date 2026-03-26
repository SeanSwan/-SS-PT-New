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
 * │ │  [Cancel]  [Acknowledge & Generate]    │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ Props: { clientName, activePainEntries, isSubmitting, ... } │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Cancel] → setState('idle')                                 │
 * │ [Acknowledge & Generate] → handlePainAcknowledgeAndGenerate │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
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
    <h3 style={{ color: '#ffaa00', margin: 0 }}>
      Active Pain Entries Detected
    </h3>
    <p style={{ color: '#94a3b8', margin: 0, maxWidth: 500 }}>
      {clientName} has {activePainEntries.length} active pain/injury{activePainEntries.length > 1 ? ' entries' : ' entry'}.
      Review before generating to ensure the AI applies appropriate restrictions.
    </p>

    <div style={{ width: '100%', maxWidth: 600, margin: '12px 0' }}>
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
          <InfoPanel key={entry.id} style={{ marginBottom: 8, borderLeftColor: severityColor, borderLeftWidth: 3, borderLeftStyle: 'solid' }}>
            <InfoContent style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {regionLabel} ({entry.side})
                </span>
                <Badge $color={severityColor}>
                  {severityLabel} — {entry.painLevel}/10
                </Badge>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
                Type: {entry.painType}
                {entry.description && <> — {entry.description}</>}
              </div>
              {entry.aggravatingMovements && (
                <div style={{ color: '#ff9999', fontSize: '0.8rem', marginTop: 4 }}>
                  Aggravates: {entry.aggravatingMovements}
                </div>
              )}
            </InfoContent>
          </InfoPanel>
        );
      })}
    </div>

    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, maxWidth: 500 }}>
      The AI will automatically apply NASM CES restrictions based on these entries.
      Severe entries (7-10) will hard-restrict exercises. Moderate entries (4-6) will modify loads.
    </p>

    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
      <SecondaryButton onClick={() => setState('idle')}>
        Cancel
      </SecondaryButton>
      <PrimaryButton onClick={handlePainAcknowledgeAndGenerate} disabled={isSubmitting}>
        <Shield size={16} />
        Acknowledge &amp; Generate
      </PrimaryButton>
    </div>
  </CenterContent>
);

export default React.memo(CopilotPainCheck);
