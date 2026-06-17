/**
 * AutomationManager
 * =================
 * Crystalline Swan themed admin UI for managing automation sequences.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useAutomationSequences, AutomationStep } from '../../hooks/useAutomationSequences';
import apiService from '../../services/api.service';
import AutomationConfirmDialog, { type AutomationConfirmRequest } from './AutomationConfirmDialog';
import AutomationManagerView from './AutomationManagerView';
import NurturePreviewPanel from './NurturePreviewPanel';
import NurtureTestSendPanel from './NurtureTestSendPanel';
import { triggerEventOptions, type TemplateOption } from './AutomationManager.options';

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
  const [confirmRequest, setConfirmRequest] = useState<AutomationConfirmRequest | null>(null);

  const [testUserId, setTestUserId] = useState('');
  const [testEvent, setTestEvent] = useState(triggerEventOptions[0].value);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await apiService.get('/api/sms/templates');
        const result = response.data;
        if (result?.success) {
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
      const response = selectedSequenceId
        ? await apiService.put(url, payload)
        : await apiService.post(url, payload);
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to save sequence.');
        return;
      }

      setSuccessMessage('Automation sequence saved.');
      await refetch();
      if (!selectedSequenceId) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Error saving automation sequence:', err);
      setFormError(err?.response?.data?.message || 'Network error saving sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSequence = async (sequenceId: number) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      setSuccessMessage(null);

      const response = await apiService.delete(`/api/automation/sequences/${sequenceId}`);
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to delete sequence.');
        return;
      }

      setSuccessMessage('Sequence deleted.');
      await refetch();
      resetForm();
    } catch (err: any) {
      console.error('Error deleting sequence:', err);
      setFormError(err?.response?.data?.message || 'Network error deleting sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSequenceId) return;
    const sequenceId = selectedSequenceId;
    setConfirmRequest({
      title: 'Delete automation sequence?',
      message: 'This removes the selected follow-up sequence from active automation management.',
      confirmLabel: 'Delete automation sequence',
      cancelLabel: 'Keep sequence',
      tone: 'danger',
      onConfirm: () => deleteSequence(sequenceId),
    });
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
      setIsSubmitting(true);

      const response = await apiService.post('/api/automation/trigger', {
        eventName: testEvent,
        userId: numericUserId,
        data: testMessage ? { message: testMessage } : {}
      });
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to trigger sequence.');
        return;
      }

      setSuccessMessage(`Triggered ${result?.created || 0} automation steps.`);
      setTestMessage('');
    } catch (err: any) {
      console.error('Error triggering automation sequence:', err);
      setFormError(err?.response?.data?.message || 'Network error triggering sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AutomationManagerView
        sequences={sequences}
        isLoading={isLoading}
        error={error}
        templates={templates}
        selectedSequenceId={selectedSequenceId}
        name={name}
        triggerEvent={triggerEvent}
        isActive={isActive}
        steps={steps}
        formError={formError}
        successMessage={successMessage}
        isSubmitting={isSubmitting}
        testUserId={testUserId}
        testEvent={testEvent}
        testMessage={testMessage}
        setSelectedSequenceId={setSelectedSequenceId}
        setName={setName}
        setTriggerEvent={setTriggerEvent}
        setIsActive={setIsActive}
        setTestUserId={setTestUserId}
        setTestEvent={setTestEvent}
        setTestMessage={setTestMessage}
        resetForm={resetForm}
        handleSave={handleSave}
        handleAddStep={handleAddStep}
        handleRemoveStep={handleRemoveStep}
        handleStepChange={handleStepChange}
        handleDelete={handleDelete}
        handleTrigger={handleTrigger}
      />
      <NurturePreviewPanel />
      <NurtureTestSendPanel />
      <AutomationConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </>
  );
};

export default AutomationManager;
