/**
 * Accessible media preview for Creative Gallery items.
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import {
  ClosePreviewButton,
  PreviewBackdrop,
  PreviewDialog,
  PreviewImage,
  PreviewMediaFrame,
  PreviewTitle,
  PreviewVideo,
} from './CreativeGalleryModal.styles';
import { normalizeCreativeMediaTitle } from './CreativeGallery.data';
import type { CreativeMediaItem } from './CreativeGallery.types';
import { sanitizeImageUrl } from '../../../utils/imageUrl';

interface CreativeGalleryModalProps {
  item: CreativeMediaItem | null;
  onClose: () => void;
}

function createPreviewTitleId(value: string): string {
  const safeId = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'media';
  return `creative-gallery-preview-${safeId}`;
}

const CreativeGalleryModal: React.FC<CreativeGalleryModalProps> = ({ item, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const safeSourceUrl = item ? sanitizeImageUrl(item.sourceUrl) : null;
  const title = item ? normalizeCreativeMediaTitle(item.title) : '';

  useEffect(() => {
    if (!item || !safeSourceUrl) return undefined;

    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (returnFocusTo?.isConnected) {
        returnFocusTo.focus();
      }
    };
  }, [item, onClose, safeSourceUrl]);

  if (!item || !safeSourceUrl) return null;

  const titleId = createPreviewTitleId(item.id);

  return (
    <PreviewBackdrop
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <PreviewDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(event) => event.stopPropagation()}
      >
        <ClosePreviewButton
          ref={closeButtonRef}
          type="button"
          aria-label="Close creative media preview"
          onClick={onClose}
        >
          <X size={22} aria-hidden="true" />
        </ClosePreviewButton>
        <PreviewTitle id={titleId}>{title}</PreviewTitle>
        <PreviewMediaFrame>
          {item.mediaKind === 'video' ? (
            <PreviewVideo src={safeSourceUrl} controls playsInline preload="metadata" aria-label={title} />
          ) : (
            <PreviewImage src={safeSourceUrl} alt={title} />
          )}
        </PreviewMediaFrame>
      </PreviewDialog>
    </PreviewBackdrop>
  );
};

export default CreativeGalleryModal;
