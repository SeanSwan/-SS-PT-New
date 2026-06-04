import React from 'react';
import { CreditCard } from 'lucide-react';
import GlowButton from '../ui/buttons/GlowButton';
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
        <GlowButton
          variant="primary"
          size="medium"
          onClick={() => handleChargeCard()}
          disabled={applying || !selectedPackageId || !selectedCardId || showForceOverride}
          isLoading={applying}
        >
          Charge Card
        </GlowButton>
      )}
      {selectedClient && modalMode === 'package' && ['venmo', 'zelle'].includes(paymentMethod) && !showPaymentConfirmation && (
        <GlowButton
          variant="primary"
          size="medium"
          onClick={handleConfirmPaymentReceived}
          disabled={applying || !selectedPackageId || showForceOverride}
          isLoading={applying}
        >
          Confirm Payment
        </GlowButton>
      )}
      {selectedClient && modalMode === 'package' && (paymentMethod === 'cash' || paymentMethod === 'check' || showPaymentConfirmation) && (
        <GlowButton
          variant="primary"
          size="medium"
          onClick={() => handleApplyPackage()}
          disabled={applying || !selectedPackageId || showForceOverride || showPaymentConfirmation}
          isLoading={applying}
        >
          Apply Package
        </GlowButton>
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
