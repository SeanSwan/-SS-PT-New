# Astra Reply — subscription transport — 2026-09-21T18:56:44.190Z

**Provider:** openai-codex
**Billing:** chatgpt-subscription
**Authentication:** chatgpt_subscription
**Transport:** codex-cli
**Requested model:** gpt-6-astra
**Served model:** NOT OBSERVABLE on codex-cli (see SERVED_MODEL_UNVERIFIABLE_NOTE)
**Reasoning effort:** high
**Tokens:** in=996690 out=20813 reasoning=6682
**Packet:** `docs/ai-workflow/blueprints/creator-brains-console-20260917/17-astra-mega-packet-r9d.md`
**Wall:** 703.1s
**Mega Blueprint:** ARMED (document)

> Marginal cost $0 — this leg rides the ChatGPT subscription, not OpenRouter.

---
Mega Blueprint. I’ll review the bounded round-9d changes, test the boundary and harness claims locally, and emit the required package with verified findings separated from unproven claims.

I found the prior round-9 review and will use the `fable-blueprint-forge`, `non-vibe-coding`, and hostile-review archive skills. This session is read-only: I can run in-memory probes and emit the package, but I cannot file the review in `Z:\HostileReviews`; that completion requirement remains blocked.

The existing suites pass: 93/93 row checks and 83/83 main checks. I found a transport gap to probe: the three new left boundaries reject the literal `n`, `r`, or `t` that precedes a token after JSON serialization. I’m also testing row deletion and whether earlier replacements can prevent the bot-token row from consuming the whole token, using the debugging and verification skills.

The probes found three concrete failures: earlier key rows can partially redact a bot token before its own row runs; all three new boundaries leak tokens after serialized newlines; and deleting any of 12 tested rows leaves the suite green at 91/91. Replacing the `github_pat_` row with a duplicate GitHub row even preserves 93/93.

Two reported measurements also differ: M-A’s sixth failure is in E6, not E4, and the described M-F mutation gives an ordinary E7 failure here—not a canary crash.

The full deletion sweep leaves 13 of 20 row deletions green. The bot-token escape alternative is load-bearing: removing it misses tokens after serialized `\n`, `\r`, and `\t`, yet the existing 93-case suite still passes.

The quoted-ID fix also misses JSON embedded in a prompt and corrupts a direct JSON body by removing the key’s closing quote. I drafted executable regressions and found an early-stop weakness in my own test matrix; I’m splitting those cases so one failure cannot hide the others.

## PART A — HOSTILE REVIEW

**Verdict: REVISE — defects reproduced. Archive filing BLOCKED by this session’s read-only filesystem. No source files changed.**

Reviewed local commit `6a7eae9aaad7a8afc2f2fa619d39ea9a63a641ba`, branch `creator-brains-engine-r2-20260915`. The three reviewed source/test files were clean and their hashes remained unchanged during verification. Executable probes used local synthetic values and an injected fetch stub; nothing was transmitted.

The packet’s displayed samples contain redaction placeholders. Runtime measurements below used the actual local files.

**A1 — Existing package and implementation**

1. **P1 — The three new boundaries miss secrets at the serialized transport.**

   **Evidence:** `scripts/lib/secret-shapes.mjs:98`, `:101`, `:102`; sibling rows `:67–70`; transport `scripts/lib/redact-egress.mjs:235`.

   For each affected row, this caller sends its synthetic token unchanged:

   ```js
   JSON.stringify({ prompt: '\n' + token })
   ```

   The character immediately before the token is now literal `n`; `(?<!\w)` rejects it. The same failure occurs after serialized carriage returns and tabs. All three newly bounded rows and all four previously bounded sibling rows fail.

   The comment at `secret-shapes.mjs:61–65` reverses the implication: the preceding word character causes rejection, not successful recognition.

   **Related measurement:** The bot-token escape alternative is **load-bearing**, not dead code. Removing it changes the row from matching to missing after each of `\n`, `\r`, and `\t`. Nevertheless, that mutation leaves the existing suite **93/93 green**. Both the bot and `sk-` rows additionally miss serialized backspace and form feed.

   **Fix:** Preserve the bot escape branch; cover all five short JSON control escapes consistently. Add individually reported transport cases for every affected family. Process JSON string values with awareness of serialization rather than assuming raw-text tests certify transport behavior.

