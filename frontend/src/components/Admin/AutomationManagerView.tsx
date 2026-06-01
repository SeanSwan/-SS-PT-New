import React from 'react';
import styled from 'styled-components';
import { Plus, Save, Trash2, Zap } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  ErrorText,
  HelperText,
  Label,
  FormField,
  StyledInput,
  PrimaryButton,
  OutlinedButton,
  SecondaryButton,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  CustomSelect,
} from '../UniversalMasterSchedule/ui';
import type { AutomationSequence, AutomationStep } from '../../hooks/useAutomationSequences';
import { channelOptions, triggerEventOptions, type TemplateOption } from './AutomationManager.options';

interface AutomationManagerViewProps {
  sequences: AutomationSequence[];
  isLoading: boolean;
  error: string | null;
  templates: TemplateOption[];
  selectedSequenceId: number | null;
  name: string;
  triggerEvent: string;
  isActive: boolean;
  steps: AutomationStep[];
  formError: string | null;
  successMessage: string | null;
  isSubmitting: boolean;
  testUserId: string;
  testEvent: string;
  testMessage: string;
  setSelectedSequenceId: (id: number) => void;
  setName: (value: string) => void;
  setTriggerEvent: (value: string) => void;
  setIsActive: (value: boolean) => void;
  setTestUserId: (value: string) => void;
  setTestEvent: (value: string) => void;
  setTestMessage: (value: string) => void;
  resetForm: () => void;
  handleSave: () => void | Promise<void>;
  handleAddStep: () => void;
  handleRemoveStep: (index: number) => void;
  handleStepChange: (index: number, field: keyof AutomationStep, value: string | number) => void;
  handleDelete: () => void | Promise<void>;
  handleTrigger: () => void | Promise<void>;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SequenceList = styled.div`
  display: grid;
  gap: 1rem;
`;

const StatusPill = styled.span<{ active: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ active }) =>
    active ? 'var(--success, #10B981)' : 'var(--accent-gold, #C6A84B)'};
  background: ${({ active }) =>
    active
      ? 'color-mix(in srgb, var(--success, #10B981) 20%, transparent)'
      : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent)'};
  border: 1px solid ${({ active }) =>
    active
      ? 'color-mix(in srgb, var(--success, #10B981) 50%, transparent)'
      : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 46%, transparent)'};
`;

const StepRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  align-items: end;
`;

const TriggerPanel = styled(Card)`
  border-style: dashed;
`;

