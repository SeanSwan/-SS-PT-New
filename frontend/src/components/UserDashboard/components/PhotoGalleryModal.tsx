import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CloseButton, ModalImage, PhotoModal } from './PhotoGalleryModal.styles';
import type { PhotoItem } from './PhotoGallery.types';

interface PhotoGalleryModalProps {
  photo: PhotoItem | null;
  onClose: () => void;
}

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ photo, onClose }) => (
  <AnimatePresence>
    {photo && (
      <PhotoModal
        role="dialog"
        aria-modal="true"
        aria-label={`Photo preview: ${photo.title}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <ModalImage src={photo.url} alt={photo.title} onClick={(event) => event.stopPropagation()} />
        <CloseButton type="button" aria-label="Close photo preview" onClick={onClose} whileHover={{ scale: 1.1 }}>
          <X size={24} />
        </CloseButton>
      </PhotoModal>
    )}
  </AnimatePresence>
);

export default PhotoGalleryModal;
