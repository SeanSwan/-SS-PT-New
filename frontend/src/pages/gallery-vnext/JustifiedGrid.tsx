/**
 * Gallery vNext — justified grid. Consumes the PURE row math (`useJustifiedRows`) and renders each row as a
 * fixed-height flex line; tile widths fall out of `aspect-ratio` x row height, so the browser does subpixel
 * layout and there is no rounding seam. Row height is the ONLY dynamic value per row (one transient prop),
 * which keeps styled-components class churn flat even on a 200-photo event.
 *
 * Reveal: per Kimi Q2 the per-tile reveal is a 240ms opacity crossfade, IntersectionObserver-armed and
 * reveal-once, capped so at most REVEAL_BATCH tiles animate concurrently.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { PhotoTile } from './PhotoTile';
import { photoRatio, useJustifiedRows } from './useJustifiedRows';
import type { GalleryPhoto } from './gallery.types';

/** Kimi: "max 8 concurrent" reveal animations. */
const REVEAL_BATCH = 8;

const Wrap = styled.div`
  width: 100%;
`;

const Row = styled.div<{ $height: number; $gap: number }>`
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  height: ${(p) => p.$height}px;
  gap: ${(p) => p.$gap}px;
  margin-bottom: ${(p) => p.$gap}px;
  /* a ragged last row simply does not fill the line — never stretched (Kimi Q6) */
  justify-content: flex-start;
`;

export interface JustifiedGridProps {
  photos: GalleryPhoto[];
  containerWidth: number;
  viewportWidth: number;
  onOpen(photo: GalleryPhoto): void;
}

export function JustifiedGrid({ photos, containerWidth, viewportWidth, onOpen }: JustifiedGridProps) {
  const { rows, config } = useJustifiedRows(photos, containerWidth, viewportWidth);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(() => new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingRef = useRef<number[]>([]);
  /** tiles mounted BEFORE the observer exists — callback refs fire during render commit, the observer is
   *  created in an effect (after). Without this queue the initial viewport never reveals (stays blurred). */
  const preObserverQueue = useRef<HTMLElement[]>([]);

  // Flush revealed ids in capped batches so no more than REVEAL_BATCH tiles crossfade at once.
  const flush = useCallback(() => {
    if (pendingRef.current.length === 0) return;
    const batch = pendingRef.current.splice(0, REVEAL_BATCH);
    setRevealedIds((prev) => {
      const next = new Set(prev);
      batch.forEach((id) => next.add(id));
      return next;
    });
    if (pendingRef.current.length > 0) requestAnimationFrame(flush);
  }, []);

  useEffect(() => {
    // Fallback: no IntersectionObserver (old WebView / jsdom) → reveal everything, never strand a blur.
    if (typeof IntersectionObserver === 'undefined') {
      setRevealedIds(new Set(photos.map((p) => p.id)));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let queued = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = Number((entry.target as HTMLElement).dataset.photoId);
          if (!Number.isFinite(id)) continue;
          pendingRef.current.push(id);
          observer.unobserve(entry.target); // reveal-once
          queued = true;
        }
        if (queued) requestAnimationFrame(flush);
      },
      { rootMargin: '200px' },
    );
    observerRef.current = observer;
    // Observe every tile that mounted before the observer existed (the initial render batch).
    preObserverQueue.current.forEach((el) => observer.observe(el));
    preObserverQueue.current = [];
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
    // photos identity changes re-arm the fallback path only; live tiles re-attach via callback refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  const attachTile = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (observerRef.current) observerRef.current.observe(el);
    else preObserverQueue.current.push(el);
  }, []);

  return (
    <Wrap data-testid="gallery-justified-grid">
      {rows.map((row, rowIndex) => (
        <Row key={`row-${rowIndex}`} $height={row.height} $gap={config.gap}>
          {row.boxes.map((box) => (
            <PhotoTile
              key={box.photo.id}
              photo={box.photo}
              ratio={photoRatio(box.photo)}
              priority={rowIndex === 0}
              revealed={revealedIds.has(box.photo.id)}
              tileRef={attachTile}
              onOpen={onOpen}
            />
          ))}
        </Row>
      ))}
    </Wrap>
  );
}

export default JustifiedGrid;