2. **P1 — The right-edge fix works, but earlier rows still cause partial redaction.**

   **Evidence:** `secret-shapes.mjs:53`, `:98`, `:128`, `:132`; sequential replacement at `redact-egress.mjs:97`.

   Let `A32 = 'A'.repeat(32)`. The bot token assembled as:

   ```js
   ['12345678:AAAA-', 'sk-', A32].join('')
   ```

   becomes:

   ```text
   12345678:AAAA-<REDACTED-KEY>
   ```

   The isolated bot row consumes the entire original token. In the real pipeline, the earlier `sk-` row replaces its suffix first, making the bot shape unrecognizable. Digits and legal body characters remain.

   The supposedly conservative DB-URL row has the same composition defect:

   ```js
   ['postgresql://alice:', 'sk-', A32,
    '@db.invalid/private?password=synthetic'].join('')
   ```

   becomes:

   ```text
   <REDACTED-DB-URL><REDACTED-KEY>@db.invalid/private?password=synthetic
   ```

   **Fix:** Determine sensitive spans against unchanged input before applying replacements. A contained key match must not destroy an enclosing bot-token or URL match. Merely changing the bot’s trailing lookahead cannot fix this.

   **Boundary of finding:** The trailing-lookahead repair itself is correct for its declared alphabet. All **4,096 two-character alphabet suffixes** were fully consumed. The composition defect is not evidence that the new lookahead backtracks incorrectly.

3. **P1 — The quoted-ID fix still misses the representation sent in a prompt.**

   **Evidence:** `secret-shapes.mjs:150`; `redact-egress.rows.r9.test.mjs:110–123`.

   Both inputs retain the seven-digit ID:

   ```js
   JSON.stringify({ chat_id: '1234567' })
   JSON.stringify({ prompt: JSON.stringify({ chat_id: 1234567 }) })
   ```

   The first has a quoted value. The second contains an escaped closing key quote, `\"`, which the optional `['"]?` cannot consume. These failures were reproduced through `fetchForEgress`, inspecting the stub’s received body.

   **Fix:** Support signed integer IDs represented as numbers or strings, including JSON text embedded in prompt strings. Assert the received transport body, not just a raw fragment.

4. **P2 — Redaction removes the closing key quote; the “keeps its key name” assertion does not check preservation.**

   **Evidence:** `secret-shapes.mjs:150`; `redact-egress.rows.r9.test.mjs:123`.

   Actual output:

   ```text
   {"chat_id":1234567}
   →
   {"chat_id:<REDACTED-ID>}
   ```

   The optional quote is consumed outside a capture. The result also inserts an unquoted placeholder where a JSON number stood. A fetch stub receives invalid JSON.

   More decisively, changing the keyed row’s replacement to just `<REDACTED-ID>`—discarding the key and separator—still leaves **93/93 green**.

   **Fix:** Preserve key and separator syntax with exact-output assertions. For a JSON numeric value, emit a JSON string placeholder. Require parseable JSON at the transport for originally valid JSON bodies.

5. **P2 — The suite does not detect row deletion or loss of a family behind a duplicate.**

   **Evidence:** `redact-egress.rows.r9.test.mjs:49–62`, `:131–155`.

   Reproduced results:

   | Mutation | Existing suite |
   |---|---:|
   | Delete each of 13 independently tested rows | **91 passed, exit 0** |
   | Replace `github_pat_` row with a duplicate `gh[pousr]_` row | **93 passed, exit 0** |
   | Remove bot-token escape alternative | **93 passed, exit 0** |
   | Discard keyed-ID key and separator | **93 passed, exit 0** |

   Surviving deletion indices, zero-based:

   ```text
   0,1,2,3,4,8,9,12,14,15,16,17,19
   ```

   E6 does **not** disable a recognizer or remove a row. It tests each surviving regex against that same row’s surviving sample. Deleting the row deletes both assertions and their input.

   **Fix:** Maintain an independent family inventory and fixtures. Check family coverage, not only array length. Test row deletion, family replacement by duplication, and behavioral mutations against a green baseline.

   **What does hold:** Making each of the 20 existing patterns unsatisfiable caused a canary refusal, exit 1. None stayed green. E3’s shared-placeholder assertion is weak, but E6 does independently reject an unsatisfiable recognizer if execution reaches it. Do not conflate these observations.

