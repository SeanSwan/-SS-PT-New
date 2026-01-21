/**
 * AutomationManager
 * =================
 * Galaxy-Swan themed admin UI for managing automation sequences.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  CustomSelect
} from '../UniversalMasterSchedule/ui';
import { useAutomationSequences, AutomationStep } from '../../hooks/useAutomationSequences';

type TemplateOption = { value: string; label: string };

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
  color: ${props => props.active ? '#10b981' : '#f59e0b'};
  background: ${props => props.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'};
  border: 1px solid ${props => props.active ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'};
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

const triggerEventOptions = [
  { value: 'client_created', label: 'Client Created' },
  { value: 'session_completed', label: 'Session Completed' },
  { value: 'package_purchased', label: 'Package Purchased' }
];

const channelOptions = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' }
];

const AutomationManager: React.FC = () => {
  const { data: sequences, isLoading, error, refetch } = useAutomationSequences();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState(triggerEventOptions[0].value);
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [testUserId, setTestUserId] = useState('');
  const [testEvent, setTestEvent] = useState(triggerEventOptions[0].value);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/sms/templates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result?.success) {
          const templateOptions = (result.data || []).map((item: { name: string }) => ({
            value: item.name,
            label: item.name
          }));
          setTemplates(templateOptions);
          if (templateOptions.length && steps.length === 0) {
            setSteps([{ dayOffset: 0, templateName: templateOptions[0].value, channel: 'sms' }]);
          }
        }
      } catch (err) {
        console.error('Failed to load SMS templates:', err);
      }
    };

    loadTemplates();
  }, [steps.length]);

  const selectedSequence = useMemo(
    () => sequences.find((sequence) => sequence.id === selectedSequenceId) || null,
    [sequences, selectedSequenceId]
  );

  useEffect(() => {
    if (!selectedSequence) return;
    setName(selectedSequence.name);
    setTriggerEvent(selectedSequence.triggerEvent);
    setIsActive(selectedSequence.isActive);
    setSteps(selectedSequence.steps || []);
  }, [selectedSequence]);

  const resetForm = () => {
    setSelectedSequenceId(null);
    setName('');
    setTriggerEvent(triggerEventOptions[0].value);
    setIsActive(true);
    setSteps(templates.length
      ? [{ dayOffset: 0, templateName: templates[0].value, channel: 'sms' }]
      : []);
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleAddStep = () => {
    const defaultTemplate = templates[0]?.value || '';
    setSteps((prev) => [...prev, { dayOffset: 0, templateName: defaultTemplate, channel: 'sms' }]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStepChange = (index: number, field: keyof AutomationStep, value: string | number) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setFormError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setFormError('Sequence name is required.');
      return;
    }

    if (!triggerEvent) {
      setFormError('Trigger event is required.');
      return;
    }

    if (!steps.length) {
      setFormError('At least one step is required.');
      return;
    }

    if (steps.some((step) => !step.templateName)) {
      setFormError('Each step must select a template.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to manage automation.');
        return;
      }

      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        triggerEvent,
        isActive,
        steps: steps.map((step) => ({
          dayOffset: Number(step.dayOffset) || 0,
          templateName: step.templateName,
          channel: step.channel
        }))
      };

      const url = selectedSequenceId
        ? `/api/automation/sequences/${selectedSequenceId}`
        : '/api/automation/sequences';
      const method = selectedSequenceId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to save sequence.');
        return;
      }

      setSuccessMessage('Automation sequence saved.');
      await refetch();
      if (!selectedSequenceId) {
        resetForm();
      }
    } catch (err) {
      console.error('Error saving automation sequence:', err);
      setFormError('Network error saving sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSequenceId) return;
    if (!window.confirm('Delete this automation sequence?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to delete sequences.');
        return;
      }

      setIsSubmitting(true);
      setFormError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/automation/sequences/${selectedSequenceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to delete sequence.');
        return;
      }

      setSuccessMessage('Sequence deleted.');
      await refetch();
      resetForm();
    } catch (err) {
      console.error('Error deleting sequence:', err);
      setFormError('Network error deleting sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrigger = async () => {
    setFormError(null);
    setSuccessMessage(null);

    const numericUserId = Number(testUserId);
    if (!Number.isFinite(numericUserId)) {
      setFormError('Valid user ID is required to trigger.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to trigger sequences.');
        return;
      }

      setIsSubmitting(true);

      const response = await fetch('/api/automation/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventName: testEvent,
          userId: numericUserId,
          data: testMessage ? { message: testMessage } : {}
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to trigger sequence.');
        return;
      }

      setSuccessMessage(`Triggered ${result?.created || 0} automation steps.`);
      setTestMessage('');
    } catch (err) {
      console.error('Error triggering automation sequence:', err);
      setFormError('Network error triggering sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
              <StyledInput
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New client nurture"
              />
            </FormField>

            <FormField>
              <Label required>Trigger Event</Label>
              <CustomSelect
                value={triggerEvent}
                onChange={setTriggerEvent}
                options={triggerEventOptions}
                placeholder="Select trigger"
              />
            </FormField>

            <FormField>
              <Label>Active</Label>
              <FlexBox align="center" gap="0.5rem">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
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
                          onChange={(value) => handleStepChange(index, 'channel', value)}
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
                    <Card
                      key={sequence.id}
                      interactive
                      onClick={() => setSelectedSequenceId(sequence.id)}
                    >
                      <CardBody>
                        <FlexBox justify="space-between" align="center" gap="0.5rem">
                          <FlexBox direction="column" gap="0.25rem">
                            <SmallText>{sequence.name}</SmallText>
                            <SmallText secondary>{sequence.triggerEvent}</SmallText>
                            <SmallText secondary>{sequence.steps?.length || 0} steps</SmallText>
                          </FlexBox>
                          <StatusPill active={sequence.isActive}>
                            {sequence.isActive ? 'Active' : 'Paused'}
                          </StatusPill>
                        </FlexBox>
                      </CardBody>
                    </Card>
                  ))}
                  {!sequences.length && (
                    <SmallText secondary>No automation sequences created yet.</SmallText>
                  )}
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
                <StyledInput
                  value={testUserId}
                  onChange={(event) => setTestUserId(event.target.value)}
                  placeholder="Client user ID"
                />
              </FormField>
              <FormField>
                <Label required>Trigger Event</Label>
                <CustomSelect
                  value={testEvent}
                  onChange={setTestEvent}
                  options={triggerEventOptions}
                />
              </FormField>
              <FormField>
                <Label>Message Override</Label>
                <StyledInput
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  placeholder="Optional message override"
                />
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
};

export default AutomationManager;
