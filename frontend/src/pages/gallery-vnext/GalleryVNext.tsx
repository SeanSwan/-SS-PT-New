/**
 * Gallery vNext — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve and
 * `[data-style-lens-shell]` exists for the gate's contract probe), then the `.gallery-vnext-shell` scope.
 *
 * DESIGN-ONLY + FULL PARITY: binds the real money path (`/api/gallery/*` via the vNext hooks) and reuses
 * every money/support modal bind-only. Behavior parity with the shipped page: vip=success return,
 * signup-redirect state, browser-back closes the lightbox, 24-per-batch progressive load, download-all,
 * the post-enhancement support chain, and the VIP branch for signed-in clients with sessions (→ /store).
 * Kimi's IA: photos-first; the gate is the setup; the shipped Crystallize fires once on unlock (LAW 5).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PhotoDetailModal from '../gallery/PhotoDetailModal';
import { CheckoutToast } from './CheckoutToast';
import { CreditPill } from './CreditPill';
import { downloadPhoto } from './downloadPhoto';
import { downloadAllUrl } from './gallery.api';
import { EventsView } from './EventsView';
import { PhotosView } from './PhotosView';
import { GalleryLensFrame } from './galleryManifest';
import { GalleryVNextModals } from './GalleryVNextModals';
import { GateCard } from './GateCard';
import { GalleryVNextTokens } from './gallery.tokens';
import { CrystallizeOverlay, useCrystallizeTransition } from './lensBindings';
import { useGalleryCredits } from './useGalleryCredits';
import { useGallerySession } from './useGallerySession';
import { useGalleryToast } from './useGalleryToast';
import { useGalleryVotes } from './useGalleryVotes';
import { useLightboxHistory } from './useLightboxHistory';
import { Content, GateWrap, Shell } from './GalleryVNext.styles';

const PHOTOS_PER_BATCH = 24; // parity with the shipped grid loader

interface RootState {
  auth?: { user?: { availableSessions?: number } };
}

export default function GalleryVNext() {
  const { slug = '' } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useSelector((state: RootState) => state.auth?.user);
  const session = useGallerySession(slug);
  const toast = useGalleryToast();
  const credits = useGalleryCredits(session.galleryToken, toast.showToast);
  const votes = useGalleryVotes(slug, session.galleryToken);
  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'gallery.reveal' });
  const { lightboxIndex, setLightboxIndex, openPhoto, closeLightbox } = useLightboxHistory();

  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_BATCH);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showVip, setShowVip] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Container/viewport measurement for the justified row math.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setContainerWidth(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // VIP checkout return + signup-redirect state (parity: GalleryPage.tsx:1214-1227).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vip') === 'success') setShowVip(true);
    const state = location.state as { showVipModal?: boolean } | null;
    if (state?.showVipModal) {
      setShowVip(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // New event → reset the progressive batch.
  useEffect(() => {
    setVisibleCount(PHOTOS_PER_BATCH);
  }, [session.selectedEvent?.id]);

  const handleGateSubmit = useCallback(
    async (input: Parameters<typeof session.submitGate>[0]) => {
      const ok = await session.submitGate(input);
      // Confirm-first: the signature moment plays only after the session is genuinely established.
      if (ok) {
        crystallizeTo(() => {}, { settleAnnouncement: 'Gallery unlocked' });
        toast.showToast();
      }
    },
    [session, crystallizeTo, toast],
  );

  const handleEnhance = useCallback(
    (photoId: number) => {
      void credits.enhance([photoId]).then((outcome) => {
        if (outcome === 'credits_required') setShowUpgrade(true);
        if (outcome === 'ok') setShowSupport(true); // parity: post-enhancement support chain
      });
    },
    [credits],
  );

  const handleDownload = useCallback(
    (photoId: number) => {
      const target = session.photos.find((p) => p.id === photoId);
      if (target && session.galleryToken) void downloadPhoto(session.galleryToken, target);
    },
    [session.photos, session.galleryToken],
  );

  // Whole-event ZIP via direct anchor navigation (parity: GalleryPage.tsx:1694-1711).
  const handleDownloadAll = useCallback(() => {
    const eventSlug = session.selectedEvent?.slug || slug || session.gateSlug;
    if (!session.galleryToken || downloadingAll || !eventSlug) return;
    setDownloadingAll(true);
    try {
      const link = document.createElement('a');
      link.href = downloadAllUrl(eventSlug, session.galleryToken);
      link.download = `${eventSlug}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      window.setTimeout(() => setDownloadingAll(false), 4000);
    }
  }, [session.selectedEvent, session.galleryToken, session.gateSlug, slug, downloadingAll]);

  // VIP entry: signed-in clients with available sessions route to the store (parity: :1912-1918).
  const handleOpenVip = useCallback(() => {
    if (authUser?.availableSessions && authUser.availableSessions > 0) navigate('/store');
    else setShowVip(true);
  }, [authUser, navigate]);

  const handleBack = useCallback(() => {
    session.exitGallery();
    setLightboxIndex(null);
    setShowSupport(false);
    navigate('/gallery', { replace: true });
  }, [session, navigate, setLightboxIndex]);

  const totalPhotos = session.photos.length;
  const handleLoadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PHOTOS_PER_BATCH, totalPhotos));
  }, [totalPhotos]);

  const activePhoto = lightboxIndex !== null ? session.photos[lightboxIndex] ?? null : null;
  const gated = Boolean(session.galleryToken);
  const eventSlug = session.selectedEvent?.slug || slug || session.gateSlug;

  return (
    <GalleryLensFrame>
      <GalleryVNextTokens />
      <div className="gallery-vnext-shell" data-testid="gallery-vnext-shell">
        <Shell>
          <Content ref={contentRef}>
            {/* The gate REPLACES the list (parity with the shipped overlay: the unlock is the whole moment,
                never a card buried below the fold). */}
            {!gated && !session.showGate && (
              <EventsView
                events={session.events}
                loading={session.loading}
                error={session.error}
                onOpenEvent={(event) => {
                  session.openEvent(event);
                  navigate(`/gallery/${event.slug}`, { replace: true });
                }}
                onRetry={session.reloadEvents}
              />
            )}

            {!gated && session.showGate && (
              <GateWrap>
                <GateCard
                  eventName={session.selectedEvent?.name}
                  loading={session.gateLoading}
                  error={session.gateError}
                  onSubmit={handleGateSubmit}
                  onBack={() => {
                    session.dismissGate();
                    navigate('/gallery', { replace: true });
                  }}
                />
              </GateWrap>
            )}

            {gated && (
              <PhotosView
                event={session.selectedEvent}
                photos={session.photos}
                photosLoaded={session.photosLoaded}
                visibleCount={visibleCount}
                containerWidth={containerWidth}
                viewportWidth={viewportWidth}
                error={session.error}
                freeCredits={credits.credits.freeRemaining}
                downloadingAll={downloadingAll}
                showSupport={showSupport}
                onLoadMore={handleLoadMore}
                onOpenPhoto={(photo) => openPhoto(photo, session.photos)}
                onBack={handleBack}
                onDownloadAll={handleDownloadAll}
                onOpenMessage={() => setShowMessage(true)}
                onOpenDonation={() => setShowDonation(true)}
                onOpenVip={handleOpenVip}
                onSupportRefer={() => { setShowSupport(false); setShowReferral(true); }}
                onSupportTip={() => { setShowSupport(false); setShowDonation(true); }}
                onSupportDismiss={() => setShowSupport(false)}
                onRetry={session.retryPhotos}
              />
            )}
          </Content>
        </Shell>

        {/* Credits are a post-gate concept only (Kimi Q4); pill hides while the lightbox is open (parity). */}
        {gated && lightboxIndex === null && (
          <CreditPill credits={credits.credits} onUpgrade={() => setShowUpgrade(true)} />
        )}

        <CheckoutToast
          message={toast.message}
          visible={toast.visible}
          exiting={toast.exiting}
          onDismiss={toast.dismiss}
        />

        {gated && (
          <GalleryVNextModals
            email={session.gateEmail}
            galleryToken={session.galleryToken || ''}
            eventSlug={eventSlug}
            showUpgrade={showUpgrade}
            showVip={showVip}
            showMessage={showMessage}
            showDonation={showDonation}
            showReferral={showReferral}
            purchaseLoading={credits.purchaseLoading}
            onPurchase={(pkg) => void credits.purchase(pkg)}
            onCloseUpgrade={() => setShowUpgrade(false)}
            onUpgradeVip={() => { setShowUpgrade(false); setShowVip(true); }}
            onUpgradeReferral={() => { setShowUpgrade(false); setShowReferral(true); }}
            onCloseVip={() => setShowVip(false)}
            onCloseMessage={() => setShowMessage(false)}
            onCloseDonation={() => setShowDonation(false)}
            onCloseReferral={() => setShowReferral(false)}
            onCreditsRefresh={() => void credits.refresh()}
          />
        )}

        <PhotoDetailModal
          isOpen={activePhoto !== null}
          photo={activePhoto}
          photoIndex={lightboxIndex ?? 0}
          totalPhotos={session.photos.length}
          credits={credits.credits}
          voteData={activePhoto ? votes.votesMap[activePhoto.id] || null : null}
          onClose={closeLightbox}
          onPrev={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() =>
            setLightboxIndex((i) => (i !== null && i < session.photos.length - 1 ? i + 1 : i))
          }
          onDownloadOriginal={handleDownload}
          onRequestEnhancement={handleEnhance}
          onVote={votes.vote}
          onUpgrade={() => setShowUpgrade(true)}
          downloadUrl={activePhoto?.url ?? ''}
          enhancementRequested={false}
          galleryToken={session.galleryToken || undefined}
          printStorefrontEnabled={session.printStorefrontEnabled}
        />

        <CrystallizeOverlay {...overlayProps} />
      </div>
    </GalleryLensFrame>
  );
}
