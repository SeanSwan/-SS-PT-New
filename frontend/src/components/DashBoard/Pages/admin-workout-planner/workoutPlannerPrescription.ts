/**
 * Lossless compatibility codec for planner intensity prescriptions.
 *
 * A typed finite number is authoritative. Legacy complete percentage text is
 * parsed for the numeric editor, while ranges and unrecognized text remain
 * text-only so a save cannot invent a prescription.
 */

export interface IntensityPrescription {
  intensityPercent?: number;
  intensityGuideline?: string;
}

const COMPLETE_PERCENTAGE = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*%\s*(?:1RM)?\s*$/i;

const finiteNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

export const decodeIntensityPrescription = (
  typedValue: unknown,
  legacyText?: unknown,
): IntensityPrescription => {
  const typed = finiteNumber(typedValue);
  if (typed !== undefined) {
    return {
      intensityPercent: typed,
      intensityGuideline: `${typed}% 1RM`,
    };
  }

  const text = typeof legacyText === 'string'
    ? legacyText
    : typeof typedValue === 'string'
      ? typedValue
      : undefined;
  if (!text || text.trim() === '') return {};

  const match = COMPLETE_PERCENTAGE.exec(text);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      return {
        intensityPercent: parsed,
        intensityGuideline: text,
      };
    }
  }

  return { intensityGuideline: text };
};

export const encodeIntensityPrescription = (
  intensityPercent: unknown,
  intensityGuideline?: unknown,
): IntensityPrescription => {
  const typed = finiteNumber(intensityPercent);
  if (typed !== undefined) {
    return {
      intensityPercent: typed,
      intensityGuideline: `${typed}% 1RM`,
    };
  }

  return typeof intensityGuideline === 'string' && intensityGuideline.trim() !== ''
    ? { intensityGuideline }
    : {};
};
