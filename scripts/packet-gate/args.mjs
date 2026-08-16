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

export function parseArgs(argv) {
  const a = { budgetChars: 24_000, maxTokens: 60_000, provider: 'kimi', json: false, overheadChars: TRANSPORT_OVERHEAD_CHARS, allowMissing: [], allowUncited: false, unknown: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--json') { a.json = true; continue; }
    if (k === '--allow-uncited') { a.allowUncited = true; continue; }
    const v = argv[i + 1];
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
