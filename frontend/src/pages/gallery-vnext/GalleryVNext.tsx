/**
 * Gallery vNext — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve and
 * `[data-style-lens-shell]` exists for the gate's contract probe), then the `.gallery-vnext-shell` token scope.
 *
 * DESIGN-ONLY: it binds the real money path (`/api/gallery/*` via the vNext hooks) and NEVER redesigns it.
 * The detail/lightbox and every money modal are REUSED bind-only from `pages/gallery/*` (Sean's scope call).
 *
 * Kimi's IA: photos-first. The gate is the SETUP for the reveal — on successful unlock the shipped
 * Crystallize fires ONCE (LAW 5: consume `useCrystallizeTransition`/`CrystallizeOverlay`, never re-time it),
 * then the justified grid reveals per-tile. Per Q4, NO credit/VIP UI renders before the gate.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
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
import type { CreditPackage, GalleryEventSummary, GalleryPhoto } from './gallery.types';

const Shell = styled.main`
  min-height: 100dvh;
  background: var(--gallery-bg);
  color: var(--gallery-ink);
  padding: 0 var(--gallery-pad, 16px) 96px;
`;

const Content = styled.div`
  max-width: 1600px;
  margin: 0 auto;
`;

const Masthead = styled.header`
  padding: 40px 0 24px;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-family: var(--gallery-font-display);
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  line-height: 1.1;
`;

const Sub = styled.p`
  margin: 0;
  color: var(--gallery-ink-2);
  max-width: 60ch;
`;

const EventList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
`;

const EventCard = styled.button`
  position: relative;
  min-height: 148px;
  padding: 16px;
  text-align: left;
  border-radius: var(--gallery-r-card, 12px);
  border: 1px solid var(--gallery-chrome-edge);
  background: var(--gallery-surface-1);
  color: var(--gallery-ink);
  cursor: pointer;
  box-shadow: var(--gallery-elev-1);
`;

const EventName = styled.span`
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
`;

const EventMeta = styled.span`
  display: block;
  color: var(--gallery-ink-2);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
`;

const GateWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0 48px;
`;

const State = styled.p`
  margin: 12vh auto;
  text-align: center;
  color: var(--gallery-ink-2);
`;

const UpgradePanel = styled.div`
  position: fixed;
  inset: auto 16px calc(76px + env(safe-area-inset-bottom, 0px)) auto;
  z-index: var(--gallery-z-overlay, 50);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: var(--gallery-r-card, 12px);
  background: var(--gallery-surface-1);
  border: 1px solid var(--gallery-chrome-edge);
  box-shadow: var(--gallery-elev-3);
`;

const UpgradeBtn = styled.button`
  min-height: var(--gallery-target, 48px);
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--gallery-line);
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  cursor: pointer;
  font-size: 0.92rem;
`;

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
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(w);
    });
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

  const activePhoto = lightboxIndex !== null ? session.photos[lightboxIndex] ?? null : null;
  const gated = Boolean(session.galleryToken);
  const heading = useMemo(
    () => session.selectedEvent?.name ?? 'Photography',
    [session.selectedEvent],
  );

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
          onDownloadOriginal={(photoId: number) => {
            const target = session.photos.find((p) => p.id === photoId);
            if (target && session.galleryToken) void downloadPhoto(session.galleryToken, target);
          }}
          onRequestEnhancement={(photoId: number) => {
            void credits.enhance([photoId]).then((outcome) => {
              if (outcome === 'credits_required') setShowUpgrade(true);
            });
          }}
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
