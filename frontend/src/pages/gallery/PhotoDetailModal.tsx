/**
 * PhotoDetailModal.tsx
 * ====================
 * Gemini 3.1 Pro "Apple Store simplicity" photo detail modal.
 * Mobile: photo sticky top (40vh) + scrollable options below.
 * Desktop (>=1024px): side-by-side split (65% image, 35% controls).
 *
 * Two-tier request options:
 *   1. "High-Quality Original" — FREE, Ice Wing accent, download arrow
 *   2. "Professional Edit"     — PAID, Gilded Fern accent, magic wand
 */
import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tokens ───────────────────────────────────────────────────────────────
const MIDNIGHT   = '#002060';
const ICE_WING   = '#60C0F0';
const GILDED     = '#C6A84B';
const FROST      = '#E0ECF4';

// ── Animations ───────────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`;

// ── Styled Components ────────────────────────────────────────────────────
const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 12000;
  background: rgba(0, 20, 60, 0.92);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  @media (min-width: 1024px) {
    padding: 32px;
  }
`;

const ModalContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1400px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: ${MIDNIGHT};
  overflow: hidden;

  @media (min-width: 1024px) {
    flex-direction: row;
    height: auto;
    max-height: 90vh;
    border-radius: 16px;
    border: 1px solid rgba(96, 192, 240, 0.12);
    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5), 0 0 120px rgba(96, 192, 240, 0.06);
  }
`;

const ImagePanel = styled.div`
  position: sticky;
  top: 0;
  width: 100%;
  height: 40vh;
  min-height: 280px;
  background: #000d1a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  @media (min-width: 1024px) {
    position: relative;
    width: 65%;
    height: auto;
    min-height: 500px;
    border-radius: 16px 0 0 16px;
  }
`;

const PhotoImage = styled.img<{ $loaded: boolean }>`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: ${props => props.$loaded ? 'block' : 'none'};
`;

const PhotoSkeleton = styled.div`
  width: 80%;
  height: 60%;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(96,192,240,0.05) 25%, rgba(96,192,240,0.12) 50%, rgba(96,192,240,0.05) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
`;

const ControlsPanel = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 1024px) {
    width: 35%;
    padding: 32px 28px;
    gap: 20px;
  }
`;

const PhotoTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${FROST};
  margin: 0;
  line-height: 1.3;

  @media (min-width: 1024px) {
    font-size: 1.5rem;
  }
`;

const PhotoMeta = styled.p`
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
  font-family: 'Fira Code', monospace;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(96, 192, 240, 0.15), transparent);
  margin: 4px 0;
`;

const SectionLabel = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(224, 236, 244, 0.4);
  margin: 0;
`;

// Option Card — the two-tier request buttons
const OptionCard = styled.button<{
  $accent: string;
  $glowColor: string;
  $animationDelay?: string;
  $muted?: boolean;
}>`
  position: relative;
  width: 100%;
  min-height: 120px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid ${p => p.$accent}33;
  background: linear-gradient(135deg, ${p => p.$accent}0D 0%, transparent 100%);
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-align: left;
  color: ${FROST};
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: ${popIn} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: ${p => p.$animationDelay || '0s'};
  opacity: ${p => p.$muted ? 0.45 : 1};
  filter: ${p => p.$muted ? 'grayscale(0.5)' : 'none'};

  &:hover {
    border-color: ${p => p.$accent}66;
    background: linear-gradient(135deg, ${p => p.$accent}1A 0%, ${p => p.$accent}08 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px ${p => p.$glowColor}26;
  }

  &:focus-visible {
    outline: 3px solid ${p => p.$accent};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const OptionIcon = styled.div<{ $bg: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 14px;
  background: ${p => p.$bg}1A;
  border: 1px solid ${p => p.$bg}33;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.$bg};
  font-size: 22px;
`;

const OptionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const OptionTitle = styled.span<{ $color?: string }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${p => p.$color || FROST};
`;

const OptionBadge = styled.span<{ $color: string }>`
  display: inline-block;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 20px;
  background: ${p => p.$color}1A;
  color: ${p => p.$color};
  border: 1px solid ${p => p.$color}33;
  width: fit-content;
`;

const OptionDesc = styled.span`
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.4;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: rgba(0, 32, 96, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  color: ${FROST};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 32, 96, 0.9);
    border-color: rgba(96, 192, 240, 0.3);
  }

  &:focus-visible {
    outline: 3px solid ${ICE_WING};
    outline-offset: 2px;
  }
`;

const NavButton = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${p => p.$side === 'left' ? 'left: 8px;' : 'right: 8px;'}
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(96, 192, 240, 0.12);
  color: ${FROST};
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 32, 96, 0.85);
    border-color: rgba(96, 192, 240, 0.25);
  }

  @media (min-width: 1024px) {
    ${p => p.$side === 'left' ? 'left: 16px;' : 'right: 16px;'}
    width: 48px;
    height: 48px;
  }
