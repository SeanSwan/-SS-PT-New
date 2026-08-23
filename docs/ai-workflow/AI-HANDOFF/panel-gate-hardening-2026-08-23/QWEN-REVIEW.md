# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/GATE-HARDENING-SESSION-REVIEW-PACKET-2026-08-23.md
**Tokens (Ollama):** 2346 in / 2363 out | **Wall:** 23.1s | **done_reason:** stop

---
# Verdict: REVISE

**Single Strongest Objection:**
The "flush race" fix (Section 3) is a **race condition patched with a sleep**, not a synchronization primitive. You replaced a non-deterministic failure (reading before write) with a *timed* failure (reading before 500ms elapses). On a high-load CI runner or a slow disk, 250ms is not a guarantee; it is a hope. By keying the delay on "build-shaped AND no closing text," you have created a state where a legitimate, fast, compliant closeout is arbitrarily delayed, while a malicious or buggy agent that writes the closing text *just* before the 500ms mark will pass, but one that writes it *just* after will be blocked. This is not a control; it is a lottery. A deterministic gate must be based on state, not time.

---

### What breaks first

**The Rule 42 `pre-push` hook will fail silently on `main` due to `git config core.hooksPath` or shell environment divergence.**

You state Rule 42 blocks a push to `main` when `backend/` has untracked/modified files. However, `pre-push` hooks are notoriously fragile in distributed/CI environments.
1.  **The "Untracked" Trap:** If an agent generates a temporary file in `backend/` (e.g., a build artifact, a `.env.local`, or a test fixture) that is *not* in `.gitignore`, the hook blocks the push. But if that file *is* in `.gitignore`, `git status --porcelain` (which likely powers your check) will not list it. If your check uses `git ls-files --others --exclude-standard`, it works. If it uses `git status --porcelain` and filters for `??`, it works. But if you are checking for *modified* files, `git status` includes staged *and* unstaged.
2.  **The Real Breakage:** The hook runs in the *local* shell environment. If the agent is running in a container or a restricted sandbox where `npm` or the git binary is not in the `PATH` expected by the hook script, the hook might exit with a non-zero code (failure) or zero (success) depending on how you handle errors. If it exits non-zero, the push is blocked (good). If it exits zero due to a silent error (e.g., `command not found` swallowed by `set -e` or lack of `set -e`), the push proceeds.
3.  **The Silent Failure:** The most likely unnoticed failure is that **the hook is not being executed at all** because `core.hooksPath` is not set, or the hook file lacks execute permissions (`chmod +x`) on the agent's checkout. Since this is a "governance" repo, it is highly likely that agents clone the repo fresh. If the clone process does not preserve execute bits (common in some CI/CD pipelines or when using `git archive`), the `pre-push` hook is inert. You have no test that verifies the hook *exists and is executable* in a fresh clone. You have only tested the logic.

**Concrete Defect:** You have no integration test that simulates a fresh `git clone` of the repo and verifies that `git push` to a mock remote is blocked when a backend file is dirty. Your unit tests of the hook script logic are irrelevant if the hook is never invoked.

---

### Ranked "What to Do Next"

1.  **Implement a "Hook Health Check" Gate (The Missing Piece).**
    *   *Why:* You have 17/83 rules enforced. But if the enforcement mechanism (the hooks) is broken in 50% of agent environments, your coverage is effectively 8/83.
    *   *Action:* Add a pre-commit hook (or a CI job) that verifies:
        *   All required hook files exist.
        *   They are executable (`test -x .githooks/pre-push`).
        *   They pass a basic syntax check (`bash -n .githooks/pre-push`).
        *   **Crucially:** Run a "smoke test" in a temporary directory: create a dummy backend file, attempt a push, and assert it fails. If the hook is missing or broken, this test fails loudly.
    *   *Why this is #1:* You cannot trust the other 16 gates if the delivery mechanism is unverified.

2.  **Replace the "Flush Race" Sleep with a State-Based Retry.**
    *   *Why:* Sleeping is non-deterministic.
    *   *Action:* Instead of `sleep 250ms`, implement a retry loop that checks for the *presence* of the closing text. If it's not there, wait 10ms and check again, up to a max of 10 retries. This is still time-based but much more responsive and less likely to delay compliant agents. Better yet, if the transcript format allows, check for a specific "end-of-turn" marker that is written *after* the closing text. If the marker is present, the text must be present. If the marker is absent, wait. This is a state-based check, not a time-based one.

