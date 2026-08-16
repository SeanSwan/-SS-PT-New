/**
 * args.mjs — the gate's CLI argument contract.
 * ============================================
 * Split out of packet-gate.mjs for the 300-line cap (CLAUDE.md rule 4). Unchanged by the split.
 *
 * Two hostile reviews landed here, and both found the same shape of bug: an input the gate accepted
 * without meaning to, which then silently disabled a check. Argument parsing is not plumbing in a
 * tool like this — it is the surface where a typo turns a refusal into a pass.
 *
 * @module packet-gate/args
 */

/**
 * The document is NOT the prompt. `context-gateway/src/consult.mjs` assembles
 *   prompt = <provider remit> + <fence scaffolding> + <document> + <seed>
 * and the wrappers prepend a substantial fixed remit — consult-kimi.mjs alone is ~1,738 chars,
 * plus ~250 chars of `=====` section fencing. Measuring only the document under-reports the very
 * quantity R1 exists to bound, and by an UNBOUNDED amount whenever --seed is used.
 *
 * Conservative default with headroom; override with --overhead-chars when a wrapper's remit grows.
 */
export const TRANSPORT_OVERHEAD_CHARS = 2_200;

/** Every flag this CLI knows. Used to catch a valued flag swallowing the NEXT flag as its value. */
const KNOWN_FLAGS = new Set([
  '--json', '--allow-uncited', '--document', '--seed', '--remit', '--provider',
  '--budget-chars', '--overhead-chars', '--max-tokens', '--allow-missing',
]);

/**
 * Everything wrong with the parsed arguments, as printable lines. Empty => proceed.
 *
 * Lives beside the parser rather than in the CLI so that "what counts as a usable invocation" is one
 * concern in one file. All three classes here are the same bug wearing different clothes — an input
 * accepted without meaning to, which then silently disables a check:
 *   unknown keys  (`--budjet-chars` reverted to a looser default, round 4)
 *   bad values    (`--max-tokens abc` printed `$NaN`; `--overhead-chars -29000` shrank the packet)
 *   eaten flags   (`--remit --json` set the remit to "--json" and turned JSON off, round 6)
 */
export function argErrors(a) {
  if (a.unknown.length) {
    return [`packet-gate: unrecognized flag(s): ${a.unknown.join(', ')}`,
      '  Refusing to certify: a misspelled flag silently reverts to a default the operator did not choose.'];
  }
  if (a.badValue.length) {
    return [`packet-gate: flag(s) missing a value, or given another flag as their value: ${a.badValue.join('; ')}`,
      '  Refusing to certify: `--remit --json` silently sets the remit to "--json" and turns JSON off.'];
  }
  if (a.bad) {
    return ['packet-gate: --budget-chars, --overhead-chars and --max-tokens must be non-negative numbers'];
  }
  return [];
}

export function parseArgs(argv) {
  const a = { budgetChars: 24_000, maxTokens: 60_000, provider: 'kimi', json: false, overheadChars: TRANSPORT_OVERHEAD_CHARS, allowMissing: [], allowUncited: false, unknown: [], badValue: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--json') { a.json = true; continue; }
    if (k === '--allow-uncited') { a.allowUncited = true; continue; }
    const v = argv[i + 1];
    // A VALUED FLAG MUST NOT EAT THE NEXT FLAG. `--remit --json` set the remit to the literal string
    // "--json", consumed the flag so JSON mode never turned on, and exited 0 — the gate then
    // evaluated a two-word remit that names nothing (aboutCode false, R4 and R5 both inert) instead
    // of the document's own `## Remit`. `--allow-missing --json` pushed "--json" into the allow-list.
    // `--seed` as the final argument set the seed to undefined and it was silently never measured.
    // All one shape: the parser assumed the next token was a value. Round 3 validated flag VALUES
    // and round 4 validated flag KEYS; neither checked that a value is not itself a key.
    if (KNOWN_FLAGS.has(k) && k !== '--json' && k !== '--allow-uncited' && (v === undefined || KNOWN_FLAGS.has(v))) {
      a.badValue.push(`${k} ${v === undefined ? '(no value)' : `→ ${v}`}`);
      continue;
    }
    if (k === '--document') { a.document = v; i += 1; }
    else if (k === '--seed') { a.seed = v; i += 1; }
    else if (k === '--remit') { a.remit = v; i += 1; }
    else if (k === '--provider') { a.provider = v; i += 1; }
    else if (k === '--budget-chars') { a.budgetChars = Number(v); i += 1; }
    else if (k === '--overhead-chars') { a.overheadChars = Number(v); i += 1; }
    else if (k === '--max-tokens') { a.maxTokens = Number(v); i += 1; }
    // The mechanism R5's remedy used to promise but never provided: a remit may legitimately name
    // a file that does not exist yet ("add src/validate.mjs; here is the call site").
    else if (k === '--allow-missing') { a.allowMissing.push(v); i += 1; }
    // An UNRECOGNIZED flag used to be skipped without a word. `--budjet-chars 8000` silently
    // reverted to the 24,000 default — a LOOSER budget than the operator chose — at exit 0, with a
    // receipt showing a number they never asked for. Round 3 validated the VALUES of known flags and
    // left the KEYS unvalidated, so a typo in the one number bounding the packet failed open
    // (Kimi K3 round 4). Fail-closed: any unknown `--flag` is exit 2. Bare values are left alone;
    // only flags are keys.
    else if (k.startsWith('--')) a.unknown.push(k);
  }
  // A non-numeric flag value would make every comparison false and silently disable the check.
  // maxTokens was unvalidated: `--max-tokens abc` produced NaN, and `NaN != null` is TRUE, so the
  // preflight printed `worst_case_usd=~$NaN` and exited 0 — destroying the single piece of cost
  // information the human approver relies on (Kimi K3 S5, 2026-08-14).
  // NON-NEGATIVE, not merely finite. `--overhead-chars -29000` passed Number.isFinite and SHRANK
  // the assembled total: a 30,003-char document measured as 1,033 and R1 stayed silent. A size gate
  // whose input can go negative is not a size gate (HY3 S5, 2026-08-14).
  const nonNeg = (n) => Number.isFinite(n) && n >= 0;
  if (!nonNeg(a.budgetChars) || !nonNeg(a.overheadChars) || !nonNeg(a.maxTokens)) a.bad = true;
  return a;
}