6. **P3 — Two mutation measurements are incorrect for the reviewed tree; outcome completeness remains unverified.**

   **Evidence:** packet §4 mutation table; `redact-egress.rows.r9.test.mjs:162–164`, `:229`.

   Re-executed mutations, with mutation application verified:

   | Mutation | Observed result |
   |---|---|
   | M-A | 6 failures: **5 E4, 1 E6** |
   | M-B | 10 E5 failures |
   | M-C | 4 E7 failures |
   | M-D | 2 E7 failures |
   | M-E | 2 E7 failures |
   | M-F: add `(?<!\w)` to `AIza` | **1 E7 failure; no crash** |
   | Add boundary to `rnd_` | 1 E7 failure |

   The packet says seven mutants but identifies only M-A through M-F.

   **Fix:** Bind each result to exact before/after patterns, source hashes, process status, completion marker and failing case names. Correct the M-A attribution and re-investigate the historical M-F crash.

   **Unverified, not an invented defect:** The packet contains no executable mutation-runner implementation. I cannot establish whether it mishandles timeout, spawn failure, signal termination, no-op mutation or incomplete execution. The demonstrated **91/91 deletion survival** proves why “exit 0 with zero failures” is insufficient without an independent expected-case inventory.

7. **P3 — The `SG.` measurement and its explanatory comment are false.**

   **Evidence:** `secret-shapes.mjs:95–100`; packet §4’s neighbor disposition.

   This assembled value:

   ```js
   ['mass', 'SG.', 'A'.repeat(16), '.', 'B'.repeat(16)].join('')
   ```

   becomes `mass<REDACTED-KEY>`.

   A dot inside a regex does not anchor the regex’s starting position. A short `massSG.…` sample cannot establish anything unless both minimum segment lengths are satisfied.

   **Fix:** Correct the comment and measurement. Retain unbounded matching as an explicitly accepted conservative policy; this synthetic prefix alone does not justify weakening the recognizer.

**Remaining remit dispositions**

- **`AIza` / `rnd_`:** I did not establish a credible ordinary-English collision warranting a boundary. Keep them unbounded. “Accepted conservatism” is supportable; “genuinely safe for all prose” is not established.
- **PEM:** Accepting mismatched labels remains conservative redaction. No new defect established.
- **`github_pat_`:** No matching defect established; its deletion escaping the suite is established.
- **Bearer:** Serialized whitespace between `Bearer` and its value produces another transport miss. `JSON.stringify({prompt:'Bearer\n' + A32})` reaches the stub unchanged. Include it in the serialization repair.
- **Broader console, engine, web, TypeScript and scanner totals:** Not rerun. They are not evidence against these reproduced failures.

**A2 — One hostile pass over this drafted package**

The initial regression draft grouped control-character and ID variants inside single tests. Its first assertion failure prevented later variants from executing. I replaced those loops with separately registered cases.

Measured result changed from **10 tests / 6 failures** to **57 tests / 47 failures**, with zero skipped or cancelled cases. The emitted test file below contains the corrected version.

The package also now explicitly forbids whole-body JSON parse/stringify normalization, which could alter unrelated large-number lexemes, and requires matching against original input so a “move this row earlier” repair cannot silently leave the same composition problem elsewhere.

## PART B — FORGED PACKAGE

### 00-README.md

**Package:** Round-9d secret-shape repair specification.  
**Status:** REVISE; regression evidence established; implementation and archive filing pending.

This package updates the bounded redaction work only. Creator Brains Console screens and S2–S7 remain outside scope.

