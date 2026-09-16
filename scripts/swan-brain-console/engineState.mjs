/**
 * engineState — read-only probe of the Design Brain learning engine.
 * @module scripts/swan-brain-console/engineState
 *
 * WHY THIS FILE EXISTS
 * The design-brain learning engine on `origin/main` is deliberately
 * fail-closed: `scripts/design-brain/README.md` states that new receipt writes
 * "remain fail-closed until the signed source-classification authority adapter
 * has production keys, trusted time, and revocation state", and that the
 * stateful CLIs `log-receipt`, `synthesize`, `corroborate`, `adjudicate` and
 * `emit-vault` are "non-operational and refuse durable work".
 *
 * The console must therefore show the engine as BLOCKED rather than hiding it
 * or faking a write path. This module is the single source of that truth so no
 * panel can invent its own version.
 *
 * CONTRACT (asserted by fleet-contract.test.mjs)
 *   - `durableWrites` is the literal 'BLOCKED' while the engine is fail-closed.
 *   - `reason` echoes the engine README's own wording.
 *   - `writeControls` is ALWAYS an empty array. Adding an entry here is the
 *     signal that a real, signed write path landed and the console was updated
 *     in the same reviewed commit — it must never be populated to "unblock" UI.
 *
 * Bounds: reads four files. No network, no DB, no .env, no writes. Counts are
 * generated at read time, never transcribed (a stale hand-maintained number is
 * the exact decay the console exists to prevent).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ENGINE_README = 'scripts/design-brain/README.md';
const ENGINE_SRC = 'scripts/design-brain/src';
const ARCHETYPE_INDEX = 'docs/ai-workflow/design-brain/archetypes/index.json';
const DOCTRINE = 'docs/ai-workflow/design-brain/design.md';

/** Read a file, or null when it is absent. Never throws. */
function tryRead(path) {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  } catch {
    return null;
  }
}

/** Pull the sentences that state the gate, so the console quotes rather than paraphrases. */
function extractGateReason(readme) {
  if (!readme) {
    return 'engine README unavailable — cannot confirm engine state; assuming BLOCKED (fail-closed default)';
  }
  // Split on sentence punctuation AND newlines: the README states the gate in
  // bullet items that end in a newline, not always in a period. Splitting on
  // periods alone returned the entire document, which is not a quotation.
  const sentences = readme
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\s*[-•]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /fail-closed|refuse durable work|non-operational|source-classification/i.test(s));
  if (!sentences.length) {
    return 'engine README no longer states a fail-closed gate — re-review before trusting this state';
  }
  // Prefer the sentence naming the specific missing authority; fall back to the first.
  const specific = sentences.find((s) => /source-classification|revocation/i.test(s));
  return (specific ?? sentences[0]).slice(0, 600);
}

/** Count files in a directory by extension. Read-time, never cached. */
function countFiles(dir, ext) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

/**
 * The engine's own declaration that durable writes are gated.
 *
 * THE SUBSTRING ALONE WAS NOT ENOUGH, and both GLM seats were right about why: a README
 * sentence reading "must no longer remain fail-closed" CONTAINS this phrase and asserts
 * the opposite, so a plain `includes()` yields maximum confidence that the gate is
 * present at the exact moment the document says it is gone. Negation is therefore
 * checked in the sentence that carries the phrase.
 */
const GATE_DECLARATION = 'remain fail-closed';

/** Words that invert the declaration when they precede it in the same clause. */
const NEGATION = /\b(no longer|not|never|cease|ceased|removed?|unblock(?:ed)?|drop(?:ped)?|lift(?:ed)?)\b/i;

/** Trim the README to the single clause that carries the declaration. */
function clauseAround(text, phrase) {
  const at = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (at === -1) return null;
  const before = text.slice(0, at);
  const after = text.slice(at + phrase.length);
  const start = Math.max(
    before.lastIndexOf('. '), before.lastIndexOf('\n'), before.lastIndexOf('•'), before.lastIndexOf('- '),
  );
  const endCandidates = [after.indexOf('. '), after.indexOf('\n')].filter((i) => i !== -1);
  const end = endCandidates.length ? Math.min(...endCandidates) : after.length;
  return `${before.slice(start + 1)} ${phrase} ${after.slice(0, end)}`.replace(/\s+/g, ' ').trim();
}

/** Read the engine's real state from disk. */
export function readEngineState(repo) {
  const readme = tryRead(join(repo, ENGINE_README));
  const indexRaw = tryRead(join(repo, ARCHETYPE_INDEX));
  const doctrine = tryRead(join(repo, DOCTRINE));

  let archetypes = 0;
  if (indexRaw) {
    try {
      const parsed = JSON.parse(indexRaw);
      archetypes = Array.isArray(parsed.archetypes) ? parsed.archetypes.length : 0;
    } catch {
      archetypes = 0;
    }
  }

  /*
   * THREE STATES, AND THE WORD "BLOCKED" IS NEVER EMITTED BARE.
   *
   * "BLOCKED" asserted from prose was itself an unsupported claim: this console is
   * GET-only and cannot TEST a write gate, so it must not speak as though it had.
   * What it can honestly report is which of three things is true:
   *
   *   DECLARED_BLOCKED  the engine's own documentation says the gate is present, and
   *                     says so without a negation. This is a DECLARATION, not a
   *                     verification, and the label says so.
   *   VERIFIED_BLOCKED  reserved for a probe that reads the gate itself. No such probe
   *                     exists in this repo, so this state is currently unreachable —
   *                     named here so the gap is explicit rather than implied.
   *   UNKNOWN           the declaration is absent, negated, or unreadable. Never a
   *                     false all-clear, and always paired with a demand for review.
   */
  const clause = readme ? clauseAround(readme, GATE_DECLARATION) : null;
  const declared = Boolean(clause) && !NEGATION.test(clause);

  const durableWrites = declared ? 'DECLARED_BLOCKED' : 'UNKNOWN';
  const reason = declared
    ? extractGateReason(readme)
    : clause
      ? `the engine README mentions the gate but negates it ("${clause.slice(0, 160)}") — `
        + 'this console cannot verify whether a signed authority adapter exists, so the '
        + 'state is UNKNOWN and requires human re-review'
      : 'the engine README does not declare the fail-closed gate, and this console cannot '
        + 'verify whether a signed authority adapter exists — state is UNKNOWN and requires '
        + 'human re-review';

  return {
    durableWrites,
    reason,
    writeControls: [],
    /** The matched clause, quoted, so an operator sees the EVIDENCE not just the verdict. */
    declaration: clause,
    gateDeclared: declared,
    sourceFiles: countFiles(join(repo, ENGINE_SRC), '.mjs'),
    testFiles: countFiles(join(repo, 'scripts/design-brain/tests'), '.mjs'),
    archetypes,
    doctrineLines: doctrine ? doctrine.split('\n').length : 0,
    readmePresent: Boolean(readme),
  };
}
