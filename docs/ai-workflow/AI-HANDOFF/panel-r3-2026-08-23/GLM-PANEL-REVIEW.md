# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R3-2026-08-23.md
**Tokens:** 5141 in / 15124 out (reasoning: 12782) | total 20265
**Wall:** 223.6s

---

## VERDICT
REVISE — the tokeniser is a real improvement but still leaks in **both** directions on realistic commands (glued operators and blank commands → false clean; `~`, subshell quoting, globs → phantom), the dry-run branch contradicts the new zero-runnable exit contract, and the "zero PII, IDs only" house rule is being satisfied by best-effort redaction rather than by construction.

Direct answers to the four questions, then blockers. (The document supplies no line numbers — evidence is cited by file + symbol.)

## BLOCKERS

1. **P1 — FALSE NEGATIVE: unspaced shell operators glue to the script token and defeat the extension anchor.** Input: `"command": "bash scripts/hooks/push-blast-radius.mjs;echo ok"` (or `node a.mjs&&node b.mjs`). Tokeniser keeps `;`/`&` inside the token (`[^\s"']` matches them), so the token is `push-blast-radius.mjs;echo`, which fails `SCRIPT_EXT`'s `$`-anchor → skipped entirely → **zero findings, byte-identical to clean, on a registration whose file is genuinely absent**. That is the original multi-week incident reopened through the fix. Evidence: `drift-check-gate.mjs` check 7, `SCRIPT_EXT = /\.(?:…)$/i` applied per token.

2. **P1 — FALSE NEGATIVE: hook entries with a missing/blank/non-object `command` are silently skipped.** `hooks: [{type:"command"}]`, `command: ""`, or a plain-string entry `"node x.mjs"` all yield `tokenize(hook?.command || '')` → `[]` → no finding, no UNVERIFIABLE entry. Round 2 fixed "structurally wrong group" but left the identical silence-means-clean pathology one level down, at the entry level. Evidence: the `for (const hook of group.hooks)` loop.

3. **P1 — FALSE POSITIVE: `~`-relative paths phantom.** Input: `node ~/scripts/hooks/x.mjs` — the runtime shell expands `~` and the hook works; the token has no `[$%{}]`, fails `isAbs`, so it's joined as `SS_PT/~/scripts/hooks/x.mjs` → `existsSync` false → "registered hook file(s) DO NOT EXIST" on a healthy hook. Per the file's own header, a phantom is not over-reporting — it retrains the operator to ignore the gate, restoring the outage. Evidence: the unresolvable char class `/[$%{}]/` omits `~`; `isAbs` handles only `/` and drives.

4. **P2 — FALSE POSITIVE: a whole subcommand in quotes becomes one bogus path token.** `sh -c "node scripts/hooks/x.mjs"` → single token `node scripts/hooks/x.mjs` (internal space preserved, quotes stripped) → passes `SCRIPT_EXT` → joined relative → phantom missing; the real inner path is never checked discretely either. This is distinct from the already-fixed quote-glue case (that was `"$VAR"/rest` splitting; this is quoting a full subcommand).

5. **P2 — FALSE POSITIVE: glob and flag tokens.** `for f in scripts/hooks/*.mjs; do node "$f"; done` → token `scripts/hooks/*.mjs` passes the extension test → literal `*` fails `existsSync` → phantom. Same class: `--import=loader.mjs`. The `$f` is correctly UNVERIFIABLE, but the glob phantoms.

