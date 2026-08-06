/**
 * SignaturePad — Phase 5W-G (accessibility rebuild)
 * =================================================
 * Two first-class, legally binding modes: Draw (the original signature_pad
 * canvas, DPR-aware, touch-action: none) and Type (full name + adoption
 * checkbox). WHY: a signature is a REQUIRED field on the public waiver, and the
 * previous canvas-only build had no keyboard path — it locked keyboard-only and
 * motor-impaired users out of a legally required form. Type is an equal path,
 * not a hidden fallback. Both modes emit the same PNG data URL, so the parent
 * page and the stored record shape are unchanged.
 *
 * Usage: ref.current?.clear() / isEmpty() / toDataURL() / getSignatureMethod()
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import SignaturePadLib from 'signature_pad';
import { renderTypedSignature, resolveToken } from './typedSignature';
import * as S from './SignaturePad.styles';

export type SignatureMethod = 'drawn' | 'typed';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
  getSignatureMethod: () => SignatureMethod;
}

interface SignaturePadProps {
  onEnd?: () => void;
  onBegin?: () => void;
  onClear?: () => void;
}

const TABS: ReadonlyArray<{ id: SignatureMethod; label: string }> = [
  { id: 'drawn', label: 'Draw' },
  { id: 'typed', label: 'Type' },
];

const CANVAS_LABEL =
  'Signature drawing surface. Use a mouse, stylus, or finger to draw your signature. ' +
  'If you cannot draw, switch to the Type tab to type your full name instead — both are accepted.';

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onEnd, onBegin, onClear }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePadLib | null>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // Props held in a ref so the pad is never re-created by a parent re-render.
    const cbRef = useRef({ onEnd, onBegin, onClear });
    cbRef.current = { onEnd, onBegin, onClear };

    const [method, setMethod] = useState<SignatureMethod>('drawn');
    const [hasDrawn, setHasDrawn] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [adopted, setAdopted] = useState(false);
    const [confirmingClear, setConfirmingClear] = useState(false);
    const [announcement, setAnnouncement] = useState('');

    const typedReady = typedName.trim().length > 0 && adopted;
    const filled = method === 'drawn' ? hasDrawn : typedReady;

    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Hidden panel (Type tab) reports 0×0 — resizing to zero would wipe the drawing.
      if (!rect.width || !rect.height) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(ratio, ratio);
      // Restore pad data if needed
      if (padRef.current && !padRef.current.isEmpty()) {
        const data = padRef.current.toData();
        padRef.current.clear();
        padRef.current.fromData(data);
      }
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      resizeCanvas();

      padRef.current = new SignaturePadLib(canvas, {
        penColor: resolveToken(canvas, '--accent-primary', '#60C0F0'),
        backgroundColor: 'rgba(0, 0, 0, 0)',
        minWidth: 1.5,
        maxWidth: 3,
      });

      padRef.current.addEventListener('endStroke', () => {
        setHasDrawn(true);
        setConfirmingClear(false);
      });
      padRef.current.addEventListener('beginStroke', () => cbRef.current.onBegin?.());

      const handleResize = () => resizeCanvas();
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        padRef.current?.off();
      };
    }, [resizeCanvas]);

    // Re-measure when the Draw panel becomes visible again.
    useEffect(() => {
      if (method === 'drawn') resizeCanvas();
    }, [method, resizeCanvas]);

    // Single source of truth for parent notification (ACTIVE method only).
    useEffect(() => {
      if (filled) cbRef.current.onEnd?.();
      else cbRef.current.onClear?.();
    }, [filled]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          padRef.current?.clear();
          setHasDrawn(false);
          setTypedName('');
          setAdopted(false);
          setConfirmingClear(false);
        },
        isEmpty: () => (method === 'drawn' ? (padRef.current?.isEmpty() ?? true) : !typedReady),
        toDataURL: (type?: string) => {
          if (method === 'typed') {
            if (!typedReady) return '';
            return renderTypedSignature(typedName, {
              type,
              penColor: resolveToken(canvasRef.current, '--accent-primary', '#60C0F0'),
            });
          }
          return padRef.current?.toDataURL(type) ?? '';
        },
        getSignatureMethod: () => method,
      }),
      [method, typedName, typedReady],
    );

    const selectTab = (next: SignatureMethod) => {
      setMethod(next);
      setConfirmingClear(false);
      setAnnouncement(next === 'drawn' ? 'Draw signature selected.' : 'Type signature selected.');
    };

    const handleTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const index = TABS.findIndex((t) => t.id === method);
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % TABS.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index + TABS.length - 1) % TABS.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = TABS.length - 1;
      if (next < 0) return;
      e.preventDefault();
      selectTab(TABS[next].id);
      tabRefs.current[next]?.focus();
    };

    const handleUndo = () => {
      const pad = padRef.current;
      if (!pad || !pad.toData().length) return;
      // slice() — toData() hands back the library's internal array; never mutate it.
      pad.fromData(pad.toData().slice(0, -1));
      const nowEmpty = pad.isEmpty();
      setHasDrawn(!nowEmpty);
      setAnnouncement(nowEmpty ? 'Last stroke removed. Signature is now empty.' : 'Last stroke removed.');
    };

    const handleClearConfirmed = () => {
      if (method === 'drawn') {
        padRef.current?.clear();
        setHasDrawn(false);
      } else {
        setTypedName('');
        setAdopted(false);
      }
      setConfirmingClear(false);
      setAnnouncement('Signature cleared.');
    };

    const canClear = method === 'drawn' ? hasDrawn : typedName.length > 0 || adopted;

    return (
      <S.Container>
        <S.TabList role="tablist" aria-label="Signature method" onKeyDown={handleTabKeyDown}>
          {TABS.map((tab, i) => (
            <S.Tab
              key={tab.id}
              type="button"
              role="tab"
              id={`signature-tab-${tab.id}`}
              aria-selected={method === tab.id}
              aria-controls={`signature-panel-${tab.id}`}
              tabIndex={method === tab.id ? 0 : -1}
              $active={method === tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
            </S.Tab>
          ))}
        </S.TabList>

        <S.Panel
          role="tabpanel"
          id="signature-panel-drawn"
          aria-labelledby="signature-tab-drawn"
          hidden={method !== 'drawn'}
        >
          <S.CanvasWrap>
            {!hasDrawn && <S.Placeholder aria-hidden="true">Sign here</S.Placeholder>}
            <S.Canvas ref={canvasRef} tabIndex={0} role="img" aria-label={CANVAS_LABEL} />
          </S.CanvasWrap>
          <S.HelpText>
            Draw your signature above. Prefer the keyboard? Choose the <strong>Type</strong> tab — a typed
            signature is equally valid.
          </S.HelpText>
        </S.Panel>

        <S.Panel
          role="tabpanel"
          id="signature-panel-typed"
          aria-labelledby="signature-tab-typed"
          hidden={method !== 'typed'}
        >
          <S.Field>
            <S.Label htmlFor="typed-signature-name">Type your full legal name</S.Label>
            <S.TextInput
              id="typed-signature-name"
              name="typedSignatureName"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Morgan"
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
                setConfirmingClear(false);
              }}
            />
          </S.Field>
          <S.Preview aria-hidden="true">
            <S.PreviewText $empty={!typedName.trim()}>{typedName.trim() || 'Your signature'}</S.PreviewText>
          </S.Preview>
          <S.AdoptRow htmlFor="typed-signature-adopt">
            <input
              id="typed-signature-adopt"
              type="checkbox"
              checked={adopted}
              onChange={(e) => setAdopted(e.target.checked)}
            />
            <span>I adopt this as my electronic signature.</span>
          </S.AdoptRow>
        </S.Panel>

        <S.ControlRow>
          {method === 'drawn' && (
            <S.ControlButton type="button" onClick={handleUndo} disabled={!hasDrawn}>
              Undo last stroke
            </S.ControlButton>
          )}
          {confirmingClear ? (
            <>
              <S.ConfirmText>Clear your signature?</S.ConfirmText>
              <S.ControlButton type="button" $danger onClick={handleClearConfirmed}>
                Yes, clear
              </S.ControlButton>
              <S.ControlButton type="button" onClick={() => setConfirmingClear(false)}>
                Cancel
              </S.ControlButton>
            </>
          ) : (
            <S.ControlButton type="button" onClick={() => setConfirmingClear(true)} disabled={!canClear}>
              Clear
            </S.ControlButton>
          )}
        </S.ControlRow>

        <S.LiveRegion role="status" aria-live="polite">
          {announcement}
        </S.LiveRegion>
      </S.Container>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
