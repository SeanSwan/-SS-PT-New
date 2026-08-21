/**
 * ============================================================================
 * FILE: TransformationPhotoStyles.ts
 * PURPOSE: Theme-aware styled-components for TransformationPhotoShowcase
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: All styled-components for the before/after photo
 * showcase with slider, upload overlay, and privacy badge.
 * HOW IT FITS IN THE APP: TransformationPhotoShowcase imports these
 * KEY DECISIONS: CSS custom properties for theme changer compatibility.
 */
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Container & Layout
// ─────────────────────────────────────────────────────────────

export const ShowcaseContainer = styled.div`
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  position: relative;
`;

export const ShowcaseHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

export const ShowcaseTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const VisibilityBadge = styled.span<{ $vis: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: ${({ $vis }) =>
    $vis === 'public' ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)' :
    $vis === 'friends' ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' :
    $vis === 'private' ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)' :
    'rgba(100, 100, 100, 0.15)'
  };
  color: ${({ $vis }) =>
    $vis === 'public' ? 'var(--accent-primary, #60C0F0)' :
    $vis === 'friends' ? 'var(--accent-secondary, #8B5CF6)' :
    $vis === 'private' ? 'var(--accent-gold, #C6A84B)' :
    'var(--text-muted, #888)'
  };
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Before/After Slider
// ─────────────────────────────────────────────────────────────

export const SliderContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 3/2;
  overflow: hidden;
  cursor: col-resize;
  user-select: none;
  touch-action: pan-y;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const PhotoLayer = styled.div<{ $position: 'before' | 'after' }>`
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  /* The "after" layer is revealed by clipping against the shared slider
     variable set by useBeforeAfterSlider — same contract the feed uses. */
  ${({ $position }) => $position === 'after' && `
    clip-path: inset(0 0 0 var(--swan-slider-pos, 50%));
  `}
`;

export const SliderDivider = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--swan-slider-pos, 50%);
  width: 3px;
  background: var(--accent-primary, #60C0F0);
  z-index: 10;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bg-elevated, #141419);
    border: 2px solid var(--accent-primary, #60C0F0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
`;

export const PhotoLabel = styled.span<{ $side: 'left' | 'right' }>`
  position: absolute;
  bottom: 12px;
  ${({ $side }) => $side}: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-primary, #fff);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  z-index: 5;
`;

export const DateLabel = styled.span`
  position: absolute;
  top: 12px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.5);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  z-index: 5;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty State & Upload
// ─────────────────────────────────────────────────────────────

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(96, 192, 240, 0); }
  50% { box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent); }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  text-align: center;
  gap: 0.75rem;
`;

export const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-base, #0A0A0F));
  color: var(--accent-primary, #60C0F0);
  animation: ${pulseGlow} 3s ease-in-out infinite;
`;

export const EmptyText = styled.p`
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 0.875rem;
  margin: 0;
  max-width: 280px;
`;

/* UploadButton removed 2026-08-21: its only consumer was the transformation
   upload affordance, which could never render (no mount site passed `onUpload`
   and no member-reachable upload path exists). Restore it alongside a real
   upload leg, not before. */


// ─────────────────────────────────────────────────────────────
// SECTION: Angle Tabs
// ─────────────────────────────────────────────────────────────

export const AngleTabs = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem 1.25rem;
  overflow-x: auto;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));

  &::-webkit-scrollbar { height: 0; }
`;

export const AngleTab = styled.button<{ $active?: boolean }>`
  min-height: 36px;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Footer Actions
// ─────────────────────────────────────────────────────────────

export const FooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

export const TimeDelta = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-family: 'Fira Code', monospace;
`;
