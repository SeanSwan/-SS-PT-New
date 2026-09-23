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
/** Whole-word match that does not continue into a hyphenated or longer name ("Ann Lee" ≠ "Ann Lee-Park"). */
const says = (text: string, words: string, flags = 'iu') => new RegExp(`(?:^|[^\\p{L}\\-])${escape(words)}(?:$|[^\\p{L}\\-])`, flags).test(text);
/** A first name alone must look like a name, not a word: capitalised, and possessive or after for/of/about/with. */
const saysFirstName = (text: string, first: string) => new RegExp(
  `(?:\\b(?:[Ff]or|[Oo]f|[Aa]bout|[Ww]ith)\\s+${escape(first)}(?![\\p{L}\\-])|(?:^|[^\\p{L}\\-])${escape(first)}['’]s\\b)`, 'u',
).test(text);

export type NamedClient = RosterClient | 'ambiguous' | null;

/**
 * The roster client the text names. A full name wins (the longest when one name
 * contains another); a first name alone counts only when it reads as a name and
 * exactly one client carries it. Two possible clients → 'ambiguous', never a guess.
 * The roster is the viewer's own RBAC'd list, so nothing here widens access.
 */
export function resolveNamedClient(text: string, clients: ReadonlyArray<RosterClient>): NamedClient {
  const full = clients.filter((client) => /\s/.test(client.label.trim()) && says(text, client.label.trim()));
  if (full.length) {
    const longest = Math.max(...full.map((client) => client.label.trim().length));
    const best = full.filter((client) => client.label.trim().length === longest);
    return best.length === 1 ? best[0] : 'ambiguous';
  }
  const byFirst = new Map<string, RosterClient[]>();
  for (const client of clients) {
    const first = client.label.trim().split(/\s+/)[0];
    if (!first || /^Client$/i.test(first)) continue;
    byFirst.set(first, [...(byFirst.get(first) ?? []), client]);
  }
  const hits = [...byFirst.entries()].filter(([first]) => saysFirstName(text, first));
  if (!hits.length) return null;
  return hits.length === 1 && hits[0][1].length === 1 ? hits[0][1][0] : 'ambiguous';
}

/**
 * Who the PDF is for: the client the text names wins over the pinned one; no
 * name → the pinned client. An ambiguous name is refused — it never falls back.
 */
export function pdfTarget(text: string, clients: ReadonlyArray<RosterClient>, pinnedId: number | null | undefined): RosterClient | 'ambiguous' | null {
  const named = resolveNamedClient(text, clients);
  if (named) return named;
  return clients.find((client) => client.id === pinnedId) ?? null;
}
