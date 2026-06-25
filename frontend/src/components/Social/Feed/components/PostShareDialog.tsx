import React from 'react';
import {
  ContainedButton,
  ModalActions,
  ModalBody,
  ModalBodyText,
  ModalContent,
  ModalInputReadonly,
  ModalTitle,
  Overlay,
  PlainButton,
} from '../styles/PostCardStyles';
import { buildSocialPostShareUrl } from '../../../../utils/socialPostShareUrl';

interface PostShareDialogProps {
  postId: string;
  canRepost: boolean;
  onClose: () => void;
  onRepost: () => void;
}

const postUrl = (postId: string) => buildSocialPostShareUrl(postId);

const PostShareDialog: React.FC<PostShareDialogProps> = ({
  postId,
  canRepost,
  onClose,
  onRepost,
}) => {
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl(postId));
    onClose();
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalTitle id="post-share-title">Share Post</ModalTitle>
        <ModalBody>
          <ModalBodyText>
            Share this post with friends or on other platforms.
          </ModalBodyText>
          <ModalInputReadonly
            readOnly
            value={postUrl(postId)}
            onFocus={(event) => event.target.select()}
          />
        </ModalBody>
        <ModalActions>
          <PlainButton type="button" onClick={onClose}>
            Cancel
          </PlainButton>
          {canRepost && (
            <ContainedButton type="button" onClick={onRepost}>
              Repost to Feed
            </ContainedButton>
          )}
          <ContainedButton type="button" onClick={handleCopyLink}>
            Copy Link
          </ContainedButton>
        </ModalActions>
      </ModalContent>
    </Overlay>
  );
};

export default PostShareDialog;
