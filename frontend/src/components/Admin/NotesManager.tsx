/**
 * NotesManager
 * ============
 * Galaxy-Swan themed admin UI for managing trainer notes for a client.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
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
  StyledTextarea,
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
import { useClientNotes } from '../../hooks/useClientNotes';

const noteTypeOptions = [
  { value: 'general', label: 'General' },
  { value: 'observation', label: 'Observation' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'concern', label: 'Concern' },
  { value: 'red_flag', label: 'Red Flag' }
];

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

  const filteredNotes = notes.filter((note) => {
    if (filterType === 'all') return true;
    return note.type === filterType;
  });

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
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to add notes.');
        return;
      }

      const payload = {
        content: content.trim(),
        noteType,
        visibility: isPrivate ? 'private' : 'trainer_only'
      };

      const response = await fetch(`/api/notes/${numericClientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
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
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to update notes.');
        return;
      }

      const payload = {
        content: editContent.trim(),
        noteType: editType,
        visibility: editPrivate ? 'private' : 'trainer_only'
      };

      const response = await fetch(`/api/notes/${numericClientId}/${editingNoteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
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

  const handleDelete = async (noteId: number) => {
    if (!numericClientId) return;
    if (!window.confirm('Delete this note?')) return;

    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to delete notes.');
        return;
      }

      const response = await fetch(`/api/notes/${numericClientId}/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
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

  return (
    <PageWrapper>
      <HeaderRow>
        <div>
          <PageTitle>Client Notes Manager</PageTitle>
          <BodyText secondary>
            Capture observations, achievements, and red flags to keep client records accurate.
          </BodyText>
        </div>
      </HeaderRow>

      <Card>
        <CardHeader>
          <SectionTitle>Client Selection</SectionTitle>
        </CardHeader>
        <CardBody>
          <FormField>
            <Label htmlFor="notes-client-id" required>Client ID</Label>
            <StyledInput
              id="notes-client-id"
              type="number"
              value={clientIdInput}
              onChange={(event) => setClientIdInput(event.target.value)}
              placeholder="Enter client user ID"
              hasError={!numericClientId && clientIdInput.length > 0}
            />
            <HelperText>Use the numeric user ID from the client profile.</HelperText>
          </FormField>
          {loadError && <ErrorText>{loadError}</ErrorText>}
          {isLoading && <SmallText secondary>Loading notes...</SmallText>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Create Note</SectionTitle>
        </CardHeader>
        <CardBody>
          <GridContainer columns={2} gap="1.5rem">
            <FormField>
              <Label htmlFor="note-type">Note Type</Label>
              <CustomSelect
                value={noteType}
                onChange={(value) => setNoteType(String(value))}
                options={noteTypeOptions}
              />
            </FormField>
            <FormField>
              <Label htmlFor="note-visibility">Visibility</Label>
              <StyledInput
                id="note-visibility"
                type="text"
                value={isPrivate ? 'Private (admin/trainers only)' : 'Trainer Notes'}
                readOnly
              />
              <CheckboxRow>
                <input
                  id="note-private-toggle"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                />
                <span>Mark as private</span>
              </CheckboxRow>
            </FormField>
          </GridContainer>
          <FormField>
            <Label htmlFor="note-content">Content</Label>
            <StyledTextarea
              id="note-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Document key observations, achievements, or concerns."
              rows={4}
            />
          </FormField>
          <PrimaryButton type="button" onClick={handleCreate} disabled={isSubmitting}>
            <Plus size={16} /> {isSubmitting ? 'Saving...' : 'Add Note'}
          </PrimaryButton>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Notes</SectionTitle>
          <FilterRow>
            <SmallText secondary>Filter</SmallText>
            <CustomSelect
              value={filterType}
              onChange={(value) => setFilterType(String(value))}
              options={[
                { value: 'all', label: 'All Notes' },
                ...noteTypeOptions
              ]}
            />
          </FilterRow>
        </CardHeader>
        <CardBody>
          {filteredNotes.length === 0 && !isLoading && (
            <SmallText secondary>No notes available for this client.</SmallText>
          )}

          {filteredNotes.map((note) => (
            <NoteCard key={note.id}>
              {editingNoteId === note.id ? (
                <>
                  <GridContainer columns={2} gap="1rem">
                    <FormField>
                      <Label htmlFor={`edit-type-${note.id}`}>Type</Label>
                      <CustomSelect
                        value={editType}
                        onChange={(value) => setEditType(String(value))}
                        options={noteTypeOptions}
                      />
                    </FormField>
                    <FormField>
                      <Label htmlFor={`edit-private-${note.id}`}>Private</Label>
                      <CheckboxRow>
                        <input
                          id={`edit-private-${note.id}`}
                          type="checkbox"
                          checked={editPrivate}
                          onChange={(event) => setEditPrivate(event.target.checked)}
                        />
                        <span>Private note</span>
                      </CheckboxRow>
                    </FormField>
                  </GridContainer>
                  <FormField>
                    <Label htmlFor={`edit-content-${note.id}`}>Content</Label>
                    <StyledTextarea
                      id={`edit-content-${note.id}`}
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      rows={3}
                    />
                  </FormField>
                  <FlexBox gap="0.5rem" justify="flex-end">
                    <OutlinedButton type="button" onClick={resetEditState}>Cancel</OutlinedButton>
                    <PrimaryButton type="button" onClick={handleUpdate} disabled={isSubmitting}>
                      <Save size={16} /> Save Changes
                    </PrimaryButton>
                  </FlexBox>
                </>
              ) : (
                <>
                  <NoteHeader>
                    <div>
                      <NoteBadge>{note.type}</NoteBadge>
                      {note.isPrivate && <NoteBadge $variant="private">Private</NoteBadge>}
                    </div>
                    <SmallText secondary>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </SmallText>
                  </NoteHeader>
                  <BodyText>{note.content}</BodyText>
                  <FlexBox gap="0.5rem" justify="flex-end" style={{ marginTop: '0.75rem' }}>
                    <OutlinedButton type="button" onClick={() => handleEdit(note.id, note.content, note.type, note.isPrivate)}>
                      Edit
                    </OutlinedButton>
                    <OutlinedButton type="button" onClick={() => handleDelete(note.id)}>
                      <Trash2 size={14} /> Delete
                    </OutlinedButton>
                  </FlexBox>
                </>
              )}
            </NoteCard>
          ))}
        </CardBody>
      </Card>

      {formError && <ErrorText>{formError}</ErrorText>}
      {successMessage && <SuccessText>{successMessage}</SuccessText>}
    </PageWrapper>
  );
};

export default NotesManager;

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FilterRow = styled(FlexBox)`
  align-items: center;
  gap: 0.75rem;
`;

const NoteCard = styled(Card)`
  padding: 1rem;
  margin-bottom: 1rem;
`;

const NoteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const NoteBadge = styled.span<{ $variant?: 'private' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  margin-right: 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $variant }) => ($variant === 'private' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)')};
  color: ${({ $variant }) => ($variant === 'private' ? '#ef4444' : '#3b82f6')};
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e2e8f0;
  font-size: 0.875rem;

  input {
    accent-color: #3b82f6;
  }
`;

const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: #10b981;
`;
