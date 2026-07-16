/**
 * ============================================================================
 * FILE: ChartTogglePanel.tsx
 * PURPOSE: Modal overlay for toggling which Victory charts appear on the
 *          user's public profile. Wraps ChartVisibilityToggle in a dialog.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a modal dialog containing the ChartVisibilityToggle
 * component. Handles focus trapping, Escape-to-close, and overlay click dismiss.
 * Saves visibility prefs via the parent's onSave callback (PUT /api/profile).
 *
 * HOW IT FITS IN THE APP: ProfileChartsGrid -> ChartTogglePanel -> ChartVisibilityToggle
 * KEY DECISIONS: Uses role="dialog" + aria-modal for a11y. Focus trap via onKeyDown.
 *   Crystalline Swan tokens with backdrop blur glassmorphism.
 *
 * ┌─── SUB-COMPONENT: ChartTogglePanel ────────────────────────┐
 * │ PARENT: ProfileChartsGrid                                    │
 * │ PURPOSE: Modal dialog for chart visibility toggles           │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │  Chart Visibility                    [X] │                 │
 * │ │  Choose which charts appear on your      │                 │
 * │ │  public profile                          │                 │
 * │ │  ☑ Workout Frequency  ☐ Body Fat Trend   │                 │
 * │ │  ☑ Weight Progression ☐ Macro Split      │                 │
 * │ │  ☑ Muscle Group Radar ☐ Cardio Endurance │                 │
 * │ │  ☑ Goal Progress      ☐ Session Freq     │                 │
 * │ │  ☐ Muscle Recovery    ☐ Exercise RPE     │                 │
 * │ │  ☐ Exercise History   ☐ Workout Heatmap  │                 │
 * │ │                                          │                 │
 * │ │              [Save Changes]              │                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { chartVisibility, onSave, onClose, saving }          │
 * │ CLICK-OUTCOMES:                                              │
 * │ [X] / Escape / Overlay -> onClose()                          │
 * │ [Toggle] -> local state flip                                 │
 * │ [Save] -> onSave(visibility) -> PUT /api/profile             │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import ChartVisibilityToggle from '../../../pages/Social/components/ChartVisibilityToggle';
import type { ChartVisibility } from '../../../pages/Social/components/ChartVisibilityToggle';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface ChartTogglePanelProps {
  chartVisibility?: Partial<ChartVisibility>;
  onSave: (visibility: ChartVisibility) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Modal wrapper with a11y focus management
// WHY: CLAUDE.md requires focus trap on modals/drawers with
//      role="dialog" aria-modal="true", Escape to close
// ─────────────────────────────────────────────────────────────
const ChartTogglePanel: React.FC<ChartTogglePanelProps> = ({
  chartVisibility,
  onSave,
  onClose,
  saving = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Capture focus on mount, restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleOverlayClick = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <Overlay onPointerDown={handleOverlayClick} aria-hidden="false">
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chart visibility settings"
        tabIndex={-1}
      >
        <DialogHeader>
          <DialogTitle>Chart Visibility</DialogTitle>
          <CloseButton onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </CloseButton>
        </DialogHeader>
        <DialogBody>
          <ChartVisibilityToggle
            chartVisibility={chartVisibility}
            onSave={onSave}
            saving={saving}
          />
        </DialogBody>
      </Dialog>
    </Overlay>
  );
};

export default ChartTogglePanel;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan glassmorphism modal
// ─────────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;

  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(0, 20, 60, 0.92);
  }

  @media (prefers-reduced-motion: reduce) {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
`;

const Dialog = styled.div`
  background: ${({ theme }) => theme?.colors?.graphite || '#1A1A24'};
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5),
              0 0 24px rgba(139, 92, 246, 0.1);
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  outline: none;

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 0;
`;

const DialogTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(96, 192, 240, 0.08);
  color: #E0ECF4;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.15);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const DialogBody = styled.div`
  padding: 8px 20px 20px;
`;
