/**
 * Swan Coach planning signal formatter for workout-plan PDFs.
 *
 * Converts the safe planning fingerprint into printable labels. Raw client
 * identity fields and private medical-history wording are intentionally
 * ignored or generalized for client-facing PDFs.
 */

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).map(v => v.trim()).filter(Boolean) : [];

const firstString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : '';

const PRIVATE_HISTORY_PATTERN =
  /\b(surgery|diagnosis|diagnosed|arthritis|replacement|medical history|injury history|procedure|medication|doctor|physician|injury|injured|tendonitis|sprain|strain|fracture|tear|torn|rehab|post-op|operation|medical clearance)\b/i;

const safeSignalText = (value: unknown, fallback: string) => {
  const cleaned = firstString(value).replace(/\s+/g, ' ').slice(0, 180);
  if (!cleaned) return '';
  if (PRIVATE_HISTORY_PATTERN.test(cleaned)) return fallback;
  return cleaned;
};

const safeSignalArray = (value: unknown, fallback: string, limit: number): string => {
  const seen = new Set<string>();
  const safeValues = toStringArray(value)
    .map(item => safeSignalText(item, fallback))
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  return safeValues.join(', ');
};

export const buildPlanningSignalLines = (planData: unknown): string[] => {
  const planning = toRecord(toRecord(planData).swanCoachPlanning);
  if (Object.keys(planning).length === 0) return [];

  const safetyGate = toRecord(planning.safetyGate);
  const lines = [
    ['Data used', safeSignalArray(planning.dataCategoriesUsed, 'readiness profile', 8)],
    ['Missing data', safeSignalArray(planning.missingDataCategories, 'readiness detail', 6)],
    ['NASM domains', safeSignalArray(planning.nasmDomainsApplied, 'NASM readiness framework', 8)],
    ['Review gate', safeSignalText(safetyGate.status, 'review_required')],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  const reviewMessage = safeSignalText(safetyGate.reviewMessage, 'Coach review required before assignment.');
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
