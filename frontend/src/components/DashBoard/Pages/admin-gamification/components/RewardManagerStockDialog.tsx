/**
 * Stock update dialog for reward inventory adjustments.
 */
import React from 'react';
import {
  DialogBody,
  DialogFooter,
  DialogOverlay,
  DialogPanel,
  DialogTitleBar,
  FieldInput,
  FieldLabel,
} from './RewardManagerDialog.styles';
import { GhostButton, PrimaryButton } from './RewardManagerControls.styles';

interface RewardManagerStockDialogProps {
  open: boolean;
  stock: number;
  onStockChange: (value: number) => void;
  onClose: () => void;
  onSave: () => void;
}

export const RewardManagerStockDialog: React.FC<RewardManagerStockDialogProps> = ({
  open,
  stock,
  onStockChange,
  onClose,
  onSave,
}) => (
  <DialogOverlay $open={open} onClick={onClose}>
    <DialogPanel $maxWidth="400px" onClick={event => event.stopPropagation()}>
      <DialogTitleBar>Update Stock</DialogTitleBar>
      <DialogBody>
        <FieldLabel htmlFor="reward-stock-update">Stock Quantity</FieldLabel>
        <FieldInput
          id="reward-stock-update"
          type="number"
          value={stock}
          onChange={event => onStockChange(parseInt(event.target.value) || 0)}
          min={0}
        />
      </DialogBody>
      <DialogFooter>
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton onClick={onSave}>Update</PrimaryButton>
      </DialogFooter>
    </DialogPanel>
  </DialogOverlay>
);