| Requirement | Acceptance criterion | Tests |
|---|---|---|
| R1 — Whole-value redaction | No residual bot-token or DB-URL characters from overlapping recognizers | R9D-02,03,08 |
| R2 — Transport boundaries | Each affected token is removed after all five short JSON control escapes | R9D-04,09 |
| R3 — Keyed IDs | Numeric/string IDs redact in direct and embedded JSON; keys survive | R9D-05,06,07 |
| R4 — Independent coverage | Missing or duplicated families cannot certify themselves | R9D-01 plus mutation checkpoint |
| R5 — Truthful evidence | Applied mutation, complete execution and process outcome recorded separately | Mutation checkpoint |
| R6 — Bounded conservatism | Existing prose controls survive; accepted unbounded rows remain active | R9D-10 |

**Builder contract:** Implement one repair slice at a time. Preserve historical results. Do not interpret a canary refusal as an assertion kill. Do not advance while required cases fail, execution is incomplete, or a required mutation survives.

**Baseline verified**

```text
node scripts/lib/redact-egress.rows.r9.test.mjs → 93 passed, exit 0
node scripts/lib/redact-egress.test.mjs         → 83 passed, exit 0
Emitted R9D regression suite, run in memory     → 57 tests, 10 pass, 47 fail, exit 1
```

No implementation, deployment or archive-completion claim accompanies this package.

### 01-architecture.md

**Existing entry points**

- Recognizers: `scripts/lib/secret-shapes.mjs`.
- Matching/replacement: `scripts/lib/redact-egress.mjs`, `applyAll`.
- Transport: the same file, `fetchForEgress`.
- Existing row evidence: `scripts/lib/redact-egress.rows.r9.test.mjs`.

**Decided repair architecture**

1. Keep the public egress entry points and provider gates.
2. Collect matches against immutable input. Apply replacements only after overlap resolution.
3. Prefer a complete enclosing match over contained matches. Merge partially overlapping sensitive ranges and redact their union with `<REDACTED-KEY>`.
4. For keyed-ID matches, distinguish the sensitive value span from preserved key/separator text.
5. Handle JSON string tokens by decoding and re-encoding the individual token. Preserve untouched source lexemes, including numbers.
6. Convert a selected JSON numeric ID to the string `"<REDACTED-ID>"`.
7. Preserve raw-text support. Extend serialized-boundary handling consistently to `n`, `r`, `t`, `b`, `f`.
8. If an originally valid JSON body becomes invalid, throw before invoking fetch.

```mermaid
flowchart TD
    A[String request body] --> B[Existing provider gates]
    B -->|denied| X[Throw; zero fetch calls]
    B --> C[Canary verification]
    C -->|failure| X
    C --> D{Valid JSON input?}
    D -->|yes| E[Identify JSON tokens; preserve original lexemes]
    E --> F[Decode string tokens; identify keyed numeric values]
    D -->|no| G[Raw text]
    F --> H[Collect sensitive spans on unchanged text]
    G --> H
    H --> I[Resolve containment and overlap]
    I --> J[Apply replacements]
    J --> K{Originally JSON?}
    K -->|yes| L[Re-encode changed tokens; validate JSON]
    L -->|invalid| X
    L -->|valid| M[Invoke fetch once]
    K -->|no| M
```

```mermaid
sequenceDiagram
    participant Caller
    participant Gate as fetchForEgress
    participant Core as Redaction core
    participant Fetch as Injected fetch or real fetch
    Caller->>Gate: URL, init.body string
    Gate->>Gate: Provider gates
    Gate->>Core: Canary and representation-aware redaction
    alt Gate, canary, or output validation fails
        Core-->>Gate: Error where applicable
        Gate-->>Caller: Reject
    else Redaction succeeds
        Core-->>Gate: Redacted body
        Gate->>Fetch: Original URL and init; replaced body
        Fetch-->>Gate: Response or rejection
        Gate-->>Caller: Propagate result
    end
```

```mermaid
stateDiagram-v2
    [*] --> Baseline
    Baseline --> Halted: baseline incomplete or failing
    Baseline --> MutationPrepared: baseline green
    MutationPrepared --> InvalidMutation: no change or wrong target count
    MutationPrepared --> Running: changed target verified
    Running --> StartFailed: launch error
    Running --> TimedOut: deadline reached
    Running --> Interrupted: termination signal
    Running --> Crashed: exception without complete case report
    Running --> Incomplete: missing expected cases
    Running --> Red: complete report with assertion failures
    Running --> StayedGreen: complete report without failures
```

