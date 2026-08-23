# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-CONFIRM-2026-08-23.md
**Tokens (Ollama):** 8980 in / 2249 out | **Wall:** 35.6s | **done_reason:** stop

---
## VERDICT
REVISE — The new stray-operand rule incorrectly rejects valid `env`-prefixed and `bash -c` invocations, and the fuzzer's identity oracle (P4) is unsound because it compares raw string tokens rather than resolved filesystem paths.

## BLOCKERS
1. **P1**: **False Decline on `env` prefix.**
   - **Scenario:** A legitimate hook command `env PATH=/usr/bin node hooks/present.mjs` is registered.
   - **Failure:** The classifier splits this into `['env', 'PATH=/usr/bin', 'node', 'hooks/present.mjs']`. The `RUNNERS` regex matches `env` and `node`, but `PATH=/usr/bin` does not start with `-` and does not match `RUNNERS`. Consequently, `strayOperand` becomes `PATH=/usr/bin`, and the function returns `UNVERIFIED`.
   - **Evidence:** `hook-registration.mjs` lines 148-152 (`RUNNERS` definition and `strayOperand` check). The `RUNNERS` list includes `env`, implying `env` is a runner, but the logic does not account for `env`'s standard usage of `VAR=val` arguments preceding the actual runner. This creates a coverage gap (false negative) for a common pattern.

2. **P1**: **False Decline on `bash -c` with inline script.**
   - **Scenario:** A hook command `bash -c "node hooks/present.mjs"` is registered.
   - **Failure:** While `SHELL_META` or quoting checks might catch the quotes first (returning UNVERIFIED for a different reason), consider a non-quoted variant or a case where the quote check is bypassed (e.g., if the command is `bash -c node hooks/present.mjs` which is invalid shell but might be tested). More critically, the `RUNNERS` list includes `bash`, but if the command is `bash hooks/present.mjs`, it works. However, if the command is `bash -e hooks/present.mjs`, `bash` is a runner, `-e` is a flag, `hooks/present.mjs` is the candidate. `before` is `['bash', '-e']`. `strayOperand` is undefined. This works.
   - **Re-evaluating the `env` case:** The primary blocker is the `env` case. Let's look for another.
   - **Alternative P1:** **Fuzzer P4 Identity Oracle is Broken.**
   - **Scenario:** The fuzzer generates a command `node ./hooks/present.mjs` (intended: `./hooks/present.mjs`). The classifier returns `OK` with `key: 'hooks/present.mjs'` (if it normalizes) or `key: './hooks/present.mjs'`.
   - **Failure:** The P4 check in `drift-check-gate.fuzz.mjs` (lines 238-242) compares `norm(named)` with `norm(intended)`. `norm` only strips leading `./`. If the classifier returns a path that is semantically identical but lexically different (e.g., `hooks/present.mjs` vs `./hooks/present.mjs`), it passes. However, if the classifier returns a *different* valid path that resolves to the same file (e.g., via symlink or different relative base), the string comparison fails. More importantly, the fuzzer's `generate()` function (line 188) sets `intended` to the raw string `target` from the `PATHS` array. If `target` is `hooks/present.mjs`, and the classifier returns `./hooks/present.mjs` (or vice versa), the string comparison `norm('hooks/present.mjs') !== norm('./hooks/present.mjs')` is `'hooks/present.mjs' !== 'hooks/present.mjs'` (false, so it passes). BUT, if the classifier normalizes differently (e.g., resolves to absolute, or strips `./` inconsistently), or if the intended path was `nested/../hooks/present.mjs` (which is in `PATHS`), the classifier will likely reject it or normalize it to `hooks/present.mjs`. The `intended` is `nested/../hooks/present.mjs`. `norm` does not collapse `..`. So `norm('hooks/present.mjs') !== norm('nested/../hooks/present.mjs')` is `true`. The fuzzer records a P4 failure.
   - **Evidence:** `drift-check-gate.fuzz.mjs` line 188 (`intended: coherent ? target : null`) and line 241 (`if (norm(named) !== norm(intended))`). The `PATHS` array contains `nested/../hooks/present.mjs`. The classifier (line 168) rejects `..` segments. So this specific case returns UNVERIFIED, so P4 doesn't fire.
   - **Let's look at the `env` case again.** Is it a blocker? It causes a loss of coverage (UNVERIFIED instead of OK/MISSING). The prompt asks: "Does the new RUNNERS/stray-operand rule reject any LEGITIMATE registration? (False decline = lost coverage.)" Yes. `env VAR=val node script.mjs` is a legitimate registration. The rule rejects it. This is a P1 defect in the fix.

