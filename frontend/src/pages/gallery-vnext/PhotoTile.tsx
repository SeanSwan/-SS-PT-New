/**
 * Gallery vNext — one justified tile. Kimi's rules, implemented:
 * - `aspect-ratio` reserved from the REAL intrinsic width/height → zero CLS as images stream in.
 * - Blur placeholder is a STATIC CSS filter on the thumbnail layer that opacity-crossfades out; we never
 *   animate `filter` (GPU-safe: transform/opacity only).
 * - No nested interactives: the open control is the only button; any future action button is a SIBLING
 *   inside the tile, never a child of the open control.
 * - `loading="lazy"` + `decoding="async"` everywhere; `fetchpriority="high"` only on the first row.
 * - Renditions per Kimi Q1: thumbnailUrl = tile + blur layer, mediumUrl = sharp layer (falls back to url).
 */
import { useState } from 'react';
import styled from 'styled-components';
import type { GalleryPhoto } from './gallery.types';

const Tile = styled.article<{ $ratio: number }>`
  position: relative;
  height: 100%;
  aspect-ratio: ${(p) => p.$ratio};
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--gallery-r-card, 12px);
  background: var(--gallery-surface-2);
  box-shadow: inset 0 0 0 1px var(--gallery-chrome-10, transparent);
`;

const OpenControl = styled.button`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  /* the tile IS the CTA (Kimi: grid -> photos are the CTA); no chrome competes with the image */
`;

const Layer = styled.img<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 240ms var(--gallery-ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 150ms;
  }
`;

/* Blur is a static filter on the placeholder only — it fades out, it never animates. */
const BlurLayer = styled(Layer)`
  filter: blur(14px) saturate(115%);
  transform: scale(1.06);
`;

export interface PhotoTileProps {
  photo: GalleryPhoto;
  ratio: number;
  /** first-row tiles get fetchpriority=high; everything else stays lazy */
  priority?: boolean;
  /** the Crystallize reveal has reached this tile */
  revealed: boolean;
  /** callback ref so the grid's IntersectionObserver can watch the tile itself (no wrapper element — a
   *  wrapper would become the flex item and break the aspect-ratio sizing) */
  tileRef?: (el: HTMLElement | null) => void;
  onOpen(photo: GalleryPhoto): void;
}

export function PhotoTile({ photo, ratio, priority = false, revealed, tileRef, onOpen }: PhotoTileProps) {
  const [sharpLoaded, setSharpLoaded] = useState(false);
  const placeholder = photo.thumbnailUrl || photo.url;
  const sharp = photo.mediumUrl || photo.url;
  const showSharp = revealed && sharpLoaded;

  return (
    <Tile $ratio={ratio} ref={tileRef} data-photo-id={photo.id} data-testid="gallery-tile">
      <BlurLayer
        src={placeholder}
        alt=""
        aria-hidden="true"
        $visible={!showSharp}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <Layer
        src={sharp}
        alt={`${photo.displayName} — frame ${photo.photoNumber}`}
        $visible={showSharp}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setSharpLoaded(true)}
      />
      <OpenControl
        type="button"
        onClick={() => onOpen(photo)}
        aria-label={`Open ${photo.displayName}, photo ${photo.photoNumber}`}
      />
    </Tile>
  );
}

export default PhotoTile;
