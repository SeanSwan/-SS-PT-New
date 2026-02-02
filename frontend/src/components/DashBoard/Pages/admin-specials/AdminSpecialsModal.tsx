import React from 'react';
import { AdminSpecial, AdminSpecialFormData, Package } from './adminSpecials.types';
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
  SaveButton
} from './adminSpecials.styles';

interface AdminSpecialsModalProps {
  show: boolean;
  editingSpecial: AdminSpecial | null;
  formData: AdminSpecialFormData;
  packages: Package[];
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
  onClose,
  onChange,
  onSave,
  onTogglePackage
}) => {
  if (!show) return null;

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{editingSpecial ? 'Edit Special' : 'Create Special'}</ModalTitle>

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

        <ButtonRow>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <SaveButton
            onClick={onSave}
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
