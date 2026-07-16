import type {
  FormattedLogBody,
  LogStyleVariant,
  LogStyleVariantKey,
  LogWorkoutSection,
} from './CoachCommandLogEntry.types';
import { parseWorkoutSectionHeading } from './CoachCommandLogEntry.sections';

const STEP_PATTERN = /(?:^|\s)(\d+)\.\s+\*\*([^*]+?)\*\*:?\s*/g;
const BULLET_PATTERN = /^\s*[-*]\s+(.+?)\s*$/;
const NUMBERED_WORKOUT_PATTERN = /^\s*\d+[.)]\s+(.+?)\s*$/;
const NUMBERED_BOLD_STEP_PATTERN = /^\s*\d+\.\s+\*\*/;
const WORKOUT_DETAIL_PATTERN =
  /\b(?:sets?|reps?|rounds?|rpe|rir|rest|tempo|sec(?:onds?)?|min(?:utes?)?|lbs?|kg|warm-?up|cool-?down)\b|\d+\s*x\s*\d+/i;
const SCIENCE_LABELS = new Set([
  'science',
  'the science',
  'scientific explanation',
  'the scientific explanation',
]);
const KEEP_100_LABELS = new Set([
  'keep it 100',
  'keeping it 100',
  'keep it 100 percent',
  'keeping it 100 percent',
  'keep it one hundred',
  'keeping it one hundred',
]);
const INLINE_STYLE_MARKER_PATTERN = /(?:^|\s)(the scientific explanation|scientific explanation|the science|science|keeping it one hundred|keep it one hundred|keeping it 100 percent|keep it 100 percent|keeping it 100|keep it 100)(?::|-)\s*/gi;
function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitParagraphs(value: string): string[] {
  const normalized = normalizeCopy(value);
  if (!normalized) return [];

  const lineBreaks = value
    .split(/\r?\n/)
    .map((part) => normalizeCopy(part))
    .filter(Boolean);
  if (lineBreaks.length > 1) return lineBreaks;

  const explicitBreaks = value
    .split(/\n{2,}/)
    .map((part) => normalizeCopy(part))
    .filter(Boolean);
  if (explicitBreaks.length > 1) return explicitBreaks;

  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [normalized];
  const paragraphs: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    const cleanSentence = normalizeCopy(sentence);
    if (!cleanSentence) return;
    if (current && `${current} ${cleanSentence}`.length > 260) {
      paragraphs.push(current);
      current = cleanSentence;
      return;
    }
    current = current ? `${current} ${cleanSentence}` : cleanSentence;
  });

  if (current) paragraphs.push(current);
  return paragraphs;
}

