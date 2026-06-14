import type { FormattedLogBody, LogStyleVariant, LogStyleVariantKey } from './CoachCommandLogEntry.types';

const STEP_PATTERN = /(?:^|\s)(\d+)\.\s+\*\*([^*]+?)\*\*:?\s*/g;
const BULLET_PATTERN = /^\s*[-*]\s+(.+?)\s*$/;

function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitParagraphs(value: string): string[] {
  const normalized = normalizeCopy(value);
  if (!normalized) return [];

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

function markerKey(line: string): LogStyleVariantKey | null {
  const plain = line
    .replace(/[*_#:`]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (plain === 'the science') return 'science';
  if (plain === 'keeping it 100' || plain === 'keep it 100') return 'keep100';
  return null;
}

function splitStyleVariants(body: string): LogStyleVariant[] | null {
  const sections: Record<LogStyleVariantKey, string[]> = { science: [], keep100: [] };
  let activeKey: LogStyleVariantKey | null = null;

  body.split(/\r?\n/).forEach((line) => {
    const key = markerKey(line);
    if (key) {
      activeKey = key;
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

function extractBullets(body: string): { readableBody: string; bullets: string[] } {
  const bullets: string[] = [];
  const bodyLines: string[] = [];

  body.split(/\r?\n/).forEach((line) => {
    const match = line.match(BULLET_PATTERN);
    if (match?.[1]) {
      bullets.push(normalizeCopy(match[1]));
      return;
    }
    bodyLines.push(line);
  });

  return { readableBody: bodyLines.join('\n'), bullets };
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
    };
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    return {
      leadParagraphs: splitParagraphs(readableBody),
      steps: [],
      bullets: bulletResult.bullets,
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
      variants,
      structuredPacket,
    };
  }

  return {
    ...formatPlainCommandLogBody(readableBody),
    structuredPacket,
  };
}
