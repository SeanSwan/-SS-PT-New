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
 * │ │  Swan Coach Workout Planning          │                  │
 * │ │  [description text]                    │                  │
 * │ │  [Override Reason (admin only)]        │                  │
 * │ │  [Swan Coach Planning Draft] button      │                  │
 * │ │  Available NASM Templates:             │                  │
 * │ │  ┌─ template 1 ─┐                     │                  │
 * │ │  ┌─ template 2 ─┐                     │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ Props: { clientName, isAdmin, overrideReasonRequired, ... } │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Swan Coach Planning Draft] → handleGenerate → pain check    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Sparkles, Info, AlertTriangle } from 'lucide-react';
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
    <h3 style={{ color: '#e2e8f0', margin: 0 }}>Swan Coach Workout Planning</h3>
    <p style={{ color: '#94a3b8', margin: 0, maxWidth: 400 }}>
      Swan Coach will analyze {clientName}&apos;s profile, training history, and NASM assessment
      to draft a personalized workout plan for your review.
    </p>

    {/* Launch P1-7: the backend rejected the first generate for a missing
        override reason. Without this notice the button appears to "do nothing"
        on the first click — the two-click consent-override trap. */}
    {overrideReasonRequired && (
      <div
        role="alert"
        style={{
          width: '100%', maxWidth: 500,
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          border: '1px solid color-mix(in srgb, var(--warning, #C6A84B) 40%, transparent)',
          background: 'color-mix(in srgb, var(--warning, #C6A84B) 10%, transparent)',
          color: 'var(--warning, #C6A84B)', fontSize: '0.85rem', textAlign: 'left',
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          A reason is required to override this client&apos;s consent before Swan Coach
          can generate a draft. Enter your justification below, then click
          &ldquo;Swan Coach Planning Draft&rdquo; again.
        </span>
      </div>
    )}

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
      Swan Coach Planning Draft
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
          Swan Coach automatically selects the best template based on {clientName}&apos;s
          NASM assessment and training goals.
        </p>
      </>
    )}
  </CenterContent>
);

export default React.memo(CopilotIdleState);