**ERD:** N/A — no database, tables, columns or persistence migration.

**UI/user flow:** N/A — headless egress utility. The caller/data flow above is the relevant flow.

Literal Mermaid source is supplied; rendered diagrams were not verified.

### 02-wireframes.md

**N/A — no screens, desktop layouts, 375px mobile layouts, interactive controls, UI copy or palette tokens exist in this bounded change.**

Existing diagnostic placeholders remain:

```text
<REDACTED-KEY>
<REDACTED-JWT>
<REDACTED-BOT-TOKEN>
<REDACTED-PEM>
<REDACTED-DB-URL>
<REDACTED-EMAIL>
<REDACTED-PHONE>
<REDACTED-ID>
```

Do not introduce console screens to satisfy this document.

### 03-contracts.md

**Public compatibility**

```ts
redactForEgress(text: unknown): {
  text: string;
  hits: Array<{ replacement: string; count: number }>;
}

fetchForEgress(
  url: string | URL,
  init?: RequestInit,
  options?: {
    label?: string;
    quiet?: boolean;
    fetchImpl?: typeof fetch;
  }
): Promise<Response>
```

Preserve existing non-string-body rejection, provider gates, identity redaction, canary enforcement and injected-fetch support. Headers and unrelated request options remain unchanged.

**Internal span contract**

```ts
type RedactionSpan = {
  start: number;       // inclusive UTF-16 offset in unchanged input
  end: number;         // exclusive UTF-16 offset
  replacement: string;
  family: string;
};
```

- Every span has `0 <= start < end <= input.length`.
- Identical ranges resolve deterministically by original recognizer order.
- A containing sensitive range supersedes its contained ranges.
- Partial overlaps redact the entire union with `<REDACTED-KEY>`.
- Hits count emitted redactions, not suppressed overlapping candidates.
- Captured key names and punctuation are outside the keyed-ID sensitive span.

**ID contract**

Recognized names remain:

```text
chat_id, chat, user_id, from_id, owner_id, telegram_id, id
```

Support signed decimal integers of at least seven digits, quoted decimal strings, and the same forms inside a JSON document carried as a prompt string. Bare-number policy remains separate.

Required examples:

```text
chat_id=1234567                  → chat_id=<REDACTED-ID>
{"chat_id":1234567}              → {"chat_id":"<REDACTED-ID>"}
{"chat_id":"1234567"}            → {"chat_id":"<REDACTED-ID>"}
{"prompt":"{\"chat_id\":1234567}"}
                                → prompt decodes to {"chat_id":"<REDACTED-ID>"}
```

Do not extend this repair into exponent/decimal IDs, JWT validation, arbitrary recursive encoding detection or a claim of comprehensive secret detection.

**Transport safety**

For valid JSON input, preserve valid JSON output and untouched numeric lexemes. Do not normalize the complete body through `JSON.stringify(JSON.parse(body))`. Validation failures produce a sanitized error and zero fetch calls. No automatic retry is introduced.

**Operations**

- Dependencies, environment variables, database migrations: none.
- Rollout: local tests and review first; no deployment authorized here.
- Recovery: restore the last verified implementation using explicit task-owned files. Do not roll back to a known leaking version and call it safe.
- Diagnostics: case names, family identifiers and counts; no original values.
- Performance: avoid repeated full-body reconstruction per match; benchmark before claiming performance acceptance. No performance result is established here.

### 04-build-order.md

| Order | File | Required work |
|---|---|---|
| 1 | `scripts/lib/redact-egress.r9d.regression.test.mjs` | Install the executable tests in `09-tests.md`; preserve observed RED evidence |
| 2 | `scripts/lib/redact-egress.rows.r9.test.mjs` | Replace self-derived coverage claims with independent inventory; exact preservation assertions |
| 3 | `scripts/lib/secret-shapes.mjs` | Consistent escape boundaries; correct comments; retain accepted unbounded rows |
| 4 | `scripts/lib/redaction-spans.mjs` | Pure immutable-match collection and overlap resolution |
| 5 | `scripts/lib/redaction-json.mjs` | JSON token handling, keyed numeric replacement and validity preservation |
| 6 | `scripts/lib/redact-egress.mjs` | Integrate helpers without changing provider gates or public entry points |
| 7 | Existing packet and new archive record | Correct evidence and record verified successor findings |

