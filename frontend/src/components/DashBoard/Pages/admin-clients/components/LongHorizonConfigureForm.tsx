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

const HORIZON_OPTIONS = [3, 6, 12] as const;
type HorizonMonths = typeof HORIZON_OPTIONS[number];

interface LongHorizonConfigureFormProps {
  clientId: number;
  horizonMonths: HorizonMonths;
  setHorizonMonths: (months: HorizonMonths) => void;
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

interface HorizonPickerProps {
  horizonMonths: HorizonMonths;
  setHorizonMonths: (months: HorizonMonths) => void;
}

const HorizonPicker: React.FC<HorizonPickerProps> = ({ horizonMonths, setHorizonMonths }) => (
  <FormGroup $fullWidth>
    <Label>Horizon</Label>
    <HorizonRadioGroup>
      {HORIZON_OPTIONS.map((option) => (
        <HorizonRadioButton
          key={option}
          $active={horizonMonths === option}
          onClick={() => setHorizonMonths(option)}
        >
          {option} months
        </HorizonRadioButton>
      ))}
    </HorizonRadioGroup>
  </FormGroup>
);

interface GoalsSummaryProps {
  clientGoals: ClientGoals | null;
  goalsLoading: boolean;
  goalsError: string;
}

const goalText = (value: string | undefined, fallback: string) => value || fallback;
const goalListText = (values: string[] | undefined) => (
  values?.length ? values.join(', ') : 'None provided'
);

interface GoalSummaryView {
  primaryGoal: string;
  secondaryGoals: string;
  constraints: string;
}

const buildGoalSummaryView = (clientGoals: ClientGoals | null): GoalSummaryView => ({
  primaryGoal: goalText(clientGoals?.primaryGoal, 'general_fitness'),
  secondaryGoals: goalListText(clientGoals?.secondaryGoals),
  constraints: goalListText(clientGoals?.constraints),
});

const GoalsLoadingContent: React.FC = () => (
  <GoalLoadingRow>
    <GoalLoadingSpinner />
    <span>Loading goals...</span>
  </GoalLoadingRow>
);

const GoalsErrorContent: React.FC<{ goalsError: string }> = ({ goalsError }) => (
  <FlushInfoPanel $variant="info">
    <IconSlot><Info size={16} /></IconSlot>
    <InfoContent>{goalsError}</InfoContent>
  </FlushInfoPanel>
);

const GoalsReadyContent: React.FC<{ summary: GoalSummaryView }> = ({ summary }) => (
  <>
    <div>
      <Label>Primary Goal</Label>
      <ReadOnlyField>{summary.primaryGoal}</ReadOnlyField>
    </div>
    <div>
      <Label>Secondary Goals</Label>
      <ReadOnlyField>{summary.secondaryGoals}</ReadOnlyField>
    </div>
    <div>
      <Label>Constraints</Label>
      <ReadOnlyField>{summary.constraints}</ReadOnlyField>
    </div>
  </>
);

const GoalsSummaryContent: React.FC<GoalsSummaryProps> = ({ clientGoals, goalsLoading, goalsError }) => {
  if (goalsLoading) {
    return <GoalsLoadingContent />;
  }

  if (goalsError) {
    return <GoalsErrorContent goalsError={goalsError} />;
  }

  return <GoalsReadyContent summary={buildGoalSummaryView(clientGoals)} />;
};

const GoalsSummary: React.FC<GoalsSummaryProps> = (props) => (
  <GoalSummaryPanel>
    <GoalsSummaryContent {...props} />
  </GoalSummaryPanel>
);

interface OverrideReasonFieldProps {
  overrideReasonRequired: boolean;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
}

const OverrideReasonField: React.FC<OverrideReasonFieldProps> = ({
  overrideReasonRequired,
  overrideReason,
  setOverrideReason,
}) => (
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
);

interface LongHorizonActionsProps {
  isSubmitting: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

const LongHorizonActions: React.FC<LongHorizonActionsProps> = ({ isSubmitting, onClose, onGenerate }) => (
  <ActionRow $justify="flex-end">
    <SecondaryButton onClick={onClose}>Close</SecondaryButton>
    <PrimaryButton onClick={onGenerate} disabled={isSubmitting}>
      {isSubmitting ? <Spinner size={16} /> : <Sparkles size={16} />}
      {isSubmitting ? 'Planning...' : 'Swan Coach Planning Draft'}
    </PrimaryButton>
  </ActionRow>
);

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
      <HorizonPicker horizonMonths={horizonMonths} setHorizonMonths={setHorizonMonths} />

      <FormGroup $fullWidth>
        <Label>
          Client Goals <ProfileBadge><Info size={12} />From profile</ProfileBadge>
        </Label>
        <GoalsSummary clientGoals={clientGoals} goalsLoading={goalsLoading} goalsError={goalsError} />
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
        <OverrideReasonField
          overrideReasonRequired={overrideReasonRequired}
          overrideReason={overrideReason}
          setOverrideReason={setOverrideReason}
        />
      )}
    </FormGrid>

    <Divider />

    <LongHorizonActions isSubmitting={isSubmitting} onClose={onClose} onGenerate={onGenerate} />
  </>
);

export default React.memo(LongHorizonConfigureForm);