3.  **Address the "Pending" Catalog Signal (Open Question 2).**
    *   *Why:* A raw count is useless.
    *   *Action:* Change the health signal from "Number of Undistilled Rows" to "Age of Oldest Undistilled Row." If a row has been pending for > 7 days, it is a defect. If it was added 1 minute ago, it is expected. This distinguishes between "active work" and "neglected debt."

4.  **Formalize the "Asymmetry" (Open Question 1).**
    *   *Why:* The asymmetry between Rule 42 (block all) and Rule 6 (block added) is defensible *if* documented as a risk trade-off.
    *   *Action:* Add a comment in the code and the constitution stating: "Rule 42 blocks all backend dirtiness because an incomplete tree is an active production hazard. Rule 6 blocks only added tokens because historical debt is a known, managed risk." This prevents future agents from "fixing" the asymmetry by making Rule 6 block all (which would break the repo) or Rule 42 block only added (which would allow production crashes).

5.  **The Thing Nobody Is Proposing: "Gate Bypass Audit Log."**
    *   *Why:* Open Question 3 asks if the layer is theatre. The answer is: it is theatre *unless* you can prove who bypassed it and why.
    *   *Action:* Every time an escape hatch is used (`SWAN_RULE45_OK=1`, `--no-verify`, `swan-guard-allow-hex`), the agent *must* write a structured log entry to a `bypass-audit.log` file (or a database) containing:
        *   Timestamp
        *   Agent ID
        *   Rule Bypassed
        *   Reason (free text)
        *   Commit SHA (if available)
    *   Then, add a **weekly report** that aggregates these logs. If you see 50 bypasses of Rule 45 in a week, you have a problem. If you see 0, you have trust. Without this, you cannot distinguish between "careless agent" and "malicious agent" or "legitimate emergency." This turns the bypass from a silent failure into a measurable signal.

---

### Answers to the Five Open Questions

1.  **Is the Rule 42 / Rule 6 asymmetry defensible?**
    **Yes, but it is fragile.** Rule 42 (block all) is correct because an incomplete backend tree is an *active* hazard to production. Rule 6 (block added) is correct because historical token debt is a *known* state. The asymmetry is defensible *if* the team accepts that Rule 42 is a "safety" gate and Rule 6 is a "hygiene" gate. The risk is that an agent will assume all gates are "hygiene" gates and try to bypass Rule 42 with `--no-verify` because it feels like "just another check." The asymmetry must be explicitly documented as a difference in *severity*.

2.  **The runner will report "pending" forever. What is the right health signal?**
    **Age of Oldest Pending Item.** A raw count is a vanity metric. If you have 100 pending items, but they were all added in the last hour, that is normal. If you have 10 pending items, but the oldest is 30 days old, that is a defect. The health signal should be: `max(timestamp_now - timestamp_created) for all pending rows`. Alert if this exceeds a threshold (e.g., 7 days). This distinguishes between "active work" and "neglected debt."

3.  **Is the gate layer theatre against a sufficiently careless agent?**
    **Yes, unless you have a bypass audit log.** A gate that can be bypassed with a single environment variable is not a control; it is a suggestion. However, if every bypass is logged and audited, the gate becomes a *deterrent* and a *signal*. The value is not in preventing the bypass (which is impossible), but in making the bypass *visible* and *accountable*. Without the log, it is theatre. With the log, it is governance.

4.  **Is it right to NOT build grep-shaped proxies for judgement rules?**
    **Yes.** A gate that scores adjacent properties (e.g., "does the code contain the word 'premium'") certifies the failure. It gives a false sense of security. It is better to have 17/83 rules enforced by deterministic gates and 66/83 rules enforced by human review or AI judgment, than to have 83/83 rules "enforced" by 66 weak, misleading gates. The weak gates will be bypassed or ignored, and the team will lose trust in the entire gate layer.

5.  **What is nobody proposing that should be proposed?**
    **A "Gate Bypass Audit Log" and a "Hook Health Check" Gate.**
    *   The **Bypass Audit Log** turns the bypass from a silent failure into a measurable signal. It allows you to track *who* is bypassing *which* rules and *why*. This is the only way to answer Open Question 3 definitively.
    *   The **Hook Health Check** ensures that the gates are actually being executed. This is the only way to ensure that your 17/83 coverage is real.
    *   Neither of these is on the current list. They are the foundation of a trustworthy governance layer.
