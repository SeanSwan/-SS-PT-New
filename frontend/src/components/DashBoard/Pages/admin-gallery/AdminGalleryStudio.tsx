/**
 * AdminGalleryStudio
 * ==================
 * Admin surface for PHOTOSHOOT passcode galleries (distinct from the client
 * progress-photo manager at /photos and the public GalleryPage at /gallery).
 * Create a passcode-protected event, batch-upload the shoot, review/delete
 * photos. Talks to the LIVE backend at /api/admin/gallery/*.
 *
 * Route: /dashboard/admin/gallery (admin|trainer gated).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useGalleryEvents } from './hooks/useGalleryEvents';
import { useGalleryUpload } from './hooks/useGalleryUpload';
import { useEventPhotos } from './hooks/useEventPhotos';
import StorageBanner from './components/StorageBanner';
import GalleryStatsRow from './components/GalleryStatsRow';
import CreateEventForm from './components/CreateEventForm';
import EventList from './components/EventList';
import PhotoUploader from './components/PhotoUploader';
import EventPhotoGrid from './components/EventPhotoGrid';
import Lightbox from './components/Lightbox';
import ConfirmModal, { type ConfirmRequest } from './components/ConfirmModal';
import {
  Banner, EmptyState, MainArea, Panel, PageHeader, PageSubtitle, PageTitle, PageWrap, Rail, SectionTitle, TwoColLayout,
} from './styles';
import type { GalleryEvent, GalleryPhoto } from './types';

const AdminGalleryStudio: React.FC = () => {
  const events = useGalleryEvents();
  const upload = useGalleryUpload();
  const photos = useEventPhotos();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const selectedIdRef = useRef<number | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const selectedEvent = events.events.find((e) => e.id === selectedId) ?? null;

  const selectEvent = (event: GalleryEvent) => {
    setSelectedId(event.id);
    setLightboxIndex(null);
    upload.reset();
    void photos.load(event.id);
  };

  const syncCount = (eventId: number) => { void events.recount(eventId).catch(() => undefined); };

  // Only insert into the grid if the user hasn't switched galleries mid-upload.
  const insertIfCurrent = (eventId: number) => (photo: GalleryPhoto) => {
    if (selectedIdRef.current === eventId) photos.addPhoto(photo);
  };

  const handleFiles = (files: File[]) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    void upload.start(id, files, watermark, insertIfCurrent(id)).then(() => syncCount(id));
  };

  const handleRetry = () => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    void upload.retryFailed(id, watermark, insertIfCurrent(id)).then(() => syncCount(id));
  };

  const confirmDeletePhoto = (photo: GalleryPhoto) => setConfirm({
    title: 'Delete this photo?',
    message: `Photo #${photo.photoNumber} will be permanently removed from this gallery.`,
    confirmLabel: 'Delete photo',
    cancelLabel: 'Keep it',
    tone: 'danger',
    onConfirm: () => {
      if (!selectedEvent) return;
      const id = selectedEvent.id;
      void photos.removePhoto(photo.id).then(() => syncCount(id));
    },
  });

  const confirmDeleteEvent = (event: GalleryEvent) => setConfirm({
    title: 'Delete this gallery?',
    message: `“${event.name}” and all ${event.photoCount} of its photos will be permanently deleted. This cannot be undone.`,
    confirmLabel: 'Delete gallery',
    cancelLabel: 'Keep gallery',
    tone: 'danger',
    onConfirm: () => {
      void events.removeEvent(event.id).then(() => {
        if (selectedIdRef.current === event.id) { setSelectedId(null); photos.clear(); }
      }).catch(() => undefined);
    },
  });

  const openLightbox = (photo: GalleryPhoto) => {
    const idx = photos.photos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setLightboxIndex(idx);
  };
  const lightboxPhoto = lightboxIndex != null ? photos.photos[lightboxIndex] ?? null : null;

  return (
    <PageWrap>
      <PageHeader>
        <div>
          <PageTitle><Camera size={26} aria-hidden="true" style={{ verticalAlign: '-4px', marginRight: 8 }} />Photo Gallery Studio</PageTitle>
          <PageSubtitle>
            Create passcode-protected photoshoot galleries and batch-upload a client&apos;s shoot. Clients unlock with
            their email + your passcode at the public gallery.
          </PageSubtitle>
        </div>
      </PageHeader>

      <StorageBanner storageType={events.stats?.storageType} />
      <GalleryStatsRow stats={events.stats} />
      {events.error && <Banner $tone="error" role="alert">{events.error}</Banner>}

      <TwoColLayout>
        <Rail>
          <CreateEventForm onCreate={events.createEvent} onCreated={selectEvent} />
          <EventList
            events={events.events}
            selectedId={selectedId}
            loading={events.loading}
            error={null}
            onSelect={selectEvent}
            onTogglePublish={events.togglePublish}
            onRecount={syncCount}
            onDelete={confirmDeleteEvent}
          />
        </Rail>

        <MainArea>
          {selectedEvent ? (
            <>
              <PhotoUploader
                eventName={selectedEvent.name}
                watermark={watermark}
                onWatermarkChange={setWatermark}
                fileStatuses={upload.fileStatuses}
                uploading={upload.uploading}
                overallProgress={upload.overallProgress}
                resultMessage={upload.resultMessage}
                failedCount={upload.failedCount}
                onFiles={handleFiles}
                onCancel={upload.cancel}
                onRetry={handleRetry}
              />
              <EventPhotoGrid
                photos={photos.photos}
                loading={photos.loading}
                error={photos.error}
                onOpen={openLightbox}
                onDelete={confirmDeletePhoto}
              />
            </>
          ) : (
            <Panel>
              <SectionTitle>Select a gallery</SectionTitle>
              <EmptyState>
                Pick a gallery on the left to upload and manage its photos — or create a new one to get started.
              </EmptyState>
            </Panel>
          )}
        </MainArea>
      </TwoColLayout>

      <Lightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxIndex(null)}
        hasPrev={lightboxIndex != null && lightboxIndex > 0}
        hasNext={lightboxIndex != null && lightboxIndex < photos.photos.length - 1}
        onPrev={() => setLightboxIndex((i) => (i != null ? Math.max(0, i - 1) : i))}
        onNext={() => setLightboxIndex((i) => (i != null ? Math.min(photos.photos.length - 1, i + 1) : i))}
      />

      <ConfirmModal request={confirm} onClose={() => setConfirm(null)} />
    </PageWrap>
  );
};

export default AdminGalleryStudio;
