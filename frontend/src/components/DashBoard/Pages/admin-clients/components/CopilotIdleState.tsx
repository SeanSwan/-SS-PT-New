/**
 * ============================================================================
 * FILE: CopilotIdleState.tsx
 * PURPOSE: Idle state UI for the Workout Copilot — generate button + template list.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the initial idle screen of the copilot panel,
 * including the generate button, admin override reason field, and the NASM
 * template catalog list.
 *
 * HOW IT FITS IN THE APP: WorkoutCopilotPanel → CopilotIdleState (when state === 'idle')
 *
 * KEY DECISIONS: Override section only visible for admins or when backend
 * requests an override reason. Templates are informational only (backend
 * auto-selects the best template).
 */

/**
 * ┌─── SUB-COMPONENT: CopilotIdleState ───────────────────────┐
 * │ PARENT: WorkoutCopilotPanel                                 │
 * │ PURPOSE: Generate button + template catalog for idle state  │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────┐                  │
 * │ │  ✨ Generate AI Workout Plan           │                  │
 * │ │  [description text]                    │                  │
 * │ │  [Override Reason (admin only)]        │                  │
 * │ │  [Generate Draft] button               │                  │
 * │ │  Available NASM Templates:             │                  │
 * │ │  ┌─ template 1 ─┐                     │                  │
 * │ │  ┌─ template 2 ─┐                     │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ Props: { clientName, isAdmin, overrideReasonRequired, ... } │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Generate Draft] → handleGenerate → pain check → generate  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import type { TemplateEntry } from './copilot-types';
import { OverrideSection, OverrideTextArea } from './copilot-local-styles';
import {
  SWAN_CYAN,
  CenterContent,
  PrimaryButton,
  SectionTitle,
  TemplateList,
  TemplateItem,
  Badge,
  Label,
} from './copilot-shared-styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface CopilotIdleStateProps {
  clientName: string;
  isAdmin: boolean;
  overrideReasonRequired: boolean;
  overrideReason: string;
  setOverrideReason: (val: string) => void;
  handleGenerate: () => void;
  isSubmitting: boolean;
  templatesLoading: boolean;
  templates: TemplateEntry[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const CopilotIdleState: React.FC<CopilotIdleStateProps> = ({
  clientName,
  isAdmin,
  overrideReasonRequired,
  overrideReason,
  setOverrideReason,
  handleGenerate,
  isSubmitting,
  templatesLoading,
  templates,
}) => (
  <CenterContent>
    <Sparkles size={48} color={SWAN_CYAN} />
    <h3 style={{ color: '#e2e8f0', margin: 0 }}>Generate Swan Coach Workout Plan</h3>
    <p style={{ color: '#94a3b8', margin: 0, maxWidth: 400 }}>
      The AI will analyze {clientName}&apos;s profile, training history, and NASM assessment
      to generate a personalized workout plan for your review.
    </p>

    {(isAdmin || overrideReasonRequired) && (
      <OverrideSection style={{ width: '100%', maxWidth: 500 }}>
        <Label>Admin Override Reason {overrideReasonRequired ? '(required)' : '(optional)'}</Label>
        <OverrideTextArea
          $required={overrideReasonRequired}
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          placeholder="Provide justification when consent override is required"
          rows={3}
        />
      </OverrideSection>
    )}

    <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
      <Sparkles size={16} />
      Generate Draft
    </PrimaryButton>

    {/* Template catalog (informational -- backend auto-selects from NASM constraints) */}
    {templatesLoading && (
      <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading templates...</p>
    )}
    {!templatesLoading && templates.length > 0 && (
      <>
        <SectionTitle style={{ marginTop: 16 }}>
          <Info size={16} /> Available NASM Templates
        </SectionTitle>
        <TemplateList>
          {templates.map((t) => (
            <TemplateItem key={t.id}>
              <Badge>{t.nasmFramework}</Badge>
              <span>{t.label}</span>
              {t.tags.length > 0 && (
                <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: 'auto' }}>
                  {t.tags.join(', ')}
                </span>
              )}
            </TemplateItem>
          ))}
        </TemplateList>
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 8, maxWidth: 500 }}>
          The AI automatically selects the best template based on {clientName}&apos;s
          NASM assessment and training goals.
        </p>
      </>
    )}
  </CenterContent>
);

export default React.memo(CopilotIdleState);
