# Hostile review ROUND 3 — dry-check (2026-08-23)

Rounds 1 and 2 found 8 + 6 defects. All fixed. **This round reviews the round-2 fixes.**
Goal: find anything still wrong, or confirm dry. Do NOT re-report already-fixed items.

## Round-2 fixes to attack

1. check-7 matcher: regex REPLACED with tokenisation. $VAR/${VAR}/%VAR% -> reported UNVERIFIABLE (not missing). URLs skipped. Quoted runs glued. Absolute POSIX + drive paths handled.
2. malformed hooks block -> now a finding, not silently skipped.
3. `remit` now redacted (was the 3rd raw egress path after document+seed).
4. zero runnable seats -> exit 1 (was exit 0).
5. DATA EGRESS warning for premium-but-free seats (ox).

## Specific questions

- Can the tokeniser still produce a FALSE POSITIVE (phantom missing hook) on any realistic command?
- Can it still produce a FALSE NEGATIVE (real missing hook reported clean)?
- Is redaction now complete for every string that reaches the wire in consult-gemini-panel.mjs?
- Does exit-code behaviour now match coverage in ALL paths (dry-run, all-skipped, partial failure)?

## FILE: scripts/hooks/drift-check-gate.mjs (check 7, current)

```javascript
// ---- 7) Hook-registration integrity: a registered guard whose file is absent ----
//
// THE FAILURE THIS CATCHES (2026-08-22, found by Sean from outside the system):
// `.claude/settings.json` registered `lane-session-start.mjs` (SessionStart) and
// `push-blast-radius.mjs` (PreToolUse). Neither file existed on the branch. The
// harness cannot run a file it cannot find, so it emitted NOTHING — and nothing is
// byte-identical to what a healthy guard that found no problems emits. No error, no
// warning, no degraded mode. Every session read as clean while the Coordination
// Ledger went unread for weeks and pushes went unguarded.
//
// That is the general shape and it is why this check has to be mechanical:
// REGISTRATION IS NOT EXISTENCE, and a guard's silence is ambiguous by construction.
// You cannot notice this from inside a session; the only prior detection was a human
// spotting a second-order symptom (agents ignoring each other's notes).
//
// Also covers the wider version: an unparseable settings file silently disables EVERY
// hook it declares, which is the same failure with a larger blast radius.
//
// EXTRACTION — rewritten 2026-08-23 (second panel round). Two regex generations both
// failed, in opposite directions, and a third regex was the wrong answer:
//   v1 required `scripts/` or `.claude/` in the path, so a bare
//      `node lane-session-start.mjs` — literally the file from the incident —
//      matched nothing and the check went silent.
//   v2 anchored on the extension, which fixed that but broke two new ways:
//      FALSE POSITIVE: `node $CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` (the canonical
//        portable idiom) matched `CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` and reported
//        a healthy hook as missing. A phantom finding is not a harmless over-report —
//        it trains the operator to ignore the gate, which restores the original outage.
//      FALSE NEGATIVE: no match could ever START with `/` or `X:`, so absolute paths
//        were invisible, and the `^(?:[A-Za-z]:|\/)` branch written to handle them was
//        unreachable dead code. `NOT_A_FILE` was dead too — every match ends in an
//        extension, so it could never equal `npm`/`node`.
// Tokenising is the honest tool: split the command, look at each argument as an
// argument. Anything unresolvable is reported as UNVERIFIABLE rather than guessed in
// either direction — because for this check, a confident wrong answer in EITHER
// direction is the failure mode.
try {
  const SCRIPT_EXT = /\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)$/i;
  const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
  /**
   * Split a shell-ish command into arguments, honouring simple quoting.
   *
   * The alternation must GLUE a quoted run to whatever abuts it: the canonical
   * portable form is `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/x.mjs`, and a
   * naive `"[^"]*"|'[^']*'|\S+` splits that into `$CLAUDE_PROJECT_DIR` plus a
   * dangling `/scripts/hooks/x.mjs`, which then reads as an ABSOLUTE path and is
   * reported missing — a phantom on a perfectly healthy hook. Caught by this
   * check's own case matrix 2026-08-23, after a panel seat predicted it.
   */
  const tokenize = (cmd) => (String(cmd).match(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g) || [])
    .map((t) => t.replace(/["']/g, ''));
  const missing = [];
  const unresolvable = [];
  const unreadable = [];

  for (const name of ['settings.json', 'settings.local.json']) {
    const cfgPath = join(SS_PT, '.claude', name);
    const raw = read(cfgPath);
    if (raw === null) continue;              // absent is legitimate — settings.local.json is optional

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      // Not fail-open: a settings file the harness cannot parse runs NO hooks at all.
      unreadable.push(name);
      continue;
    }

    const seen = new Set();
    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      // A structurally-wrong hooks block is itself a finding. The previous version
      // coerced anomalies to [] and enumerated nothing, which reported "clean" for a
      // config the harness probably cannot run — the silence-means-clean pathology
      // reborn inside the fix meant to kill it. Flag the shape, then skip it.
      if (!Array.isArray(groups)) {
        unresolvable.push(`${event} in ${name} is ${groups === null ? 'null' : typeof groups}, not an array — hooks here may not run at all`);
        continue;
      }
      for (const group of groups) {
        if (!Array.isArray(group?.hooks)) {
          unresolvable.push(`a group under ${event} in ${name} has no hooks array — that group registers nothing`);
          continue;
        }
        for (const hook of group.hooks) {
          for (const rawTok of tokenize(hook?.command || '')) {
            const tok = rawTok.replace(/\\/g, '/');
            if (!SCRIPT_EXT.test(tok)) continue;          // not a script argument
            // A remote URL ending in .sh is not a local file and must never be
            // reported missing — `curl https://host/x.sh` would otherwise phantom.
            if (URL_SCHEME.test(tok)) continue;

            const key = `${event}:${tok}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // Unexpanded shell/env interpolation ($VAR, ${VAR}, %VAR%). We cannot
            // resolve it and must NOT claim it missing — that phantom is what makes
            // an operator stop reading the gate. Say we could not check it instead.
            if (/[$%{}]/.test(tok)) {
              unresolvable.push(`${tok} (${event}, ${name}) — contains an unexpanded variable; existence NOT verified`);
              continue;
            }

            // Absolute: POSIX /…, Windows C:/…, or UNC //host/share.
            const isAbs = tok.startsWith('/') || /^[A-Za-z]:\//.test(tok);
            const abs = isAbs ? tok : join(SS_PT, tok);
            if (!existsSync(abs)) missing.push(`${tok} (${event}, ${name})`);
          }
        }
      }
    }
  }

  // Reported at LOWER volume than `missing`: these are "could not check", not
  // "is broken". Stating the difference is the whole point — an unverified item
  // must never be laundered into either a clean bill or a phantom alarm.
  if (unresolvable.length) {
    findings.push(
      `${unresolvable.length} hook registration(s) could NOT be verified: ` +
      `${unresolvable.join('; ')}. This is UNKNOWN, not clean — check these by hand.`
    );
  }
  if (unreadable.length) {
    findings.push(
      `.claude/${unreadable.join(' and ')} is not valid JSON — the harness runs NONE of the ` +
      'hooks it declares. Every gate those files register is silently inactive right now.'
    );
  }
  if (missing.length) {
    findings.push(
      `${missing.length} registered hook file(s) DO NOT EXIST: ${missing.join('; ')}. ` +
      'A hook the harness cannot find emits nothing, which is indistinguishable from a ' +
      'hook that ran and found no problems — so this protection is off and reads as on. ' +
      'Restore the file(s) or remove the registration; do not leave a phantom guard.'
    );
  }
} catch (err) {
  // FAIL-OPEN, NOT FAIL-SILENT. The first version swallowed its own errors and
  // emitted nothing — which is byte-identical to "no phantom guards found", i.e. the
  // exact ambiguity this check's own header lectures about. Two panel seats caught
  // the hypocrisy 2026-08-23. A guard that cannot run must SAY it could not run;
  // it still must not block session start.
  findings.push(
    `hook-registration check could not complete (${err?.message || err}). Phantom-guard ` +
    'detection did NOT run this session — its silence means "unknown", not "clean".'
  );
}

// ---- Emit: silent when clean ----------------------------------------------

```

## FILE: scripts/consult-gemini-panel.mjs (egress + auth region)

```javascript
}

// Create the output directory BEFORE the API call, not after. A bad --out path
// (missing parent, or a plain FILE sitting where a directory should be) would
// otherwise surface only once the response was already paid for and in hand,
// throwing the reply away after spending for it. Fail before you spend.
try {
  mkdirSync(dirname(out), { recursive: true });
} catch (e) {
  console.error(`[consult-gemini-panel] cannot create output dir for ${out}: ${e.code || e.message}`);
  process.exit(1);
}

const body = readForEgress(document, { label: 'document' });

// The SEED goes over the wire exactly like the document, so it gets exactly the
// same redaction. Three independent panel seats flagged 2026-08-23 that the
// document was passed through readForEgress while the seed was read raw — with
// redactForEgress imported and never called, which is the fossil of a half-applied
// change. A seed is typically prior session notes or a handoff, i.e. the file MOST
// likely to name a real person. Redacting the safer input and not the riskier one
// is worse than redacting neither, because the import makes the file read as
// protected. Egress protection is a property of the request, not of one argument.
// redactForEgress(text) takes ONE argument — no options object. Matches the
// existing call shape used by the sibling seat scripts.
const seedText = seed && existsSync(seed)
  ? redactForEgress(readFileSync(seed, 'utf8'))
  : '';

// The REMIT is operator free-text and goes over the wire exactly like the other two,
// so it gets the same treatment. Round 2 of the panel caught that fixing the seed
// left this third path raw — `--remit "review how <trainer> handled <client>'s
// complaint"` would have egressed names while the redaction imports above made the
// file read as fully protected. That is the same half-applied shape as the seed bug,
// one round later, which is the argument for redacting at the BOUNDARY rather than
// per-input: every string joined into `prompt` is egress, so every one is redacted.
const prompt = [
  remit && redactForEgress(remit),
  seedText && `## Prior context\n\n${seedText}`,
  '---',
  body,
].filter(Boolean).join('\n\n');

console.error(`[consult-gemini-panel] model=${model} doc=${document} chars=${body.length} key=present(${apiKey.length}ch) — direct Google API`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
const started = Date.now();

try {
  // Key travels in a HEADER, never the URL. Two panel seats flagged 2026-08-23 that
  // `?key=${apiKey}` puts the secret into a string that leaks by default: proxy and
  // access logs, HAR captures, Node diagnostic channels, and `error.cause` URLs all
  // record the full URI. The local `.split(apiKey)` scrub only covers the two places
  // we hand-wrote — it cannot reach anything the runtime logs on its own. Google
  // supports x-goog-api-key; use the channel that is not designed to be recorded.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    }),
    signal: controller.signal,
  });

  if (!res.ok) {
    // Strip the key out of any echoed URL before it reaches stdout or a log file.
    // Collapse to ONE line before it escapes. consult-panel.mjs captures seat stderr
    // verbatim into INDEX.md's Failures list, and a raw multi-line JSON error body
    // shreds that markdown - INDEX is the coverage record, the artifact that says
    // which seats actually saw the document, so it must stay readable on the worst day.
    // The key is stripped regardless of shape: never let it reach stdout or an artifact.
    const raw = (await res.text()).split(apiKey).join('<REDACTED>')
      .replace(/\s+/g, ' ').trim().slice(0, 300);
    throw new Error(`Gemini responded ${res.status}: ${raw}`);
  }

  const data = await res.json();
  const cand = data?.candidates?.[0];

```

## FILE: scripts/consult-panel.mjs (gate + exit paths)

```javascript
}

const document = readFileSync(documentPath, 'utf-8');
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';
// Rough token estimate: ~4 chars/token. Used ONLY for the pre-spend estimate,
// never for billing truth — each seat reports its own real usage.
const promptTok = Math.round((remit.length + document.length + seed.length) / 4);
const ASSUMED_OUT_TOK = 6000;

console.log(`[panel] document=${documentPath} (${document.length} chars, ~${promptTok} tok)`);
console.log(`[panel] seats=${requested.join(', ')}  out-dir=${outDir}`);
// The mode label describes the SPEND gate, never whether anything is sent. Calling
// the un-confirmed state "DRY-RUN" was a lie: `--dry-run` is a separate flag that
// exits before any request, whereas omitting --confirm-spend still RUNS every
// paid:false seat. With ox (an undisclosed provider that RETAINS prompts) and gemini
// (a metered Google key) both free-and-default, an operator reading "DRY-RUN" would
// believe nothing left the machine while the document was already being egressed.
// Found by two independent panel seats, 2026-08-23, and reproduced directly:
// `--seats qwen` with no flags printed "mode=DRY-RUN" and then "running: qwen".
const freeSeats = requested.filter((n) => !SEATS[n].paid);
const modeLabel = confirmSpend
  ? 'LIVE (all requested seats)'
  : `PAID SEATS GATED — ${freeSeats.length} free seat(s) WILL still run and send this document`;
console.log(`[panel] mode=${modeLabel}`);

// A DATA crossing must be announced in its own currency. Round 2 of the panel noted
// that `--seats ox` prints only the money label, priming the operator to think about
// dollars while a prompt-RETAINING undisclosed provider is about to receive the
// document. `premium` now covers both axes, so the warning has to name which one.
const retaining = requested.filter((n) => SEATS[n].premium && !SEATS[n].paid);
if (retaining.length) {
  console.log(
    `[panel] ⚠ DATA EGRESS — ${retaining.map((n) => SEATS[n].label).join(', ')}: ` +
    'costs $0 but an undisclosed provider RETAINS this prompt. Send only what you ' +
    'would send any vendor; the spend gate does NOT cover this.'
  );
}
console.log('');

let estimate = 0;
for (const name of requested) {
  const s = SEATS[name];
  const cost = (promptTok / 1e6) * s.inPerM + (ASSUMED_OUT_TOK / 1e6) * s.outPerM;
  estimate += cost;
  const billing = s.paid ? `~$${cost.toFixed(4)}` : '$0';
  console.log(`  ${name.padEnd(5)} ${s.label.padEnd(18)} ${billing.padStart(9)}  — ${s.note}`);
}
console.log(`\n[panel] estimated spend for this run: ~$${estimate.toFixed(4)} (assumes ${ASSUMED_OUT_TOK} output tok/seat)`);

// PREMIUM SEATS: priced on EVERY run even when NOT requested. Sean's standing ask
// (2026-08-22) is to be told what Fable and Sol would cost each time so the yes/no is
// informed. Printing unconditionally means the answer is already on screen - no second
// dry-run, no guessing, and no silent omission of the expensive option.
const premiumAvailable = Object.keys(SEATS).filter((n) => SEATS[n].premium && !requested.includes(n));
if (premiumAvailable.length) {
  console.log('\n[panel] PREMIUM seats NOT included - ask Sean before adding:');
  for (const n of premiumAvailable) {
    const ps = SEATS[n];
    const c = (promptTok / 1e6) * ps.inPerM + (ASSUMED_OUT_TOK / 1e6) * ps.outPerM;
    // The hint must be the command that ACTUALLY works for this seat. A free
    // opt-in seat (ox) needs naming but not --confirm-spend; printing the money
    // flag for it teaches a wrong incantation and implies a cost of dollars when
    // the real cost is disclosure. Say what it costs in its own currency.
    const how = ps.paid ? `--seats ...,${n} --confirm-spend` : `--seats ...,${n}`;
    const price = ps.paid ? `would add ~$${c.toFixed(4)}` : 'no $ cost — gated on DATA';
    console.log(`  + ${n.padEnd(6)} ${ps.label.padEnd(18)} ${price.padEnd(26)} (${how})`);
  }
}

// Spend gate. The gate exists to protect MONEY (Rule 16), so it applies to the
// paid seats only — making the free local/subscription seats demand a spend
// confirmation would train the reflex of typing --confirm-spend by habit,
// which is exactly how a real spend gate stops working.
// Premium seats were removed from the DEFAULT roster, so a bare
// `--document X --confirm-spend` can never reach Fable's $10/$50. Naming one is the
// deliberate act that authorises it.
const premiumRequested = requested.filter((n) => SEATS[n].premium);
if (premiumRequested.length && confirmSpend) {
  console.log(`\n[panel] PREMIUM seat(s) explicitly requested and confirmed: ${premiumRequested.join(', ')}`);
}
const paidRequested = requested.filter((n) => SEATS[n].paid);
const skipped = confirmSpend ? [] : paidRequested;
const seatsToRun = requested.filter((n) => confirmSpend || !SEATS[n].paid);

if (dryRun) {
  console.log('\n[panel] --dry-run — nothing was sent, nothing was spent.');
  process.exit(0);
}
if (skipped.length) {
  console.log(`\n[panel] SKIPPING paid seats (${skipped.join(', ')}) — no --confirm-spend.`);

```
