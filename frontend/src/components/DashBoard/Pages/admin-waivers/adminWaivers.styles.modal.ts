/**
 * ============================================================================
 * FILE: adminWaivers.styles.modal.ts
 * PURPOSE: Detail-modal and manual-link-modal styles for the admin waiver
 *          surface (overlay, sections, consent grid, match cards, user picker).
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Everything rendered inside AdminWaiverDetailModal and
 * AdminManualLinkModal. Split out of the former 489-line
 * `adminWaivers.styles.ts` to hold the 300-line cap (rule 4); the barrel at
 * `adminWaivers.styles.ts` re-exports it so imports are unchanged.
 *
 * TOKEN CONTRACT: colours resolve via Crystalline Swan tokens with the prior
 * literal as fallback (CLAUDE.md rule 6).
 */

import styled from 'styled-components';

export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--obsidian-black, #000000) 85%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 1000);
  padding: 16px;
`;

export const ModalContent = styled.div`
  background: linear-gradient(
    135deg,
    var(--bg-elevated, #1a1a2e) 0%,
    var(--bg-surface, #16213e) 100%
  );
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3);

  @media (max-width: 768px) {
    padding: 20px 16px;
    max-height: 92vh;
    border-radius: 14px;
  }
`;

export const ModalTitle = styled.h2`
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 20px 0;
  font-size: 1.25rem;
`;

export const Section = styled.div`
  margin-bottom: 20px;
`;

export const SectionLabel = styled.h3`
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const InfoItem = styled.div`
  color: var(--text-primary, rgba(255, 255, 255, 0.85));
  font-size: 0.85rem;

  strong {
    display: block;
    color: var(--text-muted, rgba(255, 255, 255, 0.5));
    font-size: 0.7rem;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
`;

export const ConsentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const ConsentItem = styled.div<{ $accepted: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  background: ${({ $accepted }) => ($accepted
    ? 'color-mix(in srgb, var(--success, #00ff88) 10%, transparent)'
    : 'color-mix(in srgb, var(--danger, #ff6b6b) 10%, transparent)')};
  color: ${({ $accepted }) => ($accepted
    ? 'var(--success, #00ff88)'
    : 'var(--danger, #ff6b6b)')};
`;

export const SignatureImage = styled.img`
  max-width: 100%;
  max-height: 150px;
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.2);
  border-radius: 8px;
  /* Signatures are ink-on-paper: the light plate is intentional in every
     theme, so this stays a near-white literal rather than a surface token. */
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
`;

export const MatchCard = styled.div`
  background: color-mix(in srgb, var(--obsidian-black, #000000) 20%, transparent);
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.2);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
`;

export const MatchRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ConfidenceBar = styled.div<{ $score: number }>`
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--frost-white-rgb, 255, 255, 255), 0.1);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${({ $score }) => Math.round($score * 100)}%;
    border-radius: 3px;
    background: ${({ $score }) => {
    if ($score >= 0.8) return 'var(--success, #00ff88)';
    if ($score >= 0.5) return 'var(--warning, #ffc107)';
    return 'var(--danger, #ff6b6b)';
  }};
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

export const CloseButton = styled.button`
  padding: 10px 20px;
  min-height: var(--min-touch-target, 44px);
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.3));
  background: transparent;
  color: var(--text-primary, #ffffff);
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: rgba(var(--frost-white-rgb, 255, 255, 255), 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const UserSearchList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-top: 12px;
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.2);
  border-radius: 8px;
`;

export const UserSearchItem = styled.div<{ $selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  min-height: var(--min-touch-target, 44px);
  cursor: pointer;
  border-bottom: 1px solid rgba(var(--frost-white-rgb, 255, 255, 255), 0.05);
  background: ${({ $selected }) => ($selected
    ? 'rgba(var(--wing-purple-rgb, 139, 92, 246), 0.1)'
    : 'transparent')};
  color: var(--text-primary, rgba(255, 255, 255, 0.9));
  font-size: 0.85rem;
  transition: background var(--duration-fast, 0.15s);

  &:hover {
    background: rgba(var(--wing-purple-rgb, 139, 92, 246), 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  &:last-child {
    border-bottom: none;
  }
`;