const AutomationManagerView: React.FC<AutomationManagerViewProps> = ({
  sequences,
  isLoading,
  error,
  templates,
  selectedSequenceId,
  name,
  triggerEvent,
  isActive,
  steps,
  formError,
  successMessage,
  isSubmitting,
  testUserId,
  testEvent,
  testMessage,
  setSelectedSequenceId,
  setName,
  setTriggerEvent,
  setIsActive,
  setTestUserId,
  setTestEvent,
  setTestMessage,
  resetForm,
  handleSave,
  handleAddStep,
  handleRemoveStep,
  handleStepChange,
  handleDelete,
  handleTrigger,
}) => (
  <Container>
    <FlexBox justify="space-between" align="center" wrap>
      <PageTitle>Automation Manager</PageTitle>
      <FlexBox gap="0.5rem" wrap>
        <SecondaryButton onClick={resetForm} disabled={isSubmitting}>Reset Form</SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={isSubmitting}>
          <Save size={16} /> Save Sequence
        </PrimaryButton>
      </FlexBox>
    </FlexBox>

    <BodyText secondary>
      Build automated SMS follow-ups and session touchpoints using SwanStudios templates.
    </BodyText>

    {formError && <ErrorText>{formError}</ErrorText>}
    {successMessage && <HelperText>{successMessage}</HelperText>}

    <GridContainer columns={2} gap="1.5rem">
      <Card>
        <CardHeader>
          <SectionTitle>Sequence Builder</SectionTitle>
          <StatusPill active={isActive}>{isActive ? 'Active' : 'Paused'}</StatusPill>
        </CardHeader>
        <CardBody>
          <FormField>
            <Label required>Sequence Name</Label>
            <StyledInput value={name} onChange={(event) => setName(event.target.value)} placeholder="New client nurture" />
          </FormField>

          <FormField>
            <Label required>Trigger Event</Label>
            <CustomSelect
              value={triggerEvent}
              onChange={(value) => setTriggerEvent(String(value))}
              options={triggerEventOptions}
              placeholder="Select trigger"
            />
          </FormField>

          <FormField>
            <Label>Active</Label>
            <FlexBox align="center" gap="0.5rem">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              <SmallText secondary>Enable this automation</SmallText>
            </FlexBox>
          </FormField>

          <SectionTitle>Sequence Steps</SectionTitle>
          <SmallText secondary>Define the timing and templates for each step.</SmallText>

          <FlexBox direction="column" gap="1rem">
            {steps.map((step, index) => (
              <Card key={`step-${index}`} elevated>
                <CardBody>
                  <StepRow>
                    <FormField>
                      <Label>Day Offset</Label>
                      <StyledInput
                        type="number"
                        value={step.dayOffset}
                        onChange={(event) => handleStepChange(index, 'dayOffset', Number(event.target.value))}
                      />
                    </FormField>

                    <FormField>
                      <Label>Template</Label>
                      <CustomSelect
                        value={step.templateName || ''}
                        onChange={(value) => handleStepChange(index, 'templateName', value)}
                        options={templates}
                        placeholder="Choose template"
                      />
                    </FormField>

                    <FormField>
                      <Label>Channel</Label>
                      <CustomSelect
                        value={step.channel}
                        onChange={(value) => handleStepChange(index, 'channel', String(value))}
                        options={channelOptions}
                        placeholder="Channel"
                      />
                    </FormField>
                  </StepRow>

                  <FlexBox justify="flex-end" gap="0.5rem">
                    <OutlinedButton onClick={() => handleRemoveStep(index)}>
                      <Trash2 size={16} /> Remove
                    </OutlinedButton>
                  </FlexBox>
                </CardBody>
              </Card>
            ))}
          </FlexBox>

          <FlexBox gap="0.5rem" wrap>
            <SecondaryButton onClick={handleAddStep}>
              <Plus size={16} /> Add Step
            </SecondaryButton>
            {selectedSequenceId && (
              <OutlinedButton onClick={handleDelete}>
                <Trash2 size={16} /> Delete Sequence
              </OutlinedButton>
            )}
          </FlexBox>
        </CardBody>
      </Card>

      <FlexBox direction="column" gap="1.5rem">
        <Card>
          <CardHeader>
            <SectionTitle>Existing Sequences</SectionTitle>
          </CardHeader>
          <CardBody>
            {isLoading && <SmallText secondary>Loading sequences...</SmallText>}
            {error && <ErrorText>{error}</ErrorText>}
            {!isLoading && !error && (
              <SequenceList>
                {sequences.map((sequence) => (
                  <Card key={sequence.id} interactive onClick={() => setSelectedSequenceId(sequence.id)}>
                    <CardBody>
                      <FlexBox justify="space-between" align="center" gap="0.5rem">
                        <FlexBox direction="column" gap="0.25rem">
                          <SmallText>{sequence.name}</SmallText>
                          <SmallText secondary>{sequence.triggerEvent}</SmallText>
                          <SmallText secondary>{sequence.steps?.length || 0} steps</SmallText>
                        </FlexBox>
                        <StatusPill active={sequence.isActive}>{sequence.isActive ? 'Active' : 'Paused'}</StatusPill>
                      </FlexBox>
                    </CardBody>
                  </Card>
                ))}
                {!sequences.length && <SmallText secondary>No automation sequences created yet.</SmallText>}
              </SequenceList>
            )}
          </CardBody>
        </Card>

        <TriggerPanel>
          <CardHeader>
            <SectionTitle>Manual Trigger</SectionTitle>
          </CardHeader>
          <CardBody>
            <BodyText secondary>Trigger a sequence for testing.</BodyText>
            <FormField>
              <Label required>User ID</Label>
              <StyledInput value={testUserId} onChange={(event) => setTestUserId(event.target.value)} placeholder="Client user ID" />
            </FormField>
            <FormField>
              <Label required>Trigger Event</Label>
              <CustomSelect value={testEvent} onChange={(value) => setTestEvent(String(value))} options={triggerEventOptions} />
            </FormField>
            <FormField>
              <Label>Message Override</Label>
              <StyledInput value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Optional message override" />
              <HelperText>Optional: overrides the template message field.</HelperText>
            </FormField>
            <PrimaryButton onClick={handleTrigger} disabled={isSubmitting}>
              <Zap size={16} /> Trigger Sequence
            </PrimaryButton>
          </CardBody>
        </TriggerPanel>
      </FlexBox>
    </GridContainer>
  </Container>
);

export default AutomationManagerView;
