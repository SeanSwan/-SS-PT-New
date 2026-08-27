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
import { readFileSync } from 'node:fs';
import { checkSpend, CAPS, spentToday, spentOnTopic, topicFromPath } from '../lib/spend-ledger.mjs';
// SWA-218: the seat roster lives in ONE file, policed by spend-coverage.test.mjs.
// Hand-curating it inside this regex is what drifted in both directions at once.
import { PAID_INVOCATION, FREE_ALLOWLIST, KNOWN_UNGATED, DRY_RUN_AWARE, PANEL_SCRIPTS, scriptNameFrom, allScriptNamesFrom, invokesPaidSeat } from '../lib/paid-seats.mjs';

const ALLOW = () => process.exit(0);

/** Worst-case $/M (in, out), OpenRouter catalog as of 2026-08-22. */
const PRICES = {
  'claude-fable-5':      [10.0, 50.0],
  'gpt-5.6-sol-pro':     [2.5,  15.0],
  'gpt-5.6-sol':         [2.5,  15.0],
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
};

/** Map a consult script to its default model key. */
const SCRIPT_MODEL = {
  'consult-fable.mjs': 'claude-fable-5',
  'consult-sol.mjs': 'gpt-5.6-sol-pro',
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
  // NO `new RegExp` HERE, AND NEVER ADD ONE. The first draft of this helper built the
  // pattern from a template literal — and inside a template literal `\s` is a STRING
  // escape that JavaScript collapses to a bare `s`, so the pattern became
  // `--documents+(...)` and matched nothing. Three tests went red and caught it.
  //
  // That is the FIFTH instance of this file's oldest bug, committed while fixing the
  // fourth: the header already records three regexes corrupted by authoring them
  // through interpolation, one of which turned a backslash-b into a literal 0x08.
  // A guard regex must be written as a literal, or not written as a regex at all.
  // This one is a plain scan, so there is nothing left to corrupt.
  const flag = `--${name}`;
  for (let i = cmd.indexOf(flag); i !== -1; i = cmd.indexOf(flag, i + 1)) {
    const after = cmd.slice(i + flag.length);
    // The next character must be `=` or whitespace, otherwise this is a LONGER flag
    // that merely starts with the same letters (`--max` must not read `--max-tokens`).
    if (after[0] !== '=' && after[0] !== ' ' && after[0] !== '\t') continue;
    const rest = after.slice(1).replace(/^[ \t]+/, '');
    if (!rest) continue;
    const quote = rest[0];
    if (quote === '"' || quote === "'") {
      const end = rest.indexOf(quote, 1);
      if (end > 0) return rest.slice(1, end);
    }
    const bare = rest.match(/^[^\s]+/);
    if (bare) return bare[0];
  }
  return undefined;
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
  if (DRY_RUN_AWARE.has(scriptName) && /--dry-run/.test(cmd)) ALLOW();

  // The fan-out refuses its own live call without --confirm-spend, so gating it
  // earlier is cry-wolf. The old condition named `consult-panel.mjs`, which does not
  // exist on main: the real panel never took this branch and neither did anything
  // else. One condition, drifted in both directions.
  if (PANEL_SCRIPTS.has(scriptName) && !/--confirm-spend/.test(cmd)) ALLOW();

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
    } else if (hit && !defaultKey) {
      modelKey = hit;
    }
  }

  // consult-panel fans out to many seats; price it as the whole fan-out.
  const isPanel = PANEL_SCRIPTS.has(scriptName);

  // Price the panel by the seats ACTUALLY REQUESTED, not the full roster.
  // Flat-rating every fan-out at the whole-roster worst case made a run of two
  // free seats plus two cheap ones (~$0.15) present as $1.20 and get blocked.
  // A gate that cries wolf is a gate the human learns to wave through, which is
  // the failure mode this whole control exists to avoid — so an overstatement
  // is not the "safe" direction, it is corrosive.
  const SEAT_WORST_USD = {
    fable: 1.05, sol: 0.32, kimi: 0.31, grok: 0.11,
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
  const worstCaseUsd = isPanel
    ? panelUsd
    : (ASSUMED_IN_TOK / 1e6) * price[0] + (maxTok / 1e6) * price[1];

  // --- topic: what "the whole thing" means --------------------------------
  // Best available proxy for one workstream is the document/out path stem.
  // topicFromPath is the SINGLE normalizer, shared with every ledger WRITER. The inline
  // version this replaced was the guard's own rules; a writer used different rules;
  // spentOnTopic matches strictly — so the per-topic cap silently never accumulated for
  // some documents (found 2026-08-24, the day a writer went live).
  const docArg = flagValue(cmd, 'document') || flagValue(cmd, 'out');
  const topic = topicFromPath(docArg || 'untitled');

  const approvalToken = (cmd.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1] || '';

  const decision = checkSpend({ model: modelKey || 'panel', topic, worstCaseUsd, approvalToken });

  if (decision.allow) {
    if (decision.reason === 'second approval accepted') {
      console.error(`[spend-guard] SECOND APPROVAL ACCEPTED — proceeding. ${decision.breach}`);
    }
    ALLOW();
  }

  // --- refuse: first ask ---------------------------------------------------
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
    'This is the FIRST of two asks. Do NOT re-run with the token on your own.',
    'Show Sean the numbers above and get an explicit yes. Only then re-run with:',
    '',
    `    SWAN_SPEND_APPROVE=${decision.token} <the same command>`,
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
