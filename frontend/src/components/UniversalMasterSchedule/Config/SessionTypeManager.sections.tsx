import React from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';
import type { SessionType } from '../hooks/useSessionTypes';
import {
  ButtonGroup,
  CardBody,
  CardHeader,
  FormField,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  OutlinedButton,
  PrimaryButton,
  SecondaryButton,
  SmallText,
  StyledInput,
  StyledTextarea
} from '../ui';
import {
  CancelButton,
  ColorInput,
  ColorPicker,
  ColorPreview,
  ColorSwatch,
  ConfirmButton,
  DangerIconButton,
  EmptyState,
  ErrorText,
  FieldRow,
  HeaderContent,
  InlineConfirm,
  MutedText,
  NameCell,
  SettingsTitle,
  StatusTag,
  Table
} from './SessionTypeManager.styles';
import type { SessionTypeEditorProps } from './SessionTypeManager.types';

interface SessionTypeManagerHeaderProps {
  onCreate: () => void;
}

interface SessionTypeTableProps {
  sessionTypes: SessionType[];
  loading: boolean;
  error: string | null;
  pendingDeleteId: number | null;
  onEdit: (sessionType: SessionType) => void;
  onRequestDelete: (id: number | null) => void;
  onConfirmDelete: (id: number) => void;
}

export const SessionTypeManagerHeader: React.FC<SessionTypeManagerHeaderProps> = ({ onCreate }) => (
  <CardHeader>
    <HeaderContent>
      <div>
        <SettingsTitle>Session Type Settings</SettingsTitle>
        <MutedText>Configure standardized durations and buffer rules.</MutedText>
      </div>
      <PrimaryButton onClick={onCreate}>
        <Plus size={16} />
        Add Type
      </PrimaryButton>
    </HeaderContent>
  </CardHeader>
);

export const SessionTypeTable: React.FC<SessionTypeTableProps> = ({
  sessionTypes,
  loading,
  error,
  pendingDeleteId,
  onEdit,
  onRequestDelete,
  onConfirmDelete
}) => (
  <CardBody>
    {loading && <SmallText>Loading session types...</SmallText>}
    {error && <ErrorText>{error}</ErrorText>}

    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Duration</th>
          <th>Buffer Before</th>
          <th>Buffer After</th>
          <th>Credits</th>
          <th>Color</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sessionTypes.map((type) => (
          <tr key={type.id}>
            <td data-label="Name">
              <NameCell>
                <span>{type.name}</span>
                {!type.isActive && <StatusTag>Inactive</StatusTag>}
              </NameCell>
            </td>
            <td data-label="Duration">{type.duration} min</td>
            <td data-label="Buffer Before">{type.bufferBefore} min</td>
            <td data-label="Buffer After">{type.bufferAfter} min</td>
            <td data-label="Credits">{type.creditsRequired}</td>
            <td data-label="Color">
              <ColorSwatch $color={type.color} />
            </td>
            <td data-label="Actions">
              {pendingDeleteId === type.id ? (
                <InlineConfirm>
                  <SmallText>Delete?</SmallText>
                  <ConfirmButton type="button" onClick={() => onConfirmDelete(type.id)}>
                    Yes
                  </ConfirmButton>
                  <CancelButton type="button" onClick={() => onRequestDelete(null)}>
                    No
                  </CancelButton>
                </InlineConfirm>
              ) : (
                <ButtonGroup>
                  <SecondaryButton type="button" onClick={() => onEdit(type)}>
                    <Edit size={14} />
                    Edit
                  </SecondaryButton>
                  <DangerIconButton
                    type="button"
                    onClick={() => onRequestDelete(type.id)}
                    aria-label="Delete session type"
                  >
                    <Trash2 size={14} />
                  </DangerIconButton>
                </ButtonGroup>
              )}
            </td>
          </tr>
        ))}
        {!loading && sessionTypes.length === 0 && (
          <tr>
            <td colSpan={7}>
              <EmptyState>No session types found. Add your first type.</EmptyState>
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </CardBody>
);

export const SessionTypeEditorModal: React.FC<SessionTypeEditorProps> = ({
  isOpen,
  editing,
  form,
  formError,
  onFormChange,
  onClose,
  onSave
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={editing ? 'Edit Session Type' : 'Create Session Type'}
    size="md"
  >
    <ModalBody>
      <FormField>
        <Label htmlFor="sessionTypeName" required>Name</Label>
        <StyledInput
          id="sessionTypeName"
          value={form.name}
          onChange={(event) => onFormChange({ name: event.target.value })}
          hasError={!!formError}
        />
      </FormField>

      <FormField>
        <Label htmlFor="sessionTypeDescription">Description</Label>
        <StyledTextarea
          id="sessionTypeDescription"
          value={form.description}
          onChange={(event) => onFormChange({ description: event.target.value })}
          rows={3}
        />
      </FormField>

      <FieldRow>
        <FormField>
          <Label htmlFor="sessionTypeDuration" required>Duration (min)</Label>
          <StyledInput
            id="sessionTypeDuration"
            type="number"
            min={1}
            value={form.duration}
            onChange={(event) => onFormChange({ duration: Number(event.target.value) })}
            hasError={!!formError}
          />
        </FormField>
        <FormField>
          <Label htmlFor="sessionTypeBufferBefore">Buffer Before</Label>
          <StyledInput
            id="sessionTypeBufferBefore"
            type="number"
            min={0}
            value={form.bufferBefore}
            onChange={(event) => onFormChange({ bufferBefore: Number(event.target.value) })}
          />
        </FormField>
        <FormField>
          <Label htmlFor="sessionTypeBufferAfter">Buffer After</Label>
          <StyledInput
            id="sessionTypeBufferAfter"
            type="number"
            min={0}
            value={form.bufferAfter}
            onChange={(event) => onFormChange({ bufferAfter: Number(event.target.value) })}
          />
        </FormField>
      </FieldRow>

      <FieldRow>
        <FormField>
          <Label htmlFor="sessionTypeColor">Color</Label>
          <ColorPicker>
            <ColorInput
              id="sessionTypeColor"
              type="color"
              value={form.color}
              onChange={(event) => onFormChange({ color: event.target.value })}
            />
            <ColorPreview $color={form.color} />
            <SmallText>{form.color}</SmallText>
          </ColorPicker>
        </FormField>
        <FormField>
          <Label htmlFor="sessionTypeCreditsRequired" required>Credits Required</Label>
          <StyledInput
            id="sessionTypeCreditsRequired"
            type="number"
            min={0}
            step={1}
            value={form.creditsRequired}
            onChange={(event) => onFormChange({ creditsRequired: Number(event.target.value) })}
          />
        </FormField>
        <FormField>
          <Label htmlFor="sessionTypePrice">Price (optional)</Label>
          <StyledInput
            id="sessionTypePrice"
            type="number"
            min={0}
            value={form.price}
            onChange={(event) => onFormChange({ price: event.target.value })}
            placeholder="125"
          />
        </FormField>
      </FieldRow>

      {formError && <ErrorText>{formError}</ErrorText>}
    </ModalBody>
    <ModalFooter>
      <OutlinedButton onClick={onClose}>
        <X size={16} />
        Cancel
      </OutlinedButton>
      <PrimaryButton onClick={onSave}>
        {editing ? 'Save Changes' : 'Create Type'}
      </PrimaryButton>
    </ModalFooter>
  </Modal>
);
