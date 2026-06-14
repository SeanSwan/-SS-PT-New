import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadChartPng, downloadCsvFile, sliceChartPointsByRange } from './progressChartActions';

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

  it('does not claim a PNG export when no rendered chart exists', async () => {
    await expect(downloadChartPng('missing-chart', 'missing.png')).resolves.toBe(false);
  });
});
