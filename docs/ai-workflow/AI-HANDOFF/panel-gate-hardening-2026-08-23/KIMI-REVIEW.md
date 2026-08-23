# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/GATE-HARDENING-SESSION-REVIEW-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 2317 in / 1691 out | **Cost:** ~$0.0323 | **Wall:** 46.5s | **finish_reason:** stop

---

# Verdict: REVISE

**Strongest objection, plainly:** The Rule 42 pre-push gate — the one with the highest stakes and the best incident justification — is a *local* hook. `.githooks/` is not enforced by git; it requires `core.hooksPath` to be set, per-clone, per-agent, forever. Four to eight parallel agents, sessions spawning fresh checkouts, and the entire crash-loop protection rests on an environment variable of configuration that this document never once states is itself enforced or verified. You built a deterministic gate whose *presence* is non-deterministic. The thing the gate protects against (remote receives broken tree → deploy + production migration) happens on the **remote**, and nothing on the remote checks anything. A GitHub-side branch protection rule, a required CI check, or a pre-receive hook is the actual control; the local hook is a convenience. The recorded incident will recur the first time an agent runs in a fresh worktree where hooksPath wasn't wired. Fix that before celebrating 17/83.

---

## What breaks first (that nobody notices)

**The token-registry cache's `(path, mtime, size)` fingerprint.** You proved it can't cause a false *block* — but you said nothing about false *passes*, and that's the silent failure mode. mtime is writable (`touch -d`, some build tools reset mtimes, git operations preserve them inconsistently across checkouts). A token file edited to *remove* a definition while preserving mtime+size (or via any tool that does) leaves a stale registry that now *contains* a token that no longer exists — the gate passes a commit using a dead token. The rebuild-on-findings path only triggers on findings; a stale registry that *over*-approves never produces findings. It fails silently, forever, and the mutation tests can't see it because they mutate source, not the cache. Add a cheap periodic full-rebuild (e.g., registry older than N minutes or N commits → rebuild) or hash content of changed-mtime files only.

Runner-up: the settle-fix for the flush race keys on "last transcript entry is attachment/bridge-session." That's a discriminator you found empirically on four data points from one session shape. A new tool, a new record type, or a transcript format bump reintroduces the cry-wolf blocking — and this time it blocks *legitimate* closeouts, training operators to bypass Stop hooks.

---

## The five open questions

**1. Is the 42/6 asymmetry defensible?** Yes, and the document's own reasoning is correct — but it's incomplete. The asymmetry is right because the *failure modes* differ: Rule 6's inherited debt is inert (a missing token is a styling degradation), Rule 42's inherited dirt is explosive (deploy crash). But the honest version of Rule 42's design is that it's not a commit-hygiene gate at all — it's a deploy-safety gate wearing a commit-hygiene costume. Which means it belongs at the deploy boundary (remote/CI), not the push boundary. Keep the local gate, stop pretending it's the control.

**2. Right health signal for the catalog?** Not pending count — **pending age distribution and coverage of what agents actually recall.** Measure: (a) median age of undistilled rows (a runner that keeps up has young pending rows; a broken one has old ones), and (b) sampled recall-hit rate — when an agent greps the catalog and finds nothing, log it; the fraction of those misses that correspond to *existing* documents is the true coverage signal. Pending count measures the runner's backlog; miss-rate measures the harm, which is what you actually care about ("we never decided that" vs "catalog can't see it").

**3. Is bypassability theatre?** No — but only if bypasses are *observable*. A gate with an escape hatch is a control if every hatch use leaves a record someone reads; it's theatre if the hatch is silent. Right now: does anything log `SWAN_RULE45_OK=1` uses, `--no-verify` invocations, `swan-guard-allow-hex` lines? The document doesn't say. The correct frame: these gates defend against *carelessness*, not *adversity* — a determined agent bypasses anything short of remote enforcement. Carelessness defense is legitimate and worth having. But unaudited hatches convert "deliberate, named, logged exception" into "invisible habit," and the habit is the incident. Emit a bypass event to a log that a weekly job summarizes. Cheap, and it's the difference between a control and a suggestion.

**4. Weak proxies for judgement rules?** The position is right, with one carve-out. A grep-shaped proxy for "premium design standard" certifies adjacent properties and actively teaches agents to satisfy the proxy — Goodhart as a training signal. Worse than nothing. The carve-out: some of the 66 have *negative-space* enforceable cores. "Recursive planning before building" can't be gated, but "no plan doc exists for a diff touching >N files" can be — not as a proxy for plan quality, but as an existence check, which is the same class as your other gates (existence, not judgement). Triage the 66 into "has an enforceable existence/negative core" vs "pure judgement." The first bucket is probably 10–20 rules. The second bucket should be explicitly declared unenforceable-by-gate and routed to periodic human/model review sampling instead of left in the "someday" pile where they currently rot.

**5. What's nobody proposing?** See below.

---

## What to do NEXT, ranked

1. **Move Rule 42's enforcement to the remote** (required CI check or pre-receive hook on the host). This is the only shipped gate protecting a production migration path, and it's the only one whose enforcement is opt-in per environment. Everything else is secondary to closing this.
2. **Bypass telemetry.** One append-only log line per escape-hatch use, one weekly summary. Converts the whole layer from "trust" to "trust with receipts." Small effort, changes the epistemic status of every gate you have.
3. **Cache staleness bound for the token registry** (time- or commit-based forced rebuild). Kills the silent-false-pass class before it produces its first invisible incident.
4. **Triage the 66 judgement rules** into existence-checkable vs pure-judgement, and stand up a *sampling* review (human or model, weekly, n=small) for the pure-judgement bucket. Sampling is the honest control for judgement rules; gates are not.
5. **Catalog health signal** per Q2: pending-age + recall-miss logging.

## The high-value thing nobody is proposing

**Adversarial gate-testing as a standing practice.** This session's best work was attacking your own gates — the 3-second gate, the wrong flush discriminator, the batch-yield failure mislabeled as a content judgement. Every one of those was found by *you*, pre-merge, by luck of diligence. Nothing in the system *schedules* the next attack. You have 17 gates and zero red-team passes against them: nobody has tried to push a broken backend tree with hooks disabled, nobody has fed the transcript gates a malformed or novel record shape, nobody has tried to make the token cache lie, nobody has tested what the gates do under a detached HEAD, a partial staging state, or a worktree. A quarterly "break the gates" session — with findings filed as rules or gate fixes — is worth more than the next five rules converted from prose. You built an immune system and never injected a pathogen. The recorded lessons in this very document ("a written trap is not a control," the first fix was wrong twice) are evidence that your gates' failure modes are found by accident. Make it a practice, not an accident.
