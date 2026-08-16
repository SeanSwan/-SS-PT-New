/**
 * seed.mjs — the `--seed` channel, held to the same discipline as the document.
 * =============================================================================
 * Split out of packet-gate.mjs for the 300-line cap (CLAUDE.md rule 4).
 *
 * THE SEED IS PACKET CONTENT. `context-gateway/src/consult.mjs` assembles
 *   prompt = <provider remit> + <fence scaffolding> + <document> + <seed>
 * so whatever is in the seed reaches the model exactly as the document does. The gate has always
 * half-acknowledged this — it MEASURED the seed for R1 and SCANNED it for R6 — while never once
 * PARSING it. So `--seed fabricated.md` put unlimited hand-typed code on the wire behind a document
 * whose own approval line read "all byte-verified". Both paid reviewers found that independently in
 * round 5, which was the strongest agreement the review produced.
 *
 * Two further holes closed here:
 *   - CONTAINMENT. The seed path was resolved and read with no containment check, and the approval
 *     view PRINTS it into the send command — so the gate was certifying a command that ships an
 *     arbitrary out-of-repo file to a paid model. R6 would still catch a secret-shaped value; a
 *     private file containing no secrets would sail through. Same realpath predicate readCitedFile
 *     already uses for cited paths: one rule, both places.
 *   - PARSE INTEGRITY. The hidden-character bypass would simply relocate to this channel otherwise.
 *
 * @module packet-gate/seed
 */
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseFencesFrom, fenceParseAnomalies } from './fences.mjs';

/**
 * Load and vet the seed.
 *
 * @returns {{text:string, blocks:object[], error?:string[]}} `error` present => the caller exits 2.
 *   Blocks are tagged `origin:'seed'` so findings say WHICH channel a fence came from; a refusal
 *   citing "line 7" when the operator's document has no line 7 is undiagnosable.
 */
export function loadSeed(root, seedArg) {
  if (!seedArg) return { text: '', blocks: [] };

  const seedPath = path.resolve(root, seedArg);
  if (!existsSync(seedPath)) {
    return { text: '', blocks: [], error: [`packet-gate: --seed not found: ${seedArg}`,
      '  Refusing to certify: an unmeasured seed makes the size check meaningless.'] };
  }

  try {
    const realRoot = realpathSync(root);
    const realSeed = realpathSync(seedPath);
    const fold = (v) => (process.platform === 'win32' ? v.toLowerCase() : v);
    const inside = fold(realSeed) === fold(realRoot) || fold(realSeed).startsWith(fold(realRoot + path.sep));
    if (!inside) {
      return { text: '', blocks: [], error: [`packet-gate: --seed resolves outside the repository: ${seedArg}`,
        '  Refusing to certify: the gate would be approving a send command that ships a non-repo file.'] };
    }
  } catch (err) {
    return { text: '', blocks: [], error: [`packet-gate: --seed cannot be resolved (${err.code ?? err.message})`] };
  }

  const text = readFileSync(seedPath, 'utf8');

  const anomalies = fenceParseAnomalies(text);
  if (anomalies.length) {
    return { text, blocks: [], error: [
      `packet-gate: fence-like line(s) the parser did not consume in --seed, at line(s) ${anomalies.join(', ')}.`,
      '  Refusing to certify: delete the hidden character so the delimiter starts the line.'] };
  }

  return { text, blocks: parseFencesFrom(text, 'seed') };
}
