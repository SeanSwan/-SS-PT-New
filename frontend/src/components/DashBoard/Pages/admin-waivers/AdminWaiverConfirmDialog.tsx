/**
 * AdminWaiverConfirmDialog.tsx
 *
 * Branded confirmation surface for admin waiver legal/compliance actions.
 * Replaces browser-native confirms with an accessible dark-first dialog.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, X } from 'lucide-react';

export interface AdminWaiverConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'warning' | 'danger';
  onConfirm: () => void | Promise<void>;
}

interface AdminWaiverConfirmDialogProps {
  request: AdminWaiverConfirmRequest | null;
  onClose: () => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, var(--bg-base, #030712) 78%, transparent);
  backdrop-filter: blur(12px);
`;

const Dialog = styled.div`
  width: min(460px, 100%);
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.24));
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--danger, #C92A54) 11%, transparent),
      transparent 42%
    ),
    var(--bg-surface, #141419);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.52);
  color: var(--text-primary, #E0ECF4);
  padding: 18px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const IconWrap = styled.div<{ $tone: 'warning' | 'danger' }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: ${({ $tone }) =>
    $tone === 'danger'
      ? 'var(--danger, #C92A54)'
      : 'var(--accent-gold, #C6A84B)'};
  background: ${({ $tone }) =>
    $tone === 'danger'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 14%, transparent)'
      : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'};
  border: 1px solid ${({ $tone }) =>
    $tone === 'danger'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 32%, transparent)'
      : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent)'};
`;

const CopyBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  line-height: 1.25;
  color: var(--text-primary, #E0ECF4);
`;

const Message = styled.p`
  margin: 8px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.55;
`;

const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  cursor: pointer;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
`;

const ActionButton = styled.button<{ $primary?: boolean; $tone: 'warning' | 'danger' }>`
  min-height: 44px;
  min-width: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid ${({ $primary, $tone }) =>
    $primary
      ? ($tone === 'danger'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 48%, transparent)'
        : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 48%, transparent)')
      : 'var(--border-soft, rgba(96, 192, 240, 0.2))'};
  background: ${({ $primary, $tone }) =>
    $primary
      ? ($tone === 'danger'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 18%, var(--bg-elevated, #1A1A24))'
        : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, var(--bg-elevated, #1A1A24))')
      : 'var(--bg-elevated, #1A1A24)'};
  color: ${({ $primary, $tone }) =>
    $primary
      ? ($tone === 'danger'
        ? 'var(--danger, #C92A54)'
        : 'var(--accent-gold, #C6A84B)')
      : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const AdminWaiverConfirmDialog: React.FC<AdminWaiverConfirmDialogProps> = ({
  request,
  onClose,
}) => {
  const [confirming, setConfirming] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const tone = request?.tone || 'danger';

  useEffect(() => {
    if (request) {
      cancelButtonRef.current?.focus();
    }
  }, [request]);

  const handleConfirm = useCallback(async () => {
    if (!request || confirming) return;
    setConfirming(true);
    try {
      await request.onConfirm();
      onClose();
    } catch {
      // Deliberate swallow: `onConfirm` rethrows only AFTER the caller has
      // surfaced the failure to the admin (see AdminWaiversManager's revoke
      // handler). The rethrow's job is to keep this dialog OPEN so the action
      // can be retried; without this catch it also became an unhandled
      // promise rejection.
    } finally {
      setConfirming(false);
    }
  }, [confirming, onClose, request]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !confirming) {
      event.preventDefault();
      onClose();
    }
  }, [confirming, onClose]);

  if (!request) return null;

  return (
    <Overlay role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !confirming) onClose();
    }}>
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-waiver-confirm-title"
        onKeyDownCapture={handleKeyDown}
      >
        <Header>
          <IconWrap $tone={tone} aria-hidden="true">
            <AlertTriangle size={20} />
          </IconWrap>
          <CopyBlock>
            <Title id="admin-waiver-confirm-title">{request.title}</Title>
            <Message>{request.message}</Message>
          </CopyBlock>
          <CloseButton type="button" onClick={onClose} disabled={confirming} aria-label="Close confirmation">
            <X size={18} />
          </CloseButton>
        </Header>
        <ActionRow>
          <ActionButton
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={confirming}
            $tone={tone}
          >
            {request.cancelLabel || 'Cancel'}
          </ActionButton>
          <ActionButton
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            $primary
            $tone={tone}
          >
            {confirming ? 'Working...' : request.confirmLabel}
          </ActionButton>
        </ActionRow>
      </Dialog>
    </Overlay>
  );
};

export default AdminWaiverConfirmDialog;
