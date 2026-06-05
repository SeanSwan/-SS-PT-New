/**
 * LongHorizonConfigureForm
 *
 * Purpose: Renders the setup form for Swan Coach long-horizon planning while
 * LongHorizonContent owns the resulting state and API transitions.
 */

import React from 'react';
import { Info, Sparkles } from 'lucide-react';
import type { ClientGoals } from './longHorizonGoals';
import {
  Divider,
  FormGroup,
  FormGrid,
  InfoContent,
  Label,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  Spinner,
  TextArea,
} from './copilot-shared-styles';
import {
  ActionRow,
  FlushInfoPanel,
  GoalLoadingRow,
  GoalLoadingSpinner,
  GoalSummaryPanel,
  HorizonRadioButton,
  HorizonRadioGroup,
  IconSlot,
  OverrideSection,
  OverrideTextArea,
  ProfileBadge,
  ReadOnlyField,
} from './LongHorizonContent.styles';
import EquipmentProfilePicker from '../../../../Shared/EquipmentProfilePicker';
import AITerminalPanel from '../../../../Shared/AITerminalPanel';

interface LongHorizonConfigureFormProps {
  clientId: number;
  horizonMonths: 3 | 6 | 12;
  setHorizonMonths: (months: 3 | 6 | 12) => void;
  clientGoals: ClientGoals | null;
  goalsLoading: boolean;
  goalsError: string;
  equipmentProfileId: number | null;
  setEquipmentProfileId: (profileId: number | null) => void;
  trainerNotes: string;
  setTrainerNotes: (value: string) => void;
  isAdmin: boolean;
  overrideReasonRequired: boolean;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

const LongHorizonConfigureForm: React.FC<LongHorizonConfigureFormProps> = ({
  clientId,
  horizonMonths,
  setHorizonMonths,
  clientGoals,
  goalsLoading,
  goalsError,
  equipmentProfileId,
  setEquipmentProfileId,
  trainerNotes,
  setTrainerNotes,
  isAdmin,
  overrideReasonRequired,
  overrideReason,
  setOverrideReason,
  isSubmitting,
  onClose,
  onGenerate,
}) => (
  <>
    <SectionTitle>Long-Horizon Planning</SectionTitle>
    <FormGrid>
      <FormGroup $fullWidth>
        <Label>Horizon</Label>
        <HorizonRadioGroup>
          {[3, 6, 12].map((option) => (
            <HorizonRadioButton
              key={option}
              $active={horizonMonths === option}
              onClick={() => setHorizonMonths(option as 3 | 6 | 12)}
            >
              {option} months
            </HorizonRadioButton>
          ))}
        </HorizonRadioGroup>
      </FormGroup>

      <FormGroup $fullWidth>
        <Label>
          Client Goals <ProfileBadge><Info size={12} />From profile</ProfileBadge>
        </Label>
        <GoalSummaryPanel>
          {goalsLoading && (
            <GoalLoadingRow>
              <GoalLoadingSpinner />
              <span>Loading goals...</span>
            </GoalLoadingRow>
          )}
          {!goalsLoading && goalsError && (
            <FlushInfoPanel $variant="info">
              <IconSlot><Info size={16} /></IconSlot>
              <InfoContent>{goalsError}</InfoContent>
            </FlushInfoPanel>
          )}
          {!goalsLoading && !goalsError && (
            <>
              <div>
                <Label>Primary Goal</Label>
                <ReadOnlyField>{clientGoals?.primaryGoal || 'general_fitness'}</ReadOnlyField>
              </div>
              <div>
                <Label>Secondary Goals</Label>
                <ReadOnlyField>
                  {clientGoals?.secondaryGoals.length
                    ? clientGoals.secondaryGoals.join(', ')
                    : 'None provided'}
                </ReadOnlyField>
              </div>
              <div>
                <Label>Constraints</Label>
                <ReadOnlyField>
                  {clientGoals?.constraints.length
                    ? clientGoals.constraints.join(', ')
                    : 'None provided'}
                </ReadOnlyField>
              </div>
            </>
          )}
        </GoalSummaryPanel>
      </FormGroup>

      <FormGroup $fullWidth>
        <EquipmentProfilePicker
          selectedProfileId={equipmentProfileId}
          onSelect={setEquipmentProfileId}
          compact
          label="Equipment Profile"
        />
      </FormGroup>

      <FormGroup $fullWidth>
        <Label>Additional Notes</Label>
        <TextArea
          value={trainerNotes}
          onChange={(e) => setTrainerNotes(e.target.value)}
          placeholder="Optional context for your review process"
          rows={3}
        />
      </FormGroup>

      <FormGroup $fullWidth>
        <AITerminalPanel
          context="workout_generation"
          clientId={clientId}
          equipmentProfileId={equipmentProfileId}
          placeholder="Ask Swan Coach about long-horizon planning..."
          defaultOpen={false}
        />
      </FormGroup>

      {(isAdmin || overrideReasonRequired) && (
        <FormGroup $fullWidth>
          <OverrideSection>
            <Label>Admin Override Reason {overrideReasonRequired ? '(required)' : '(optional)'}</Label>
            <OverrideTextArea
              $required={overrideReasonRequired}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Provide justification when consent override is required"
              rows={3}
            />
          </OverrideSection>
        </FormGroup>
      )}
    </FormGrid>

    <Divider />

    <ActionRow $justify="flex-end">
      <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      <PrimaryButton onClick={onGenerate} disabled={isSubmitting}>
        {isSubmitting ? <Spinner size={16} /> : <Sparkles size={16} />}
        {isSubmitting ? 'Generating...' : 'Generate Draft'}
      </PrimaryButton>
    </ActionRow>
  </>
);

export default React.memo(LongHorizonConfigureForm);
