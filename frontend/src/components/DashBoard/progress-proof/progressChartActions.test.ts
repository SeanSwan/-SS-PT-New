import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProgressChartPulse,
  downloadChartPng,
  downloadCsvFile,
  sliceChartPointsByRange,
} from './progressChartActions';

describe('progress chart actions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const readBlobText = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

  it('slices visible chart points by selected range without fabricating data', () => {
    const points = Array.from({ length: 10 }, (_, index) => ({ x: `W${index + 1}`, y: index + 1 }));

    expect(sliceChartPointsByRange(points, 'recent')).toEqual(points.slice(-6));
    expect(sliceChartPointsByRange(points, 'quarter')).toEqual(points);
    expect(sliceChartPointsByRange(points, 'all')).toEqual(points);
  });

  it('exports CSV rows with safe escaping', () => {
    let capturedBlob: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlob = blob as Blob;
      return 'blob:swan-chart';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    expect(downloadCsvFile('chart.csv', [
      { week: 'W1', value: 100, note: 'clean' },
      { week: 'W2', value: 200, note: 'heavy, controlled' },
    ])).toBe(true);
    expect(capturedBlob).not.toBeNull();
    return expect(readBlobText(capturedBlob as Blob)).resolves.toBe(
      'week,value,note\nW1,100,clean\nW2,200,"heavy, controlled"'
    );
  });

  it('builds an honest empty pulse without fabricating chart momentum', () => {
    expect(buildProgressChartPulse([], { label: 'Volume Pulse', unit: 'lbs' })).toEqual({
      label: 'Volume Pulse',
      value: 'Waiting on logs',
      detail: 'No verified rows exist in this range yet.',
      tone: 'empty',
    });
  });

  it('turns verified chart points into a real momentum readout', () => {
    expect(buildProgressChartPulse([
      { x: 'W1', y: 1200 },
      { x: 'W2', y: 2400 },
    ], { label: 'Volume Pulse', unit: 'lbs' })).toMatchObject({
      label: 'Volume Pulse',
      value: '+100% vs prior',
      detail: 'Latest W2: 2,400 lbs. Best W2: 2,400 lbs.',
      target: 'Protect the new high mark: 2,400 lbs.',
      tone: 'record',
    });
  });

  it('reports a real decline without hiding the best verified point', () => {
    expect(buildProgressChartPulse([
      { x: 'W1', y: 2400 },
      { x: 'W2', y: 1800 },
    ], { label: 'Volume Pulse', unit: 'lbs' })).toMatchObject({
      value: '-25% vs prior',
      detail: 'Latest W2: 1,800 lbs. Best W1: 2,400 lbs.',
      target: 'Next target: 2,400 lbs.',
      tone: 'falling',
    });
  });

  it('does not claim a PNG export when no rendered chart exists', async () => {
    await expect(downloadChartPng('missing-chart', 'missing.png')).resolves.toBe(false);
  });
});