function normalizeMarkerLabel(value: string): string {
  return value
    .replace(/[*_#:`]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function markerKey(label: string): LogStyleVariantKey | null {
  const plain = normalizeMarkerLabel(label);

  if (SCIENCE_LABELS.has(plain)) return 'science';
  if (KEEP_100_LABELS.has(plain)) return 'keep100';
  return null;
}

function parseStyleMarker(line: string): { key: LogStyleVariantKey; copy: string } | null {
  let candidate = line.trim();
  if (!candidate) return null;

  candidate = candidate
    .replace(/^\s*(?:#{1,6}|[-*>])\s*/, '')
    .replace(/^[^A-Za-z0-9*]+/, '')
    .trim();

  const strongMatch = candidate.match(/^\*\*([^*]+?)\*\*\s*(?::|[-–—])?\s*(.*)$/);
  if (strongMatch?.[1]) {
    const key = markerKey(strongMatch[1]);
    if (key) return { key, copy: strongMatch[2]?.trim() || '' };
  }

  const labelMatch = candidate.match(/^(.{1,60}?)(?::|[-–—])\s*(.+)$/);
  if (labelMatch?.[1]) {
    const key = markerKey(labelMatch[1]);
    if (key) return { key, copy: labelMatch[2]?.trim() || '' };
  }

  const exactKey = markerKey(candidate);
  return exactKey ? { key: exactKey, copy: '' } : null;
}

function expandInlineStyleMarkers(line: string): string[] {
  const matches = Array.from(line.matchAll(INLINE_STYLE_MARKER_PATTERN))
    .map((match) => ({
      contentStart: (match.index ?? 0) + match[0].length,
      key: markerKey(match[1] || ''),
      label: match[1] || '',
      start: match.index ?? 0,
    }))
    .filter((match) => match.key);
  if (new Set(matches.map((match) => match.key)).size < 2) return [line];
  return matches
    .map((match, index) => `${match.label}: ${line.slice(match.contentStart, matches[index + 1]?.start ?? line.length).trim()}`)
    .filter((part) => normalizeCopy(part));
}

function splitStyleVariants(body: string): LogStyleVariant[] | null {
  const sections: Record<LogStyleVariantKey, string[]> = { science: [], keep100: [] };
  let activeKey: LogStyleVariantKey | null = null;

  body.split(/\r?\n/).flatMap(expandInlineStyleMarkers).forEach((line) => {
    const marker = parseStyleMarker(line);
    if (marker) {
      activeKey = marker.key;
      if (marker.copy) sections[marker.key].push(marker.copy);
      return;
    }
    if (!activeKey || /^\s*-{3,}\s*$/.test(line)) return;
    sections[activeKey].push(line);
  });

  const science = sections.science.join('\n').trim();
  const keep100 = sections.keep100.join('\n').trim();
  if (!science || !keep100) return null;

  return [
    { key: 'science', label: 'Science', body: formatPlainCommandLogBody(science) },
    { key: 'keep100', label: 'Keep It 100', body: formatPlainCommandLogBody(keep100) },
  ];
}

function extractBullets(body: string): {
  readableBody: string;
  bullets: string[];
  sections: LogWorkoutSection[];
} {
  const bullets: string[] = [];
  const sections: LogWorkoutSection[] = [];
  const bodyLines: string[] = [];
  let pendingSectionTitle: string | null = null;
  let activeSection: LogWorkoutSection | null = null;

  const flushPendingSectionTitle = () => {
    if (!pendingSectionTitle) return;
    bodyLines.push(`${pendingSectionTitle}:`);
    pendingSectionTitle = null;
  };

  const pushBullet = (bullet: string) => {
    if (pendingSectionTitle) {
      activeSection = { title: pendingSectionTitle, bullets: [] };
      sections.push(activeSection);
      pendingSectionTitle = null;
    }
    if (activeSection) {
      activeSection.bullets.push(bullet);
      return;
    }
    bullets.push(bullet);
  };

  body.split(/\r?\n/).forEach((line) => {
    const sectionTitle = parseWorkoutSectionHeading(line, WORKOUT_DETAIL_PATTERN);
    if (sectionTitle) {
      flushPendingSectionTitle();
      pendingSectionTitle = sectionTitle;
      activeSection = null;
      return;
    }

    const match = line.match(BULLET_PATTERN);
    if (match?.[1]) {
      pushBullet(normalizeCopy(match[1]));
      return;
    }
    const numberedWorkout = line.match(NUMBERED_WORKOUT_PATTERN);
    if (
      numberedWorkout?.[1]
      && WORKOUT_DETAIL_PATTERN.test(numberedWorkout[1])
      && !NUMBERED_BOLD_STEP_PATTERN.test(line)
    ) {
      pushBullet(normalizeCopy(numberedWorkout[1]));
      return;
    }

    if (!normalizeCopy(line)) return;
    flushPendingSectionTitle();
    activeSection = null;
    bodyLines.push(line);
  });

  flushPendingSectionTitle();

  return { readableBody: bodyLines.join('\n'), bullets, sections };
}

function extractStructuredPacket(body: string): { readableBody: string; structuredPacket?: string } {
  const candidates = ['{"action"', '{"schema', '{"proposal_type"', '{"client_'];
  const start = candidates
    .map((candidate) => body.indexOf(candidate))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (start === undefined) return { readableBody: body };

  const packet = body.slice(start).trim();
  try {
    return {
      readableBody: body.slice(0, start).trim(),
      structuredPacket: JSON.stringify(JSON.parse(packet), null, 2),
    };
  } catch {
    return { readableBody: body };
  }
}

function formatPlainCommandLogBody(body: string): FormattedLogBody {
  const bulletResult = extractBullets(body);
  const readableBody = bulletResult.readableBody;
  const matches = Array.from(readableBody.matchAll(STEP_PATTERN));

  if (!matches.length) {
    return {
      leadParagraphs: splitParagraphs(readableBody),
      steps: [],
      bullets: bulletResult.bullets,
      sections: bulletResult.sections,
    };
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    return {
      leadParagraphs: splitParagraphs(readableBody),
      steps: [],
      bullets: bulletResult.bullets,
      sections: bulletResult.sections,
    };
  }

  const leadParagraphs = splitParagraphs(readableBody.slice(0, firstMatch.index ?? 0));
  const steps = matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = nextMatch?.index ?? readableBody.length;

    return {
      number: match[1] ?? String(index + 1),
      title: (match[2] ?? 'Step').replace(/:$/, '').trim(),
      body: normalizeCopy(readableBody.slice(bodyStart, bodyEnd)),
    };
  });

  return {
    leadParagraphs,
    steps,
    bullets: bulletResult.bullets,
    sections: bulletResult.sections,
  };
}

export function formatCommandLogBody(body: string): FormattedLogBody {
  const { readableBody, structuredPacket } = extractStructuredPacket(body);
  const variants = splitStyleVariants(readableBody);
  if (variants) {
    return {
      leadParagraphs: [],
      steps: [],
      bullets: [],
      sections: [],
      variants,
      structuredPacket,
    };
  }

  return {
    ...formatPlainCommandLogBody(readableBody),
    structuredPacket,
  };
}