Each file must remain under 300 lines. Helpers import only Node built-ins or the existing recognizer module; they must not invoke network APIs.

Use the current consumer’s injected `fetchImpl` pattern for tests. Do not introduce another egress entry point or bypass `selfTest()`.

### 05-slices.md

| Slice | Scope | Exit evidence |
|---|---|---|
| S1 — Evidence | New regression file; existing row tests | Current failures reproduced; independent inventory survives all intended positive fixtures and rejects missing families |
| S2 — Boundaries | Shape table and boundary tests | All 45 R9D-04 cases pass; prose controls pass; bot escape-removal mutation is detected |
| S3 — Composition | Span helper and consumer | R9D-02,03,08 pass; containment and partial-overlap tests pass |
| S4 — Representation | JSON helper and consumer | R9D-05,06,07,09 pass; untouched-number preservation and zero-send failure tests pass |
| S5 — Evidence closure | Tests, packet, archive | Complete green baseline, mutation receipts, archived review and review of actual diff |

**Stop condition for every slice:** Do not advance while a required case fails, execution is incomplete, or the proposed implementation changes a contract without updating its tests.

The 57 emitted cases are the initial regression floor, not an exhaustive certification suite. New helper contracts require their own tests before implementation acceptance.

### 06-bans.md

- Do not remove the bot-token escape alternative.
- Do not weaken `AIza`, `rnd_`, `SG.` or `github_pat_` solely because a fabricated prefix can precede them.
- Do not let placeholders substitute for evidence that the intended recognizer fired.
- Do not derive the required family inventory from the implementation table.
- Do not certify a mutation unless its application was verified.
- Do not count canary crashes as assertion kills.
- Do not treat fewer executed tests as a complete green run.
- Do not process later recognizers against text already damaged by earlier replacements.
- Do not alter unrelated JSON numbers through whole-body normalization.
- Do not send a known-invalid rewritten JSON body.
- Do not add scanner allowlists for synthetic fixtures; assemble them from parts.
- Do not change unrelated console features, provider routing or production settings.
- Do not overwrite shared work, broad-stage files, push, deploy or spend on reviewers.

### 07-checkpoints.md

**Verified receipt**

| Check | Result |
|---|---|
| Existing row suite | PASS — 93/93 |
| Existing main suite | PASS — 83/83 |
| Emitted regression suite, executed in memory | FAIL — 57 cases; 10 pass, 47 fail; exit 1 |
| Bot suffix alphabet | PASS — 4,096 combinations |
| Existing suite under row deletion | FAIL as evidence — 13 deletions survive |
| Existing suite under duplicate-family substitution | FAIL as evidence — 93/93 survives |
| Unsatisfiable-row sweep | 20/20 canary refusals; no assertion-completion claim |
| Mutant runner implementation | NOT VERIFIED |
| Broader project suites | NOT RUN |
| Archive filing | BLOCKED — read-only filesystem |

**Source SHA-256**

```text
secret-shapes.mjs
321920d8340dc2ea26746dc0c45e3547d66bf4c27baf9c0fe2757c8d837429dc

redact-egress.rows.r9.test.mjs
5a9e8bdc5640e3776f3f9f700a3d4418c4a67824000636accec39fe8b70cd5c6

redact-egress.mjs
fedb9163017731d14f3c0761185d0a499bc8899e685c43048fecaa92cdce153f
```

**Required mutation receipt**

Record mutant name, target family, before/after pattern or table operation, source hash, applied-change verification, expected/executed case identities, process exit/signal/error, and completion status.

Keep separate outcomes for invalid/no-op mutation, start failure, timeout, interruption, crash, incomplete execution, assertion failure and survival.

**Review checkpoint remit**

Re-run the counterexamples from PART A through the real public functions with injected fetch. Inspect overlap resolution and JSON preservation. Require every deletion/duplication control to fail for an independently expected family. Review newly introduced helpers before accepting their green tests.

**Archive checkpoint**

