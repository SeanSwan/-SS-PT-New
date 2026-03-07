/**
 * VideoOverlay — Neon Wireframe Skeleton HUD
 * ============================================
 * Gemini Directive 1: Custom neon-wireframe with cyan/purple/red dynamic
 * colors, shadowBlur glow, and vignette overlay on canvas.
 *
 * PERF FIX: Reads from MutableRefObjects instead of props to bypass
 * React's render cycle. Runs its own rAF draw loop — zero React re-renders
 * during live analysis.
 */
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  SKELETON_CONNECTIONS,
  OVERLAY_COLORS,
  ANALYSIS_CONFIG,
} from './constants';

type NormalizedLandmark = { x: number; y: number; z: number; visibility?: number };

export interface VideoOverlayRefs {
  landmarks: React.MutableRefObject<NormalizedLandmark[] | null>;
  jointQuality: React.MutableRefObject<Record<number, 'good' | 'warning' | 'danger'>>;
  dimensions: React.MutableRefObject<{ width: number; height: number }>;
  /** Set to false to stop the draw loop */
  active: React.MutableRefObject<boolean>;
}

interface VideoOverlayProps {
  refs: VideoOverlayRefs;
}

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
`;

function getConnectionQuality(
  a: number,
  b: number,
  jointQuality: Record<number, 'good' | 'warning' | 'danger'>
): 'good' | 'warning' | 'danger' {
  const qa = jointQuality[a] ?? 'good';
  const qb = jointQuality[b] ?? 'good';
  if (qa === 'danger' || qb === 'danger') return 'danger';
  if (qa === 'warning' || qb === 'warning') return 'warning';
  return 'good';
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  jointQuality: Record<number, 'good' | 'warning' | 'danger'>,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  if (landmarks.length < 33) return;

  // Vignette overlay
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Draw skeleton connections
  const minVis = ANALYSIS_CONFIG.MIN_VISIBILITY;
  for (const [a, b] of SKELETON_CONNECTIONS) {
    const la = landmarks[a];
    const lb = landmarks[b];
    if ((la.visibility ?? 0) < minVis || (lb.visibility ?? 0) < minVis) continue;

    const quality = getConnectionQuality(a, b, jointQuality);
    const color = OVERLAY_COLORS.skeleton[quality];
    const glowColor = OVERLAY_COLORS.glow[quality];

    // Glow layer
    ctx.save();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 8;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(la.x * width, la.y * height);
    ctx.lineTo(lb.x * width, lb.y * height);
    ctx.stroke();
    ctx.restore();

    // Main line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(la.x * width, la.y * height);
    ctx.lineTo(lb.x * width, lb.y * height);
    ctx.stroke();
  }

  // Draw joint dots
  for (let i = 11; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if ((lm.visibility ?? 0) < minVis) continue;

    const quality = jointQuality[i] ?? 'good';
    const color = OVERLAY_COLORS.joint[quality];
    const glowColor = OVERLAY_COLORS.glow[quality];
    const x = lm.x * width;
    const y = lm.y * height;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

const VideoOverlay: React.FC<VideoOverlayProps> = ({ refs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId = 0;

    const loop = () => {
      if (!refs.active.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const { width, height } = refs.dimensions.current;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const landmarks = refs.landmarks.current;
      if (landmarks) {
        drawFrame(ctx, landmarks, refs.jointQuality.current, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [refs]);

  return <Canvas ref={canvasRef} />;
};

export default VideoOverlay;
