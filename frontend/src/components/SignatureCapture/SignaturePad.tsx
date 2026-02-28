/**
 * SignaturePad — Phase 5W-G
 * ==========================
 * Canvas-based signature capture using signature_pad library.
 * Galaxy-Swan themed with cyan pen color, dark background.
 *
 * Usage:
 *   const ref = useRef<SignaturePadHandle>(null);
 *   <SignaturePad ref={ref} onEnd={() => setHasSignature(true)} />
 *   ref.current?.clear()
 *   ref.current?.isEmpty()
 *   ref.current?.toDataURL()
 */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useCallback,
} from 'react';
import styled from 'styled-components';
import SignaturePadLib from 'signature_pad';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
}

interface SignaturePadProps {
  onEnd?: () => void;
  onBegin?: () => void;
  onClear?: () => void;
}

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 200px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  background: #0a0a2e;
  cursor: crosshair;
  touch-action: none;

  &:focus {
    border-color: #00ffff;
    outline: none;
  }
`;

const Placeholder = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.25);
  font-size: 1rem;
  pointer-events: none;
  user-select: none;
`;

const ClearButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 6px;
  background: rgba(10, 10, 30, 0.8);
  color: #00ffff;
  font-size: 0.75rem;
  cursor: pointer;
  z-index: 2;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
  }
`;

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onEnd, onBegin, onClear }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePadLib | null>(null);
    const hasDrawnRef = useRef(false);

    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
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
        penColor: '#00ffff',
        backgroundColor: 'rgba(10, 10, 46, 0)',
        minWidth: 1.5,
        maxWidth: 3,
      });

      padRef.current.addEventListener('endStroke', () => {
        hasDrawnRef.current = true;
        onEnd?.();
      });

      padRef.current.addEventListener('beginStroke', () => {
        onBegin?.();
      });

      const handleResize = () => resizeCanvas();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        padRef.current?.off();
      };
    }, [onEnd, onBegin, resizeCanvas]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        padRef.current?.clear();
        hasDrawnRef.current = false;
      },
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: (type?: string) => padRef.current?.toDataURL(type) ?? '',
    }));

    const handleClear = () => {
      padRef.current?.clear();
      hasDrawnRef.current = false;
      onClear?.();
    };

    return (
      <Container>
        {!hasDrawnRef.current && <Placeholder>Sign here</Placeholder>}
        <Canvas ref={canvasRef} tabIndex={0} />
        <ClearButton type="button" onClick={handleClear}>
          Clear
        </ClearButton>
      </Container>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
