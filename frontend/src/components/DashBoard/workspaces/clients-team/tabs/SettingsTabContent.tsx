/**
 * ============================================================================
 * FILE: SettingsTabContent.tsx
 * PURPOSE: Read-only client settings display with 2-column form layout
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a 2-column settings view for a selected client
 * showing real profile info, training config, privacy settings, and notes.
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
 * State:     real client details (read-only display)
 * API Calls: GET /api/admin/clients/:id
 * Children:  SettingsSection, FieldRow (styled)
 *
 * CLICK-OUTCOME FLOWCHART:
 * [All fields] → read-only mirror of GET /api/admin/clients/:id
 */

import React from 'react';
import {
  User, Dumbbell, ShieldCheck, FileText,
} from 'lucide-react';
import {
  FieldGroup,
  FieldLabel,
  PolicyNote,
  SectionHeader,
  SectionIcon,
  SectionTitle,
  SettingsGrid,
  SettingsSection,
  StyledInput,
  StyledSelect,
  StyledTextarea,
  ToggleLabel,
  TogglePill,
  ToggleRow,
} from './SettingsTabContent.styles';
import { useClientSettingsDetails } from './useClientSettingsDetails';
import { getClientSourcePolicy, type SettingsTabContentProps } from './SettingsTabContent.logic';

const getReadOnlySwitchProps = (label: string, isOn: boolean) => ({
  role: 'switch' as const, 'aria-checked': isOn, 'aria-disabled': true,
  'aria-label': `${label}: ${isOn ? 'on' : 'off'}`,
});

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Component props
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: 2-column form layout and form field primitives
// WHY: Consistent dark-first form styling with Ice Wing focus glow
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders the 2-column read-only settings form
// ─────────────────────────────────────────────────────────────

const SettingsTabContent: React.FC<SettingsTabContentProps> = React.memo(({ clientId, clientName }) => {
  const { details: settings } = useClientSettingsDetails(clientId, clientName);
  const clientSourcePolicy = getClientSourcePolicy(settings.clientSource);

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
            value={settings.firstName}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`last-name-${clientId}`}>Last Name</FieldLabel>
          <StyledInput
            id={`last-name-${clientId}`}
            type="text"
            placeholder="Last name"
            value={settings.lastName}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`email-${clientId}`}>Email</FieldLabel>
          <StyledInput
            id={`email-${clientId}`}
            type="email"
            placeholder="client@email.com"
            value={settings.email}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`phone-${clientId}`}>Phone</FieldLabel>
          <StyledInput
            id={`phone-${clientId}`}
            type="tel"
            placeholder="(555) 000-0000"
            value={settings.phone}
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
          <StyledSelect id={`goal-${clientId}`} value={settings.fitnessGoal} disabled>
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
          <FieldLabel htmlFor={`available-sessions-${clientId}`}>Available Sessions</FieldLabel>
          <StyledInput
            id={`available-sessions-${clientId}`}
            type="number"
            value={settings.availableSessions}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`client-source-${clientId}`}>Client Source</FieldLabel>
          <StyledInput
            id={`client-source-${clientId}`}
            type="text"
            value={clientSourcePolicy.label}
            readOnly
          />
          <PolicyNote>{clientSourcePolicy.note}</PolicyNote>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`training-experience-${clientId}`}>Training Experience</FieldLabel>
          <StyledTextarea
            id={`training-experience-${clientId}`}
            value={settings.trainingExperience}
            readOnly
          />
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
          <ToggleLabel>Account Active</ToggleLabel>
          <TogglePill $on={settings.isActive} {...getReadOnlySwitchProps('Account active', settings.isActive)} />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Profile Visibility (Public)</ToggleLabel>
          <TogglePill
            $on={settings.profileIsPublic}
            {...getReadOnlySwitchProps('Profile visibility', settings.profileIsPublic)}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Show Achievements</ToggleLabel>
          <TogglePill
            $on={settings.showAchievements}
            {...getReadOnlySwitchProps('Achievement visibility', settings.showAchievements)}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Show Workout History</ToggleLabel>
          <TogglePill
            $on={settings.showWorkoutHistory}
            {...getReadOnlySwitchProps('Workout history visibility', settings.showWorkoutHistory)}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>Email Notifications</ToggleLabel>
          <TogglePill
            $on={settings.emailNotifications}
            {...getReadOnlySwitchProps('Email notifications', settings.emailNotifications)}
          />
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
          <FieldLabel htmlFor={`health-concerns-${clientId}`}>Health Concerns</FieldLabel>
          <StyledTextarea
            id={`health-concerns-${clientId}`}
            value={settings.healthConcerns}
            readOnly
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor={`emergency-contact-${clientId}`}>Emergency Contact</FieldLabel>
          <StyledTextarea
            id={`emergency-contact-${clientId}`}
            value={settings.emergencyContact}
            readOnly
          />
        </FieldGroup>
      </SettingsSection>
    </SettingsGrid>
  );
});

SettingsTabContent.displayName = 'SettingsTabContent';

export default SettingsTabContent;
