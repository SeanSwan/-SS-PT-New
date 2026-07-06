/**
 * SwanExercisePicker — overlay + preview styles (Phase 2.3b)
 * ==========================================================
 * Split from styles.ts (Rule 4 line-cap discipline). Sheet geometry follows
 * LeadCaptureDrawer (mobile bottom sheet -> desktop right panel); motion is
 * a single GPU-safe slide honoring prefers-reduced-motion.
 */
import styled, { css, keyframes } from 'styled-components';

const sheetRise = keyframes`
  from { transform: translateY(24px); opacity: 0.6; }
  to { transform: translateY(0); opacity: 1; }
`;

export const SheetBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(4px);

  @media (min-width: 1024px) {
    align-items: stretch;
    justify-content: flex-end;
  }
`;

export const SheetPanel = styled.div`
  width: 100%;
  max-height: 82vh;
  overflow-y: auto;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  border-radius: 18px 18px 0 0;
  padding: 1rem 1rem 1.25rem;
  animation: ${css`${sheetRise}`} 180ms ease-out;

  @media (min-width: 1024px) {
    width: 420px;
    max-height: none;
    height: 100%;
    border-radius: 0;
    border-right: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

export const SheetTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
`;

export const SheetCloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  background: var(--card-dark, #141419);
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const PreviewBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

export const PreviewTitle = styled.h4`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const PreviewMeta = styled.div`
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
`;

export const PreviewSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const PreviewSectionLabel = styled.h5`
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60c0f0);
`;

export const CueList = styled.ul`
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  li {
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--text-primary, #e0ecf4);
  }
`;