3. **P2**: **Fuzzer P4 Oracle Compares Strings, Not Paths.**
   - **Scenario:** The fuzzer generates `node hooks/present.mjs`. `intended` is `hooks/present.mjs`. The classifier returns `OK` with `key: 'hooks/present.mjs'`. P4 passes.
   - **Scenario:** The fuzzer generates `node ./hooks/present.mjs`. `intended` is `./hooks/present.mjs`. The classifier returns `OK` with `key: 'hooks/present.mjs'` (if it strips `./`). `norm('hooks/present.mjs')` is `hooks/present.mjs`. `norm('./hooks/present.mjs')` is `hooks/present.mjs`. Passes.
   - **Scenario:** What if the classifier returns a path that is *different* but *correct*? E.g., if the classifier resolves relative to root and returns an absolute path? The classifier returns `tok` (line 176), which is the raw token. So it returns the raw string.
   - **The real issue:** The P4 check is an *identity* check on the *string*. If the classifier is correct, it should return the token it identified. The fuzzer asserts that the token identified is the one it intended. This is a valid test *if* the classifier is expected to return the exact token. However, if the classifier normalizes the path (e.g., removes `./`), the string comparison fails. The classifier does *not* normalize the path in the `key` (it returns `tok`). So `key` is the raw token.
   - **Wait, look at the classifier's `OK` return:** `return { kind: 'OK', key: tok }`. `tok` is `candidates[0]`, which is the raw word from the split. So if the input is `node ./hooks/present.mjs`, `tok` is `./hooks/present.mjs`. The fuzzer's `intended` is `./hooks/present.mjs`. `norm` strips `./`. Both become `hooks/present.mjs`. Match.
   - **Is there a case where the classifier is correct but the string differs?** If the input is `node hooks/present.mjs`, `tok` is `hooks/present.mjs`. `intended` is `hooks/present.mjs`. Match.
   - **Conclusion:** The P4 oracle is fragile but not necessarily broken for the current classifier implementation. However, it is a *string* comparison, not a *path* comparison. If the classifier were to normalize paths (e.g., `resolve(root, tok)`), the P4 check would fail. The current classifier does not normalize. So this is not a blocker *for the current code*, but it is a design flaw in the test. I will flag it as a P2 risk.

4. **P1**: **`env` prefix false decline.** This is the strongest blocker. `env` is in `RUNNERS`, but `VAR=val` is not a runner and not a flag. It is a stray operand. The rule rejects it. This is a false decline of a legitimate registration.

## ATTACKS
- **Correctness:** The `strayOperand` logic assumes that any non-flag, non-runner word before the candidate is the entrypoint. This is false for `env VAR=val node script.mjs`. The `env` command takes `VAR=val` pairs as arguments. The classifier does not understand `env`'s argument structure.
- **Security:** No new security vulnerabilities introduced. The `UNVERIFIED` return is safe (fails open to manual check, not silent pass).
- **Data-truth:** The fuzzer's P4 check is a string comparison, which is brittle. It should compare resolved paths or use a path-normalization function that is shared between the classifier and the fuzzer.

## HIGHEST RISK
The `strayOperand` rule rejecting `env VAR=val node script.mjs`. This is a common pattern in CI/CD and local development. The gate will report these hooks as UNVERIFIED, causing noise and potentially masking real issues if operators start ignoring UNVERIFIED warnings.

**Cheapest de-risk:** Update the `strayOperand` check to allow `VAR=val` patterns if the preceding runner is `env`. Or, more simply, add `env` to a special case where `VAR=val` arguments are skipped.

## CONFIDENCE
I am confident in the `env` false decline. I am less confident about the P4 oracle's brittleness, as it depends on the classifier's exact behavior. I did not verify if `bash -c` with quotes is handled correctly by the `SHELL_META` check (it likely is, as quotes are in `SHELL_META`). I did not verify if `npx` with a package name (not a path) is handled correctly (it likely returns UNVERIFIED, which is safe).
