/**
 * Lightbox — full-size photo view
 * ===============================
 * Shows the full-resolution `url`. Escape / backdrop / X to close, arrow keys +
 * on-screen arrows to page through the event when nav handlers are provided.
 */

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryPhoto } from '../types';

interface Props {
  photo: GalleryPhoto | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const Lightbox: React.FC<Props> = ({ photo, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  useEffect(() => {
    if (!photo) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [photo, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!photo) return null;

  return (
    <Backdrop onClick={onClose}>
      <CloseBtn type="button" onClick={onClose} aria-label="Close photo"><X size={22} /></CloseBtn>
      {hasPrev && (
        <NavBtn $side="left" type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); onPrev?.(); }}>
          <ChevronLeft size={26} />
        </NavBtn>
      )}
      <Frame onClick={(e) => e.stopPropagation()}>
        <FullImg src={photo.url} alt={photo.displayName || `Photo ${photo.photoNumber}`} />
        <Caption>#{photo.photoNumber} · {photo.displayName}</Caption>
      </Frame>
      {hasNext && (
        <NavBtn $side="right" type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); onNext?.(); }}>
          <ChevronRight size={26} />
        </NavBtn>
      )}
    </Backdrop>
  );
};

const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 2300;
  display: flex; align-items: center; justify-content: center; padding: 2rem 1rem;
  background: rgba(3, 7, 18, 0.9); backdrop-filter: blur(6px);
`;

const Frame = styled.figure`
  margin: 0; display: flex; flex-direction: column; gap: 0.6rem; align-items: center;
  max-width: min(1200px, 92vw); max-height: 88vh;
`;

const FullImg = styled.img`
  max-width: 100%; max-height: 78vh; object-fit: contain;
  border-radius: 10px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
`;

const Caption = styled.figcaption`
  font-size: 0.85rem; color: var(--text-muted, #8fa3b8);
  font-family: 'Fira Code', monospace;
`;

const CloseBtn = styled.button`
  position: absolute; top: 1rem; right: 1rem;
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  border-radius: 10px; border: none; cursor: pointer;
  background: var(--surface-dark, #1a1a24); color: var(--text-primary, #e0ecf4);
  &:focus-visible { outline: 2px solid var(--accent-purple, #8b5cf6); }
`;

const NavBtn = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute; ${({ $side }) => $side}: 1rem; top: 50%; transform: translateY(-50%);
  width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; border: none; cursor: pointer;
  background: var(--surface-dark, #1a1a24); color: var(--text-primary, #e0ecf4);
  &:focus-visible { outline: 2px solid var(--accent-purple, #8b5cf6); }
`;

export default Lightbox;
