/**
 * Apply Payment Modal
 * ===================
 * Canonical admin payment recovery modal for adding session credits.
 */

import React from 'react';
import { Modal } from './ui';
import DuplicatePaymentWarning from './DuplicatePaymentWarning';
import { useApplyPaymentModalController } from './ApplyPaymentModal.controller';
import { ApplyPaymentModalFooter } from './ApplyPaymentModal.footer';
import { ApplyPaymentClientList } from './ApplyPaymentModal.ClientList';
import { ApplyPaymentForceOverridePanel } from './ApplyPaymentModal.ForceOverridePanel';
import { ApplyPaymentSelectedClientPanel } from './ApplyPaymentModal.SelectedClientPanel';
import type { ApplyPaymentModalProps } from './ApplyPaymentModal.types';
import { ErrorBlock, SuccessMessage } from './ApplyPaymentModal.baseStyles';

const ApplyPaymentModal: React.FC<ApplyPaymentModalProps> = ({
  open,
  onClose,
  onApplied,
  preselectedClientId
}) => {
  const controller = useApplyPaymentModalController({
    open,
    onApplied,
    preselectedClientId,
  });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Apply Payment / Manage Credits"
      size="lg"
      footer={<ApplyPaymentModalFooter controller={controller} onClose={onClose} />}
    >
      {controller.error && <ErrorBlock>{controller.error}</ErrorBlock>}
      {controller.success && <SuccessMessage>{controller.success}</SuccessMessage>}
      {controller.duplicateInfo && (
        <DuplicatePaymentWarning
          orderId={controller.duplicateInfo.orderId}
          orderNumber={controller.duplicateInfo.orderNumber}
          newBalance={controller.duplicateInfo.newBalance}
          clientName={controller.selectedClient?.name}
          onDismiss={controller.handleDismissDuplicateInfo}
        />
      )}
      <ApplyPaymentForceOverridePanel controller={controller} />
      <ApplyPaymentClientList controller={controller} />
      <ApplyPaymentSelectedClientPanel controller={controller} />
    </Modal>
  );
};

export default ApplyPaymentModal;
