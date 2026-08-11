/**
 * ============================================================================
 * FILE: content-studio.styles.ts
 * PURPOSE: Shared styled-components for Phase 10 Content Studio panels
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * ============================================================================
 */

import styled from 'styled-components';

// ─── Layout ──────────────────────────────────────────────────
export const PanelContainer = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const SplitLayout = styled.div`
  padding: 24px;
  display: flex;
  gap: 24px;

  @media (max-width: 900px) { flex-direction: column; }
`;

export const MainPanel = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const SidePanel = styled.div<{ $width?: number }>`
  width: ${({ $width }) => $width || 280}px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 900px) { width: 100%; }
`;

// ─── Typography ──────────────────────────────────────────────
export const SectionTitle = styled.h3`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SectionHint = styled.p`
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.55);
  line-height: 1.4;
`;

export const MetaText = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: rgba(224, 236, 244, 0.5);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const OptionLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// ─── Inputs ──────────────────────────────────────────────────
export const StudioInput = styled.input`
  width: 100%;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  min-height: 44px;
  transition: border-color 0.3s ease;

  &::placeholder { color: rgba(224, 236, 244, 0.3); }
  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }
`;

export const StudioTextArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.3s ease;

  &::placeholder { color: rgba(224, 236, 244, 0.3); }
  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }
`;

// ─── Buttons ─────────────────────────────────────────────────
export const PrimaryBtn = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  background: var(--bg-primary, #002060);
  color: #E0ECF4;
  border: 1px solid rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover:not(:disabled) { box-shadow: 0 0 16px rgba(139, 92, 246, 0.5); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 4px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const SecondaryBtn = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  background: transparent;
  color: rgba(224, 236, 244, 0.7);
  border: 1px solid rgba(96, 192, 240, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover { border-color: rgba(96, 192, 240, 0.3); color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 4px; }
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

// ─── Chips ───────────────────────────────────────────────────
export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Chip = styled.button<{ $active: boolean; $color?: string }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  /* 32px failed the 44px touch-target law. The visual pill stays compact; the HIT
     AREA is expanded to 44px so a thumb can actually land on it. */
  padding: 5px 12px;
  min-height: 44px;
  border-radius: 6px;
  background: ${({ $active, $color }) =>
    $active ? `${$color || 'rgba(96, 192, 240)'}20` : 'var(--bg-elevated, #141419)'};
  color: ${({ $active, $color }) => ($active ? ($color || '#60C0F0') : 'rgba(224, 236, 244, 0.5)')};
  border: 1px solid ${({ $active, $color }) =>
    $active ? `${$color || 'rgba(96, 192, 240)'}40` : 'rgba(96, 192, 240, 0.08)'};
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover { border-color: rgba(96, 192, 240, 0.2); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

// ─── Cards ───────────────────────────────────────────────────
export const StudioCard = styled.div`
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const StudioCardRow = styled.div`
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const StatusChip = styled.span<{ $variant: 'cyan' | 'gold' | 'purple' | 'muted' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 4px;
  color: ${({ $variant }) =>
    $variant === 'cyan' ? '#60C0F0' :
    $variant === 'gold' ? '#C6A84B' :
    $variant === 'purple' ? '#8B5CF6' :
    'rgba(224, 236, 244, 0.5)'};
  background: ${({ $variant }) =>
    $variant === 'cyan' ? 'rgba(96, 192, 240, 0.12)' :
    $variant === 'gold' ? 'rgba(198, 168, 75, 0.12)' :
    $variant === 'purple' ? 'rgba(139, 92, 246, 0.12)' :
    'rgba(224, 236, 244, 0.06)'};
`;

export const WarningBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(198, 168, 75, 0.08);
  border-left: 3px solid #C6A84B;
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.7);
`;
