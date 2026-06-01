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
} from '../styles/PostCardStyles';

interface DeletePostConfirmDialogProps {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeletePostConfirmDialog: React.FC<DeletePostConfirmDialogProps> = ({
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
        aria-labelledby="delete-post-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalTitle id="delete-post-title">Delete post?</ModalTitle>
        <ModalBody>
          <ModalBodyText>
            This removes the post from the SwanStudios feed. This action cannot be undone.
          </ModalBodyText>
        </ModalBody>
        <ModalActions>
          <PlainButton type="button" onClick={onCancel} disabled={busy}>
            Keep post
          </PlainButton>
          <ContainedButton type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting...' : 'Delete post'}
          </ContainedButton>
        </ModalActions>
      </ModalContent>
    </Overlay>
  );
};

export default DeletePostConfirmDialog;
