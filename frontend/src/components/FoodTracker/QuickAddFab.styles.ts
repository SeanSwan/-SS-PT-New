/**
 * FILE: QuickAddFab.styles.ts
 * PURPOSE: Phase 4C styles for the quick-add floating action button + sheet.
 * KEY DECISIONS: Dual-Button Glow law — Wing Purple background gets an
 *          Arctic Cyan glow. Fab clears the mobile bottom nav (fixed at
 *          ≤768px). All motion behind prefers-reduced-motion guards.
 */
import styled, { css, keyframes } from 'styled-components';

const sheetRise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const FabButton = styled.button`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent);
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  box-shadow: 0 0 22px color-mix(in srgb, var(--arctic-cyan, #50A0F0) 45%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 30px color-mix(in srgb, var(--arctic-cyan, #50A0F0) 62%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }

  @media (max-width: 768px) {
    right: 16px;
    bottom: calc(78px + env(safe-area-inset-bottom, 0px));
  }
`;

export const SheetBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 61;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
`;

export const Sheet = styled.div<{ $reduceMotion: boolean }>`
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 62;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(340px, calc(100vw - 32px));
  max-height: min(70vh, 480px);
  overflow-y: auto;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);

  ${({ $reduceMotion }) => !$reduceMotion && css`animation: ${sheetRise} 0.18s ease-out;`}
  @media (prefers-reduced-motion: reduce) { animation: none; }

  @media (max-width: 768px) {
    right: 16px;
    left: 16px;
    width: auto;
    bottom: calc(146px + env(safe-area-inset-bottom, 0px));
  }
`;

export const SheetTitle = styled.p`
  margin: 0 0 4px;
  color: var(--text-secondary, #94a3b8);
  font: 800 0.72rem/1 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const SheetItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 600 0.85rem/1.3 var(--font-ui, 'Sora', sans-serif);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  svg { flex-shrink: 0; color: var(--accent-primary, #60C0F0); }

  &:hover:not(:disabled) {
    border-color: var(--accent-secondary, #8B5CF6);
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-elevated, #141419));
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  &:disabled { cursor: not-allowed; opacity: 0.6; }

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const SheetItemMeta = styled.span`
  margin-left: auto;
  padding-left: 8px;
  color: var(--text-secondary, #94a3b8);
  font: 500 0.75rem/1 var(--font-data, 'Fira Code', monospace);
  white-space: nowrap;
`;

export const SheetNote = styled.p`
  margin: 2px 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8rem;
  line-height: 1.4;
`;
