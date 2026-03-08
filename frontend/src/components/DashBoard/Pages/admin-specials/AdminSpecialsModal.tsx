import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminSpecial, AdminSpecialFormData, Package, ClientOption } from './adminSpecials.types';
import {
  Modal,
  ModalContent,
  ModalTitle,
  FormGroup,
  Label,
  Input,
  TextArea,
  CheckboxGroup,
  CheckboxLabel,
  ButtonRow,
  CancelButton,
  SaveButton,
  ClientSearchBox,
  ClientSearchInput,
  SearchIcon,
  ClientDropdown,
  ClientDropdownItem,
  AssignedClientChips,
  ClientChip,
  ChipRemove,
  ClientNote,
  ModalScrollContent,
} from './adminSpecials.styles';

interface AdminSpecialsModalProps {
  show: boolean;
  editingSpecial: AdminSpecial | null;
  formData: AdminSpecialFormData;
  packages: Package[];
  clients: ClientOption[];
  onClose: () => void;
  onChange: (next: AdminSpecialFormData) => void;
  onSave: () => void;
  onTogglePackage: (pkgId: number) => void;
}

const AdminSpecialsModal: React.FC<AdminSpecialsModalProps> = ({
  show,
  editingSpecial,
  formData,
  packages,
  clients,
  onClose,
  onChange,
  onSave,
  onTogglePackage
}) => {
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNoClientWarning, setShowNoClientWarning] = useState(false);

  // Reset search when modal closes
  useEffect(() => {
    if (!show) {
      setClientSearch('');
      setShowDropdown(false);
      setShowNoClientWarning(false);
    }
  }, [show]);

  // Intercept save — warn if no clients assigned
  const handleSaveClick = useCallback(() => {
    if (formData.assignedClientIds.length === 0) {
      setShowNoClientWarning(true);
    } else {
      onSave();
    }
  }, [formData.assignedClientIds, onSave]);

  // Filter clients by search term, exclude already-assigned
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [];
    const term = clientSearch.toLowerCase();
    return clients.filter(c =>
      !formData.assignedClientIds.includes(c.id) &&
      (`${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
       c.email.toLowerCase().includes(term))
    ).slice(0, 10);
  }, [clientSearch, clients, formData.assignedClientIds]);

  const addClient = useCallback((clientId: number) => {
    onChange({
      ...formData,
      assignedClientIds: [...formData.assignedClientIds, clientId],
    });
    setClientSearch('');
    setShowDropdown(false);
  }, [formData, onChange]);

  const removeClient = useCallback((clientId: number) => {
    onChange({
      ...formData,
      assignedClientIds: formData.assignedClientIds.filter(id => id !== clientId),
    });
  }, [formData, onChange]);

  const getClientName = useCallback((id: number) => {
    const client = clients.find(c => c.id === id);
    return client ? `${client.firstName} ${client.lastName}` : `Client #${id}`;
  }, [clients]);

  if (!show) return null;

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{editingSpecial ? 'Edit Special' : 'Create Special'}</ModalTitle>

        <ModalScrollContent>
          <FormGroup>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              placeholder="e.g., New Year Kickstart"
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
            />
          </FormGroup>

          <FormGroup>
            <Label>Bonus Sessions *</Label>
            <Input
              type="number"
              min="1"
              value={formData.bonusSessions}
              onChange={(e) =>
                onChange({
                  ...formData,
                  bonusSessions: parseInt(e.target.value, 10) || 1
                })
              }
            />
          </FormGroup>

          <FormGroup>
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
            />
          </FormGroup>

          <FormGroup>
            <Label>End Date *</Label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
            />
          </FormGroup>

          <FormGroup>
            <Label>Assign to Clients (leave empty for all)</Label>
            <ClientSearchBox>
              <SearchIcon>🔍</SearchIcon>
              <ClientSearchInput
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowDropdown(e.target.value.trim().length > 0);
                }}
                placeholder="Search clients by name or email..."
                onFocus={() => clientSearch.trim() && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              />
            </ClientSearchBox>

            {showDropdown && filteredClients.length > 0 && (
              <ClientDropdown>
                {filteredClients.map(client => (
                  <ClientDropdownItem
                    key={client.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addClient(client.id)}
                  >
                    <span>{client.firstName} {client.lastName}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{client.email}</span>
                  </ClientDropdownItem>
                ))}
              </ClientDropdown>
            )}

            {showDropdown && clientSearch.trim() && filteredClients.length === 0 && (
              <ClientNote>No matching clients found</ClientNote>
            )}

            {formData.assignedClientIds.length > 0 && (
              <AssignedClientChips>
                {formData.assignedClientIds.map(id => (
                  <ClientChip key={id}>
                    {getClientName(id)}
                    <ChipRemove onClick={() => removeClient(id)} title="Remove">&times;</ChipRemove>
                  </ClientChip>
                ))}
              </AssignedClientChips>
            )}

            <ClientNote>
              {formData.assignedClientIds.length === 0
                ? 'No clients selected — special will be available to everyone'
                : `${formData.assignedClientIds.length} client${formData.assignedClientIds.length > 1 ? 's' : ''} assigned`}
            </ClientNote>
          </FormGroup>

          <FormGroup>
            <Label>Applicable Packages (leave empty for all)</Label>
            <CheckboxGroup>
              {packages.map((pkg) => (
                <CheckboxLabel key={pkg.id}>
                  <input
                    type="checkbox"
                    checked={formData.applicablePackageIds.includes(pkg.id)}
                    onChange={() => onTogglePackage(pkg.id)}
                  />
                  {pkg.name}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </FormGroup>
        </ModalScrollContent>

        {showNoClientWarning && (
          <div style={{
            background: 'rgba(255, 51, 102, 0.12)',
            border: '1px solid rgba(255, 51, 102, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#FF3366', fontWeight: 600, margin: '0 0 6px', fontSize: '0.9rem' }}>
              ⚠️ No clients assigned
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem', margin: '0 0 14px' }}>
              This special will apply to <strong style={{ color: '#FF3366' }}>ALL clients</strong>.
              Are you sure you want to continue?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <CancelButton onClick={() => setShowNoClientWarning(false)} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                Go Back
              </CancelButton>
              <SaveButton
                onClick={() => { setShowNoClientWarning(false); onSave(); }}
                style={{ fontSize: '0.8rem', padding: '8px 16px', background: 'linear-gradient(135deg, #FF3366, #cc2952)' }}
              >
                Yes, Apply to Everyone
              </SaveButton>
            </div>
          </div>
        )}

        <ButtonRow>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <SaveButton
            onClick={handleSaveClick}
            disabled={!formData.name || !formData.startDate || !formData.endDate}
          >
            {editingSpecial ? 'Update' : 'Create'}
          </SaveButton>
        </ButtonRow>
      </ModalContent>
    </Modal>
  );
};

export default AdminSpecialsModal;
