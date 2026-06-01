import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import styled from 'styled-components';

interface ModerationConfirmDialogProps {
  busy: boolean;
  postPreview: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, var(--obsidian-black, #0A0A0F) 74%, transparent);
  backdrop-filter: blur(18px);
`;

const Dialog = styled.div`
  width: min(460px, 100%);
  border: 1px solid color-mix(in srgb, var(--error, #EF4444) 30%, transparent);
  border-radius: 16px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--graphite, #1A1A24) 92%, transparent), var(--obsidian-black, #0A0A0F)),
    var(--graphite, #1A1A24);
  box-shadow: 0 24px 70px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 68%, transparent);
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;

  svg {
    color: var(--error, #EF4444);
    flex: 0 0 auto;
  }
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.div`
  display: grid;
  gap: 12px;
  color: var(--text-secondary, #B6C2CC);
  font-size: 0.92rem;
  line-height: 1.55;
`;

const Preview = styled.div`
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--midnight-sapphire, #002060) 35%, transparent);
  padding: 12px 14px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;

  @media (max-width: 520px) {
    flex-direction: column-reverse;
  }
`;

const Button = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  border: 1px solid ${({ $danger }) => (
    $danger
      ? 'color-mix(in srgb, var(--error, #EF4444) 42%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent)'
  )};
  border-radius: 10px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: ${({ $danger }) => (
    $danger
      ? 'color-mix(in srgb, var(--error, #EF4444) 20%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent)'
  )};
  color: ${({ $danger }) => ($danger ? 'var(--error-text, #FECACA)' : 'var(--text-primary, #E0ECF4)')};
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ $danger }) => ($danger ? 'var(--error, #EF4444)' : 'var(--accent-primary, #60C0F0)')};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: progress;
    opacity: 0.68;
  }
`;

const ModerationConfirmDialog: React.FC<ModerationConfirmDialogProps> = ({
  busy,
  postPreview,
  onCancel,
  onConfirm,
}) => {
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target && !busy) {
      onCancel();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Dialog role="dialog" aria-modal="true" aria-labelledby="moderation-delete-title">
        <Header>
          <AlertTriangle size={22} />
          <Title id="moderation-delete-title">Delete moderation post?</Title>
        </Header>
        <Body>
          <span>This removes the post from the admin moderation queue and marks the content as deleted.</span>
          <Preview>{postPreview || 'No post preview available.'}</Preview>
        </Body>
        <Actions>
          <Button type="button" onClick={onCancel} disabled={busy}>
            Keep post
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-label="Confirm delete moderation post"
            $danger
          >
            <Trash2 size={16} />
            {busy ? 'Deleting...' : 'Delete post'}
          </Button>
        </Actions>
      </Dialog>
    </Overlay>
  );
};

export default ModerationConfirmDialog;
