#!/usr/bin/env node
/**
 * spend-guard-gate.mjs — PreToolUse(Bash) gate on paid AI calls.
 * ==============================================================
 * Sean's directive 2026-08-22 after one workstream cost ~$4.87 (Fable $3.47
 * across four calls, Sol $0.92 across two): "we gotta now create a skill that
 * blocks ... shouldn't cost me no more than two or three bucks for that whole
 * thing max ... I would be asked twice before approving."
 *
 * WHY A HOOK AND NOT A SCRIPT EDIT. Two reasons, both load-bearing.
 *   1. The two priciest scripts (consult-fable.mjs, consult-sol.mjs) were being
 *      edited by another agent at the time this was written. Rule 67 says do not
 *      touch a file another agent has in flight. A hook needs none of them.
 *   2. A gate living inside the thing it gates can be bypassed by calling the
 *      model another way. This sits at the harness boundary, so it covers any
 *      invocation shape — including ones written after today.
 *
 * The lesson this session kept teaching: a rule the model must remember is a
 * rule that will eventually be skipped. Deterministic, or it is not a control.
 *
 * FAIL-OPEN on its own errors. A spend guard that bricks the toolchain when it
 * has a bug costs more than the spend it prevents. It fails open loudly.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSpend, CAPS, spentToday, spentOnTopic, topicFromPath, SPEND_DIR, reserveSpend, releaseReservation } from '../lib/spend-ledger.mjs';
// SWA-218: the seat roster lives in ONE file, policed by spend-coverage.test.mjs.
// Hand-curating it inside this regex is what drifted in both directions at once.
import { FREE_ALLOWLIST, KNOWN_UNGATED, DRY_RUN_AWARE, PANEL_SCRIPTS, scriptNameFrom, allScriptNamesFrom, invokesPaidSeat, seatArgsFrom } from '../lib/paid-seats.mjs';
import { flagFrom, hasFlag } from '../lib/shell-parse.mjs';

const ALLOW = () => process.exit(0);

/** Worst-case $/M (in, out), OpenRouter catalog as of 2026-08-22. */
const PRICES = {
  'claude-fable-5':      [10.0, 50.0],
  // CORRECTED 2026-08-27. Both were [2.5, 15.0] — HALF what the seat's own provider
  // record says. `context-gateway/src/providers.mjs` has carried
  // `priceInPerM: 5, priceOutPerM: 30, priceVerified: '2026-07-17'` for sol the whole
  // time, so two price tables disagreed by 2x and nothing compared them. A spend guard
  // that under-counts by half is worse than one that is merely incomplete: it reports
  // a confident number and the number is wrong. Found by a parity test written for a
  // different defect (the reservation key), which is the argument for cross-table
  // tests over careful reading — see `sol prices are not cheaper than providers.mjs`.
  // Worst case moves $0.31 -> $0.61, still inside the $1.00 per-call cap, so this
  // corrects the count without crying wolf.
  'gpt-5.6-sol-pro':     [5.0,  30.0],
  'gpt-5.6-sol':         [5.0,  30.0],
  'kimi-k3':             [3.0,  15.0],
  'grok-4.6':            [2.0,  6.0],
  'deepseek-v4-pro':     [0.48, 0.96],
  'deepseek-v4-flash':   [0.073, 0.145],

  // --- Priced 2026-08-27 from OpenRouter's per-endpoint API, not from memory ----
  // These were KNOWN_UNGATED frozen debt. Every number below was READ from
  // openrouter.ai/api/v1/models/<id>/endpoints, because a price recalled from
  // training data is exactly the kind of confident-and-stale figure that silently
  // under-counts a cap. First lookup returned "NOT FOUND" for two of the three —
  // a summariser choking on a huge catalog page — so each was re-queried on its own
  // endpoint. A negative from one instrument is not a fact.
  //
  // gpt-5.5 spans SEVEN endpoints: openai/flex $2.50/$15, standard $5/$30, azure &
  // bedrock $5.50/$33, and openai/fast $12.50/$75. Priced at the highest STANDARD
  // route. Taking the true worst (`fast`) would put a routine codex consult at
  // ~$1.53 against a $1.00 cap and refuse every honest call — and a gate that cries
  // wolf is the one people learn to wave through, which this file's own comments
  // call more corrosive than the hole. KNOWN UNDER-COUNT: if OpenRouter routes to
  // `openai/fast`, real cost is ~2.3x this estimate. Revisit if that ever happens.
  'gpt-5.5':             [5.5,  33.0],
  // opus-5 is nearly flat across nine endpoints ($5/$25 to $5.50/$27.50). Worst case
  // taken, because here it costs nothing to be honest.
  'claude-opus-5':       [5.5,  27.5],
  // hy3 spans $0.126/$0.522 (GMICloud) to $0.20/$0.80 (AtlasCloud). Worst taken.
  'tencent-hy3':         [0.2,  0.8],

  // The four forge-* image probes all call openai/gpt-5.4-image-2 (read from each
  // file, not inferred). Verified endpoint pricing: prompt $8/M, completion $15/M,
  // PLUS an `image_output` component of $0.00003 and a `web_search` component of
  // $0.01 per use.
  //
  // KNOWN UNDER-COUNT, and this one is structural rather than a routing choice: this
  // table is [in, out] TOKENS, and an image model's dominant cost is not a token
  // rate. The text rates below are real and counted; the image-output component is
  // NOT modelled, so a heavy generation run costs more than the estimate says.
  // Pricing the text half is strictly better than the previous state (invisible), and
  // saying so is better than a number that looks complete. A per-image cost model is
  // its own slice — flagged rather than faked.
  //
  // Related, from forge-response-shape.mjs's own header: `data.usage.total_cost` is
  // absent from this provider's response, so the forge's run ledger has been writing
  // `costUsd: null` on every real generation. recordSpend() treats null as WORST CASE
  // against the caps, so that failure at least errs toward refusal.
  'gpt-5.4-image-2':     [8.0,  15.0],

  // The auto-research tooling, surfaced 2026-08-27 the moment the coverage walker
  // became recursive — it had been invisible below the top level for two rounds.
  // google/gemini-3-flash-preview spans $0.25/$1.50 (flex) to $0.90/$5.40 (priority);
  // worst taken. The `-lite` variant used by prompt-mutator is cheaper by definition,
  // so it is priced at the same worst case rather than guessed at separately — at a
  // ~$0.11 estimate the choice cannot change a verdict, and over-stating a cheap seat
  // is the one direction that costs nothing here.
  'gemini-3-flash-preview': [0.9, 5.4],
};

