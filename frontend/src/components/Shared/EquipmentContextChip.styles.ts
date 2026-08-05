/**
 * EquipmentContextChip styles — Crystalline Swan chrome for the F11 chip.
 * Sticky sapphire pill, Ice Wing accents, bottom-sheet (mobile) / popover
 * (desktop) profile cards, Wing Purple client-context ribbon, Gilded Fern
 * corrective mismatch notice. Reduced-motion collapses all transitions.
 */
import styled, { css } from 'styled-components';

export const ChipRoot = styled.div`
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const ContextRibbon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 4px 12px;
  border-left: 3px solid var(--accent-glow, #8b5cf6);
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 82%, transparent);
  backdrop-filter: blur(6px);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.8rem;
  border-radius: 6px;
`;

export const ChipButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 22px;
  border: 1px solid rgba(96, 192, 240, 0.4);
  background: var(--color-primary, #002060);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 10px rgba(96, 192, 240, 0.35);
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ChipHint = styled.span`
  color: rgba(224, 236, 244, 0.65);
  font-size: 0.75rem;
`;

export const sheetSurface = css`
  background: var(--surface-dark, #1a1a24);
  border: 1px solid rgba(96, 192, 240, 0.25);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
`;

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(10, 10, 15, 0.6);
`;

export const SheetPanel = styled.div`
  ${sheetSurface};
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 41;
  max-height: 70vh;
  overflow-y: auto;
  border-radius: 16px 16px 0 0;
  padding: 16px;

  @media (min-width: 768px) {
    position: absolute;
    inset: auto auto auto 0;
    top: calc(100% + 8px);
    bottom: auto;
    width: 340px;
    max-height: 420px;
    border-radius: 12px;
  }
`;

export const SheetTitle = styled.h3`
  margin: 0 0 12px;
  color: var(--text-primary, #e0ecf4);
  font-size: 0.95rem;
`;

export const ProfileCard = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 8px 12px;
  margin-bottom: 8px;
  text-align: left;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-left: ${({ $active }) => ($active
    ? '3px solid var(--accent-primary, #60c0f0)'
    : '3px solid transparent')};
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--color-primary, #002060) 70%, transparent)'
    : 'var(--card-dark, #141419)')};
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60c0f0);
    outline: none;
  }
`;

export const ProfileMeta = styled.span`
  display: block;
  color: rgba(224, 236, 244, 0.6);
  font-size: 0.75rem;
`;

export const MismatchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-left: 3px solid var(--accent-gold, #c6a84b);
  border-radius: 6px;
  background: color-mix(in srgb, var(--card-dark, #141419) 88%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.82rem;
`;

export const MismatchAction = styled.button`
  min-height: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60c0f0);
  font-size: 0.82rem;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    outline: none;
  }
`;
