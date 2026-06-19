/**
 * ┌─── SUB-COMPONENT: BootcampDemoVideoModal ──────────────────┐
 * │ PARENT: BootcampDemoMode                                    │
 * │ PURPOSE: "Click for depth" — opens the FULL exercise video  │
 * │          in-app (an R2 <video> for direct files, a YouTube/ │
 * │          Vimeo iframe for embeds) instead of a raw new tab.  │
 * │          The board itself shows the short looping preview.   │
 * │ a11y: role=dialog/aria-modal, Esc + backdrop close, the     │
 * │       close button takes focus on open.                      │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { X, ExternalLink } from 'lucide-react';
import { getVideoEmbedUrl, isDirectVideoFile } from './bootcampVideoEmbed';

interface BootcampDemoVideoModalProps {
  open: boolean;
  title: string;
  videoUrl: string | null;
  onClose: () => void;
}

const BootcampDemoVideoModal: React.FC<BootcampDemoVideoModalProps> = ({
  open,
  title,
  videoUrl,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !videoUrl) return;

    const previousActive = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;

    const trapTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        closeRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      trapTab(e);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    // Move focus to the close control so keyboard users land inside the dialog.
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus();
    };
  }, [open, videoUrl, onClose]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!open || !videoUrl) return null;

  const embedUrl = getVideoEmbedUrl(videoUrl);
  const isFile = isDirectVideoFile(videoUrl);

  return (
    <Backdrop role="presentation" onClick={handleBackdrop}>
      <Dialog ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${title} demo video`}>
        <Header>
          <Heading title={title}>{title}</Heading>
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close video">
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </Header>
        <Stage>
          {isFile ? (
            <MediaVideo
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
              src={videoUrl}
            />
          ) : embedUrl ? (
            <EmbedFrame
              title={`${title} demo video`}
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <Fallback>
              <p>This video can&apos;t play inline.</p>
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                Open it in a new tab <ExternalLink size={14} />
              </a>
            </Fallback>
          )}
        </Stage>
      </Dialog>
    </Backdrop>
  );
};

BootcampDemoVideoModal.displayName = 'BootcampDemoVideoModal';
export default BootcampDemoVideoModal;

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>([
    'a[href]',
    'button:not([disabled])',
    'iframe',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'video[controls]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','))).filter((el) => (
    el.tabIndex >= 0
    && el.getAttribute('aria-hidden') !== 'true'
    && !el.hasAttribute('disabled')
  ));
}

// ── Styled Components ──

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9990;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent);
  backdrop-filter: blur(6px);
`;

const Dialog = styled.div`
  width: min(960px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: var(--bg-elevated, #141419);
  box-shadow: 0 24px 64px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

const Heading = styled.h3`
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 800;
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const Stage = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  background: var(--bg-base, #0A0A0F);
`;

const MediaVideo = styled.video`
  width: 100%;
  height: 100%;
  display: block;
  background: var(--bg-base, #0A0A0F);
`;

const EmbedFrame = styled.iframe`
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
`;

const Fallback = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, #c8d6e5);
  font-family: 'Sora', sans-serif;
  font-size: 13px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent-gold, #C6A84B);
    font-weight: 700;
  }
`;
