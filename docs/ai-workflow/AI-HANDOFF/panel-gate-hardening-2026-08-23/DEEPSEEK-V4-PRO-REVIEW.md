# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/GATE-HARDENING-SESSION-REVIEW-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 2300 in / 2355 out · **Cost:** ~$0.0087 · **Wall:** 32.3s · **finish:** stop

---

**Verdict:** APPROVE — but with a single objection that must be resolved before the next hardening session, or the work will degrade into theatre.

**Strongest objection, stated plainly:**  
Rule 42’s pre‑push gate blocks *any* untracked or modified‑uncommitted file under `backend/`, including pre‑existing files that are not part of the push. This will fire on legitimate local artefacts (editor swap files, local config overrides, test output directories) that have nothing to do with the change being deployed. The gate will train operators to `--no-verify` every push, and once that habit forms, the gate protects nothing. The deliberate asymmetry with Rule 6 (which scopes to added lines) is indefensible here: an incomplete tree is a hazard, but a gate that cries wolf on harmless local state is a hazard too. The gate needs either a scope‑to‑changes mode or an explicit allowlist (e.g., a `.gitignore`‑style `backend/.push-allow-untracked`) before it can be trusted.

---

## Open questions attacked

1. **Is the Rule 42 / Rule 6 asymmetry defensible?**  
   No. Rule 6’s “added‑only” scope is correct because inherited debt is a known, accepted risk. Rule 42’s blanket block treats all untracked files as equal, but a `backend/local-only-config.json` is not the same as a missing module. The asymmetry should be reversed: Rule 42 must scope to files that are *part of the push* (i.e., new or modified in the commit range) or, at minimum, provide an escape hatch that doesn’t require disabling the whole hook. Without that, the gate is a nuisance that will be bypassed.

2. **The runner will report “pending” forever — what is the right health signal?**  
   A raw count of undistilled rows is noise. The right signal is **distillation lag**: the age of the oldest undistilled document, or the rate of new undistilled documents versus distillation throughput. If the lag stays under, say, 2 hours, the system is healthy even if the absolute count is high. A dashboard that shows “oldest pending: 3 days” is actionable; “pending: 47” is not.

3. **Every gate is bypassable — is the whole layer theatre?**  
   As currently implemented, yes, it is theatre against a sufficiently careless or malicious agent. The escape hatches (`--no-verify`, `SWAN_RULE45_OK=1`, etc.) are silent; a human reviewer sees no trace of them in the PR or commit message. The gates rely entirely on agent cooperation, and a bypass leaves no audit trail. The layer becomes a real control only when bypass events are **tamper‑evident and surfaced to the human**. Without that, it’s a paper shield.

4. **Coverage is 17/83 — are weak signals better than none?**  
   No. A gate that scores an adjacent property and certifies the failure is actively harmful. It creates a false sense of security and trains operators to ignore the gate’s output. The correct path is to make judgement rules testable by requiring structured decision records (e.g., mandatory `decision:` frontmatter in all design docs) that a gate can parse and cross‑reference, not to build grep‑shaped proxies that guess.

5. **What is nobody proposing that should be proposed?**  
   **A bypass audit trail that is impossible to miss.** Every escape hatch should append a structured record to the commit message or a `BYPASS_LOG` file that is diffed in the PR. The human reviewer would see, for example, `[GATE‑42 BYPASS] --no-verify used; 3 untracked files in backend/` directly in the pull request body. This turns theatre into a real, human‑enforced control without requiring the agent to be trustworthy.

---

## What to do NEXT — ranked

1. **Implement the bypass audit trail** (makes all existing gates non‑theatre immediately).  
2. **Fix Rule 42’s scope** — either limit to files changed in the push, or add a `.push-allow-untracked` mechanism, before the gate is habitually bypassed.  
3. **Replace the runner’s “pending” count with a distillation‑lag metric** and an alert if lag exceeds a threshold.  
4. **Automate the runner to distill on `main` post‑session**, not just report; a pending count that never decreases is a broken feedback loop.  
5. **Begin work on structured decision frontmatter** for the 66 judgement rules — a gate that can parse `decision:` lines is the only path to real coverage.

**One high‑value thing nobody is currently proposing:**  
A **gate‑effectiveness dashboard** that measures, per gate, bypass frequency, false‑positive rate, and correlation with actual incidents. This would let the team prune theatrical gates, harden the ones that matter, and stop mistaking activity for security.
