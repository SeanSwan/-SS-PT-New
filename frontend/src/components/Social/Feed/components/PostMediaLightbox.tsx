import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cssUrlValue, sanitizeImageUrl } from '../../../../utils/imageUrl';
import {
  CloseButton,
  FullImage,
  LightboxFrame,
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
  const safeSrc = sanitizeImageUrl(src);
  const backdropStyle = safeSrc ? ({
    '--post-lightbox-backdrop-image': `url(${cssUrlValue(safeSrc)})`,
  } as React.CSSProperties & Record<'--post-lightbox-backdrop-image', string>) : undefined;

  useEffect(() => {
    if (!open || !safeSrc) return undefined;
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
  }, [onClose, open, safeSrc]);

  if (!open || !safeSrc) return null;

  return (
    <LightboxOverlay style={backdropStyle} onMouseDown={onClose}>
      <LightboxFrame
        role="dialog"
        aria-modal="true"
        aria-label="Full post image"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <CloseButton ref={closeButtonRef} type="button" aria-label="Close full image" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </CloseButton>
        <FullImage src={safeSrc} alt={`Full post image: ${alt}`} />
      </LightboxFrame>
    </LightboxOverlay>
  );
};

export default React.memo(PostMediaLightbox);