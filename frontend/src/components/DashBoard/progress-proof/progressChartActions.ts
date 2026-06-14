import type { ChartPoint } from '../../../hooks/analytics/useClientProgressCharts';

export const PROGRESS_CHART_TIME_RANGES = [
  { id: 'recent', label: 'Recent', pointLimit: 6 },
  { id: 'quarter', label: 'Quarter', pointLimit: 12 },
  { id: 'halfYear', label: 'Half Year', pointLimit: 24 },
  { id: 'all', label: 'All', pointLimit: Infinity },
] as const;

export type ProgressChartTimeRange = typeof PROGRESS_CHART_TIME_RANGES[number]['id'];

export const PROGRESS_CHART_RANGE_LABELS: Record<ProgressChartTimeRange, string> = {
  recent: 'recent verified data',
  quarter: 'quarter view',
  halfYear: 'half-year view',
  all: 'all verified data',
};

export interface ProgressChartDrilldownRow {
  id: string;
  label: string;
  value: string;
  detail?: string;
}

export type ProgressChartCsvRow = Record<string, string | number | null | undefined>;

const csvEscape = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function sliceChartPointsByRange<T extends ChartPoint>(
  points: T[],
  range: ProgressChartTimeRange,
): T[] {
  const config = PROGRESS_CHART_TIME_RANGES.find((item) => item.id === range);
  const limit = config?.pointLimit ?? Infinity;
  if (!Number.isFinite(limit)) return points;
  return points.slice(-limit);
}

function toCsv(rows: ProgressChartCsvRow[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const body = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','));
  return [headers.join(','), ...body].join('\n');
}

const downloadBlob = (filename: string, blob: Blob): boolean => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};

export function downloadCsvFile(filename: string, rows: ProgressChartCsvRow[]): boolean {
  const csv = toCsv(rows);
  if (!csv || typeof document === 'undefined' || typeof Blob === 'undefined') return false;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  return downloadBlob(filename, blob);
}

const findExportSvg = (exportTargetId: string): SVGSVGElement | null => {
  if (typeof document === 'undefined') return null;
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-chart-export]'));
  const target = targets.find((node) => node.getAttribute('data-chart-export') === exportTargetId);
  return target?.querySelector<SVGSVGElement>('svg') || null;
};

export async function downloadChartPng(exportTargetId: string, filename: string): Promise<boolean> {
  if (
    typeof window === 'undefined'
    || typeof XMLSerializer === 'undefined'
    || typeof Blob === 'undefined'
    || typeof Image === 'undefined'
  ) {
    return false;
  }

  const svg = findExportSvg(exportTargetId);
  if (!svg) return false;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const width = Number(svg.getAttribute('width')) || svg.viewBox.baseVal?.width || 900;
  const height = Number(svg.getAttribute('height')) || svg.viewBox.baseVal?.height || 520;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<boolean>((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
    });
    image.src = svgUrl;
    if (!(await loaded)) return false;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return false;
    context.fillStyle = '#0A0A0F';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
    return !!pngBlob && downloadBlob(filename, pngBlob);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
