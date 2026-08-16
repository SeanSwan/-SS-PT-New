/**
 * The Desk — name machinery.
 * ==========================
 * Everything that knows what a child is called: variant generation, matching,
 * substitution, the last-resort leak check, and roster collision reporting.
 * Split out of `desk.mjs` to keep both files under the line cap and because this
 * is the half that has produced every leak found so far — it deserves to be read
 * on its own.
 */

const PLACEHOLDERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Unicode-aware word boundary. `\b` is ASCII-only in JavaScript, so `\bZoë\b` never
 * matches — the boundary after "ë" fails because "ë" is not an ASCII word character.
 * With a nickname present that produced "Child Aë"; with no nickname the accented
 * name passed through to the cloud untouched. Rosters are full of accented names,
 * so this was a silent leak for a whole class of children.
 */
export function wordRe(term, flags = 'i') {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(term)}(?![\\p{L}\\p{N}_])`, `${flags}u`);
}

/**
 * All the ways a name can appear.
 *
 * Apostrophe-less possessives are generated explicitly. "Amara's" already matched —
 * an apostrophe is not a letter, so the boundary holds — but "Amaras" did not, and
 * that is how the name arrives whenever she types quickly or dictates. It leaked
 * "Amaras key person meeting is due" and "Theos mum mentioned they are moving" to
 * the cloud with the names intact. Only names of three characters or more get the
 * bare-s form, so a two-letter nickname cannot start swallowing plurals.
 *
 * Blank labels are dropped: an empty pattern with boundary lookarounds matches at
 * every punctuation gap, so one stray blank field would spray "Child A" through her
 * text at every comma.
 */
export function nameVariants(roster) {
  const out = [];
  const add = (text, to, id) => out.push({ text, to, id });
  for (const child of roster) {
    const own = `Child ${child.placeholder}`;
    const fam = `Child ${child.placeholder}'s family`;
    const labels = [child.name, ...(child.nicknames || [])].filter((n) => n && n.trim());
    const carers = (child.carers || []).filter((n) => n && n.trim());
    for (const n of labels) {
      add(n, own, child.id);
      if (n.length >= 3 && !/s$/i.test(n)) add(`${n}s`, `${own}'s`, child.id);
    }
    for (const c of carers) {
      add(c, fam, child.id);
      if (c.length >= 3 && !/s$/i.test(c)) add(`${c}s`, `${fam}'s`, child.id);
    }
  }
  // Longest first so "Amaras" is consumed before "Amara", and multi-word carers survive.
  return out.sort((a, b) => b.text.length - a.text.length);
}

/** Stage 2 — roster match. Returns hits without mutating anything. */
export function matchRoster(text, variants) {
  return variants.filter((v) => wordRe(v.text).test(text));
}

/** Stage 5 — substitute. Longest-first ordering makes possessives resolve correctly. */
export function substitute(text, hits) {
  let out = text;
  const substitutions = [];
  for (const hit of hits) {
    const next = out.replace(wordRe(hit.text, 'gi'), hit.to);
    if (next === out) continue;
    out = next;
    substitutions.push({ from: hit.text, to: hit.to });
  }
  return { out, substitutions };
}

/** Nothing that identifies a child may survive into outbound text. */
export function leakCheck(outbound, roster, canaries) {
  if (!outbound) return null;
  const terms = [
    ...roster.flatMap((c) => [c.name, ...(c.nicknames || []), ...(c.carers || [])]),
    ...canaries,
  ].filter((t) => typeof t === 'string' && t.trim());
  for (const term of terms) {
    if (wordRe(term).test(outbound)) return term;
  }
  return null;
}

/**
 * Two children answering to the same label collapse to one placeholder, which means
 * a cloud reply about "Child A" re-hydrates to whichever the roster listed first.
 * That is a wrong-child attribution — the one error this project treats as
 * unrecoverable — so the clash is surfaced at roster load rather than discovered in
 * a family note. The fix is hers, not the code's.
 *
 * Carers are included. A mum named the same as another child in the room is
 * ordinary, and it resolved correctly only by accident of roster order.
 */
export function rosterCollisions(roster) {
  const seen = new Map();
  const clashes = [];
  for (const child of roster) {
    const labels = [child.name, ...(child.nicknames || []), ...(child.carers || [])];
    for (const label of labels) {
      if (typeof label !== 'string' || !label.trim()) continue;
      const key = label.trim().toLowerCase();
      if (seen.has(key) && seen.get(key) !== child.id) clashes.push(label);
      else seen.set(key, child.id);
    }
  }
  return [...new Set(clashes)];
}

/**
 * Assign stable placeholders: A..Z, then AA, AB, … An earlier version used `i % 26`,
 * which silently gave the 27th child the same label as the first. Her room holds
 * twelve, so it would never have fired here; it is fixed rather than documented
 * because a shared label re-hydrates to the wrong child, and a limit nobody will
 * reach is not worth carrying as a known fault.
 */
export function withPlaceholders(children) {
  const label = (i) => {
    let n = i;
    let out = '';
    do {
      out = PLACEHOLDERS[n % 26] + out;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return out;
  };
  return children.map((c, i) => ({ ...c, placeholder: label(i) }));
}
