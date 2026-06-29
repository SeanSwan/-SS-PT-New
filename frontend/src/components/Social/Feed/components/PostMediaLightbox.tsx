import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import {
  CloseButton,
  FullImage,
  LightboxActions,
  LightboxFrame,
  LightboxHeader,
  LightboxOpenLink,
  LightboxOverlay,
} from './PostMediaLightbox.styles';

interface PostMediaLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

const PostMediaLightbox: React.FC<PostMediaLightboxProps> = ({ src, alt, open, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <LightboxOverlay onClick={onClose}>
      <LightboxFrame
        role="dialog"
        aria-modal="true"
        aria-label="Full post image"
        onClick={(event) => event.stopPropagation()}
      >
        <LightboxHeader>
          <span>Image preview</span>
          <LightboxActions>
            <LightboxOpenLink href={src} target="_blank" rel="noopener noreferrer">
              Open original
              <ExternalLink size={15} aria-hidden="true" />
            </LightboxOpenLink>
            <CloseButton ref={closeButtonRef} type="button" aria-label="Close full image" onClick={onClose}>
              <X size={20} aria-hidden="true" />
            </CloseButton>
          </LightboxActions>
        </LightboxHeader>
        <FullImage src={src} alt={`Full post image: ${alt}`} loading="eager" decoding="async" />
      </LightboxFrame>
    </LightboxOverlay>,
    document.body,
  );
};

export default React.memo(PostMediaLightbox);
