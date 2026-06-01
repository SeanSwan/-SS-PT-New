import React from 'react';
import styled from 'styled-components';
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
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  CustomSelect,
} from '../UniversalMasterSchedule/ui';
import type { ClientNote } from '../../hooks/useClientNotes';
import { noteTypeOptions } from './NotesManager.options';

interface NotesManagerViewProps {
  clientIdInput: string;
  hasValidClientId: boolean;
  notes: ClientNote[];
  isLoading: boolean;
  loadError: string | null;
  filterType: string;
  content: string;
  noteType: string;
  isPrivate: boolean;
  formError: string | null;
  successMessage: string | null;
  isSubmitting: boolean;
  editingNoteId: number | null;
  editContent: string;
  editType: string;
  editPrivate: boolean;
  setClientIdInput: (value: string) => void;
  setFilterType: (value: string) => void;
  setContent: (value: string) => void;
  setNoteType: (value: string) => void;
  setIsPrivate: (value: boolean) => void;
  setEditContent: (value: string) => void;
  setEditType: (value: string) => void;
  setEditPrivate: (value: boolean) => void;
  resetEditState: () => void;
  handleCreate: () => void | Promise<void>;
  handleEdit: (noteId: number, currentContent: string, currentType: string, currentPrivate: boolean) => void;
  handleUpdate: () => void | Promise<void>;
  handleDelete: (noteId: number) => void | Promise<void>;
}

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
  background: ${({ $variant }) =>
    $variant === 'private'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 18%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'};
  color: ${({ $variant }) =>
    $variant === 'private' ? 'var(--danger, #C92A54)' : 'var(--accent-primary, #60C0F0)'};
  border: 1px solid ${({ $variant }) =>
    $variant === 'private'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 34%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)'};
`;

const CheckboxRow = styled.label`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;

  input {
    accent-color: var(--accent-primary, #60C0F0);
  }
`;

const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: var(--success, #10B981);
`;

const ActionRow = styled(FlexBox)`
  margin-top: 0.75rem;
`;

const NotesManagerView: React.FC<NotesManagerViewProps> = ({
  clientIdInput,
  hasValidClientId,
  notes,
  isLoading,
  loadError,
  filterType,
  content,
  noteType,
  isPrivate,
  formError,
  successMessage,
  isSubmitting,
  editingNoteId,
  editContent,
  editType,
  editPrivate,
  setClientIdInput,
  setFilterType,
  setContent,
  setNoteType,
  setIsPrivate,
  setEditContent,
  setEditType,
  setEditPrivate,
  resetEditState,
  handleCreate,
  handleEdit,
  handleUpdate,
  handleDelete,
}) => (
  <PageWrapper>
    <HeaderRow>
      <div>
        <PageTitle>Client Notes Manager</PageTitle>
        <BodyText secondary>Capture observations, achievements, and red flags to keep client records accurate.</BodyText>
      </div>
    </HeaderRow>

    <Card>
      <CardHeader><SectionTitle>Client Selection</SectionTitle></CardHeader>
      <CardBody>
        <FormField>
          <Label htmlFor="notes-client-id" required>Client ID</Label>
          <StyledInput
            id="notes-client-id"
            type="number"
            value={clientIdInput}
            onChange={(event) => setClientIdInput(event.target.value)}
            placeholder="Enter client user ID"
            hasError={!hasValidClientId && clientIdInput.length > 0}
          />
          <HelperText>Use the numeric user ID from the client profile.</HelperText>
        </FormField>
        {loadError && <ErrorText>{loadError}</ErrorText>}
        {isLoading && <SmallText secondary>Loading notes...</SmallText>}
      </CardBody>
    </Card>

    <Card>
      <CardHeader><SectionTitle>Create Note</SectionTitle></CardHeader>
      <CardBody>
        <GridContainer columns={2} gap="1.5rem">
          <FormField>
            <Label htmlFor="note-type">Note Type</Label>
            <CustomSelect value={noteType} onChange={(value) => setNoteType(String(value))} options={noteTypeOptions} />
          </FormField>
          <FormField>
            <Label htmlFor="note-visibility">Visibility</Label>
            <StyledInput id="note-visibility" type="text" value={isPrivate ? 'Private (admin/trainers only)' : 'Trainer Notes'} readOnly />
            <CheckboxRow>
              <input id="note-private-toggle" type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
              <span>Mark as private</span>
            </CheckboxRow>
          </FormField>
        </GridContainer>
        <FormField>
          <Label htmlFor="note-content">Content</Label>
          <StyledTextarea id="note-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Document key observations, achievements, or concerns." rows={4} />
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
          <CustomSelect value={filterType} onChange={(value) => setFilterType(String(value))} options={[{ value: 'all', label: 'All Notes' }, ...noteTypeOptions]} />
        </FilterRow>
      </CardHeader>
      <CardBody>
        {notes.length === 0 && !isLoading && <SmallText secondary>No notes available for this client.</SmallText>}
        {notes.map((note) => (
          <NoteCard key={note.id}>
            {editingNoteId === note.id ? (
              <>
                <GridContainer columns={2} gap="1rem">
                  <FormField>
                    <Label htmlFor={`edit-type-${note.id}`}>Type</Label>
                    <CustomSelect value={editType} onChange={(value) => setEditType(String(value))} options={noteTypeOptions} />
                  </FormField>
                  <FormField>
                    <Label htmlFor={`edit-private-${note.id}`}>Private</Label>
                    <CheckboxRow>
                      <input id={`edit-private-${note.id}`} type="checkbox" checked={editPrivate} onChange={(event) => setEditPrivate(event.target.checked)} />
                      <span>Private note</span>
                    </CheckboxRow>
                  </FormField>
                </GridContainer>
                <FormField>
                  <Label htmlFor={`edit-content-${note.id}`}>Content</Label>
                  <StyledTextarea id={`edit-content-${note.id}`} value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={3} />
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
                  <SmallText secondary>{new Date(note.createdAt).toLocaleDateString()}</SmallText>
                </NoteHeader>
                <BodyText>{note.content}</BodyText>
                <ActionRow gap="0.5rem" justify="flex-end">
                  <OutlinedButton type="button" onClick={() => handleEdit(note.id, note.content, note.type, note.isPrivate)}>Edit</OutlinedButton>
                  <OutlinedButton type="button" onClick={() => handleDelete(note.id)}>
                    <Trash2 size={14} /> Delete
                  </OutlinedButton>
                </ActionRow>
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

export default NotesManagerView;
