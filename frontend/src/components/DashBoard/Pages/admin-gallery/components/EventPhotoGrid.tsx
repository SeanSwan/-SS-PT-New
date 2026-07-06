/**
 * EventPhotoGrid — the selected event's photos
 * ============================================
 * Responsive tile grid using thumbnailUrl (falls back to url). Click a tile to
 * open the lightbox; the corner button deletes. Open + delete are SIBLING
 * buttons (never nested) for valid DOM. Grid auto-fills wide monitors.
 */

import React from 'react';
import styled from 'styled-components';
import { ImageOff, Trash2 } from 'lucide-react';
import type { GalleryPhoto } from '../types';
import { EmptyState, ErrorText, Panel, SectionTitle, Spinner } from '../styles';

interface Props {
  photos: GalleryPhoto[];
  loading: boolean;
  error: string | null;
  onOpen: (photo: GalleryPhoto) => void;
  onDelete: (photo: GalleryPhoto) => void;
}

const EventPhotoGrid: React.FC<Props> = ({ photos, loading, error, onOpen, onDelete }) => (
  <Panel>
    <SectionTitle>Photos {photos.length > 0 && <Count>{photos.length}</Count>}</SectionTitle>

    {loading && <Loading><Spinner /> Loading photos…</Loading>}
    {error && <ErrorText role="alert">{error}</ErrorText>}
    {!loading && !error && photos.length === 0 && (
      <EmptyState><ImageOff size={24} aria-hidden="true" />No photos yet. Upload a shoot above.</EmptyState>
    )}

    {photos.length > 0 && (
      <Grid>
        {photos.map((photo) => (
          <Tile key={photo.id}>
            <OpenBtn type="button" onClick={() => onOpen(photo)} aria-label={`Open photo ${photo.photoNumber}`}>
              <Thumb
                src={photo.thumbnailUrl || photo.url}
                loading="lazy"
                alt={photo.displayName || `Photo ${photo.photoNumber}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }}
              />
              <Num>#{photo.photoNumber}</Num>
            </OpenBtn>
            <DeleteBtn type="button" onClick={() => onDelete(photo)} aria-label={`Delete photo ${photo.photoNumber}`}>
              <Trash2 size={16} />
            </DeleteBtn>
          </Tile>
        ))}
      </Grid>
    )}
  </Panel>
);

const Count = styled.span`
  font-size: 0.75rem; color: var(--text-muted, #8fa3b8);
  background: var(--surface-dark, #1a1a24); border-radius: 999px; padding: 0.1rem 0.5rem;
`;

const Loading = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--text-muted, #8fa3b8); font-size: 0.9rem; padding: 0.5rem 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const Tile = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));
  background: var(--surface-dark, #1a1a24);
`;

const OpenBtn = styled.button`
  display: block; width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-purple, #8b5cf6); outline-offset: -2px; }
`;

const Thumb = styled.img`
  width: 100%; height: 100%; object-fit: cover; display: block;
  @media (prefers-reduced-motion: no-preference) { transition: transform 0.3s ease; }
  ${OpenBtn}:hover & { transform: scale(1.05); }
`;

const Num = styled.span`
  position: absolute; left: 6px; bottom: 6px;
  font-family: 'Fira Code', monospace; font-size: 0.68rem;
  padding: 0.1rem 0.4rem; border-radius: 6px;
  background: rgba(3, 7, 18, 0.7); color: var(--text-primary, #e0ecf4);
`;

const DeleteBtn = styled.button`
  position: absolute; top: 6px; right: 6px;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; border: none; cursor: pointer;
  background: rgba(3, 7, 18, 0.72); color: var(--danger, #e5484d);
  opacity: 0; transition: opacity 0.18s ease;
  ${Tile}:hover &, ${Tile}:focus-within & { opacity: 1; }
  &:focus-visible { opacity: 1; outline: 2px solid var(--danger, #e5484d); }
  @media (hover: none) { opacity: 1; } /* always visible on touch */
`;

export default EventPhotoGrid;
