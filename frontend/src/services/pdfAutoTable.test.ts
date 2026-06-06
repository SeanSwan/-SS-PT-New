import type { jsPDF } from 'jspdf';
import { describe, expect, it, vi } from 'vitest';
import {
  addAutoTable,
  getLastAutoTableY,
  resolveAutoTableRenderer,
  type AutoTableOptions,
} from './pdfAutoTable';

const options: AutoTableOptions = {
  head: [['Set', 'Reps']],
  body: [[1, 10]],
};

describe('pdfAutoTable interop', () => {
  it('uses a named autoTable renderer when the package exposes one', () => {
    const renderer = vi.fn();
    const doc = {} as jsPDF;

    addAutoTable(doc, options, { autoTable: renderer });

    expect(renderer).toHaveBeenCalledWith(doc, options);
  });

  it('uses a default renderer when the package exposes a default function', () => {
    const renderer = vi.fn();
    const doc = {} as jsPDF;

    addAutoTable(doc, options, { default: renderer });

    expect(renderer).toHaveBeenCalledWith(doc, options);
  });

  it('uses a nested module renderer when bundling wraps the dependency object', () => {
    const renderer = vi.fn();
    const doc = {} as jsPDF;

    addAutoTable(doc, options, { default: { autoTable: renderer } });

    expect(renderer).toHaveBeenCalledWith(doc, options);
  });

  it('falls back to an already-installed jsPDF plugin method', () => {
    const pluginRenderer = vi.fn(function plugin(this: { lastAutoTable?: { finalY?: number } }) {
      this.lastAutoTable = { finalY: 42 };
    });
    const doc = { autoTable: pluginRenderer } as unknown as jsPDF;

    resolveAutoTableRenderer({})(doc, options);

    expect(pluginRenderer).toHaveBeenCalledWith(options);
    expect(getLastAutoTableY(doc, 10)).toBe(42);
  });

  it('throws a stable product error when no renderer is available', () => {
    const renderer = resolveAutoTableRenderer({});

    expect(() => renderer({} as jsPDF, options)).toThrow('SwanStudios PDF table export is unavailable.');
  });
});
