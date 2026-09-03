/**
 * ConfirmModal — themed replacement for window.confirm
 * ====================================================
 * Now a thin adapter over the shared <SwanDialog> primitive (SWA-225 EX-6),
 * consumer #1 of 93. Its public surface is unchanged — `ConfirmRequest` and the
 * `{ request, onClose }` props — so AdminGalleryStudio did not move.
 *
 * WHAT THE REWRITE BOUGHT, none of which the hand-rolled version had:
 *   - a real focus TRAP (Tab could previously walk out of the dialog into the
 *     page behind it)
 *   - background inerting via aria-hidden, so a screen reader cannot wander out
 *   - body scroll lock
 *   - a portal, so an ancestor's overflow/transform can never clip the dialog
 *   - focus RETURN to whatever opened it — supplied manually by SwanDialog,
 *     because this component is `request`-controlled and therefore has no Radix
 *     Trigger for Radix's own restore to aim at
 *
 * WHAT DELIBERATELY DID NOT CHANGE: Escape and backdrop still dismiss, even for
 * `tone: 'danger'`. Dismissing a confirm is the SAFE outcome and the WAI-ARIA
 * dialog pattern requires Escape to work; blueprint v3 proposed disabling both
 * on destructive dialogs and that was rejected as a keyboard trap.
 *
 * The behaviour contract is pinned by ConfirmModal.behaviour.test.tsx, written
 * against the ORIGINAL implementation before this rewrite and passing unchanged
 * against it after.
 */

import React from 'react';
import { SwanDialog } from '../../../../ui/SwanDialog';
import { DangerButton, GhostButton, PrimaryButton } from '../styles';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
}

interface Props {
  request: ConfirmRequest | null;
  onClose: () => void;
}

const ConfirmModal: React.FC<Props> = ({ request, onClose }) => {
  const destructive = request?.tone === 'danger';
  const Confirm = destructive ? DangerButton : PrimaryButton;

  return (
    <SwanDialog
      open={request !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={request?.title ?? ''}
      description={request?.message}
      destructive={destructive}
      confirmLabel={request?.confirmLabel ?? 'Confirm'}
      cancelLabel={request?.cancelLabel ?? 'Cancel'}
      onConfirm={request?.onConfirm}
      renderCancel={({ onClick, children, type, ref }) => (
        <GhostButton ref={ref} type={type} onClick={onClick}>{children}</GhostButton>
      )}
      renderConfirm={({ onClick, children, type }) => (
        <Confirm type={type} onClick={onClick}>{children}</Confirm>
      )}
    />
  );
};

export default ConfirmModal;
