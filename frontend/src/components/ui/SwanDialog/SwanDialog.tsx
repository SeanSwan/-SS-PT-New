/**
 * ============================================================================
 * FILE: SwanDialog.tsx
 * PURPOSE: The one dialog primitive. Radix supplies the parts that are hard to
 *          hand-roll correctly — focus trap, scroll lock, portal, inert
 *          background, Escape and overlay dismissal — and Crystalline Swan
 *          supplies the skin.
 *
 * WHY (SWA-225 EX-6): the app carries 93 hand-rolled dialog components, 117
 * files hand-writing `role="dialog"` + `aria-modal`, 94 hand-writing an Escape
 * handler, 37 hand-writing a portal. Every one is a separate chance to get
 * focus return, scroll lock or background inerting wrong — and those failures
 * are invisible until a keyboard user hits them.
 *
 * FOCUS RETURN IS MANUAL HERE, AND THAT IS THE POINT. Radix returns focus to
 * its `Dialog.Trigger`. This primitive's consumers are `open`-controlled from
 * parent state — the gallery's ConfirmModal is driven by
 * `useState<ConfirmRequest | null>` — so there IS no trigger element, and Radix
 * has nothing to return focus to: it would land on `<body>` and a keyboard user
 * would lose their place in the page. So the element that had focus when the
 * dialog opened is captured and restored explicitly in `onCloseAutoFocus`, with
 * a test that fails if the restore is removed.
 *
 * ESCAPE AND OVERLAY DISMISSAL ARE ALWAYS ENABLED — including for destructive
 * dialogs. Blueprint v3 specified disabling them when `destructive`; that is
 * wrong for a CONFIRM dialog and was not adopted. Dismissing a confirm is the
 * SAFE outcome (it cancels; nothing is destroyed), and the WAI-ARIA dialog
 * pattern requires Escape to close. Trapping a keyboard user inside a delete
 * prompt to protect them from cancelling it is a hazard, not a safeguard.
 * `destructive` therefore controls exactly two things: danger styling, and
 * initial focus resting on Cancel.
 * ============================================================================
 */
import React, { useCallback, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';

import { Actions, Body, Content, Message, Overlay, TitleRow } from './SwanDialog.styles';

export interface SwanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Danger styling + initial focus on Cancel. Does NOT disable dismissal. */
  destructive?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Omit for an informational dialog: a single Close button is rendered. */
  onConfirm?: () => void | Promise<void>;
  /** Rendered between the description and the actions. */
  children?: React.ReactNode;
  /** Confirm control. Defaults to a plain button so the primitive has no hard
   *  dependency on any one button system; consumers pass their own. */
  renderConfirm?: (props: {
    onClick: () => void;
    children: React.ReactNode;
    type: 'button';
  }) => React.ReactNode;
  renderCancel?: (props: {
    onClick: () => void;
    children: React.ReactNode;
    type: 'button';
    ref: React.Ref<HTMLButtonElement>;
  }) => React.ReactNode;
}

const SwanDialog: React.FC<SwanDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  destructive = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  children,
  renderConfirm,
  renderCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  // Capture the element that had focus at open time. Radix cannot do this for
  // us without a Trigger, and our consumers are state-controlled.
  useEffect(() => {
    if (open) returnFocusTo.current = document.activeElement as HTMLElement | null;
  }, [open]);

  const restoreFocus = useCallback((event: Event) => {
    event.preventDefault(); // stop Radix's own (trigger-less) restore
    const target = returnFocusTo.current;
    // The opener may have been unmounted by the very action just confirmed —
    // e.g. the row whose delete button opened this dialog. Focusing a detached
    // node throws in some engines and silently does nothing in others, so check.
    if (target && document.contains(target) && typeof target.focus === 'function') {
      target.focus();
    }
  }, []);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleConfirm = useCallback(() => {
    // The confirm handler runs BEFORE close, and a rejected promise leaves the
    // dialog open so the user can see what failed and retry.
    const result = onConfirm?.();
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(close).catch(() => { /* stay open */ });
      return;
    }
    close();
  }, [onConfirm, close]);

  const cancelButton = renderCancel
    ? renderCancel({ onClick: close, children: cancelLabel, type: 'button', ref: cancelRef })
    : <button ref={cancelRef} type="button" onClick={close}>{cancelLabel}</button>;

  const confirmButton = onConfirm
    ? (renderConfirm
      ? renderConfirm({ onClick: handleConfirm, children: confirmLabel, type: 'button' })
      : <button type="button" onClick={handleConfirm}>{confirmLabel}</button>)
    : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Overlay />
        {/* aria-modal is set EXPLICITLY: Radix enforces modality with a focus
            scope, scroll lock and aria-hidden siblings but does not emit the
            attribute here, and the hand-rolled dialog this replaces did. Dropping
            it would be a silent a11y regression on every future consumer — the
            characterization test written before this rewrite caught exactly that. */}
        <Content
          aria-modal="true"
          onCloseAutoFocus={restoreFocus}
          aria-describedby={description ? undefined : ''}
        >
          <TitleRow $danger={destructive}>
            {destructive && <AlertTriangle size={18} aria-hidden="true" />}
            <span>{title}</span>
          </TitleRow>
          {description ? <Message>{description}</Message> : null}
          {children ? <Body>{children}</Body> : null}
          <Actions>
            {cancelButton}
            {confirmButton}
          </Actions>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SwanDialog;
