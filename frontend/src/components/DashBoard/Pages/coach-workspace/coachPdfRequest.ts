/**
 * FILE: coachPdfRequest.ts
 * PURPOSE: Recognise "make me a PDF of …" in the coach composer, and the client it
 * names, so the PDF is built ON THIS DEVICE from first-party records instead of
 * being sent to a model that cannot make files and must never see the client's
 * name (Rule 8, PRIVACY-PROXY.md). Deterministic code, not an agent (Rule 73).
 *
 * Deliberately narrow: it needs the word "PDF" plus an ask to make or get one, so
 * a question ABOUT a PDF ("why won't the PDF open?") still goes to Swan Coach.
 */

const VERBS = 'make|create|generate|build|export|download|print|prepare|put together|send|give|get|need|want';
/** "create a PDF", "I need you to make me a pdf of …", "get me Maria's PDF". */
const ASK = new RegExp(`\\b(?:${VERBS})\\b[^.?!\\n]{0,60}\\bpdfs?\\b`, 'i');
/** "PDF of Maria's progress", "a pdf for Jesse". */
const NOUN_FIRST = /^\s*(?:a\s+|the\s+)?pdf\b[^.?!\n]{0,40}\b(?:of|for)\b/i;
/** Questions about PDFs: only a request when they also ask to make one. */
const QUESTION = /^\s*(?:what|how|why|where|when|which|is|are|does|do)\b/i;
const MAKE = /\b(?:make|create|generate|build|export)\b/i;

export function isPdfRequest(text: string): boolean {
  const value = text.trim();
  if (!value || value.startsWith('/') || value.length > 400) return false;
  if (!ASK.test(value) && !NOUN_FIRST.test(value)) return false;
  return !QUESTION.test(value) || MAKE.test(value);
}

export type RosterClient = { id: number; label: string };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NOT_LETTER = '[^\\p{L}\\-]';
/** Words that can follow "for"/"of" capitalised without being a person ("PDF for Me", "of Week 6"). */
const NOT_A_NAME = new Set(('i me my mine him her hers them their theirs his our us your you it its this that these those the a an all '
  + 'let what there here who he she we they one someone somebody nobody '
  + 'everyone everybody today tomorrow yesterday now monday tuesday wednesday thursday friday saturday sunday january february march '
  + 'april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec '
  + 'week month year quarter client clients pdf pdfs workout workouts progress plan plans session sessions swan coach '
  + 'chart charts notes report reports').split(' '));
/** "NASM", "PDF", "Q3": all-capitals or one-letter tokens are acronyms and labels, not people. */
const isLabel = (word: string) => word.length < 2 || (word === word.toUpperCase() && /\p{Lu}{2}/u.test(word));

type Span = { start: number; end: number; ids: number[] };
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

/** Every full-name mention, case-insensitive, whole-word ("Ann Lee" ≠ "Ann Lee-Park"). Overlapping readings are ONE mention: the longest wins; equal-length rivals stay rivals. */
function fullNameSpans(text: string, clients: ReadonlyArray<RosterClient>): Span[] {
  const found: Span[] = [];
  for (const client of clients) {
    const label = client.label.trim();
    if (!/\s/.test(label)) continue;
    for (const match of text.matchAll(new RegExp(`(^|${NOT_LETTER})(${escape(label)})(?![\\p{L}\\-])`, 'giu'))) {
      const start = (match.index ?? 0) + match[1].length;
      found.push({ start, end: start + match[2].length, ids: [client.id] });
    }
  }
  found.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const kept: Span[] = [];
  for (const span of found) {
    const clash = kept.find((other) => overlaps(other, span));
    if (!clash) kept.push({ ...span, ids: [...span.ids] });
    else if (clash.end - clash.start === span.end - span.start && !clash.ids.includes(span.ids[0])) clash.ids.push(span.ids[0]);
  }
  return kept;
}

/**
 * A first name alone reads as a name after for/of/about/with/and, or as a possessive,
 * when capitalised. Lowercase (speech, quick typing) counts only after for/of/about or
 * as a possessive, and never for an ordinary word ("for june", "and mark the changes").
 * A first name followed by a surname that matched nobody ("Maria Smith") is a
 * different person, left to the unknown-name check.
 */
