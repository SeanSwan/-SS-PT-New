/**
 * ox-identity.mjs — pure seat-identity logic for the Ox final-review gate.
 *
 * SIDE-EFFECT FREE ON PURPOSE. It was carved out of `ox-final-review.mjs` on
 * 2026-08-24 so the test suite can `import` these symbols instead of lifting them
 * out of source text with a regex and `new Function`.
 *
 * Why that mattered (GLM 5.3 round-3, advisory): the lift was coupled to source
 * FORMATTING. It had already over-captured once — the regex ended `;\n`, the
 * function's last line ends `;` followed by a trailing comment, so it swallowed the
 * next function whole. That failure was loud (a SyntaxError in `new Function`), but
 * loudness was luck of where the break landed. A miscapture that still PARSES —
 * absorbing a trailing const into a function body, say — would have silently tested
 * something other than the shipped code, in a file whose entire purpose is catching
 * exactly that class of "the thing you checked is not the thing that ran".
 *
 * Exporting from `ox-final-review.mjs` directly was not an option: that module runs
 * the review at import time, so importing it from a test would fire paid API calls.
 */
/**
 * The seat this gate exists to prove. THE single declaration — the runner's request,
 * its dry-run banner, the identity assertion and the test suite all import this one.
 *
 * It briefly lived in two places: the runner declared it and the test hardcoded its own
 * copy. That is the same one-implementation-two-identities shape as the original bug
 * (a seat requested one way and read back another), reintroduced by the refactor that
 * was removing a different instance of it. Caught by attacking my own change before a
 * reviewer had to.
 *
 * NOTE `scripts/debate/panel-debate.mjs` still carries its own literal in a seat table.
 * Left alone deliberately — that file has a different owner and its own roster shape;
 * consolidating it is a separate change, not a drive-by.
 */
export const OX_MODEL = 'stealth/ox-alpha';

/**
 * Fault codes. The caller classifies on CODE, never on prose (GLM 5.3 round-2 F2):
 * fault messages interpolate uncontrolled text — a provider error string containing
 * the word UNPROVEN would have flipped a transient retry into a hard paid abort
 * under the previous substring match. A closed set of codes cannot be spoofed by
 * content, and rewording a message can no longer silently change abort behavior.
 */
//
// TWO independent flags per code, both fail-closed for codes not listed here:
//   abort  — stop the whole run (config error; more calls only spend)
//   retry  — worth ONE paid re-attempt after a backoff (provider-transient)
// Three review seats (GLM, Ox×2, 2026-08-24) independently caught the previous
// predicate `FAULT[code]?.abort !== true` treating every UNLISTED code as
// retryable — a "closed table" closed only for codes someone remembered to list,
// with the default pointing at more spend. Retry is an opt-in allowlist now.
// The transport codes are in the table too, so it is actually closed.
export const FAULT = Object.freeze({
  WRONG_SEAT:          { abort: true,  retry: false }, // config: selector never reached the transport
  SUBSTITUTED:         { abort: true,  retry: false }, // config: provider served a different model family
  UNPROVEN_NO_HEADER:  { abort: true,  retry: false }, // config: transport writes no attribution at all
  UNPROVEN_NO_SERVED:  { abort: true,  retry: false }, // config: transport does not report the served model
  UNPROVEN_UNREPORTED: { abort: true,  retry: false }, // config: provider names no model
  TRUNCATED:           { abort: false, retry: true  }, // transient: reply cut at max_tokens
  TRANSIENT:           { abort: false, retry: true  }, // transient: transport exit 75 = 429 / 5xx upstream
  IO_ERROR:            { abort: false, retry: true  }, // transient: output unreadable (fs blip)
  EXIT_NONZERO:        { abort: false, retry: false }, // config-shaped: exit 1 = key/args/4xx — never re-spend
  NO_OUTPUT:           { abort: false, retry: false }, // exit 0 with no file — a transport bug, not a blip
});

/**
 * OpenRouter does not always echo the slug you asked for. It canonicalizes to a
 * dated snapshot (`vendor/model-2026-08-01`), appends a routing variant
 * (`:free`, `:nitro`, `:floor`), or resolves an alias. Raw string equality treats
 * every one of those benign rewrites as a substitution — and since a substitution
 * now aborts the run, that would hard-fail every call at call 1, already paid,
 * telling the operator to "fix the seat" when nothing is wrong (GLM round-2 F1).
 *
 * That false positive is NEW: before the served value existed, this comparison
 * never ran on live data, so the fix activated a code path nothing had exercised.
 */
export const canonicalSlug = (m) => String(m)
  .toLowerCase()
  .split(':')[0]                       // drop routing variants
  .replace(/-\d{4}-\d{2}-\d{2}$/, '')  // drop -YYYY-MM-DD snapshots
  .replace(/-\d{8}$/, '');             // drop -YYYYMMDD snapshots

/**
 * Aliases the operator has explicitly accepted as the same seat. EMPTY by design:
 * a real alias is a decision someone must make and defend, not something a matcher
 * should infer. Add entries as `'requested-canonical': ['served-canonical', ...]`.
 */
