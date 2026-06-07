/**
 * Swan Coach planning signal formatter for workout-plan PDFs.
 *
 * Converts the safe planning fingerprint into printable labels. Raw client
 * identity fields from the fingerprint are intentionally ignored.
 */

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).map(v => v.trim()).filter(Boolean) : [];

const firstString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : '';

export const buildPlanningSignalLines = (planData: unknown): string[] => {
  const planning = toRecord(toRecord(planData).swanCoachPlanning);
  if (Object.keys(planning).length === 0) return [];

  const safetyGate = toRecord(planning.safetyGate);
  const lines = [
    ['Data used', toStringArray(planning.dataCategoriesUsed).slice(0, 8).join(', ')],
    ['Missing data', toStringArray(planning.missingDataCategories).slice(0, 6).join(', ')],
    ['NASM domains', toStringArray(planning.nasmDomainsApplied).slice(0, 8).join(', ')],
    ['Review gate', firstString(safetyGate.status)],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  const reviewMessage = firstString(safetyGate.reviewMessage);
  if (reviewMessage) lines.push(reviewMessage);
  return lines;
};

interface RenderPlanningSignalLinesInput {
  doc: {
    setFont: (family: string, style?: string) => void;
    setFontSize: (size: number) => void;
    setTextColor: (...color: number[]) => void;
  };
  lines: string[];
  y: number;
  pageW: number;
  ink: [number, number, number];
  addSectionTitle: (doc: any, title: string, y: number) => number;
  addWrappedText: (doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight?: number) => number;
}

export const renderPlanningSignalLines = ({
  doc,
  lines,
  y,
  pageW,
  ink,
  addSectionTitle,
  addWrappedText,
}: RenderPlanningSignalLinesInput) => {
  if (lines.length === 0) return y;
  let nextY = addSectionTitle(doc, 'Swan Coach Planning Signals', y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...ink);
  lines.forEach((line) => {
    nextY = addWrappedText(doc, line, 18, nextY, pageW - 36, 4.5);
  });
  return nextY;
};
