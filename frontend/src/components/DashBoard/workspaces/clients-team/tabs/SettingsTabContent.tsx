/**
 * ============================================================================
 * FILE: SettingsTabContent.tsx
 * PURPOSE: Read-only client settings display with 2-column form layout
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a 2-column settings view for a selected client
 * showing profile info, training config, privacy settings, and trainer notes.
 * All fields are currently read-only placeholders that will be wired to API data.
 *
 * HOW IT FITS IN THE APP: ClientDetailView → SettingsTabContent (renderSettings prop)
 * KEY DECISIONS: Read-only first, form submission added later. Styled inputs match
 * the Crystalline Swan dark-first aesthetic with subtle border glow on focus.
 */

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SettingsTabContent                                ║
 * ║  PURPOSE: Read-only client settings 2-column form view        ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-25                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────┬────────────────────────┐
 * │ Profile Info            │ Training Config         │
 * │ - First/Last name       │ - OPT Phase (dropdown) │
 * │ - Email                 │ - Goal (dropdown)       │
 * │ - Phone                 │ - Sessions/week         │
 * │ - Profile photo         │ - Difficulty level      │
 * ├────────────────────────┼────────────────────────┤
 * │ Privacy & Permissions   │ Notes                   │
 * │ - Chart visibility      │ - Trainer notes         │
 * │ - Profile visibility    │ - Internal notes        │
 * └────────────────────────┴────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName? }
 * State:     none (read-only placeholders)
 * API Calls: none yet (future: GET /api/clients/:id, PUT /api/clients/:id)
 * Children:  SettingsSection, FieldRow (styled)
 *
 * CLICK-OUTCOME FLOWCHART:
 * [All fields] → read-only for now, future: inline edit → PUT /api/clients/:id
 */

