/**
 * ┌─── COMPONENT: FreezeFrameAnnotator ────────────────────────┐
 * │ PURPOSE: Trainer freezes video frame, draws annotations on  │
 * │ client's body (arrows, circles, freehand) for movement     │
 * │ analysis. Saves annotated image to assessment history.      │
 * │ CEO RULING: Mobile-first gestures, undo/redo, save to R2.  │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Undo2, Redo2, Trash2, Save, X, Pen, Circle, ArrowUpRight } from 'lucide-react';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-elevated, #141419);
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
  flex-wrap: wrap;
  gap: 8px;
`;

const ToolGroup = styled.div`
  display: flex;
  gap: 6px;
`;

const ToolBtn = styled.button<{ $active?: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.12)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.15)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover { background: rgba(96, 192, 240, 0.1); }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const ColorDot = styled.button<{ $color: string; $active: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${({ $active }) => $active ? '#fff' : 'transparent'};
  background: ${({ $color }) => $color};
  cursor: pointer;
`;

const CanvasContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
`;

const StyledCanvas = styled.canvas`
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
  touch-action: none;
`;

const SaveBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-elevated, #141419);
  border-top: 1px solid rgba(96, 192, 240, 0.12);
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
  background: ${({ $variant }) =>
    $variant === 'danger' ? '#EF4444' :
    $variant === 'primary' ? 'linear-gradient(135deg, #60C0F0, #8B5CF6)' :
    'var(--bg-elevated, #141419)'};
  color: ${({ $variant }) => $variant ? '#fff' : 'var(--text-primary, #E0ECF4)'};
  border: ${({ $variant }) => !$variant ? '1px solid rgba(96, 192, 240, 0.2)' : 'none'};

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

type Tool = 'pen' | 'arrow' | 'circle' | 'text';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#60C0F0', '#8B5CF6', '#E0ECF4'];

interface FreezeFrameAnnotatorProps {
  /** The frozen video frame as a data URL or blob URL */
  frameDataUrl: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

const FreezeFrameAnnotator: React.FC<FreezeFrameAnnotatorProps> = ({
  frameDataUrl, onSave, onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#EF4444');
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState<Array<{ tool: Tool; color: string; points: number[][] }>>([]);
  const [undoneStack, setUndoneStack] = useState<typeof paths>([]);
  const [saving, setSaving] = useState(false);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Load background image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        redraw();
      }
    };
    img.src = frameDataUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameDataUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !bgImageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImageRef.current, 0, 0);

    for (const path of paths) {
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'pen' && path.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path.points[0][0], path.points[0][1]);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i][0], path.points[i][1]);
        }
        ctx.stroke();
      } else if (path.tool === 'arrow' && path.points.length === 2) {
        const [start, end] = path.points;
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(end[0], end[1]);
        ctx.lineTo(end[0] - headLen * Math.cos(angle - 0.4), end[1] - headLen * Math.sin(angle - 0.4));
        ctx.moveTo(end[0], end[1]);
        ctx.lineTo(end[0] - headLen * Math.cos(angle + 0.4), end[1] - headLen * Math.sin(angle + 0.4));
        ctx.stroke();
      } else if (path.tool === 'circle' && path.points.length === 2) {
        const [center, edge] = path.points;
        const radius = Math.hypot(edge[0] - center[0], edge[1] - center[1]);
        ctx.beginPath();
        ctx.arc(center[0], center[1], radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [paths]);

  useEffect(() => { redraw(); }, [redraw]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setUndoneStack([]);
    const coords = getCanvasCoords(e);
    setPaths(prev => [...prev, { tool, color, points: [coords] }]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setPaths(prev => {
      const updated = [...prev];
      const current = { ...updated[updated.length - 1] };
      if (tool === 'pen') {
        current.points = [...current.points, coords];
      } else {
        current.points = [current.points[0], coords];
      }
      updated[updated.length - 1] = current;
      return updated;
    });
  };

  const handleEnd = () => setDrawing(false);

  const undo = () => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    setPaths(prev => prev.slice(0, -1));
    setUndoneStack(prev => [...prev, last]);
  };

  const redo = () => {
    if (undoneStack.length === 0) return;
    const last = undoneStack[undoneStack.length - 1];
    setUndoneStack(prev => prev.slice(0, -1));
    setPaths(prev => [...prev, last]);
  };

  const clearAll = () => {
    setPaths([]);
    setUndoneStack([]);
  };

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    setSaving(false);
  }, [onSave]);

  return (
    <Overlay>
      <TopBar>
        <ToolGroup>
          <ToolBtn $active={tool === 'pen'} onClick={() => setTool('pen')} title="Freehand"><Pen size={18} /></ToolBtn>
          <ToolBtn $active={tool === 'arrow'} onClick={() => setTool('arrow')} title="Arrow"><ArrowUpRight size={18} /></ToolBtn>
          <ToolBtn $active={tool === 'circle'} onClick={() => setTool('circle')} title="Circle"><Circle size={18} /></ToolBtn>
        </ToolGroup>

        <ColorPicker>
          {COLORS.map(c => (
            <ColorDot key={c} $color={c} $active={color === c} onClick={() => setColor(c)} />
          ))}
        </ColorPicker>

        <ToolGroup>
          <ToolBtn onClick={undo} title="Undo"><Undo2 size={18} /></ToolBtn>
          <ToolBtn onClick={redo} title="Redo"><Redo2 size={18} /></ToolBtn>
          <ToolBtn onClick={clearAll} title="Clear all"><Trash2 size={18} /></ToolBtn>
        </ToolGroup>
      </TopBar>

      <CanvasContainer>
        <StyledCanvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </CanvasContainer>

      <SaveBar>
        <ActionBtn onClick={onClose}><X size={14} /> Cancel</ActionBtn>
        <ActionBtn $variant="primary" onClick={handleSave} disabled={saving || paths.length === 0}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save Annotation'}
        </ActionBtn>
      </SaveBar>
    </Overlay>
  );
};

export default FreezeFrameAnnotator;
