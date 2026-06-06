/**
 * pdfAutoTable
 * ============
 * Runtime interop boundary for jspdf-autotable.
 *
 * Why this exists:
 * - Vite/browser bundles can expose jspdf-autotable as a default function,
 *   a named autoTable function, a nested module object, or an installed
 *   jsPDF plugin method.
 * - PDF export callers should not care which shape the dependency exposes.
 */
import { jsPDF } from 'jspdf';
import autoTableDefault, {
  applyPlugin,
  autoTable as autoTableNamed,
  type UserOptions,
} from 'jspdf-autotable';

export type AutoTableOptions = UserOptions;
export type AutoTableRenderer = (doc: jsPDF, options: AutoTableOptions) => void;

export interface AutoTableModuleShape {
  default?: unknown;
  autoTable?: unknown;
  applyPlugin?: unknown;
}

type PluginDoc = jsPDF & {
  autoTable?: (options: AutoTableOptions) => void;
  lastAutoTable?: { finalY?: number };
};

const installedAutoTableModule: AutoTableModuleShape = {
  default: autoTableDefault,
  autoTable: autoTableNamed,
  applyPlugin,
};

const isRenderer = (candidate: unknown): candidate is AutoTableRenderer =>
  typeof candidate === 'function';

const asModuleShape = (candidate: unknown): AutoTableModuleShape =>
  candidate && typeof candidate === 'object'
    ? candidate as AutoTableModuleShape
    : {};

const resolvePluginInstaller = (moduleShape: AutoTableModuleShape) => {
  const nestedDefault = asModuleShape(moduleShape.default);
  return [moduleShape.applyPlugin, nestedDefault.applyPlugin]
    .find((candidate): candidate is (ctor: typeof jsPDF) => void => typeof candidate === 'function');
};

export const resolveAutoTableRenderer = (
  moduleShape: AutoTableModuleShape = installedAutoTableModule,
): AutoTableRenderer => {
  const nestedDefault = asModuleShape(moduleShape.default);
  const renderer = [
    moduleShape.autoTable,
    moduleShape.default,
    nestedDefault.autoTable,
    nestedDefault.default,
  ].find(isRenderer);

  if (renderer) {
    return renderer;
  }

  return (doc, options) => {
    const pluginDoc = doc as PluginDoc;
    if (typeof pluginDoc.autoTable !== 'function') {
      resolvePluginInstaller(moduleShape)?.(jsPDF);
    }

    if (typeof pluginDoc.autoTable === 'function') {
      pluginDoc.autoTable(options);
      return;
    }

    throw new Error('SwanStudios PDF table export is unavailable.');
  };
};

export function addAutoTable(
  doc: jsPDF,
  options: AutoTableOptions,
  moduleShape: AutoTableModuleShape = installedAutoTableModule,
) {
  resolveAutoTableRenderer(moduleShape)(doc, options);
}

export function getLastAutoTableY(doc: jsPDF, fallbackY: number): number {
  return (doc as PluginDoc).lastAutoTable?.finalY ?? fallbackY;
}