`;

const VoteRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
`;

const VoteStat = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: ${p => p.$color};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${ICE_WING};
    outline-offset: 4px;
  }
`;

const VoteIcon = styled.span`
  font-size: 18px;
`;

const SuccessToast = styled(motion.div)`
  padding: 12px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${ICE_WING}1A, ${ICE_WING}0D);
  border: 1px solid ${ICE_WING}33;
  color: ${ICE_WING};
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PrintIconGlyph = styled.span`
  font-size: 1.5rem;
`;

const DirectDownloadLink = styled.a`
  color: rgba(224, 236, 244, 0.4);
  font-size: 0.8rem;
  text-decoration: none;
  text-align: center;
  padding: 8px;
  display: block;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${ICE_WING};
    outline-offset: 3px;
  }
`;

// ── Props ────────────────────────────────────────────────────────────────
interface PhotoDetailModalProps {
  isOpen: boolean;
  photo: {
    id: number;
    photoNumber: number;
    displayName: string;
    url: string;
    thumbnailUrl: string | null;
    mediumUrl: string | null;
    enhancedUrl: string | null;
  } | null;
  photoIndex: number;
  totalPhotos: number;
  credits: {
    freeRemaining: number;
    purchasedCredits: number;
    isVip: boolean;
  };
  voteData: { thumbsUp: number; thumbsDown: number; userVote: 1 | -1 | null } | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDownloadOriginal: (photoId: number) => void;
  onRequestEnhancement: (photoId: number) => void;
  onVote: (photoId: number, voteType: 1 | -1) => void;
  onUpgrade: () => void;
  downloadUrl: string;
  enhancementRequested?: boolean;
  galleryToken?: string;
  printStorefrontEnabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────
const PrintStore = React.lazy(() => import('./PrintStore'));

const PhotoDetailModal: React.FC<PhotoDetailModalProps> = ({
  isOpen,
  photo,
  photoIndex,
  totalPhotos,
  credits,
  voteData,
  onClose,
  onPrev,
  onNext,
  onDownloadOriginal,
  onRequestEnhancement,
  onVote,
  onUpgrade,
  downloadUrl,
  enhancementRequested,
  galleryToken,
  printStorefrontEnabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [showPrintStore, setShowPrintStore] = React.useState(false);

  // Reset image loaded state when photo changes
  useEffect(() => {
    setImgLoaded(false);
    setShowSuccess(false);
  }, [photo?.id]);

  // Focus trap + keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, onNext, onPrev]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const hasCredits = credits.isVip || credits.freeRemaining > 0 || credits.purchasedCredits > 0;

  const getEnhanceCost = () => {
    if (credits.isVip) return 'VIP - Unlimited';
    if (credits.freeRemaining > 0) return `Free (${credits.freeRemaining} left)`;
    if (credits.purchasedCredits > 0) return `1 Credit (${credits.purchasedCredits} left)`;
    return '$15 per photo';
  };

  const handleEnhanceClick = () => {
    if (!photo) return;
    if (!hasCredits) {
      onUpgrade();
      return;
    }
    onRequestEnhancement(photo.id);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!photo) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onPointerDown={onClose}
          role="presentation"
        >
          <ModalContainer
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onPointerDown={e => e.stopPropagation()}
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Photo detail: ${photo.displayName}`}
          >
            <CloseButton onClick={onClose} aria-label="Close photo detail">
              &#x2715;
            </CloseButton>

            {/* Image Panel */}
            <ImagePanel>
              {!imgLoaded && <PhotoSkeleton />}
              <PhotoImage
                src={photo.enhancedUrl || photo.mediumUrl || photo.url}
                alt={photo.displayName}
                onLoad={() => setImgLoaded(true)}
                $loaded={imgLoaded}
              />
              {photoIndex > 0 && (
                <NavButton $side="left" onClick={onPrev} aria-label="Previous photo">
                  &#x2039;
                </NavButton>
              )}
              {photoIndex < totalPhotos - 1 && (
                <NavButton $side="right" onClick={onNext} aria-label="Next photo">
                  &#x203A;
                </NavButton>
              )}
            </ImagePanel>

            {/* Controls Panel */}
            <ControlsPanel>
              <PhotoTitle>{photo.displayName}</PhotoTitle>
              <PhotoMeta>Photo #{photo.photoNumber} of {totalPhotos}</PhotoMeta>

              {/* Vote Stats */}
              {voteData && (
                <VoteRow>
                  <VoteStat
                    $color={voteData.userVote === 1 ? ICE_WING : 'rgba(224,236,244,0.4)'}
                    onClick={() => onVote(photo.id, 1)}
                    aria-label={`Thumbs up (${voteData.thumbsUp})`}
                    type="button"
                  >
                    <VoteIcon>&#x1F44D;</VoteIcon> {voteData.thumbsUp}
                  </VoteStat>
                  <VoteStat
                    $color={voteData.userVote === -1 ? '#FF5E7E' : 'rgba(224,236,244,0.4)'}
                    onClick={() => onVote(photo.id, -1)}
                    aria-label={`Thumbs down (${voteData.thumbsDown})`}
                    type="button"
                  >
                    <VoteIcon>&#x1F44E;</VoteIcon> {voteData.thumbsDown}
                  </VoteStat>
                </VoteRow>
              )}

              <Divider />
              <SectionLabel>Get This Photo</SectionLabel>

              {/* Option 1: Download to Browser */}
              <OptionCard
                $accent={ICE_WING}
                $glowColor={ICE_WING}
                onClick={() => onDownloadOriginal(photo.id)}
                $animationDelay="0.05s"
                aria-label="Download photo to your browser"
              >
                <OptionIcon $bg={ICE_WING}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </OptionIcon>
                <OptionContent>
                  <OptionTitle>Download to Browser</OptionTitle>
                  <OptionBadge $color={ICE_WING}>Free</OptionBadge>
                  <OptionDesc>
                    Save this high-quality photo directly to your device. Perfect for social media and personal use.
                  </OptionDesc>
                </OptionContent>
              </OptionCard>

              {/* Option 2: Professional Edit */}
              <OptionCard
                $accent={GILDED}
                $glowColor={GILDED}
                onClick={handleEnhanceClick}
                disabled={enhancementRequested}
                $animationDelay="0.15s"
                aria-label={enhancementRequested ? 'Enhancement already requested' : 'Request professional edit'}
              >
                <OptionIcon $bg={GILDED}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
                    <path d="M17.8 11.8 19 13" /><path d="M15 9h0" />
                    <path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" />
                    <path d="M12.2 6.2 11 5" />
                  </svg>
                </OptionIcon>
                <OptionContent>
                  <OptionTitle>
                    {enhancementRequested ? 'Enhancement Requested' : 'Professional Edit'}
                  </OptionTitle>
                  <OptionBadge $color={GILDED}>
                    {enhancementRequested ? 'Pending' : getEnhanceCost()}
                  </OptionBadge>
                  <OptionDesc>
                    {enhancementRequested
                      ? 'Your enhancement request has been submitted. We\'ll notify you when it\'s ready.'
                      : 'AI-powered color grading, retouching, and composition enhancement by our team.'
                    }
                  </OptionDesc>
                </OptionContent>
              </OptionCard>

              {/* Success Toast */}
              <AnimatePresence>
                {showSuccess && (
                  <SuccessToast
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <span>&#x2714;</span> Enhancement request submitted!
                  </SuccessToast>
                )}
              </AnimatePresence>

              {/* Print-on-Demand Option (Slice 3f) — flag-gated; "Coming Soon" until PRINT_STOREFRONT_ENABLED */}
              <OptionCard
                $accent={GILDED}
                $glowColor={GILDED}
                disabled={!printStorefrontEnabled}
                onClick={printStorefrontEnabled ? () => setShowPrintStore(true) : undefined}
                aria-label={printStorefrontEnabled ? 'Order prints of this photo' : 'Order prints — coming soon'}
                $animationDelay="0.25s"
                $muted={!printStorefrontEnabled}
              >
                <OptionIcon $bg={GILDED}>
                  <PrintIconGlyph>&#x1F5BC;</PrintIconGlyph>
                </OptionIcon>
                <OptionContent>
                  <OptionTitle $color={GILDED}>Order Print</OptionTitle>
                  {!printStorefrontEnabled && <OptionBadge $color="rgba(224,236,244,0.4)">Coming Soon</OptionBadge>}
                  <OptionDesc>
                    Premium fine art prints, canvas, and metal — delivered to your door.
                  </OptionDesc>
                </OptionContent>
              </OptionCard>

              <Divider />

              {/* Direct download link as fallback */}
              <DirectDownloadLink
                href={downloadUrl}
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch(downloadUrl);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = photo.displayName + '.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                  } catch {
                    window.open(downloadUrl, '_blank');
                  }
                }}
              >
                Direct download link
              </DirectDownloadLink>
            </ControlsPanel>
          </ModalContainer>

          {/* Print Store Overlay — stop pointer/click bubbling to the Backdrop's onClose,
              or any interaction inside the store would close the whole photo modal (3f review fix). */}
          <AnimatePresence>
            {showPrintStore && photo && galleryToken && (
              <React.Suspense fallback={null}>
                <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <PrintStore
                    photoId={photo.id}
                    photoUrl={photo.url}
                    photoName={photo.displayName}
                    galleryToken={galleryToken}
                    onClose={() => setShowPrintStore(false)}
                  />
                </div>
              </React.Suspense>
            )}
          </AnimatePresence>

        </Backdrop>
      )}
    </AnimatePresence>
  );
};

export default PhotoDetailModal;