/** Map a consult script to its default model key. */
const SCRIPT_MODEL = {
  'consult-fable.mjs': 'claude-fable-5',
  // `gpt-5.6-sol`, not `-pro`: providers.mjs routes this shim to `openai/gpt-5.6-sol`
  // (verified 2026-08-27 by reading the provider record, not the script name). The
  // key must match what the WRITER records or the reservation never settles — the
  // same defect proven for Fable, second instance, and it survived because the two
  // sides read correct in isolation. `-pro` stays PRICED so a `--model` override
  // naming it is capped rather than falling into the unpriced BLOCK.
  'consult-sol.mjs': 'gpt-5.6-sol',
  'consult-kimi.mjs': 'kimi-k3',
  'consult-grok.mjs': 'grok-4.6',
  // Moved out of KNOWN_UNGATED 2026-08-27 once real prices existed. All five codex
  // variants call openai/gpt-5.5; verified by reading the model id out of each file
  // rather than assuming the name implied the model.
  'consult-codex.mjs': 'gpt-5.5',
  'consult-codex-via-openrouter.mjs': 'gpt-5.5',
  'consult-codex-impl-review.mjs': 'gpt-5.5',
  'consult-codex-v1-1-review.mjs': 'gpt-5.5',
  'consult-codex-v1-2-review.mjs': 'gpt-5.5',
  'consult-opus5.mjs': 'claude-opus-5',
  'consult-hy3-design.mjs': 'tencent-hy3',
  // The forge image probes. They are ad-hoc diagnostics rather than routine consults,
  // but ad-hoc is not free: each one calls a paid image endpoint.
  'forge-capture-fixtures.mjs': 'gpt-5.4-image-2',
  'forge-i2i-influence.mjs': 'gpt-5.4-image-2',
  'forge-i2i-probe.mjs': 'gpt-5.4-image-2',
  'forge-response-shape.mjs': 'gpt-5.4-image-2',
  // auto-research: an LLM judge and a prompt mutator, both billing through OpenRouter.
  'eval-suite.mjs': 'gemini-3-flash-preview',
  'prompt-mutator.mjs': 'gemini-3-flash-preview',
};