export const SEAT_ALIASES = Object.freeze({});

/**
 * Same seat? EXACT equality after canonicalisation, plus the explicit allowlist.
 *
 * This used to also accept prefix relationships (`a.startsWith(b) || b.startsWith(a)`).
 * GLM 5.3 round-3 F1 killed it, correctly, on two grounds:
 *
 *   1. `startsWith` has no token boundary, so it silently passes the exact
 *      substitution this gate exists to catch — `gpt-4` ⊂ `gpt-4o` ⊂ `gpt-4o-mini`,
 *      `llama-4` ⊂ `llama-4-maverick`. A provider quietly serving the cheaper family
 *      neighbour would have been waved straight through, in both directions.
 *   2. It bought nothing. Every benign class it was added for — case, `:free`/`:nitro`
 *      routing, `-YYYY-MM-DD` and `-YYYYMMDD` snapshots — is already handled by
 *      `canonicalSlug` BEFORE the comparison. The prefix clause added only risk.
 *
 * The asymmetry it created was the worst possible orientation for an identity gate:
 * an unanticipated but benign format (`model@2025-01-01`, `-0613` short dates) failed
 * LOUD, while a family-neighbour substitution failed SILENT. Loud costs one paid abort
 * and a rule addition. Silent costs undetected wrong-seat output — the original sin
 * this whole harness was built to fix.
 */
/**
 * The seat-bound check the runner actually calls. Exported PRE-BOUND on purpose.
 *
 * Ox round-4 F1 flagged that the runner held its own one-line wrapper
 * (`const identityFault = (text) => identityFaultFor(text, OX_MODEL)`), and that
 * wrapper was **the only untested link in the chain** — the tests called
 * `identityFault(text, OX)` directly, so a mis-bound or dropped seat argument in
 * the runner would have passed every test while shipping a gate keyed to the wrong
 * seat. Relocating the constant removed the duplication but left that glue in place.
 *
 * Binding here removes the glue entirely: the runner imports and calls this, and the
 * tests exercise this same function. There is no longer a line of seat-binding code
 * that ships untested.
 */
export const oxIdentityFault = (text) => identityFault(text, OX_MODEL);

export function modelsAgree(requested, served) {
  // Fail closed on anything that is not a real slug. Ox round-4 F4: canonicalSlug
  // runs String() on its input, so two undefineds both become "undefined" and
  // compare EQUAL — an identity gate returning "these match" because both sides
  // are missing. The existing guards in identityFault make that unreachable today,
  // but "unreachable via the current caller" is not a property worth relying on in
  // the one function whose whole job is refusing to assume identity.
  if (typeof requested !== 'string' || typeof served !== 'string') return false;
  if (requested.trim() === '' || served.trim() === '') return false;

  const a = canonicalSlug(requested);
  const b = canonicalSlug(served);
  if (a === b) return true;
  return (SEAT_ALIASES[a] || []).includes(b) || (SEAT_ALIASES[b] || []).includes(a);
}

/**
 * @returns {{code: string, message: string}|null} null when identity is established.
 */
export function identityFault(text, OX_MODEL) {
  const requested = text.match(/^\*\*Reviewer:\*\*\s*OpenRouter\s*`([^`]+)`/m);
  const served = text.match(/^\*\*Served:\*\*\s*`([^`]+)`/m);
  const f = (code, message) => ({ code, message });

  if (!requested) {
    return f('UNPROVEN_NO_HEADER', 'no Reviewer header — cannot tell which model was requested');
  }

  // REQUEST side: catches the plumbing bug this gate was built for — a seat
  // selector that never reached the transport, so the default model ran.
  if (!modelsAgree(requested[1], OX_MODEL)) {
    return f('WRONG_SEAT', `requested \`${requested[1]}\`, expected \`${OX_MODEL}\``);
  }

  // RESPONSE side: the request line is OUR OWN env var echoed back, so checking
  // it alone is tautological — it passes whichever model actually replied. Only
  // the provider-reported served model can catch silent substitution upstream.
  if (!served) {
    return f('UNPROVEN_NO_SERVED',
      'transport did not report which model replied — upgrade consult-grok.mjs to capture it');
  }
  if (served[1] === 'unreported') {
    return f('UNPROVEN_UNREPORTED', 'provider named no served model — identity not assumed');
  }
  if (!modelsAgree(served[1], OX_MODEL)) {
    return f('SUBSTITUTED', `requested \`${OX_MODEL}\` but provider served \`${served[1]}\``);
  }
  if (/^> ⚠ \*\*TRUNCATED\*\*/m.test(text)) {
    // A truncated reply is the most expensive possible outcome (one such call
    // billed 5.7x a normal one for 48k tokens of a repeating sentence and zero
    // review). Treat it as a failed call, never as a partial result.
    return f('TRUNCATED', 'hit max_tokens — incomplete reply, not a result');
  }
  return null;
}

