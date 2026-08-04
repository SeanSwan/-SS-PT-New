/**
 * FILE: SegmentedTabBar.styles.ts
 * PURPOSE: Phase 4B styles — 4-segment bar + sub-pill tool row that replace
 *          the native <select>. Desktop: inline segmented bar. Mobile ≤768px:
 *          the segment bar becomes a fixed bottom nav (44px+ items) and the
 *          pill row stays below the header as a swipeable strip (HY3 §e4).
 * KEY DECISIONS: styled-components only; var(--token, #fallback) with
 *          Crystalline Swan fallbacks; every animation guarded by
 *          prefers-reduced-motion.
 */
import styled from 'styled-components';

export const SegmentNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

export const SegmentBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 999px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent)),
    var(--bg-elevated, #141419);

  @media (max-width: 768px) {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    gap: 4px;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    background: var(--bg-base, #0A0A0F);
    box-shadow: 0 -10px 24px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  }
`;

export const SegmentButton = styled.button<{ $active: boolean }>`
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: 0;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent)'
    : 'transparent')};
  background: ${({ $active }) => ($active ? 'var(--royal-depth, #003080)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94a3b8)')};
  font: 800 0.8rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) { color: var(--accent-primary, #60C0F0); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) { transition: none; }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 3px;
    min-height: 52px;
    padding: 6px 4px;
    font-size: 0.66rem;
    letter-spacing: 0.02em;
  }
  @media (max-width: 320px) { font-size: 0.6rem; }
  @media (min-width: 1024px) { padding: 0 18px; }
`;

export const SubPillRow = styled.div`
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 414px) { gap: 6px; }
  @media (min-width: 1024px) { gap: 10px; }
`;

export const SubPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)')};
  background: ${({ $active }) => ($active
    ? 'var(--primary, #002060)'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent)')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #94a3b8)')};
  font: ${({ $active }) => ($active ? 700 : 500)} 0.82rem/1 var(--font-ui, 'Sora', sans-serif);
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--accent-secondary, #8B5CF6);
    color: var(--text-primary, #E0ECF4);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
    color: var(--text-secondary, #94a3b8);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) { transform: none; }
  }

  @media (max-width: 414px) { padding: 0 13px; font-size: 0.78rem; }
  @media (max-width: 320px) { padding: 0 11px; }
`;

/** Gilded Fern lock glyph wrapper on gated pills (HY3: locked, never hidden). */
export const PillLock = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--accent-luxury, #C6A84B);
`;
