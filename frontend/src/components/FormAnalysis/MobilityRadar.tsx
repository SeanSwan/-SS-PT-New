/**
 * MobilityRadar — Canvas-based Radar Chart
 * ==========================================
 * Draws a radar/spider chart for per-joint mobility scores.
 * Galaxy-Swan themed: cyan lines, dark fill, glowing data points.
 */
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { getScoreColor } from './constants';

interface MobilityRadarProps {
  scores: Record<string, number>;
}

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0;
`;

const Canvas = styled.canvas`
  max-width: 300px;
  max-height: 300px;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
`;

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

const MobilityRadar: React.FC<MobilityRadarProps> = ({ scores }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const entries = Object.entries(scores);
    if (entries.length < 3) return;

    const size = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 40;
    const n = entries.length;
    const angleStep = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, size, size);

    // Draw grid rings
    const rings = [0.25, 0.5, 0.75, 1.0];
    for (const ring of rings) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius * ring;
        const y = cy + Math.sin(angle) * radius * ring;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(96, 192, 240, ${ring === 1 ? 0.2 : 0.08})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axis lines
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = 'rgba(96, 192, 240, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const value = Math.min(100, Math.max(0, entries[idx][1])) / 100;
      const angle = idx * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius * value;
      const y = cy + Math.sin(angle) * radius * value;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(96, 192, 240, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(96, 192, 240, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points and labels
    for (let i = 0; i < n; i++) {
      const value = Math.min(100, Math.max(0, entries[i][1])) / 100;
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius * value;
      const y = cy + Math.sin(angle) * radius * value;

      const color = getScoreColor(entries[i][1]);

      // Glow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Core dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Label
      const labelRadius = radius + 20;
      const lx = cx + Math.cos(angle) * labelRadius;
      const ly = cy + Math.sin(angle) * labelRadius;
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(224, 236, 244, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatLabel(entries[i][0]), lx, ly);
    }
  }, [scores]);

  return (
    <Wrapper>
      <Canvas ref={canvasRef} />
    </Wrapper>
  );
};

export default MobilityRadar;
