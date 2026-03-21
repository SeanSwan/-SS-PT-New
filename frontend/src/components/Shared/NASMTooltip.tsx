/**
 * ============================================================================
 * FILE: NASMTooltip.tsx
 * PURPOSE: Glassmorphic education tooltip for NASM Learning Mode —
 *          appears on hover (desktop) or tap (mobile) with protocol info
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: A reusable tooltip that displays NASM education
 * content when Learning Mode is ON. Trigger icon is a small "i" circle.
 * Non-blocking, dismissible, never covers form controls.
 *
 * HOW IT FITS: Used inside ExerciseCardComponent, OPTPhaseIndicator,
 * TempoInput, RestTimer, and BootcampBuilderPage when learning mode enabled.
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Info } from 'lucide-react';

// ─── Props ───────────────────────────────────────────────────

interface NASMTooltipProps {
  /** Education content to display */
  content: string;
  /** Optional title line */
  title?: string;
  /** Placement relative to trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Icon size */
  size?: number;
}

// ─── Component ───────────────────────────────────────────────

const NASMTooltip: React.FC<NASMTooltipProps> = memo(({
  content,
  title,
  placement = 'top',
  size = 14,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <TooltipContainer ref={ref}>
      <TriggerButton
        onClick={handleToggle}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={title || 'NASM education tip'}
        aria-expanded={open}
        type="button"
      >
        <Info size={size} />
      </TriggerButton>
      {open && (
        <Popup $placement={placement} role="tooltip">
          {title && <PopupTitle>{title}</PopupTitle>}
          <PopupContent>{content}</PopupContent>
        </Popup>
      )}
    </TooltipContainer>
  );
});

NASMTooltip.displayName = 'NASMTooltip';
export default NASMTooltip;

// ─── Styled Components ───────────────────────────────────────

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const TriggerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(96, 192, 240, 0.6);
  transition: color 0.2s;

  &:hover { color: rgba(96, 192, 240, 1); }
  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const placementStyles: Record<string, string> = {
  top: 'bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);',
  bottom: 'top: calc(100% + 8px); left: 50%; transform: translateX(-50%);',
  left: 'right: calc(100% + 8px); top: 50%; transform: translateY(-50%);',
  right: 'left: calc(100% + 8px); top: 50%; transform: translateY(-50%);',
};

const Popup = styled.div<{ $placement: string }>`
  position: absolute;
  ${p => placementStyles[p.$placement] || placementStyles.top}
  z-index: 50;
  width: max-content;
  max-width: 280px;
  padding: 12px 16px;
  background: rgba(26, 26, 36, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  pointer-events: none;
`;

const PopupTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #60C0F0;
  margin-bottom: 6px;
`;

const PopupContent = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  line-height: 1.5;
  color: #E0ECF4;
`;
