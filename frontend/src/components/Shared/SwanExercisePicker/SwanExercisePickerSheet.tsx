/**
 * SwanExercisePickerSheet (Phase 2.3b)
 * ====================================
 * Bottom-sheet (mobile) / side-panel (desktop) container for the exercise
 * preview. Geometry follows LeadCaptureDrawer; the overlay mechanics follow
 * the HARDENED house pattern (ChartExpandModal lineage) that the drawer
 * lacks: body portal (defends the translateZ stacking-context gotcha),
 * scroll lock, Escape, focus-to-close + focus-return, reduced-motion.
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  SheetBackdrop,
  SheetCloseButton,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from './styles.overlay';

export interface SwanExercisePickerSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const SwanExercisePickerSheet: React.FC<SwanExercisePickerSheetProps> = ({
  title,
  onClose,
  children,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = 'swan-picker-sheet-title';

  useEffect(() => {
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  return createPortal(
    <SheetBackdrop
      data-testid="swan-picker-sheet-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <SheetPanel role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <SheetHeader>
          <SheetTitle id={titleId}>{title}</SheetTitle>
          <SheetCloseButton
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title} preview`}
          >
            <X size={18} aria-hidden="true" />
          </SheetCloseButton>
        </SheetHeader>
        {children}
      </SheetPanel>
    </SheetBackdrop>,
    document.body,
  );
};

export default SwanExercisePickerSheet;