import React from 'react';
import styled from 'styled-components';
import {
  User, Dumbbell, ShieldCheck, FileText,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Component props
// ─────────────────────────────────────────────────────────────

interface SettingsTabContentProps {
  clientId: number | string;
  clientName?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: 2-column form layout and form field primitives
// WHY: Consistent dark-first form styling with Ice Wing focus glow
// ─────────────────────────────────────────────────────────────

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SettingsSection = styled.div`
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
`;

const SectionIcon = styled.div<{ $color?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'} 12%, transparent);
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

const SectionTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const inputStyles = `
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  border-radius: 8px;
  padding: 10px 12px;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  transition: border-color 200ms ease, box-shadow 200ms ease;
  cursor: default;

  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }
`;

const StyledInput = styled.input`
  ${inputStyles}
`;

const StyledSelect = styled.select`
  ${inputStyles}
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234070C0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
`;

const StyledTextarea = styled.textarea`
  ${inputStyles}
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 4px 0;
`;

const ToggleLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

const TogglePill = styled.div<{ $on?: boolean }>`
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: ${({ $on }) =>
    $on
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--bg-elevated, #1A1A24)'};
  border: 1px solid ${({ $on }) =>
    $on
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--border-soft, rgba(224, 236, 244, 0.12))'};
  position: relative;
  cursor: default;
  transition: background 200ms ease, border-color 200ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? '19px' : '2px')};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-primary, #E0ECF4);
    transition: left 200ms ease;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders the 2-column read-only settings form
// ─────────────────────────────────────────────────────────────

const SettingsTabContent: React.FC<SettingsTabContentProps> = React.memo(({ clientId, clientName }) => {
  return (
    <SettingsGrid>
      {/* Profile Info */}
      <SettingsSection>
        <SectionHeader>
          <SectionIcon $color="var(--accent-primary, #60C0F0)">
            <User size={16} />
          </SectionIcon>
          <SectionTitle>Profile Info</SectionTitle>
        </SectionHeader>

        <FieldGroup>
          <FieldLabel htmlFor={`first-name-${clientId}`}>First Name</FieldLabel>
          <StyledInput
            id={`first-name-${clientId}`}
            type="text"
            placeholder="First name"
            defaultValue={clientName?.split(' ')[0] || ''}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`last-name-${clientId}`}>Last Name</FieldLabel>
          <StyledInput
            id={`last-name-${clientId}`}
            type="text"
            placeholder="Last name"
            defaultValue={clientName?.split(' ').slice(1).join(' ') || ''}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`email-${clientId}`}>Email</FieldLabel>
          <StyledInput
            id={`email-${clientId}`}
            type="email"
            placeholder="client@email.com"
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`phone-${clientId}`}>Phone</FieldLabel>
          <StyledInput
            id={`phone-${clientId}`}
            type="tel"
            placeholder="(555) 000-0000"
            readOnly
          />
        </FieldGroup>
      </SettingsSection>

      {/* Training Config */}
      <SettingsSection>
        <SectionHeader>
          <SectionIcon $color="var(--accent-secondary, #8B5CF6)">
            <Dumbbell size={16} />
          </SectionIcon>
          <SectionTitle>Training Config</SectionTitle>
        </SectionHeader>

        <FieldGroup>
          <FieldLabel htmlFor={`opt-phase-${clientId}`}>OPT Phase</FieldLabel>
          <StyledSelect id={`opt-phase-${clientId}`} disabled>
            <option value="">Select phase...</option>
            <option value="1">Phase 1 - Stabilization Endurance</option>
            <option value="2">Phase 2 - Strength Endurance</option>
            <option value="3">Phase 3 - Hypertrophy</option>
            <option value="4">Phase 4 - Maximal Strength</option>
            <option value="5">Phase 5 - Power</option>
          </StyledSelect>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`goal-${clientId}`}>Primary Goal</FieldLabel>
          <StyledSelect id={`goal-${clientId}`} disabled>
            <option value="">Select goal...</option>
            <option value="fat-loss">Fat Loss</option>
            <option value="muscle-gain">Muscle Gain</option>
            <option value="strength">Strength</option>
            <option value="endurance">Endurance</option>
            <option value="flexibility">Flexibility</option>
            <option value="sport-performance">Sport Performance</option>
            <option value="general-fitness">General Fitness</option>
            <option value="golf-performance">Golf Performance</option>
          </StyledSelect>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`sessions-week-${clientId}`}>Sessions / Week</FieldLabel>
          <StyledInput
            id={`sessions-week-${clientId}`}
            type="number"
            placeholder="3"
            min={1}
            max={7}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`difficulty-${clientId}`}>Difficulty Level</FieldLabel>
          <StyledSelect id={`difficulty-${clientId}`} disabled>
            <option value="">Select level...</option>
            <option value="beginner">Beginner (50-300)</option>
            <option value="intermediate">Intermediate (300-600)</option>
            <option value="advanced">Advanced (600-900)</option>
          </StyledSelect>
        </FieldGroup>
      </SettingsSection>

      {/* Privacy & Permissions */}
      <SettingsSection>
        <SectionHeader>
          <SectionIcon $color="var(--accent-gold, #C6A84B)">
            <ShieldCheck size={16} />
          </SectionIcon>
          <SectionTitle>Privacy & Permissions</SectionTitle>
        </SectionHeader>

        <ToggleRow>
          <ToggleLabel>Chart Visibility (Public)</ToggleLabel>
          <TogglePill $on={false} aria-label="Chart visibility toggle" />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Profile Visibility (Public)</ToggleLabel>
          <TogglePill $on={true} aria-label="Profile visibility toggle" />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Allow Direct Messages</ToggleLabel>
          <TogglePill $on={true} aria-label="Direct messages toggle" />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Allow Challenge Invites</ToggleLabel>
          <TogglePill $on={true} aria-label="Challenge invites toggle" />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Share Achievements</ToggleLabel>
          <TogglePill $on={true} aria-label="Share achievements toggle" />
        </ToggleRow>
      </SettingsSection>

      {/* Notes */}
      <SettingsSection>
        <SectionHeader>
          <SectionIcon $color="var(--accent-primary, #60C0F0)">
            <FileText size={16} />
          </SectionIcon>
          <SectionTitle>Notes</SectionTitle>
        </SectionHeader>

        <FieldGroup>
          <FieldLabel htmlFor={`trainer-notes-${clientId}`}>Trainer Notes</FieldLabel>
          <StyledTextarea
            id={`trainer-notes-${clientId}`}
            placeholder="Training observations, form cues, modifications..."
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`internal-notes-${clientId}`}>Internal Notes</FieldLabel>
          <StyledTextarea
            id={`internal-notes-${clientId}`}
            placeholder="Scheduling preferences, injuries, special considerations..."
            readOnly
          />
        </FieldGroup>
      </SettingsSection>
    </SettingsGrid>
  );
});

SettingsTabContent.displayName = 'SettingsTabContent';

export default SettingsTabContent;