function firstNameSpans(text: string, clients: ReadonlyArray<RosterClient>, taken: Span[]): Span[] {
  const byFirst = new Map<string, number[]>();
  for (const client of clients) {
    const first = client.label.trim().split(/\s+/)[0]?.toLowerCase();
    if (!first || first === 'client') continue;
    byFirst.set(first, [...(byFirst.get(first) ?? []), client.id]);
  }
  const named = new Set(taken.flatMap((span) => span.ids));
  const spans: Span[] = [];
  for (const [first, ids] of byFirst) {
    const name = escape(first);
    const after = [...text.matchAll(new RegExp(`\\b(for|of|about|with|and)\\s+(${name})(?![\\p{L}\\-])`, 'giu'))]
      .map((match) => ({ start: (match.index ?? 0) + match[0].length - match[2].length, lowerOk: /^(?:for|of|about)$/i.test(match[1]) }));
    const possessive = [...text.matchAll(new RegExp(`(^|${NOT_LETTER})(${name})['’]s\\b`, 'giu'))]
      .map((match) => ({ start: (match.index ?? 0) + match[1].length, lowerOk: true }));
    for (const { start, lowerOk } of [...after, ...possessive]) {
      const said = text.slice(start, start + first.length);
      const capitalised = /^\p{Lu}/u.test(said);
      if (!capitalised && (!lowerOk || NOT_A_NAME.has(first))) continue;
      const surname = /^\s+(\p{Lu}[\p{L}'’-]*)/u.exec(text.slice(start + first.length))?.[1];
      if (capitalised && surname && !NOT_A_NAME.has(surname.toLowerCase()) && !isLabel(surname)) continue;
      const span = { start, end: start + first.length, ids };
      if (taken.some((other) => overlaps(other, span)) || spans.some((other) => overlaps(other, span))) continue;
      // "Maria Rios … Maria's plan": a first name that also fits a client named in full is that client.
      const already = ids.filter((id) => named.has(id));
      spans.push({ ...span, ids: already.length ? already : ids });
    }
  }
  return spans;
}

/**
 * Capitalised names that match nobody on the roster: after for/of/about/on/to/and/
 * with/vs ("PDF for Olivia Patel", "PDF on Olivia Patel"), or as a possessive
 * ("Olivia Patel's PDF"). Ordinary words, months, acronyms and labels are skipped.
 */
function unknownNameSpans(text: string, taken: Span[]): Span[] {
  const NAME = "\\p{Lu}[\\p{L}'’-]*(?:\\s+\\p{Lu}[\\p{L}'’-]*)?";
  const afterWord = new RegExp(`(?:\\b[Ff]or|\\b[Oo]f|\\b[Aa]bout|\\b[Oo]n|\\b[Tt]o|\\b[Aa]nd|\\b[Ww]ith|\\b[Vv]s\\.?|\\b[Vv]ersus)\\s+(${NAME})`, 'gu');
  const possessive = new RegExp(`(?:^|\\s)(${NAME})['’]s\\b`, 'gu');
  const spans: Span[] = [];
  for (const match of [...text.matchAll(afterWord), ...text.matchAll(possessive)]) {
    const words = match[1].replace(/['’]s$/, '').split(/\s+/);
    const start = (match.index ?? 0) + match[0].length - match[1].length;
    const span = { start, end: start + match[1].length, ids: [] as number[] };
    if (NOT_A_NAME.has(words[0].toLowerCase()) || words.every(isLabel)) continue;
    if (taken.some((other) => overlaps(other, span)) || spans.some((other) => overlaps(other, span))) continue;
    spans.push(span);
  }
  return spans;
}

export type PdfSubject =
  | { kind: 'client'; client: RosterClient }
  | { kind: 'ambiguous' | 'multiple' | 'unknown' | 'none' };

/** Who the text names, without the pin: one client, several, an ambiguous or unknown name, or nobody. */
function namedSubject(text: string, clients: ReadonlyArray<RosterClient>): PdfSubject {
  const full = fullNameSpans(text, clients);
  const roster = [...full, ...firstNameSpans(text, clients, full)];
  const unknown = unknownNameSpans(text, roster);
  if (unknown.length) return { kind: roster.length ? 'multiple' : 'unknown' };
  const subjects = new Map(roster.map((span) => [[...span.ids].sort((a, b) => a - b).join(','), span.ids]));
  if (subjects.size > 1) return { kind: 'multiple' };
  const [ids] = [...subjects.values()];
  if (!ids) return { kind: 'none' };
  const client = ids.length === 1 ? clients.find((entry) => entry.id === ids[0]) : undefined;
  return client ? { kind: 'client', client } : { kind: 'ambiguous' };
}

export type NamedClient = RosterClient | 'ambiguous' | null;

/**
 * The roster client the text names: a full name (the longest reading when one
 * name contains another), or a first name that reads as a name and fits exactly
 * one client. Two possible clients, or two named clients → 'ambiguous'; a name
 * that matches nobody → null. The roster is the viewer's own RBAC'd list.
 */
export function resolveNamedClient(text: string, clients: ReadonlyArray<RosterClient>): NamedClient {
  const subject = namedSubject(text, clients);
  if (subject.kind === 'client') return subject.client;
  return subject.kind === 'ambiguous' || subject.kind === 'multiple' ? 'ambiguous' : null;
}

/**
 * Who the PDF is for. The pinned client is used ONLY when the text names nobody:
 * an ambiguous, unknown or second name is refused — it never falls back.
 */
export function pdfSubject(text: string, clients: ReadonlyArray<RosterClient>, pinnedId: number | null | undefined): PdfSubject {
  const named = namedSubject(text, clients);
  if (named.kind !== 'none') return named;
  const pinned = clients.find((client) => client.id === pinnedId);
  return pinned ? { kind: 'client', client: pinned } : { kind: 'none' };
}

/** pdfSubject in the older shape: a client, 'ambiguous' (ambiguous or several), or null (unknown or nobody). */
export function pdfTarget(text: string, clients: ReadonlyArray<RosterClient>, pinnedId: number | null | undefined): RosterClient | 'ambiguous' | null {
  const subject = pdfSubject(text, clients, pinnedId);
  if (subject.kind === 'client') return subject.client;
  return subject.kind === 'ambiguous' || subject.kind === 'multiple' ? 'ambiguous' : null;
}
