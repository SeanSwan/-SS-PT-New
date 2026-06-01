import React from 'react';
import {
  ContainedButton,
  ModalActions,
  ModalBody,
  ModalBodyText,
  ModalContent,
  ModalTitle,
  Overlay,
  PlainButton,
} from '../Feed/styles/PostCardStyles';

interface RemoveFriendConfirmDialogProps {
  friendName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const RemoveFriendConfirmDialog: React.FC<RemoveFriendConfirmDialogProps> = ({
  friendName,
  busy,
  onCancel,
  onConfirm,
}) => {
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !busy) {
      onCancel();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-friend-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalTitle id="remove-friend-title">Remove friend?</ModalTitle>
        <ModalBody>
          <ModalBodyText>
            {friendName} will be removed from your SwanStudios friends list.
          </ModalBodyText>
        </ModalBody>
        <ModalActions>
          <PlainButton type="button" onClick={onCancel} disabled={busy}>
            Keep friend
          </PlainButton>
          <ContainedButton type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Removing...' : 'Remove friend'}
          </ContainedButton>
        </ModalActions>
      </ModalContent>
    </Overlay>
  );
};

export default RemoveFriendConfirmDialog;
