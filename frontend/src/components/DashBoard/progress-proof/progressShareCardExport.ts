/**
 * MODULE: progressShareCardExport
 * PURPOSE: Generate a bitmap proof card from safe Progress Share Card data.
 * OWNER: Client Dashboard / Progress Proof.
 */

import type { ProgressShareCard } from './progressShareCard';
import { downloadBlob } from './progressFileDownload';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const CARD_PADDING = 72;

interface ShareCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

interface CanvasColors {
  accent: string;
  border: string;
  gold: string;
  muted: string;
  primary: string;
  surface: string;
}

const getCssColor = (token: string, fallback: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
};

const drawRoundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
): number => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);

  lines.slice(0, maxLines).forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : '';
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });

  return y + Math.min(lines.length, maxLines) * lineHeight;
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> => (
  new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1))
);

const createShareCanvas = (): ShareCanvas | null => {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  return context ? { canvas, context } : null;
};

const buildCanvasColors = (): CanvasColors => ({
  accent: getCssColor('--accent-primary', '#60C0F0'),
  border: getCssColor('--border-accent', '#60C0F0'),
  gold: getCssColor('--accent-gold', '#C6A84B'),
  muted: getCssColor('--text-muted', 'rgba(224, 236, 244, 0.68)'),
  primary: getCssColor('--text-primary', '#E0ECF4'),
  surface: getCssColor('--bg-surface', '#1A1A24'),
});

const drawMetric = (
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  colors: { border: string; muted: string; primary: string; surface: string },
) => {
  context.fillStyle = colors.surface;
  context.strokeStyle = colors.border;
  context.lineWidth = 2;
  drawRoundRect(context, x, y, width, 132, 20);
  context.fill();
  context.stroke();

  context.fillStyle = colors.muted;
  context.font = '700 22px Sora, sans-serif';
  context.fillText(label.toUpperCase(), x + 26, y + 44);

  context.fillStyle = colors.primary;
  context.font = '700 31px "Fira Code", monospace';
  drawWrappedText(context, value, x + 26, y + 92, width - 52, 34, 1);
};

const paintShareCard = (context: CanvasRenderingContext2D, card: ProgressShareCard) => {
  const colors = buildCanvasColors();
  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, getCssColor('--bg-elevated', '#003080'));
  background.addColorStop(1, getCssColor('--bg-base', '#030712'));
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.strokeStyle = colors.border;
  context.lineWidth = 4;
  drawRoundRect(context, CARD_PADDING, CARD_PADDING, CARD_WIDTH - CARD_PADDING * 2, CARD_HEIGHT - CARD_PADDING * 2, 32);
  context.stroke();

  context.fillStyle = colors.accent;
  context.font = '800 26px Sora, sans-serif';
  context.fillText(card.kicker.toUpperCase(), CARD_PADDING + 36, CARD_PADDING + 78);

  context.fillStyle = colors.primary;
  context.font = '800 58px "Plus Jakarta Sans", sans-serif';
  const afterTitle = drawWrappedText(
    context,
    card.title,
    CARD_PADDING + 36,
    CARD_PADDING + 168,
    CARD_WIDTH - CARD_PADDING * 2 - 72,
    66,
    3,
  );

  context.fillStyle = colors.muted;
  context.font = '500 30px Sora, sans-serif';
  const afterDetail = drawWrappedText(
    context,
    card.detail,
    CARD_PADDING + 36,
    afterTitle + 38,
    CARD_WIDTH - CARD_PADDING * 2 - 72,
    42,
    4,
  );

  const metricGap = 22;
  const metricWidth = (CARD_WIDTH - CARD_PADDING * 2 - 72 - metricGap * 2) / 3;
  const metricY = afterDetail + 52;
  card.metrics.slice(0, 3).forEach((metric, index) => {
    drawMetric(
      context,
      metric.label,
      metric.value,
      CARD_PADDING + 36 + index * (metricWidth + metricGap),
      metricY,
      metricWidth,
      colors,
    );
  });

  context.fillStyle = colors.gold;
  context.font = '700 30px Sora, sans-serif';
  drawWrappedText(
    context,
    card.proofLine,
    CARD_PADDING + 36,
    metricY + 204,
    CARD_WIDTH - CARD_PADDING * 2 - 72,
    42,
    3,
  );

  context.fillStyle = colors.muted;
  context.font = '600 24px Sora, sans-serif';
  context.fillText('Built from verified SwanStudios workout and progress logs.', CARD_PADDING + 36, CARD_HEIGHT - CARD_PADDING - 56);
};

export async function downloadProgressShareCardPng(
  card: ProgressShareCard,
  filename: string,
): Promise<boolean> {
  if (!card.isShareable) return false;
  const shareCanvas = createShareCanvas();
  if (!shareCanvas) return false;
  paintShareCard(shareCanvas.context, card);
  const blob = await canvasToBlob(shareCanvas.canvas);
  if (!blob) return false;
  return downloadBlob(filename, blob);
}