6. **P2 — Exit-code mismatch on the dry-run path (the specific question's answer is "no").** `consult-panel.mjs --seats fable --dry-run` with no `--confirm-spend`: `seatsToRun` is `[]`, but `if (dryRun) { … process.exit(0) }` fires unconditionally — while the identical real invocation must exit 1 under fix #4 (zero runnable seats). Dry-run misreports the exit semantics of the very run it previews.

7. **P1 — House-rule violation: "zero PII to LLMs (IDs only)."** The shipped mechanism is best-effort redaction of free-text `document` + `seed` + `remit`. The file's own comment concedes a seed is "the file MOST likely to name a real person" — i.e., PII is *expected* in the input, and pattern redaction of expected-PII prose cannot guarantee zero leakage (a redactor miss = egress). Reducing PII is not the same contract as IDs-only. Either the pipeline must be IDs-only by construction or this needs an explicit, written rule exception — flagging per binding instruction. Evidence: `consult-gemini-panel.mjs` prompt assembly. (Other house rules — MUI/Recharts/palette/44px/WCAG/300-line/yoga/NASM phrasing — are N/A or unviolated in these files; 300-line compliance is unverifiable from excerpts.)

## ATTACKS

- **Correctness:** (a) `consult-panel.mjs` computes `remit.length` unguarded — if `--remit` is optional and not defaulted upstream of the excerpt, a bare `--document X` invocation TypeErrors before any output (the gemini file's `remit && …` idiom suggests remit can be falsy; verify the default). (b) Escaped-space POSIX paths (`scripts/my\ hooks/x.mjs`) split at the escaped space → first fragment unchecked, second fragment checked as `hooks/x.mjs` → phantom. (c) A UTF-8 BOM makes `JSON.parse` throw → the new "unreadable" finding fires even if the harness's own parser tolerates BOMs — wrong direction (alarm, not silence), but still noise. (d) Tokeniser drops characters adjacent to a dangling apostrophe (`don't` → `don`, `t`); harmless today, but it means tokens are not a faithful split.
- **Security:** (a) The strongest remaining risk is **outside the shown file**: round 2 fixed the seed, round 3 fixed the remit — one path per round, always in `consult-gemini-panel.mjs`. `consult-panel.mjs` spawns other seats (qwen, ox). If any sibling seat script passes `remit` or `seed` raw, that's the fourth raw egress path and the actual round-4 finding. The gemini comment claims siblings use the same call shape — unverified. (b) The error path scrubs only `apiKey` from the echoed body; acceptable because the echo is of already-redacted request text, but note it lands verbatim in INDEX.md via stderr capture. (c) `"".split(apiKey)`-with-empty-key edge: if `apiKey` is `''`, `split('')` explodes the body into characters joined by `<REDACTED>` — garbled, not leaking, but guard it. (d) Header-based key transport is correct; `error.cause` URLs are now key-free.
- **Data-truth / schema drift:** Little surface here and I won't invent any. `promptTok` counts raw seed/document while the wire carries redacted text — disclosed as estimate-only, acceptable. The DATA EGRESS warning's correctness hinges entirely on `SEATS.ox.premium && !SEATS.ox.paid` being true and premium seats being absent from the default roster — neither the SEATS table nor the default roster is shown, so the guarantee "a bare `--confirm-spend` can never reach Fable" is asserted, not evidenced.

## HIGHEST RISK
Blockers 1–2: the false-negative class. The entire reason this check exists is that a missing guard reads as clean; both residual FNs (`;`-glued tokens, blank `command` entries) reproduce exactly that ambiguity through the fix built to kill it. **Cheapest de-risk (~5 lines + test cases):** route to UNVERIFIABLE instead of skipping — (a) any token that *contains* a script extension anywhere (`/\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)\b/i`, unanchored) but fails the strict end-anchored test → UNVERIFIABLE; (b) add `~` to the `[$%{}]` class; (c) emit a finding for any hook entry whose `command` is absent/blank/non-string. Then extend the existing case matrix (the file already maintains one) with: `;`-glued, `&&`-glued, `sh -c "…"`, `~/…`, glob, empty command, string-entry hook. This converts every edge from "guessed" to "unknown" — the check's own stated contract.

## CONFIDENCE
Could **not** verify from the document, with what would settle it:

1. **Fix #4's actual code and partial-failure aggregation** — the `consult-panel.mjs` excerpt ends at the SKIPPING log. Whether zero-runnable exits 1, and what exit code a 2-of-3-seat failure produces, is unknown. Evidence: the tail of the file (run loop + `process.exit` logic).
2. **Sibling seat scripts (qwen, ox)** — whether they redact `remit`/`seed`. Given the one-path-per-round fix history, prior probability of a residual raw path there is high. Evidence: `grep -n "readFileSync\|fetch(" scripts/*panel*.mjs scripts/*seat*.mjs`.
3. **Redaction depth** — `readForEgress` / `redactForEgress` bodies are unseen; I cannot confirm the redactor actually catches names/emails/phones, or that `redactForEgress(remit)` matches the real signature (the comment asserts it). Evidence: the redaction module source.
4. **`SEATS` table and default roster** — the spend-gate and DATA-EGRESS guarantees are property-tests over data I can't see. Evidence: the SEATS definition.
5. **`remit` defaulting in `consult-panel.mjs`** — settles or dismisses the `.length` crash.
6. **Whether drift-gate `findings` block or merely annotate** — the check's own "must not block session start" contract vs. how `findings` is consumed downstream. Evidence: the gate's emit/exit region (the excerpt cuts at "Emit: silent when clean").
7. **≤300-line compliance** for all three files — excerpts only.

I am confident in the tokeniser findings (each traced through the regex by hand) and the dry-run exit mismatch (fully visible in the excerpt). I am least confident in blocker 7's severity — it is a genuine rule-compliance gap, but whether it is P1 or an accepted working posture is Sean's call, not mine.
