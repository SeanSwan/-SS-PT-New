import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../hooks/use-toast';
import useSessionTypes, { SessionType } from '../hooks/useSessionTypes';
import { GlassCard } from '../ui';
import {
  buildFormFromSessionType,
  buildSessionTypePayload,
  createEmptySessionTypeForm,
  sortSessionTypes,
  validateSessionTypeForm
} from './SessionTypeManager.logic';
import {
  SessionTypeEditorModal,
  SessionTypeManagerHeader,
  SessionTypeTable
} from './SessionTypeManager.sections';
import type { FormPatch, SessionTypeFormState } from './SessionTypeManager.types';

const SessionTypeManager: React.FC = () => {
  const { toast } = useToast();
  const {
    sessionTypes,
    loading,
    error,
    fetchSessionTypes,
    createSessionType,
    updateSessionType,
    deleteSessionType
  } = useSessionTypes();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SessionType | null>(null);
  const [form, setForm] = useState<SessionTypeFormState>(createEmptySessionTypeForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchSessionTypes().catch(() => undefined);
  }, [fetchSessionTypes]);

  const sortedSessionTypes = useMemo(() => sortSessionTypes(sessionTypes), [sessionTypes]);

  const updateForm = (patch: FormPatch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm(createEmptySessionTypeForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sessionType: SessionType) => {
    setEditing(sessionType);
    setForm(buildFormFromSessionType(sessionType));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    const validationError = validateSessionTypeForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = buildSessionTypePayload(form);
    setFormError(null);

    try {
      if (editing) {
        await updateSessionType(editing.id, payload);
        toast({
          title: 'Session type updated',
          description: `${payload.name} updated successfully.`,
          variant: 'default'
        });
      } else {
        await createSessionType(payload);
        toast({
          title: 'Session type created',
          description: `${payload.name} created successfully.`,
          variant: 'default'
        });
      }
      closeModal();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to save session type.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSessionType(id);
      setPendingDeleteId(null);
      toast({
        title: 'Session type deleted',
        description: 'The session type has been removed.',
        variant: 'default'
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to delete session type.',
        variant: 'destructive'
      });
    }
  };

  return (
    <GlassCard>
      <SessionTypeManagerHeader onCreate={openCreateModal} />
      <SessionTypeTable
        sessionTypes={sortedSessionTypes}
        loading={loading}
        error={error}
        pendingDeleteId={pendingDeleteId}
        onEdit={openEditModal}
        onRequestDelete={setPendingDeleteId}
        onConfirmDelete={handleDelete}
      />
      <SessionTypeEditorModal
        isOpen={isModalOpen}
        editing={editing}
        form={form}
        formError={formError}
        onFormChange={updateForm}
        onClose={closeModal}
        onSave={handleSave}
      />
    </GlassCard>
  );
};

export default SessionTypeManager;
