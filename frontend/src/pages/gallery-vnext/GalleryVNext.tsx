/**
 * Gallery vNext — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve and
 * `[data-style-lens-shell]` exists for the gate's contract probe), then the `.gallery-vnext-shell` token scope.
 *
 * DESIGN-ONLY: it binds the real money path (`/api/gallery/*` via the vNext hooks) and NEVER redesigns it.
 * The detail/lightbox and the money modals are REUSED bind-only from `pages/gallery/*` (Sean's scope call).
 *
 * Kimi's IA: photos-first. The gate is the SETUP for the reveal — on successful unlock the shipped
 * Crystallize fires ONCE (LAW 5: consume `useCrystallizeTransition`/`CrystallizeOverlay`, never re-time it),
 * then the justified grid reveals per-tile. Per Q4, NO credit/VIP UI renders before the gate.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PhotoDetailModal from '../gallery/PhotoDetailModal';
import { CheckoutToast } from './CheckoutToast';
import { CreditPill } from './CreditPill';
import { downloadPhoto } from './downloadPhoto';
import { GalleryLensFrame } from './galleryManifest';
import { GateCard } from './GateCard';
import { GalleryVNextTokens } from './gallery.tokens';
import { JustifiedGrid } from './JustifiedGrid';
import { CrystallizeOverlay, useCrystallizeTransition } from './lensBindings';
import { useGalleryCredits } from './useGalleryCredits';
import { useGallerySession } from './useGallerySession';
import { useGalleryToast } from './useGalleryToast';
import { useGalleryVotes } from './useGalleryVotes';
import {
  Content,
  EventCard,
  EventList,
  EventMeta,
  EventName,
  GateWrap,
  Masthead,
  Shell,
  State,
  Sub,
  Title,
  UpgradeBtn,
  UpgradePanel,
} from './GalleryVNext.styles';
import type { CreditPackage, GalleryEventSummary, GalleryPhoto } from './gallery.types';

const PACKAGES: Array<{ key: CreditPackage; label: string }> = [
  { key: 'single', label: 'Single enhancement' },
  { key: 'bundle5', label: '5-pass bundle' },
  { key: 'vip', label: 'VIP — unlimited' },
];

export default function GalleryVNext() {
  const { slug = '' } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const session = useGallerySession(slug);
  const toast = useGalleryToast();
  const credits = useGalleryCredits(session.galleryToken, toast.showToast);
  const votes = useGalleryVotes(slug, session.galleryToken);
  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'gallery.reveal' });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const contentRef = useRef<HTMLDivElement>(null);

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

  const openEvent = useCallback(
    (event: GalleryEventSummary) => {
      session.openEvent(event);
      navigate(`/gallery/${event.slug}`, { replace: true });
    },
    [navigate, session],
  );

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

  const openPhoto = useCallback(
    (photo: GalleryPhoto) => {
      const idx = session.photos.findIndex((p) => p.id === photo.id);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [session.photos],
  );

  const handleEnhance = useCallback(
    (photoId: number) => {
      void credits.enhance([photoId]).then((outcome) => {
        if (outcome === 'credits_required') setShowUpgrade(true);
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

  const activePhoto = lightboxIndex !== null ? session.photos[lightboxIndex] ?? null : null;
  const gated = Boolean(session.galleryToken);
  const heading = useMemo(() => session.selectedEvent?.name ?? 'Photography', [session.selectedEvent]);

  return (
    <GalleryLensFrame>
      <GalleryVNextTokens />
      <div className="gallery-vnext-shell" data-testid="gallery-vnext-shell">
        <Shell>
          <Content ref={contentRef}>
            <Masthead>
              <Title>{heading}</Title>
              <Sub>
                {gated
                  ? 'Your gallery is open. Tap any frame to view, download, or enhance it.'
                  : 'Real moments from the floor. Pick an event to unlock its gallery.'}
              </Sub>
            </Masthead>

            {session.error && !session.loading && <State role="alert">{session.error}</State>}
            {!slug && session.loading && <State>Loading galleries…</State>}
            {!slug && !session.loading && session.events.length === 0 && !session.error && (
              <State>No galleries are published yet. Check back soon.</State>
            )}

            {!slug && session.events.length > 0 && (
              <EventList>
                {session.events.map((event) => (
                  <EventCard key={event.id} type="button" onClick={() => openEvent(event)}>
                    <EventName>{event.name}</EventName>
                    <EventMeta>
                      {event.photoCount} {event.photoCount === 1 ? 'photo' : 'photos'}
                      {event.location ? ` · ${event.location}` : ''}
                    </EventMeta>
                  </EventCard>
                ))}
              </EventList>
            )}

            {session.showGate && (
              <GateWrap>
                <GateCard
                  eventName={session.selectedEvent?.name}
                  loading={session.gateLoading}
                  error={session.gateError}
                  onSubmit={handleGateSubmit}
                />
              </GateWrap>
            )}

            {gated && session.photos.length > 0 && (
              <JustifiedGrid
                photos={session.photos}
                containerWidth={containerWidth}
                viewportWidth={viewportWidth}
                onOpen={openPhoto}
              />
            )}

            {gated && session.photos.length === 0 && !session.error && (
              <State>This gallery has no photos yet.</State>
            )}
          </Content>
        </Shell>

        {/* Credits are a post-gate concept only (Kimi Q4) — no anonymous credit state. */}
        {gated && (
          <CreditPill
            credits={credits.credits}
            hasCredits={credits.hasCredits}
            onUpgrade={() => setShowUpgrade((v) => !v)}
          />
        )}

        {gated && showUpgrade && (
          <UpgradePanel role="dialog" aria-label="Add enhancement passes">
            {PACKAGES.map((p) => (
              <UpgradeBtn
                key={p.key}
                type="button"
                disabled={credits.purchaseLoading !== null}
                onClick={() => void credits.purchase(p.key)}
              >
                {credits.purchaseLoading === p.key ? 'Opening checkout…' : p.label}
              </UpgradeBtn>
            ))}
          </UpgradePanel>
        )}

        <CheckoutToast
          message={toast.message}
          visible={toast.visible}
          exiting={toast.exiting}
          onDismiss={toast.dismiss}
        />

        <PhotoDetailModal
          isOpen={activePhoto !== null}
          photo={activePhoto}
          photoIndex={lightboxIndex ?? 0}
          totalPhotos={session.photos.length}
          credits={credits.credits}
          voteData={activePhoto ? votes.votesMap[activePhoto.id] || null : null}
          onClose={() => setLightboxIndex(null)}
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
