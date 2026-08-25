import React from 'react';
import { CreditCard } from 'lucide-react';
import ForgeButton from '../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import { OutlinedButton, PrimaryButton, Spinner } from './ui';
import type { useApplyPaymentModalController } from './ApplyPaymentModal.controller';

type PaymentController = ReturnType<typeof useApplyPaymentModalController>;

interface ApplyPaymentModalFooterProps {
  controller: PaymentController;
  onClose: () => void;
}

export const ApplyPaymentModalFooter: React.FC<ApplyPaymentModalFooterProps> = ({
  controller,
  onClose,
}) => {
  const {
    applying,
    loading,
    selectedClient,
    modalMode,
    paymentMethod,
    selectedPackageId,
    selectedCardId,
    showForceOverride,
    showPaymentConfirmation,
    sessionsToAdd,
    handleProcessDeductions,
    handleChargeCard,
    handleConfirmPaymentReceived,
    handleApplyPackage,
    handleApplyManual,
  } = controller;

  return (
    <>
      <OutlinedButton onClick={onClose} disabled={applying}>
        Close
      </OutlinedButton>
      <OutlinedButton onClick={handleProcessDeductions} disabled={applying || loading}>
        {applying ? <Spinner size={16} /> : null}
        Process Auto-Deductions
      </OutlinedButton>
      {selectedClient && modalMode === 'package' && paymentMethod === 'stripe' && (
        <ForgeButton
          variant="primary"
          size="medium"
          onClick={() => handleChargeCard()}
          disabled={applying || !selectedPackageId || !selectedCardId || showForceOverride}
          isLoading={applying}
        >
          Charge Card
        </ForgeButton>
      )}
      {selectedClient && modalMode === 'package' && ['venmo', 'zelle'].includes(paymentMethod) && !showPaymentConfirmation && (
        <ForgeButton
          variant="primary"
          size="medium"
          onClick={handleConfirmPaymentReceived}
          disabled={applying || !selectedPackageId || showForceOverride}
          isLoading={applying}
        >
          Confirm Payment
        </ForgeButton>
      )}
      {selectedClient && modalMode === 'package' && (paymentMethod === 'cash' || paymentMethod === 'check' || showPaymentConfirmation) && (
        <ForgeButton
          variant="primary"
          size="medium"
          onClick={() => handleApplyPackage()}
          disabled={applying || !selectedPackageId || showForceOverride || showPaymentConfirmation}
          isLoading={applying}
        >
          Apply Package
        </ForgeButton>
      )}
      {selectedClient && modalMode === 'manual' && (
        <PrimaryButton onClick={handleApplyManual} disabled={applying || !sessionsToAdd}>
          {applying ? <Spinner size={16} /> : <CreditCard size={16} />}
          Apply Credits
        </PrimaryButton>
      )}
    </>
  );
};
