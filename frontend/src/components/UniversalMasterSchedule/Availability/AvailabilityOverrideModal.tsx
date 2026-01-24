/**
 * AvailabilityOverrideModal - One-off Schedule Override
 * ======================================================
 * Modal for adding vacation, sick days, or extra availability.
 */

import React, { useState } from 'react';
import { useTrainerAvailability } from '../../../hooks/useTrainerAvailability';
import {
  Modal,
  PrimaryButton,
  OutlinedButton,
  StyledInput,
  CustomSelect,
  FormField,
  Label,
  StyledTextarea,
  FlexBox,
  Spinner
} from '../ui';

interface AvailabilityOverrideModalProps {
  trainerId: number | string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const AvailabilityOverrideModal: React.FC<AvailabilityOverrideModalProps> = ({
  trainerId,
  isOpen,
  onClose,
  onCreated
}) => {
  const { addOverride, isAddingOverride } = useTrainerAvailability(trainerId);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    type: 'blocked',
    reason: ''
  });

  const handleSubmit = async () => {
    try {
      await addOverride({
        ...formData,
        trainerId: Number(trainerId)
      });
      if (onCreated) onCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create override:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Schedule Override"
      size="sm"
      footer={
        <>
          <OutlinedButton onClick={onClose} disabled={isAddingOverride}>
            Cancel
          </OutlinedButton>
          <PrimaryButton onClick={handleSubmit} disabled={isAddingOverride}>
            {isAddingOverride ? <Spinner size={16} /> : 'Add Override'}
          </PrimaryButton>
        </>
      }
    >
      <FlexBox direction="column" gap="1rem">
        <FormField>
          <Label htmlFor="date" required>Date</Label>
          <StyledInput
            id="date"
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </FormField>

        <FlexBox gap="1rem">
          <FormField style={{ flex: 1 }}>
            <Label htmlFor="startTime" required>Start Time</Label>
            <StyledInput
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={e => setFormData({ ...formData, startTime: e.target.value })}
            />
          </FormField>
          <FormField style={{ flex: 1 }}>
            <Label htmlFor="endTime" required>End Time</Label>
            <StyledInput
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={e => setFormData({ ...formData, endTime: e.target.value })}
            />
          </FormField>
        </FlexBox>

        <FormField>
          <Label htmlFor="type" required>Type</Label>
          <CustomSelect
            value={formData.type}
            onChange={val => setFormData({ ...formData, type: val as string })}
            options={[
              { value: 'blocked', label: 'Blocked (Unavailable)' },
              { value: 'vacation', label: 'Vacation / Time Off' },
              { value: 'available', label: 'Extra Availability' }
            ]}
          />
        </FormField>

        <FormField>
          <Label htmlFor="reason">Reason (Optional)</Label>
          <StyledTextarea
            id="reason"
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            placeholder="e.g., Doctor appointment, Holiday"
            rows={3}
          />
        </FormField>
      </FlexBox>
    </Modal>
  );
};

export default AvailabilityOverrideModal;