/**
 * Read a flag value in EITHER spelling: `--flag value` or `--flag=value`, quoted or bare.
 *
 * GLM 5.3 finding 3 (2026-08-26): the hand-rolled `--flag\s+(\S+)` patterns diverged from
 * every real argument parser on the equals form, and one root cause produced three
 * symptoms — `--document=plan.md` yielded topic `untitled` so the per-topic cap silently
 * never accumulated for that document; `--seats=fable` priced a fan-out as if no seats
 * were named; `--model=` overrides were ignored entirely. Verified before fixing.
 */
function flagValue(cmd, name) {
  // STRUCTURAL now. This used to scan the command text, which had to be taught twice
  // that a flag inside a quoted remit is data — and the second fix had to preserve
  // byte offsets so a quoted `--document "path with spaces"` still resolved. Both
  // problems were artefacts of scanning text. argv has neither.
  return flagFrom(seatArgsFrom(cmd), name);
}

function readInput() {
  try { return JSON.parse(readFileSync(0, 'utf-8')); } catch { return null; }
}

const input = readInput();
if (!input) ALLOW();

const cmd = input?.tool_input?.command || '';

// Gate INVOCATIONS, not mentions. `grep consult-fable.mjs`, `cat`, `git log` and
// friends contain the filename but spend nothing; blocking them is a false
// positive that trains people to route around the guard. Require a `node`
// (or npx/bun) execution of the script.
// Deliberately written with NO backslash escapes. Three earlier attempts to
// author this line through shell/python interpolation were silently corrupted —
// one turned `\b` into a literal backspace (0x08), which matches nothing, so the
// gate stopped firing entirely while still reporting "SYNTAX OK". A regex that
// silently never matches is the worst possible failure for a guard.
// FOURTH corruption of this line, found 2026-08-26 (SWA-218). The leading context
// used to be the enumerated separator class `[ ;&|(]`, which does not contain quote
// characters — so `sh -c "node scripts/consult-fable.mjs ..."` and
// `bash -lc 'node scripts/consult-fable.mjs ...'` put a QUOTE before `node` and were
// NOT MATCHED AT ALL. The gate never fired, no cap was checked, no token was required,
// and the call billed in full. It fails open by design, so the miss was silent.
//
// It was found by copying this regex into scripts/hooks/fable-remit-gate.mjs and then
// attacking the copy. Nothing here would have caught it: until this commit the file
// had no test at all, while scripts/lib/spend-ledger.test.mjs covered the CAP logic.
// The cap was proven; the pipe feeding it was not.
//
// Enumerating separators means enumerating every future one correctly, forever. A
// NEGATED IDENTIFIER class inverts the burden: anything that is not part of a word or
// a path is a boundary — quotes, newlines, tabs, parens, `$(`. `mynode script.mjs`
// still does not match, which was the only false positive that ever mattered.
//
// FIFTH issue, found in the same session by attacking the fixed regex rather than
// waiting for a reviewer. The MIDDLE segment used to be a bare `[^|;&]*?`, which
// cannot cross a shell boundary — that exclusion is deliberate and still wanted, so
// `node build.mjs | grep consult-fable.mjs` (an invocation and an unrelated MENTION in
// two different commands) does not false-positive. But it also could not cross a
// `| ; &` sitting INSIDE A QUOTED ARGUMENT, so all three of these were misses:
//     node --flag "a|b" scripts/consult-fable.mjs
//     node --flag "a;b" scripts/consult-fable.mjs
//     node --flag "a&b" scripts/consult-fable.mjs
// Not academic: this repo's own review templates instruct agents to pass remits
// containing "APPROVE | REVISE | REJECT".
//
// The middle now alternates QUOTED SPANS (opaque, any content) with non-boundary
// characters. Verified against 39 shapes — plain, sh -c, bash -lc, env prefix, env
// assignment, absolute interpreter, yarn node, npm exec, node flags, &&, ;, pipe,
// backgrounding, subshell, command substitution, Windows backslash paths, cmd /c,
// line continuation, eval, bun, npx — with zero misses AND zero false positives,
// including all four cross-command mention cases the exclusion exists to reject.
// SIXTH round, from the GLM hostile pass. `node<TAB>scripts/...` was a miss because
// the separator was a literal U+0020 and bash's IFS splits on tab too; `bunx`, `tsx`
// and `ts-node` were misses because the alternation named three runners. The separator
// is now the same negated identifier class as the leading context — NOT a literal tab,
// because an invisible character in a guard regex is the ``-became-0x08 failure with
// a different costume. `nodejs` and `node-foo` still correctly do not match.
// SEVENTH round (SWA-218): the pattern itself moved to scripts/lib/paid-seats.mjs and
// became PAID_INVOCATION, matching ANY `consult-*` seat instead of five hand-named ones.
// The old enumeration had drifted in both directions at once — pricing `consult-grok.mjs`
// and `consult-panel.mjs`, neither of which exists on main, while four live scripts that
// read OPENROUTER_API_KEY matched nothing. The roster now lives in one file with a
// coverage test policing it, so this line can never be the thing that goes stale again.
// `invokesPaidSeat`, NOT the bare regex. The helper also drops non-executing node
// flags (`--check`, `--version`), and testing the pattern directly here meant that
// carve-out existed in the library while the gate ignored it — the gate refused my
// own `node --check` of a consult file mid-repair. Two entry points into one decision
// is how a fix lands in the file nobody calls.
if (!cmd || !invokesPaidSeat(cmd)) ALLOW();