The governing [archive skill](.claude/skills/hostile-review-archive/SKILL.md) requires: “Every hostile-review pass leaves exactly one file in `Z:\HostileReviews`.”

This response is **unfiled**. The session’s read-only filesystem prevents satisfying that requirement. No archive ID or successful filing is claimed.

### 09-tests.md

**New file:** `scripts/lib/redact-egress.r9d.regression.test.mjs`.

Run from the repository root:

```powershell
node --test scripts/lib/redact-egress.r9d.regression.test.mjs
node scripts/lib/redact-egress.rows.r9.test.mjs
node scripts/lib/redact-egress.test.mjs
```

The following source was executed in memory after the A2 correction: **57 cases, 10 passed, 47 failed, exit 1**. It is emitted here, not saved to disk.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleAt = p => import(pathToFileURL(resolve(p)).href);
const { SECRET_SHAPES: rows } =
  await moduleAt('scripts/lib/secret-shapes.mjs');
const { redactForEgress: redact, fetchForEgress } =
  await moduleAt('scripts/lib/redact-egress.mjs');

const c = (...p) => p.join('');
const a = 'A'.repeat(32);
const key = '<REDACTED-KEY>';
const id = '<REDACTED-ID>';
const bot = c('1234', '5678:', a);
const fixtures = [
  ['sk', c('sk-', a), key],
  ['stripe', c('sk_', 'live_', a), key],
  ['restricted', c('rk_', 'live_', a), key],
  ['webhook', c('wh', 'sec_', a), key],
  ['slack', c('xo', 'xb-', a), key],
  ['google', c('AI', 'za', a), key],
  ['render', c('rn', 'd_', a), key],
  ['github', c('gh', 'p_', a), key],
  ['github-pat', c('github_', 'pat_', a), key],
  ['sendgrid', c('SG.', a, '.', a), key],
  ['linear', c('lin_', 'api_', a), key],
  ['jwt', c('eyJ', a, '.', a, '.', a), '<REDACTED-JWT>'],
  ['bearer', c('Bearer ', a), 'Bearer ' + key],
  ['bot', bot, '<REDACTED-BOT-TOKEN>'],
  ['pem', c('-----BEGIN PRIVATE KEY-----\n', a,
    '\n-----END PRIVATE KEY-----'), '<REDACTED-PEM>'],
  ['db', 'postgresql://alice:synthetic@db.invalid/x',
    '<REDACTED-DB-URL>'],
  ['email', c('sample', '@', 'example.invalid'),
    '<REDACTED-EMAIL>'],
  ['phone', c('(555) ', '000-', '0199'), '<REDACTED-PHONE>'],
  ['keyed', c('chat_id=', '123', '4567'), id],
  ['bare', c('98765', '43210'), id],
];

async function send(body) {
  let calls = 0;
  let sent;
  await fetchForEgress('https://example.invalid', { body }, {
    quiet: true,
    fetchImpl: async (_url, init) => {
      calls++;
      sent = init.body;
      return { ok: true };
    },
  });
  assert.equal(calls, 1);
  return sent;
}

test('R9D-01 independent inventory and isolated recognizers', () => {
  assert.equal(rows.length, 20);
  for (const [name, sample] of fixtures) {
    assert.ok(rows.some(([re]) =>
      new RegExp(re.source, re.flags).test(sample)), name);
  }
});

test('R9D-02 bot consumes every two-character alphabet suffix', () => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  for (const x of alphabet) for (const y of alphabet) {
    assert.equal(redact(bot + x + y).text, '<REDACTED-BOT-TOKEN>');
  }
});

test('R9D-03 whole bot wins over embedded key', () => {
  const input = c('1234', '5678:AAAA-', 'sk-', a);
  assert.equal(redact(input).text, '<REDACTED-BOT-TOKEN>');
});

for (const [name, token, replacement] of fixtures.slice(0, 14)) {
  if (['google', 'render', 'github-pat', 'sendgrid', 'bearer']
    .includes(name)) continue;
  for (const control of ['\n', '\r', '\t', '\b', '\f']) {
    test('R9D-04 ' + name + ' ' + JSON.stringify(control), async () => {
      const output = JSON.parse(await send(
        JSON.stringify({ prompt: control + token }),
      ));
      assert.equal(output.prompt, control + replacement);
    });
  }
}

