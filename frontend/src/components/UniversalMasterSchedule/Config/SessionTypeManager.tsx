import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Edit, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import useSessionTypes, { SessionType } from '../hooks/useSessionTypes';
import {
  GlassCard,
  CardHeader,
  CardBody,
  PrimaryButton,
  OutlinedButton,
  SecondaryButton,
  ButtonGroup,
  Modal,
  ModalBody,
  ModalFooter,
  FormField,
  Label,
  StyledInput,
  StyledTextarea,
  HelperText,
  BodyText,
  SmallText
} from '../ui';

interface FormState {
  name: string;
  description: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  color: string;
  price: string;
  isActive: boolean;
}

const DEFAULT_COLOR = '#00FFFF';

const createEmptyForm = (): FormState => ({
  name: '',
  description: '',
  duration: 60,
  bufferBefore: 0,
  bufferAfter: 0,
  color: DEFAULT_COLOR,
  price: '',
  isActive: true
});

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
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchSessionTypes().catch(() => undefined);
  }, [fetchSessionTypes]);

  const sortedSessionTypes = useMemo(
    () => [...sessionTypes].sort((a, b) => a.sortOrder - b.sortOrder),
    [sessionTypes]
  );

  const openCreateModal = () => {
    setEditing(null);
    setForm(createEmptyForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sessionType: SessionType) => {
    setEditing(sessionType);
    setForm({
      name: sessionType.name,
      description: sessionType.description ?? '',
      duration: sessionType.duration,
      bufferBefore: sessionType.bufferBefore,
      bufferAfter: sessionType.bufferAfter,
      color: sessionType.color || DEFAULT_COLOR,
      price: sessionType.price !== undefined && sessionType.price !== null ? String(sessionType.price) : '',
      isActive: sessionType.isActive
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const validateForm = () => {
    const trimmedName = form.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setFormError('Name must be between 2 and 100 characters.');
      return false;
    }
    if (form.duration <= 0) {
      setFormError('Duration must be greater than 0.');
      return false;
    }
    if (form.bufferBefore < 0 || form.bufferAfter < 0) {
      setFormError('Buffer values cannot be negative.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration: Number(form.duration),
      bufferBefore: Number(form.bufferBefore),
      bufferAfter: Number(form.bufferAfter),
      color: form.color || DEFAULT_COLOR,
      price: form.price ? Number(form.price) : null,
      isActive: form.isActive
    };

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
      <CardHeader>
        <HeaderContent>
          <div>
            <BodyText style={{ fontSize: '1.1rem', fontWeight: 600 }}>Session Type Settings</BodyText>
            <SmallText style={{ color: 'rgba(255,255,255,0.6)' }}>
              Configure standardized durations and buffer rules.
            </SmallText>
          </div>
          <PrimaryButton onClick={openCreateModal}>
            <Plus size={16} />
            Add Type
          </PrimaryButton>
        </HeaderContent>
      </CardHeader>
      <CardBody>
        {loading && <SmallText>Loading session types...</SmallText>}
        {error && <HelperText style={{ color: '#ef4444' }}>{error}</HelperText>}

        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Duration</th>
              <th>Buffer Before</th>
              <th>Buffer After</th>
              <th>Color</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSessionTypes.map((type) => (
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
                <td data-label="Color">
                  <ColorSwatch style={{ background: type.color }} />
                </td>
                <td data-label="Actions">
                  {pendingDeleteId === type.id ? (
                    <InlineConfirm>
                      <SmallText>Delete?</SmallText>
                      <ConfirmButton type="button" onClick={() => handleDelete(type.id)}>
                        Yes
                      </ConfirmButton>
                      <CancelButton type="button" onClick={() => setPendingDeleteId(null)}>
                        No
                      </CancelButton>
                    </InlineConfirm>
                  ) : (
                    <ButtonGroup>
                      <SecondaryButton type="button" onClick={() => openEditModal(type)}>
                        <Edit size={14} />
                        Edit
                      </SecondaryButton>
                      <DangerIconButton
                        type="button"
                        onClick={() => setPendingDeleteId(type.id)}
                        aria-label="Delete session type"
                      >
                        <Trash2 size={14} />
                      </DangerIconButton>
                    </ButtonGroup>
                  )}
                </td>
              </tr>
            ))}
            {!loading && sortedSessionTypes.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState>No session types found. Add your first type.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </CardBody>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Session Type' : 'Create Session Type'}
        size="md"
      >
        <ModalBody>
          <FormField>
            <Label htmlFor="sessionTypeName" required>Name</Label>
            <StyledInput
              id="sessionTypeName"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              hasError={!!formError}
            />
          </FormField>

          <FormField>
            <Label htmlFor="sessionTypeDescription">Description</Label>
            <StyledTextarea
              id="sessionTypeDescription"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, duration: Number(event.target.value) }))
                }
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bufferBefore: Number(event.target.value) }))
                }
              />
            </FormField>
            <FormField>
              <Label htmlFor="sessionTypeBufferAfter">Buffer After</Label>
              <StyledInput
                id="sessionTypeBufferAfter"
                type="number"
                min={0}
                value={form.bufferAfter}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bufferAfter: Number(event.target.value) }))
                }
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
                  onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                />
                <ColorPreview style={{ background: form.color }} />
                <SmallText>{form.color}</SmallText>
              </ColorPicker>
            </FormField>
            <FormField>
              <Label htmlFor="sessionTypePrice">Price (optional)</Label>
              <StyledInput
                id="sessionTypePrice"
                type="number"
                min={0}
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="125"
              />
            </FormField>
          </FieldRow>

          {formError && <HelperText style={{ color: '#ef4444' }}>{formError}</HelperText>}
        </ModalBody>
        <ModalFooter>
          <OutlinedButton onClick={closeModal}>
            <X size={16} />
            Cancel
          </OutlinedButton>
          <PrimaryButton onClick={handleSave}>
            {editing ? 'Save Changes' : 'Create Type'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </GlassCard>
  );
};

export default SessionTypeManager;

const HeaderContent = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: #e2e8f0;
  font-size: 0.9rem;

  thead th {
    text-align: left;
    padding: 0.75rem 0.5rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  tbody td {
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  @media (max-width: 768px) {
    display: block;

    thead {
      display: none;
    }

    tbody, tr, td {
      display: block;
      width: 100%;
    }

    tr {
      margin-bottom: 1rem;
      padding: 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
    }

    td {
      border: none;
      padding: 0.35rem 0;
    }

    td::before {
      content: attr(data-label);
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 0.2rem;
    }
  }
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusTag = styled.span`
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
`;

const ColorSwatch = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const InlineConfirm = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const ConfirmButton = styled.button`
  border: none;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
`;

const CancelButton = styled.button`
  border: none;
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
`;

const DangerIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-radius: 8px;
  padding: 0.4rem;
  cursor: pointer;

  &:hover {
    background: rgba(239, 68, 68, 0.25);
  }
`;

const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
`;

const ColorPicker = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ColorInput = styled.input`
  width: 44px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const ColorPreview = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;
