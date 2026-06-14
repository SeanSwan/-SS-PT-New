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

export type ProgressChartPulseTone = 'empty' | 'building' | 'rising' | 'steady' | 'falling' | 'record';

export interface ProgressChartPulse {
  label: string;
  value: string;
  detail: string;
  target?: string;
  tone: ProgressChartPulseTone;
}

interface ProgressChartPulseOptions {
  label?: string;
  unit?: string;
  higherIsBetter?: boolean;
}

interface ResolvedProgressChartPulseOptions {
  label: string;
  unit: string;
  higherIsBetter: boolean;
}

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

const formatPulseNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
};

const formatDeltaPercent = (latest: number, previous: number): string => {
  if (!Number.isFinite(previous) || previous === 0) return 'new baseline';
  const deltaPct = ((latest - previous) / Math.abs(previous)) * 100;
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${Math.round(deltaPct)}%`;
};

const formatPulseValue = (value: number, unit: string): string => (
  `${formatPulseNumber(value)}${unit ? ` ${unit}` : ''}`
);

const buildEmptyPulse = (label: string): ProgressChartPulse => ({
  label,
  value: 'Waiting on logs',
  detail: 'No verified rows exist in this range yet.',
  tone: 'empty',
});

const getBestPoint = <T extends ChartPoint>(points: T[], higherIsBetter: boolean): T => (
  [...points].sort((a, b) => (higherIsBetter ? b.y - a.y : a.y - b.y))[0]
);

const buildBaselinePulse = <T extends ChartPoint>(
  label: string,
  latest: T,
  bestValue: string,
): ProgressChartPulse => ({
  label,
  value: bestValue,
  detail: `First verified point: ${latest.x}. Log another point to unlock momentum.`,
  target: `Beat ${bestValue} to set the next proof mark.`,
  tone: 'building',
});

type DirectionToneKey = 'true' | 'false';

const DIRECTION_TONES: Record<DirectionToneKey, ProgressChartPulseTone> = {
  false: 'falling',
  true: 'rising',
};

interface MomentumToneContext<T extends ChartPoint> {
  best: T;
  delta: number;
  isImproving: boolean;
  latest: T;
}

const MOMENTUM_TONE_RULES = [
  {
    tone: 'record' as const,
    test: <T extends ChartPoint>({ best, isImproving, latest }: MomentumToneContext<T>) => (
      latest.x === best.x && isImproving
    ),
  },
  {
    tone: 'steady' as const,
    test: <T extends ChartPoint>({ delta }: MomentumToneContext<T>) => Math.abs(delta) < 1,
  },
];

const resolveMomentumTone = <T extends ChartPoint>(
  latest: T,
  previous: T,
  best: T,
  higherIsBetter: boolean,
): ProgressChartPulseTone => {
  const delta = latest.y - previous.y;
  const effectiveDelta = higherIsBetter ? delta : -delta;
  const isImproving = effectiveDelta > 0;
  const context = { best, delta, isImproving, latest };
  const matchedRule = MOMENTUM_TONE_RULES.find((rule) => rule.test(context));

  if (matchedRule) return matchedRule.tone;
  return DIRECTION_TONES[String(isImproving) as DirectionToneKey];
};

const buildMomentumPulse = <T extends ChartPoint>(
  label: string,
  points: T[],
  best: T,
  unit: string,
  higherIsBetter: boolean,
): ProgressChartPulse => {
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const tone = resolveMomentumTone(latest, previous, best, higherIsBetter);
  const latestValue = formatPulseValue(latest.y, unit);
  const bestValue = formatPulseValue(best.y, unit);

  return {
    label,
    value: tone === 'steady' ? 'Stable' : `${formatDeltaPercent(latest.y, previous.y)} vs prior`,
    detail: `Latest ${latest.x}: ${latestValue}. Best ${best.x}: ${bestValue}.`,
    target: tone === 'record'
      ? `Protect the new high mark: ${bestValue}.`
      : `Next target: ${bestValue}.`,
    tone,
  };
};

const resolvePulseOptions = (
  options: ProgressChartPulseOptions,
): ResolvedProgressChartPulseOptions => ({
  label: options.label ?? 'Progress Pulse',
  unit: options.unit ?? '',
  higherIsBetter: options.higherIsBetter ?? true,
});

export function buildProgressChartPulse<T extends ChartPoint>(
  points: T[],
  options: ProgressChartPulseOptions = {},
): ProgressChartPulse {
  const { label, unit, higherIsBetter } = resolvePulseOptions(options);
  if (points.length === 0) return buildEmptyPulse(label);

  const latest = points[points.length - 1];
  const best = getBestPoint(points, higherIsBetter);
  const bestValue = formatPulseValue(best.y, unit);

  if (points.length === 1) {
    return buildBaselinePulse(label, latest, bestValue);
  }

  return buildMomentumPulse(label, points, best, unit, higherIsBetter);
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

const canExportPng = (): boolean => (
  [
    typeof window,
    typeof XMLSerializer,
    typeof Blob,
    typeof Image,
  ].every((value) => value !== 'undefined')
);

interface SerializedSvg {
  height: number;
  url: string;
  width: number;
}

const firstPositiveNumber = (values: number[]): number => (
  values.find((value) => Number.isFinite(value) && value > 0) ?? 0
);

const readSvgDimension = (
  svg: SVGSVGElement,
  attribute: 'height' | 'width',
  fallback: number,
): number => {
  const attrValue = Number(svg.getAttribute(attribute));
  const viewBoxValue = svg.viewBox.baseVal[attribute];
  return firstPositiveNumber([attrValue, viewBoxValue, fallback]);
};

const serializeSvgForPng = (svg: SVGSVGElement): SerializedSvg => {
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const width = readSvgDimension(svg, 'width', 900);
  const height = readSvgDimension(svg, 'height', 520);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  return { height, url: URL.createObjectURL(svgBlob), width };
};

const loadImageFromUrl = async (url: string): Promise<HTMLImageElement | null> => {
  const image = new Image();
  image.decoding = 'async';
  const loaded = new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = url;
  return await loaded ? image : null;
};

const renderImageToPngBlob = async (
  image: HTMLImageElement,
  width: number,
  height: number,
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#0A0A0F';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
};

const downloadPngBlob = (filename: string, pngBlob: Blob | null): boolean => {
  if (!pngBlob) return false;
  return downloadBlob(filename, pngBlob);
};

export async function downloadChartPng(exportTargetId: string, filename: string): Promise<boolean> {
  if (!canExportPng()) return false;

  const svg = findExportSvg(exportTargetId);
  if (!svg) return false;

  const serialized = serializeSvgForPng(svg);

  try {
    const image = await loadImageFromUrl(serialized.url);
    if (!image) return false;
    const pngBlob = await renderImageToPngBlob(image, serialized.width, serialized.height);
    return downloadPngBlob(filename, pngBlob);
  } finally {
    URL.revokeObjectURL(serialized.url);
  }
}
