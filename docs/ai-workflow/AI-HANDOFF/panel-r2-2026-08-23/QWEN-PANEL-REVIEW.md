# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R2-2026-08-23.md
**Tokens (Ollama):** 9515 in / 1336 out | **Wall:** 15.4s | **done_reason:** stop

---
## VERDICT
REVISE — The `premium` flag is overloaded with conflicting semantics (data-gating vs. money-gating), creating a high-risk false sense of security for the `ox` seat, and the `PATH_RE` regex is over-engineered to the point of likely false positives/negatives that will erode operator trust.

## BLOCKERS
1. **P1: `premium` flag semantic conflict creates a security hole for `ox` seat.**
   - **Failure Scenario:** An operator runs `node scripts/consult-panel.mjs --document sensitive-packet.md --seats ox --confirm-spend`.
   - **Why it fails:** In `panel-seats.mjs`, `ox` has `premium: true` and `paid: false`. In `consult-panel.mjs`, the spend gate logic is: `if (premiumRequested.length && confirmSpend) { ... }` (implied to proceed). However, the *intent* of `premium` for `ox` is **data retention gating** (opt-in required), while for `fable`/`sol` it is **money gating** (opt-in required). The code treats `premium` as a single boolean. If the gate logic in `consult-panel.mjs` (not fully shown but implied by the `premiumRequested` check) allows `ox` to run because `confirmSpend` is passed, it conflates "I agree to pay" with "I agree to leak data to a stealth provider." More critically, if the gate *blocks* `ox` unless `confirmSpend` is passed, it implies a monetary cost that doesn't exist, misleading the operator. The real issue: `ox` is `paid: false`, so the "spend gate" (which protects money) should not be the mechanism protecting data. The code currently uses `premium` as a proxy for both. If an operator passes `--confirm-spend` to authorize Fable, they might inadvertently authorize `ox` if it's in the list, believing they are only authorizing money. The distinction between "money premium" and "data premium" is lost in the single `premium` boolean.
   - **Evidence:** `panel-seats.mjs` line ~120 (`ox` definition) vs `consult-panel.mjs` line ~180 (`premiumRequested` logic). The `ox` note says "gated on DATA", but the code gates it via the same `premium` flag used for money.

2. **P2: `PATH_RE` regex in `drift-check-gate.mjs` is likely to produce false positives/negatives.**
   - **Failure Scenario:** A hook command is `node scripts/hooks/pre-commit.mjs`. The regex `/(?<![\w./\\-])[A-Za-z0-9_.][A-Za-z0-9_./\\-]*\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)(?![\w-])/g` will match `scripts/hooks/pre-commit.mjs`. However, if the command is `npx some-package/bin/run.mjs`, the `NOT_A_FILE` check catches `npx` but the regex might still match `some-package/bin/run.mjs` if `npx` is not the *entire* token. More critically, the lookbehind `(?<![\w./\\-])` prevents matching if the preceding character is a word char, dot, slash, or backslash. This means `./script.mjs` will NOT match because the `.` before `script` is in the exclusion class. This is a **false negative** for relative paths starting with `./`.
   - **Evidence:** `drift-check-gate.mjs` line ~15 (`PATH_RE` definition). The lookbehind excludes `.`, so `./foo.mjs` fails to match.

## ATTACKS
- **Correctness:** The `PATH_RE` lookbehind `(?<![\w./\\-])` explicitly excludes `.` and `/`. Therefore, any relative path starting with `./` (e.g., `./scripts/foo.mjs`) will **not** be matched because the character before the first word char is `.`. This is a direct contradiction of the comment "Match any token that looks like a script path". The regex is broken for the most common relative path format.
- **Security:** The `ox` seat is `paid: false` but `premium: true`. If the spend gate in `consult-panel.mjs` only checks `paid` for the money gate and `premium` for the opt-in, the semantics are muddled. `ox` should be gated by a **data consent** flag, not a **spend** flag. Using `--confirm-spend` to authorize data leakage to a stealth provider is a semantic security anti-pattern. It implies financial risk where the risk is actually privacy/data retention.
- **Data-truth:** The `premium` flag in `panel-seats.mjs` is used for `fable` (money), `sol` (money), and `ox` (data). This is a schema drift in the semantic model. `premium` should be split into `premium_spend` and `premium_data` or similar, to allow distinct gating logic.

## HIGHEST RISK
The `PATH_RE` regex fails to match `./` relative paths due to the lookbehind exclusion of `.`. This means the drift check will miss hooks registered with `./` prefixes, leading to **silent failures** where hooks are not checked for existence. The cheapest fix is to remove `.` from the lookbehind exclusion class, changing `(?<![\w./\\-])` to `(?<![\w/\\-])`.

## CONFIDENCE
I could not verify the full logic of the spend gate in `consult-panel.mjs` because the code snippet cuts off after the `premiumRequested` check. I am confident that the `PATH_RE` regex is broken for `./` paths based on the lookbehind syntax. I am also confident that the `premium` flag semantic overload is a design flaw, but I cannot be 100% sure how `consult-panel.mjs` handles the `ox` seat specifically without seeing the full gate logic.