for (const value of [1234567, '1234567', -1234567, '-1234567']) {
  test('R9D-05 keyed ' + JSON.stringify(value), async () => {
    const out = JSON.parse(await send(JSON.stringify({ chat_id: value })));
    assert.deepEqual(out, { chat_id: id });
  });
}

test('R9D-06 nested JSON document in prompt has no ID', async () => {
  const prompt = JSON.stringify({ chat_id: 1234567 });
  const out = JSON.parse(await send(JSON.stringify({ prompt })));
  assert.deepEqual(JSON.parse(out.prompt), { chat_id: id });
});

test('R9D-07 bare keyed syntax is preserved exactly', () => {
  assert.equal(
    redact(c('chat_id=', '123', '4567')).text,
    'chat_id=' + id,
  );
});

test('R9D-08 full DB URL wins over embedded key', () => {
  const input = c('postgresql://alice:', 'sk-', a,
    '@db.invalid/private?password=synthetic');
  assert.equal(redact(input).text, '<REDACTED-DB-URL>');
});

test('R9D-09 serialized Bearer whitespace is recognized', async () => {
  const out = JSON.parse(await send(
    JSON.stringify({ prompt: 'Bearer\n' + a }),
  ));
  assert.equal(out.prompt, 'Bearer ' + key);
});

test('R9D-10 conservative rows and prose boundaries', () => {
  for (const [prefix, token] of [
    ['meta', c('AI', 'za', a)],
    ['the b', c('rn', 'd_', a)],
    ['mass', c('SG.', a, '.', a)],
  ]) {
    assert.equal(redact(prefix + token).text, prefix + key);
  }
  for (const compound of [
    c('highs_', a),
    c('weighp_', a),
    c('displin_api_', a),
    'theyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcde',
  ]) {
    assert.equal(redact(compound).text, compound);
  }
});
```

**Executable reproduction of the existing suite’s deletion defect**

```powershell
node --input-type=module -e "const {SECRET_SHAPES:r}=await import('./scripts/lib/secret-shapes.mjs'); r.splice(8,1); await import('./scripts/lib/redact-egress.rows.r9.test.mjs');"
```

Observed: **91 passed, exit 0**.

**Executable reproduction preserving the misleading 93-case count**

```powershell
node --input-type=module -e "const {SECRET_SHAPES:r}=await import('./scripts/lib/secret-shapes.mjs'); r[8]=[...r[7]]; await import('./scripts/lib/redact-egress.rows.r9.test.mjs');"
```

Observed: **93 passed, exit 0**.

These mutations affect only the child process’s imported array; neither writes source files.

## PART C — DECISION-DENSITY SELF-TEST

| Choice | Decision or bounded delegation |
|---|---|
| Is the bot right-edge repair rejected? | No. Retain it; repair composition separately. |
| Is its escape branch necessary? | Yes, demonstrated for `n/r/t`; preserve it and cover `b/f`. |
| How are competing matches handled? | Original-input spans; enclosing match wins; partial overlaps redact their union. |
| What happens to typed numeric IDs? | Replace selected IDs with JSON string placeholders. |
| How much JSON is normalized? | Changed tokens only; untouched lexemes remain unchanged. |
| How are JSON tokens recognized? | Builder may choose a small local lexer implementation; no new dependency, no whole-body reserialization, and all syntax/preservation contracts must pass. |
| How deeply are encodings decoded? | Required scope is transport JSON plus the supplied embedded-document cases; no arbitrary recursive-encoding claim. |
| Are unbounded rows weakened? | No. Keep accepted conservatism; correct unsupported explanations. |
| What proves family inventory? | Independent fixtures plus deletion and duplicate-family mutations. |
| Does a canary crash count as RED? | No. It proves refusal, not completion of assertions. |
| What happens on incomplete evidence? | Halt advancement; retain the incomplete result. |
| Are additional helper tests optional? | No. The emitted 57 cases establish regressions, not full helper coverage. |
| Who implements or deploys now? | Neither occurs in this review-only, read-only turn. |
| Is the review filed? | No. Archive completion remains blocked by filesystem permissions. |
