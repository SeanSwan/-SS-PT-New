import React, { useEffect, useState } from 'react';
import { Modal } from '../CustomModal';
import { CancelBtn, ConfirmBtn, FooterRow, NativeSelect, NativeSelectWrapper } from './TimeWheel.styles';
import { formatTimeDisplay, isTimeInRange } from './useTimeWheelState';

interface NativeTimeSelectProps {
  value: string;
  onConfirm: (value: string) => void;
  slots: string[];
  minTime?: string;
  maxTime?: string;
  isOpen: boolean;
  onClose: () => void;
  label?: string;
}

const NativeTimeSelect: React.FC<NativeTimeSelectProps> = ({
  value,
  onConfirm,
  slots,
  minTime,
  maxTime,
  isOpen,
  onClose,
  label,
}) => {
  const [selected, setSelected] = useState(value || slots[0] || '');

  useEffect(() => {
    if (value && slots.includes(value)) {
      setSelected(value);
    }
  }, [value, slots]);

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  const footer = (
    <FooterRow>
      <CancelBtn type="button" onClick={onClose}>Cancel</CancelBtn>
      <ConfirmBtn type="button" onClick={handleConfirm}>Confirm</ConfirmBtn>
    </FooterRow>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={label || 'Select Time'}
      size="sm"
      footer={footer}
    >
      <NativeSelectWrapper>
        <NativeSelect
          value={selected}
          onChange={e => setSelected(e.target.value)}
          data-testid="time-native-select"
        >
          {slots.map(slot => {
            const disabled = minTime ? !isTimeInRange(slot, minTime, maxTime) : false;
            return (
              <option key={slot} value={slot} disabled={disabled}>
                {formatTimeDisplay(slot)}
              </option>
            );
          })}
        </NativeSelect>
      </NativeSelectWrapper>
    </Modal>
  );
};

export default NativeTimeSelect;
