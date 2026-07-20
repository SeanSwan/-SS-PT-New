/**
 * Gallery vNext — gated photos view. PARITY with the shipped grid view (GalleryPage.tsx:1868-2058):
 * back-to-events, event header + date/location/count + "All free to download", the photographer note with
 * attribution, the Download-All ZIP bar, the GalleryInfoCard actions (message / donation / VIP), the
 * justified grid (batched 24 at a time with an IntersectionObserver sentinel, like the shipped page), the
 * post-enhancement SupportSheet, and designed empty/error/skeleton states with one recovery CTA (Kimi b7).
 */
import { useEffect, useRef } from 'react';
import GalleryInfoCard from '../gallery/GalleryInfoCard';
import { JustifiedGrid } from './JustifiedGrid';
import { SupportSheet } from './SupportSheet';
import {
  Attribution,
  BackLink,
  DownloadAllBar,
  DownloadAllButton,
  DownloadAllHint,
  PhotographerNote,
  SkeletonRow,
  SkeletonTile,
} from './GalleryVNext.chrome.styles';
import { RetryBtn, State, Sub, Title } from './GalleryVNext.styles';
import type { GalleryEventSummary, GalleryPhoto } from './gallery.types';

const formatDate = (d: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

export interface PhotosViewProps {
  event: GalleryEventSummary | null;
  photos: GalleryPhoto[];
  photosLoaded: boolean;
  visibleCount: number;
  containerWidth: number;
  viewportWidth: number;
  error: string;
  freeCredits: number;
  downloadingAll: boolean;
  showSupport: boolean;
  onLoadMore(): void;
  onOpenPhoto(photo: GalleryPhoto): void;
  onBack(): void;
  onDownloadAll(): void;
  onOpenMessage(): void;
  onOpenDonation(): void;
  onOpenVip(): void;
  onSupportRefer(): void;
  onSupportTip(): void;
  onSupportDismiss(): void;
  onRetry(): void;
}

export function PhotosView(props: PhotosViewProps) {
  const {
    event, photos, photosLoaded, visibleCount, containerWidth, viewportWidth, error, freeCredits,
    downloadingAll, showSupport, onLoadMore, onOpenPhoto, onBack, onDownloadAll,
    onOpenMessage, onOpenDonation, onOpenVip, onSupportRefer, onSupportTip, onSupportDismiss, onRetry,
  } = props;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const visible = photos.slice(0, visibleCount);
  const loading = !photosLoaded && !error;

  // Progressive batching sentinel (mirrors the shipped 24-per-batch loader, GalleryPage.tsx:1180-1193).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, visibleCount, photos.length]);

  return (
    <>
      <BackLink type="button" onClick={onBack}>
        ← Back to events
      </BackLink>

      {event && (
        <>
          <Title>{event.name}</Title>
          <Sub>
            {formatDate(event.eventDate)}
            {event.location ? ` · ${event.location}` : ''}
            {` · ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} · All free to download`}
          </Sub>
          {event.description && (
            <PhotographerNote>
              {event.description}
              <Attribution>— Sean Swan, SwanStudios</Attribution>
            </PhotographerNote>
          )}
        </>
      )}

      {photos.length > 0 && (
        <DownloadAllBar>
          <DownloadAllButton
            type="button"
            onClick={onDownloadAll}
            disabled={downloadingAll}
            aria-label={`Download all ${photos.length} photos as a ZIP file`}
          >
            {downloadingAll ? 'Preparing ZIP…' : `Download all ${photos.length} photos (ZIP)`}
          </DownloadAllButton>
          <DownloadAllHint>Free · one zip file · large galleries may take a moment</DownloadAllHint>
        </DownloadAllBar>
      )}

      {photos.length > 0 && (
        <GalleryInfoCard
          onOpenMessage={onOpenMessage}
          onOpenDonation={onOpenDonation}
          onOpenVip={onOpenVip}
          freeCredits={freeCredits}
        />
      )}

      {showSupport && (
        <SupportSheet onRefer={onSupportRefer} onTip={onSupportTip} onDismiss={onSupportDismiss} />
      )}

      {error && (
        <State role="alert">
          {error}
          <RetryBtn type="button" onClick={onRetry}>
            Try again
          </RetryBtn>
        </State>
      )}

      {loading && (
        <SkeletonRow aria-hidden="true">
          <SkeletonTile $flex={1.3} />
          <SkeletonTile $flex={1} />
          <SkeletonTile $flex={1.5} />
          <SkeletonTile $flex={1.1} />
        </SkeletonRow>
      )}

      {!error && photos.length === 0 && !loading && (
        <State>This gallery has no photos yet.</State>
      )}

      {visible.length > 0 && (
        <JustifiedGrid
          photos={visible}
          containerWidth={containerWidth}
          viewportWidth={viewportWidth}
          onOpen={onOpenPhoto}
        />
      )}

      {visibleCount < photos.length && <div ref={sentinelRef} aria-hidden="true" />}
    </>
  );
}

export default PhotosView;
