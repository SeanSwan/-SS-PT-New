/**
 * NotesManager
 * ============
 * Crystalline Swan themed admin UI for managing trainer notes for a client.
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useClientNotes } from '../../hooks/useClientNotes';
import apiService from '../../services/api.service';
import AdminNoteConfirmDialog, { type AdminNoteConfirmRequest } from './AdminNoteConfirmDialog';
import NotesManagerView from './NotesManagerView';

const NotesManager: React.FC = () => {
  const { clientId: clientIdParam } = useParams();
  const [clientIdInput, setClientIdInput] = useState(clientIdParam || '');
  const numericClientId = useMemo(() => {
    const parsed = Number(clientIdInput);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [clientIdInput]);

  const { data: notes, isLoading, error: loadError, refetch } = useClientNotes(numericClientId);

  const [filterType, setFilterType] = useState('all');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [isPrivate, setIsPrivate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('general');
  const [editPrivate, setEditPrivate] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<AdminNoteConfirmRequest | null>(null);

  const filteredNotes = notes.filter((note) => filterType === 'all' || note.type === filterType);

  const resetEditState = () => {
    setEditingNoteId(null);
    setEditContent('');
    setEditType('general');
    setEditPrivate(false);
  };

  const handleCreate = async () => {
    setFormError(null);
    setSuccessMessage(null);

    if (!numericClientId) {
      setFormError('Valid client ID is required.');
      return;
    }

    if (!content.trim()) {
      setFormError('Note content is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        content: content.trim(),
        noteType,
        visibility: isPrivate ? 'private' : 'trainer_only',
      };

      const response = await apiService.post(`/api/notes/${numericClientId}`, payload);
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to create note.');
        return;
      }

      setContent('');
      setNoteType('general');
      setIsPrivate(false);
      setSuccessMessage('Note created successfully.');
      await refetch();
    } catch (error) {
      console.error('Error creating note:', error);
      setFormError('Network error creating note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (noteId: number, currentContent: string, currentType: string, currentPrivate: boolean) => {
    setEditingNoteId(noteId);
    setEditContent(currentContent);
    setEditType(currentType || 'general');
    setEditPrivate(currentPrivate);
  };

  const handleUpdate = async () => {
    if (!numericClientId || !editingNoteId) return;
    if (!editContent.trim()) {
      setFormError('Updated content cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        content: editContent.trim(),
        noteType: editType,
        visibility: editPrivate ? 'private' : 'trainer_only',
      };

      const response = await apiService.put(`/api/notes/${numericClientId}/${editingNoteId}`, payload);
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to update note.');
        return;
      }

      setSuccessMessage('Note updated successfully.');
      resetEditState();
      await refetch();
    } catch (error) {
      console.error('Error updating note:', error);
      setFormError('Network error updating note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteNote = async (clientId: number, noteId: number) => {
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await apiService.delete(`/api/notes/${clientId}/${noteId}`);
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to delete note.');
        return;
      }

      setSuccessMessage('Note deleted successfully.');
      await refetch();
    } catch (error) {
      console.error('Error deleting note:', error);
      setFormError('Network error deleting note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (noteId: number) => {
    if (!numericClientId) return;
    const clientId = numericClientId;

    setConfirmRequest({
      title: 'Delete client note?',
      message: 'This removes the selected trainer note from the client record.',
      confirmLabel: 'Delete client note',
      cancelLabel: 'Keep note',
      onConfirm: () => deleteNote(clientId, noteId),
    });
  };

  return (
    <>
      <NotesManagerView
        clientIdInput={clientIdInput}
        hasValidClientId={Boolean(numericClientId)}
        notes={filteredNotes}
        isLoading={isLoading}
        loadError={loadError}
        filterType={filterType}
        content={content}
        noteType={noteType}
        isPrivate={isPrivate}
        formError={formError}
        successMessage={successMessage}
        isSubmitting={isSubmitting}
        editingNoteId={editingNoteId}
        editContent={editContent}
        editType={editType}
        editPrivate={editPrivate}
        setClientIdInput={setClientIdInput}
        setFilterType={setFilterType}
        setContent={setContent}
        setNoteType={setNoteType}
        setIsPrivate={setIsPrivate}
        setEditContent={setEditContent}
        setEditType={setEditType}
        setEditPrivate={setEditPrivate}
        resetEditState={resetEditState}
        handleCreate={handleCreate}
        handleEdit={handleEdit}
        handleUpdate={handleUpdate}
        handleDelete={handleDelete}
      />
      <AdminNoteConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </>
  );
};

export default NotesManager;
