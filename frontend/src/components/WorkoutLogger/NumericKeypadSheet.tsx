/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: NumericKeypadSheet (Arc L / L2)                   ║
 * ║  PURPOSE: Bottom-sheet number pad for coarse-pointer logging  ║
 * ║           — glass keys, ghost quick-chip, zero-discard laws.  ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Kimi-binding contract (ELEGANCE-BLUEPRINT-ARC-L): glass keys with 8px gaps, Fira Code display
 * digits, pressed state = accent color-mix + scale (reduced-motion: color only); Done = Dual-Button
 * Glow primary (blue bg → purple glow); quick-chip commits LAST SESSION'S value in one tap (the ghost
 * narrative); "Use system keyboard" 44px escape hatch (SR populations — readOnly announces dimmed);
 * dirty Esc/backdrop COMMITS, never discards; empty + Done keeps prior value (no zero-commit);
 * safe-area-inset-bottom; landscape max-height 70dvh; focus trapped while open, returned by caller.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Delete } from 'lucide-react';
import {
  Backdrop, Sheet, Handle, SheetTitle, Display, KeyGrid, Key, DoneKey,
  QuickChip, SystemKeyboardBtn, FooterRow,
} from './NumericKeypadSheet.styles';

export interface NumericKeypadSheetProps {
  open: boolean;
  label: string;
  /** Current committed value — shown as placeholder context; NOT pre-typed. */
  value: number | null | undefined;
  allowDecimal: boolean;
  /** Ghost narrative quick-chip: one tap commits last session's value. */
  lastSessionValue?: number | null;
  onCommit: (next: number) => void;
  /** reason 'done' = committed completion (advance allowed); 'dismiss' = Esc/backdrop (never advance). */
  onClose: (reason?: 'done' | 'dismiss') => void;
  onUseSystemKeyboard?: () => void;
}

const vibrate = (ms: number) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    && typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches) {
    navigator.vibrate(ms);
  }
};

const NumericKeypadSheet: React.FC<NumericKeypadSheetProps> = ({
  open, label, value, allowDecimal, lastSessionValue, onCommit, onClose, onUseSystemKeyboard,
}) => {
  const [entry, setEntry] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setEntry(''); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const node = sheetRef.current;
    node?.focus();
    return undefined;
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const commitIfDirty = (reason: 'done' | 'dismiss') => {
    if (entry !== '' && entry !== '.') {
      const parsed = Number(entry);
      if (Number.isFinite(parsed)) { vibrate(20); onCommit(parsed); }
    }
    onClose(reason);
  };

  const press = (digit: string) => {
    vibrate(10);
    setEntry((prev) => {
      if (digit === '.' && (!allowDecimal || prev.includes('.'))) return prev;
      if (prev.replace('.', '').length >= 5) return prev; // sane cap
      return prev + digit;
    });
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ...(allowDecimal ? ['.'] : []), '0'];

  return createPortal(
    <>
      <Backdrop data-testid="keypad-backdrop" onClick={() => commitIfDirty('dismiss')} />
      <Sheet
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} keypad`}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); commitIfDirty('dismiss'); }
          if (e.key >= '0' && e.key <= '9') press(e.key);
          if (e.key === '.' && allowDecimal) press('.');
          if (e.key === 'Backspace') setEntry((p) => p.slice(0, -1));
          if (e.key === 'Enter') { e.preventDefault(); commitIfDirty('done'); }
        }}
      >
        <Handle aria-hidden="true" />
        <SheetTitle>{label}</SheetTitle>
        <Display aria-live="polite">
          {entry === '' ? <span className="ghosted">{value ?? 0}</span> : entry}
        </Display>
        {lastSessionValue != null && (
          <QuickChip
            type="button"
            onClick={() => { vibrate(20); onCommit(lastSessionValue); onClose('done'); }}
          >
            Last: {lastSessionValue}
          </QuickChip>
        )}
        <KeyGrid>
          {keys.map((k) => (
            <Key key={k} type="button" onClick={() => press(k)}>{k}</Key>
          ))}
          <Key type="button" aria-label="Backspace" onClick={() => { vibrate(10); setEntry((p) => p.slice(0, -1)); }}>
            <Delete size={20} aria-hidden="true" />
          </Key>
          <DoneKey type="button" onClick={() => commitIfDirty('done')}>Done</DoneKey>
        </KeyGrid>
        <FooterRow>
          {onUseSystemKeyboard && (
            <SystemKeyboardBtn type="button" onClick={() => { onUseSystemKeyboard(); onClose('dismiss'); }}>
              Use system keyboard
            </SystemKeyboardBtn>
          )}
        </FooterRow>
      </Sheet>
    </>,
    document.body,
  );
};

export default NumericKeypadSheet;