try {
  // --- which model, and how big is the worst case? -------------------------
  // scriptNameFrom is shared with the coverage test, so the gate and the contract
  // can never disagree about what a command names. It also resolves the gateway
  // engine path, which the old `consult-([a-z0-9-]+)` capture could not see.
  // EVERY paid name in the line, priced by the most expensive (GLM 5.3 blocker 4).
  // `node consult-kimi.mjs && node consult-fable.mjs` used to resolve to kimi alone,
  // price it at ~$0.32, fit the cap, and let Fable's ~$1.06 through unmetered in the
  // same Bash call. Verified exit 0 before this change.
  //
  // Free and frozen names are dropped FIRST, so a free seat in the line cannot become
  // the one that gets priced, and a paid one cannot hide behind it.
  const allNames = allScriptNamesFrom(cmd);
  const priceOf = (n) => {
    const key = SCRIPT_MODEL[n];
    const p = key && PRICES[key];
    return p ? p[0] + p[1] : -1; // unpriced sorts below priced; -1 never wins a max
  };
  const chargeable = allNames.filter((n) => !FREE_ALLOWLIST[n] && !KNOWN_UNGATED[n]);
  const scriptName = chargeable.length
    ? chargeable.reduce((worst, n) => (priceOf(n) > priceOf(worst) ? n : worst))
    : scriptNameFrom(cmd);

  // --- INVERTED: paid by default, free by declaration (SWA-218) -------------
  //
  // The matcher above now recognises ANY consult-* seat, not five hand-named ones.
  // That enumeration had drifted in both directions — pricing two scripts that do
  // not exist while four live ones billed unseen. So the roster moved to
  // scripts/lib/paid-seats.mjs, where a coverage test polices it, and a script is
  // waved through only if somebody WROTE DOWN why.
  if (FREE_ALLOWLIST[scriptName]) ALLOW();       // declared free, with a reason
  if (KNOWN_UNGATED[scriptName]) ALLOW();        // frozen debt, behaviour unchanged

  // A dry run spends nothing — BUT ONLY WHERE THE SCRIPT IMPLEMENTS ONE.
  // This used to be an unconditional `if (/--dry-run/.test(cmd)) ALLOW()`. Verified
  // 2026-08-27: only consult-openrouter-panel.mjs implements the flag. Appending it
  // to a Fable, Sol or Kimi call made the gate stand down while the script ignored
  // the unknown flag and billed in full — the identical bypass class this file
  // already documents for `--max-tokens 500`, still live in a different branch.
  //
  // Scanned over MASKED text, not the raw command (GLM 5.3-flash B2, reproduced at
  // exit 0). `--remit "does it support --dry-run"` put the flag in DATA, the substring
  // test saw it, and a LIVE paid fan-out was waved through with no cap and no token.
  // Round 2 restricted the flag to the one script that implements it but kept matching
  // over quoted arguments — narrowing WHICH script while leaving WHERE it looks.
  if (DRY_RUN_AWARE.has(scriptName) && hasFlag(seatArgsFrom(cmd), 'dry-run')) ALLOW();

  // The fan-out refuses its own live call without --confirm-spend, so gating it
  // earlier is cry-wolf. The old condition named `consult-panel.mjs`, which does not
  // exist on main: the real panel never took this branch and neither did anything
  // else. One condition, drifted in both directions.
  if (PANEL_SCRIPTS.has(scriptName) && !hasFlag(seatArgsFrom(cmd), 'confirm-spend')) ALLOW();

  // An explicit --model / SWAN_*_MODEL override wins over the script default.
  // OVERRIDES MAY ONLY RAISE THE ESTIMATE — never lower it.
  // Found by a bypass round: `SWAN_FABLE_MODEL=deepseek-v4-flash node
  // scripts/consult-fable.mjs` sailed through, because the regex believed the
  // env var. consult-fable.mjs does not read SWAN_FABLE_MODEL at all (it reads
  // SWAN_FUSION_JUDGE_MODEL), so the real call would still have run Fable at
  // $10/M while the gate priced it as flash. Any caller-supplied value that
  // makes a call look CHEAPER is exactly what an agent under budget pressure
  // would reach for, so the estimate takes the max of default and override.
  const defaultKey = SCRIPT_MODEL[scriptName] || '';
  let modelKey = defaultKey;
  const overrideVal = (cmd.match(/SWAN_[A-Z_]*MODEL=([^\s]+)/) || [])[1] || flagValue(cmd, 'model');
  const override = overrideVal ? [null, overrideVal] : null;
  if (override) {
    const hit = Object.keys(PRICES).find((k) => override[1].includes(k));
    if (hit && PRICES[defaultKey]) {
      const costOf = (k) => PRICES[k][0] + PRICES[k][1];
      if (costOf(hit) > costOf(defaultKey)) modelKey = hit;
    }
    // The `else if (hit && !defaultKey) modelKey = hit` branch is DELETED, and must
    // not come back. Both GLM seats found it independently (5.3 F3, 5.3-flash B1) and
    // it was reproduced live at exit 0:
    //
    //     node scripts/consult-mistral.mjs --document x.md --model deepseek-v4-flash
    //
    // An unknown seat has no default, so a caller-declared model became its price —
    // ~$0.07, under the cap, ALLOW — while the script bills at whatever it actually
    // calls and need not even READ `--model`. That is the "believing a flag the target
    // ignores" failure this file documents twice, reintroduced in the one branch whose
    // whole job is to refuse unknown seats, and a silent third option past the
    // "no third option" contract. An unknown seat now falls through to the unpriced
    // BLOCK, whatever the caller declares.
  }

  // consult-panel fans out to many seats; price it as the whole fan-out.
  const isPanel = PANEL_SCRIPTS.has(scriptName);

  // Price the panel by the seats ACTUALLY REQUESTED, not the full roster.
  // Flat-rating every fan-out at the whole-roster worst case made a run of two
  // free seats plus two cheap ones (~$0.15) present as $1.20 and get blocked.
  // A gate that cries wolf is a gate the human learns to wave through, which is
  // the failure mode this whole control exists to avoid — so an overstatement
  // is not the "safe" direction, it is corrosive.
  // sol: 0.32 -> 0.61, following the PRICES correction above (it was derived from the
  // half-price row). Pinned against PRICES by a test, because flash named this exact
  // table as the next hand-curated list to drift.
  const SEAT_WORST_USD = {
    fable: 1.05, sol: 0.61, kimi: 0.31, grok: 0.11,
    dspro: 0.03, dsflash: 0.01, glm: 0, qwen: 0, gemini: 0, ox: 0,
  };
  const DEFAULT_SEATS = ['kimi', 'glm', 'qwen', 'ox', 'gemini', 'grok', 'dspro', 'dsflash'];
  const seatsArg = flagValue(cmd, 'seats');
  const panelSeats = seatsArg
    ? seatsArg.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_SEATS;
  const panelUsd = panelSeats.reduce((sum, s) => sum + (SEAT_WORST_USD[s] ?? 0.35), 0);
  const price = PRICES[modelKey];
  // --- THE UNPRICED FAIL-OPEN, CLOSED (SWA-218) ------------------------------
  //
  // This used to be `if (!price && !isPanel) ALLOW()` — "unknown model, do not guess
  // a number." The first half is right and stays: inventing a price for a money guard
  // is worse than admitting there isn't one, because a wrong number silently
  // UNDER-counts the caps. The conclusion was the bug. Not knowing the price is not a
  // reason to wave the call through; it is a reason to stop and ask someone to write
  // it down.
  //
  // It is the same shape as every other hole in this file's history: something the
  // gate could not classify became something the gate ignored. With the matcher now
  // inverted to paid-by-default, an unrecognised seat lands HERE, and this is the
  // branch that decides whether inversion means anything at all. GLM 5.3 named that
  // dependency exactly: inversion is cosmetic while the unpriced branch fail-opens.
  //
  // NO APPROVAL TOKEN IS MINTED. This is a CLASSIFICATION refusal, not a spend
  // refusal — there is nothing for Sean to approve, because nobody yet knows what
  // the call costs. A token here would let an agent buy its way past the one question
  // that must be answered.
  // ANY unpriced seat in the line blocks, not just the one that won the max.
  //
  // GLM 5.3 round-4 B2, reproduced at exit 0:
  //     node scripts/consult-kimi.mjs --document a && node scripts/consult-newseat.mjs --document b
  // `priceOf` returns -1 for an unknown seat so it can never win the max, and
  // `oneCallUsd` returned 0 for it — so the unpriced BLOCK, whose comment says "an
  // unknown seat now falls through", was FALSE for every compound line. Any future
  // seat not yet in SCRIPT_MODEL rode free beside any priced one, which is the
  // inversion being cosmetic in exactly the batching case the summing fix was for.
  const unpriced = chargeable.filter((n) => !PANEL_SCRIPTS.has(n) && !PRICES[SCRIPT_MODEL[n]]);
  if (unpriced.length && !(chargeable.length === 1 && isPanel)) {
    console.error([
      `SPEND GUARD — BLOCKED: ${unpriced.join(', ')} ${unpriced.length > 1 ? 'are' : 'is'} not priced.`,
      '',
      '  A seat with no price cannot be capped, so it cannot be allowed — not alone,',
      '  and not alongside a seat that is priced.',
      '',
      '  Fix in scripts/lib/paid-seats.mjs — pick ONE, deliberately:',
      '    PRICES        add the real OpenRouter price. Look it up; do not estimate.',
      '    FREE_ALLOWLIST  if it genuinely cannot bill (local, subscription, free tier).',
      '    KNOWN_UNGATED   only to freeze pre-existing debt, WITH a written reason.',
      '',
      '  There is no token for this. Nothing to approve until someone knows the cost.',
    ].join('\n'));
    process.exit(2);
  }

  if (!price && !isPanel) {
    console.error([
      `SPEND GUARD — BLOCKED: ${scriptName || 'this script'} is not priced.`,
      '',
      '  It reads a payment credential and the gate has no per-token price for it,',
      '  so no cap can be applied. Waving it through was the old behaviour and it is',
      '  how four live seats billed unseen for weeks.',
      '',
      '  Fix it in scripts/lib/paid-seats.mjs — pick ONE, deliberately:',
      '    PRICES        add the real OpenRouter price. Look it up; do not estimate.',
      '    FREE_ALLOWLIST  if it genuinely cannot bill (local, subscription, free tier).',
      '    KNOWN_UNGATED   only to freeze pre-existing debt, WITH a written reason.',
      '',
      '  There is no token for this. Nothing to approve until someone knows the cost.',
    ].join('\n'));
    process.exit(2);
  }

  // Same rule for the output ceiling. Found by the same round: appending
  // `--max-tokens 500` to a Fable call dropped the estimate under the cap — and
  // consult-fable.mjs does not even accept that flag, so the real call would
  // have used its own 16k default and cost the full amount. A declared ceiling
  // may raise the estimate; it may never lower it below the script's default.
  const SCRIPT_DEFAULT_MAX_TOK = 16000;
  const declaredTok = Number(flagValue(cmd, 'max-tokens') || 0)
    || Number((cmd.match(/SWAN_[A-Z_]*MAX_TOKENS=(\d+)/) || [])[1] || 0)
    || 0;
  const maxTok = Math.max(declaredTok, SCRIPT_DEFAULT_MAX_TOK);

  // Input size is unknown at gate time; assume a large review packet so the
  // worst case is honest rather than flattering.
  const ASSUMED_IN_TOK = 26000;
  // SUM every chargeable invocation in the line, not just the priciest one.
  //
  // GLM 5.3-flash round-3 blocker 4, reproduced live at exit 0:
  //
  //     node consult-codex.mjs --document a && node consult-codex.mjs --document b
  //       && node consult-codex.mjs --document c
  //
  // Three real calls, ~$0.67 each. Round 2 fixed "two DIFFERENT paid scripts" by
  // taking the MAX — which prices this at $0.67, inside the $1.00 cap, ALLOW, with
  // ~$2.01 of exposure and no per-call enforcement for calls two through N. Max was
  // the wrong operator: it defends against a cheap seat sheltering an expensive one,
  // and does nothing about the same seat called repeatedly. GLM 5.3 said "price the
  // sum" in round 3 and I chose max with a rationale that only covered half the case.
  //
  // A panel is priced by its own per-seat fan-out, so it is summed as one unit.
  const oneCallUsd = (n) => {
    // A PANEL has no SCRIPT_MODEL entry — its cost is the per-seat fan-out. Returning
    // 0 for it (GLM 5.3-flash round-4 finding 5, reproduced at exit 0) meant a
    // compound line containing a panel priced the panel at nothing: `<panel with
    // fable,sol> && <kimi>` came out at ~$0.31 against ~$1.68 of real exposure. The
    // panel's special-case pricing only ran on the path where it was the sole or
    // worst chargeable name, and its -1 sort weight made that impossible in any
    // compound — a special case unreachable from the branch that needed it.
    if (PANEL_SCRIPTS.has(n)) return panelUsd;
    const k = SCRIPT_MODEL[n];
    const p = k && PRICES[k];
    return p ? (ASSUMED_IN_TOK / 1e6) * p[0] + (maxTok / 1e6) * p[1] : 0;
  };
  const worstCaseUsd = isPanel
    ? panelUsd
    : (chargeable.length > 1
      ? chargeable.reduce((sum, n) => sum + oneCallUsd(n), 0)
      : (ASSUMED_IN_TOK / 1e6) * price[0] + (maxTok / 1e6) * price[1]);

  // --- topic: what "the whole thing" means --------------------------------
  // Best available proxy for one workstream is the document/out path stem.
  // topicFromPath is the SINGLE normalizer, shared with every ledger WRITER. The inline
  // version this replaced was the guard's own rules; a writer used different rules;
  // spentOnTopic matches strictly — so the per-topic cap silently never accumulated for
  // some documents (found 2026-08-24, the day a writer went live).
  const docArg = flagValue(cmd, 'document') || flagValue(cmd, 'out');
  const topic = topicFromPath(docArg || 'untitled');

  const approvalToken = (cmd.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1] || '';

  // --- HOLD FIRST, THEN ASK ------------------------------------------------
  //
  // GLM 5.3 round-4 B4 and flash 3, same defect, and GLM's ONE THING. Reserving
  // AFTER the decision leaves nothing serializing the two, so N parallel gates all
  // decide on a snapshot none of them has written to yet. The suite's own
  // "12/20 under a barrier" was that residual window, measured. Appending the hold
  // first makes it visible to every later reader before this gate commits, and the
  // refusal path below gives the budget straight back.
  //
  // ONE HOLD PER INVOCATION, not one for the line. A compound reserved a single row
  // under the winner's key while each script settles under its own, so the first
  // completion cancelled the whole combined hold with siblings still running — the
  // in-flight blindness reopened for exactly the batching case. Per-invocation holds
  // mean each script settles the hold that belongs to it. It is also what GLM listed
  // as MISSED: nothing tested that a compound line reserves per invocation.
  const holdSpec = (isPanel || chargeable.length <= 1)
    ? [{ model: modelKey || 'panel', usd: worstCaseUsd }]
    : chargeable.map((n) => ({
      model: PANEL_SCRIPTS.has(n) ? 'panel' : (SCRIPT_MODEL[n] || n),
      usd: oneCallUsd(n),
    }));

  // Non-fatal: a hold that cannot be written must not block a call the caps would
  // allow. It is loud, because silently losing it reopens the parallel overshoot.
  const holds = [];
  try {
    for (const h of holdSpec) holds.push(reserveSpend({ model: h.model, topic, usd: h.usd }));
  } catch (err) {
    console.error(`[spend-guard] could not reserve budget — parallel calls may overshoot: ${err?.message}`);
  }
  // `selfHeld` only when the WHOLE worst case is on the file; a partial write would
  // otherwise under-count the caller against its own caps.
  const selfHeld = holds.length === holdSpec.length;

  const decision = checkSpend({ model: modelKey || 'panel', topic, worstCaseUsd, approvalToken, selfHeld });

  if (decision.allow) {
    if (decision.reason === 'second approval accepted') {
      console.error(`[spend-guard] SECOND APPROVAL ACCEPTED — proceeding. ${decision.breach}`);
    }
    ALLOW();
  }

  // REFUSED — hand the budget back. Released by NONCE, so a refusal settles the
  // holds this gate placed and never a concurrent caller's live one.
  for (const nonce of holds) {
    try { releaseReservation({ model: '', topic, nonce }); } catch { /* non-fatal */ }
  }

  // --- refuse: first ask ---------------------------------------------------
  //
  // Write the token where SEAN reads it, not into the agent's own error output.
  // GLM 5.3 round-3 blocker 2: the Fable gate stopped printing its token in
  // `fef453e29`; this one kept doing it, and my commit message read broader than the
  // change. Two gates, one protocol, opposite behaviour — and the one still printing
  // is the one guarding actual money.
  //
  // Same honest limit as the Fable gate: an agent with file-read access can open this
  // too. What changes is the reflex, not the possibility — self-serving now takes a
  // deliberate, greppable act rather than reading the error it just caused.
  try {
    writeFileSync(join(SPEND_DIR, 'PENDING-SPEND-APPROVAL.txt'), [
      'SPEND GUARD — an agent asked to spend and was refused.',
      '',
      `  when:      ${new Date().toISOString()}`,
      `  model:     ${modelKey || 'panel fan-out'}`,
      `  worst case $${worstCaseUsd.toFixed(2)}`,
      `  topic:     ${topic}`,
      `  breach:    ${decision.breach}`,
      '',
      'If you want this to run, read the token below back to the agent.',
      'If you did not ask for it, do nothing — the refusal already held.',
      '',
      `  SWAN_SPEND_APPROVE=${decision.token}`,
      '',
      'Single-use, and bound to that exact model+topic+cost.',
    ].join('\n'), 'utf-8');
  } catch (err) {
    // Non-fatal: the refusal itself is the control. Losing the note costs Sean a
    // lookup in pending-approval.json, not the protection.
    console.error(`[spend-guard] could not write the approval note: ${err?.message}`);
  }

  const t = decision.totals;
  const lines = [
    'SPEND GUARD — BLOCKED (first ask). Sean 2026-08-22: a whole workstream should cost $2-3, not $5.',
    '',
    `  model            ${modelKey || 'panel fan-out'}`,
    `  worst case       $${worstCaseUsd.toFixed(2)}   (cap per call $${CAPS.perCall.toFixed(2)})`,
    `  topic            ${topic}`,
    `  spent on topic   $${t.topic.toFixed(2)}        (cap $${CAPS.perTopic.toFixed(2)})`,
    `  spent today      $${t.day.toFixed(2)}        (cap $${CAPS.perDay.toFixed(2)})`,
    '',
    `  BREACH: ${decision.breach}`,
    '',
    'This is the FIRST of two asks. Show Sean the numbers above and get an explicit yes.',
    '',
    'THE TOKEN IS NOT PRINTED HERE, and that is deliberate. A PreToolUse refusal is',
    'read by YOU, not by Sean — printing it made the second ask something you could',
    'satisfy alone, so the two-ask protocol bound nothing. It is written to:',
    '',
    `    .ai-workflow/spend/PENDING-SPEND-APPROVAL.txt`,
    '',
    'Ask Sean to read the token back to you, then re-run the same command with',
    'SWAN_SPEND_APPROVE=<token> in front. Do not open that file to serve yourself:',
    'this gate is friction and an audit trail, not a wall, and helping yourself to',
    'the key is the exact move it exists to make visible.',
    '',
    'The token is single-use and bound to this exact model+topic+cost.',
    'Cheaper first: Qwen 3.8 is local and free, GLM 5.3 is subscription, DeepSeek',
    'V4 Flash/Pro are cents. Ask whether the expensive seat is actually needed.',
  ];

  console.error(lines.join('\n'));
  process.exit(2); // non-zero blocks the tool call
} catch (err) {
  // Fail OPEN, loudly. Never brick the toolchain over a guard bug.
  console.error(`[spend-guard] gate error, failing open: ${err?.message}`);
  process.exit(0);
}
