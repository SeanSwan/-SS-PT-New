# GLM Consult

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/EGRESS-REDACTOR-REVIEW-PACKET-2026-08-23.md
**Tokens:** 3029 in / 10731 out (reasoning: 8783) | total 13760
**Wall:** 307.9s

---

VERDICT: REVISE

The architecture (shared module, canary-gated, wired at read time) is the right direction, and the self-test-before-use idea is genuinely better than what preceded it. But there are regressions against the sanitizers it replaced, a pattern-ordering flaw that kills composed detections, a realistic destructive-replacement mode in CI, and durability/process failures large enough that shipping today would violate your own house rules.

BLOCKERS:

1. **PII regression: the phone-number pattern was dropped.** `SECRET_SHAPES` (redact-egress.mjs, lines 17–29 of the listing) contains no phone pattern. The legacy `sanitizeOutboundText` (consult-kimi.mjs, shown §1) redacted phones; the shared module replaced it without absorbing that capability. House rule is "zero PII to LLMs." This alone blocks approve.
2. **Regression: the generic Bearer redaction was dropped.** Legacy had `Bearer\s+[A-Za-z0-9._-]+`. The new module only redacts *known-prefix* keys. Any documented `curl -H "Authorization: Bearer <opaque-token>"` in a doc, or any vendor token without an `sk-`-family prefix, sails through. The three legacy sanitizers knew things the shared module forgot — no capability-superset analysis was done (this belongs under MISSED too).
3. **Pattern-order defect destroys composite detections.** `redactForEgress` applies identity patterns *before* `SECRET_SHAPES`. Because every value class excludes `<`/`>` characters, an identity hit inside a larger structure kills the later pattern permanently: `postgres://svc:P4ss@alice-db.internal/db` becomes `postgres://svc:P4ss@<OPERATOR>-db.internal/db`, and then `/<postgres(ql)?:\/\/[^\s"'<>]+/` cannot match (first char after `://` is `<`). Result: credentials-plus-infrastructure leak with **zero hits recorded** — the log stays quiet while the thing it exists to catch escapes. Windows path anchors die the same way if the username happens to be `users`/`home`/`mnt` (structural tokens), nuking `[A-Za-z]:\\Users\\...` before it can fire. Fix: run structural/value patterns first, identities last. Cheap, total fix.
4. **Identity floor produces destructive false positives in realistic environments.** `length >= 3` (identityPatterns, and mirrored in selfTest) admits `root`, `runner`, `vagrant`, `docker`. Your own consult scripts plausibly run in CI containers where `homedir() === '/root'` or GitHub Actions where the user is `runner`. Every occurrence of "root cause," "runner-up," or `root@host` in every document becomes `<OPERATOR> cause`. Case-insensitive substring matching without word boundaries means `pat` → "com<OPERATOR>ible." This doesn't just corrupt prose — it corrupts the *content the vendor reasons over*, silently. Anchor identities with boundaries (`(?<![A-Za-z0-9])NAME(?![A-Za-z0-9])`) and raise the floor to something defensible, with a loud warning when the derived name is dictionary-common.
5. **The fix is not durable, on a dead-end branch.** Packet §6 admits everything is uncommitted, on a branch ~2,226 commits behind `origin/main`. Per your own house rule — no "done/working" without durable current-session proof — this control currently does not exist as far as the repository is concerned. Commit it, and get it onto a main-descendant line the same session. Until then, treat the tool as nonexistent.
6. **Nothing stops the counter from growing.** You measured 59→61 during the session. There is no write-time scrub and no CI grep gate. Read-time filtering on 15 specific scripts cannot see backups, zips, humans, or the 16th script added next week. Blocker: add a CI guard that greps for the username in `docs/ai-workflow/AI-HANDOFF/**` and fails, so the number can only go down.

FINDINGS:

* HIGH — **Self-redaction materially reduced what I can verify.** The "full source" shown is ~80 lines against a claimed 145; the `if (!quiet)` body is elided; the canary string and both CANARY error messages are elided. I cannot verify the stderr content, the complete error-text (does it interpolate the username into thrown messages? That would be a new leak channel invented by the control), or that nothing else lives in those ~65 unseen lines. Per your own framing, I'm flagging this as a finding: the artifact arrived in a state where "full source" is an unverified claim.
* HIGH — **Forward-slash Windows paths bypass.** `[A-Za-z]:\\Users\\...` requires backslashes. `C:/Users/alice/notes.md` (Git Bash style, markdown links, `file:///C:/Users/...` URIs, JSON emitted with normalized slashes) is untouched. One-character class change closes most of it: `[A-Za-z]:[/\\]Users[/\\]`.
* HIGH — **Coverage check repeats the original sin.** You claim "15/15 wired, 0 unwired" based on grep. Your entire thesis is "coverage is not existence" — and grep is existence-checking. Egress vectors not gated by `readFileSync` swapping: stack traces (which contain absolute paths — the *original incident class*) caught and pasted into prompts as error context; inline prompt arguments typed by the operator; child-process stdout re-fed to the model; anything in a 16th script not yet written. The right chokepoint is the *send* boundary (one place where the outbound payload assembles), not N read sites. The current design buys one drift event away from repeating itself.
* MEDIUM — **Metadata survives, enabling reviewer-side reconstruction.** `verbatim`-fenced citations preserve `file:line` byte-for-byte — good property, bad adjacency: line numbers + filenames + title-shaped headings tell a motivated reader exactly which repo files hold the redacted spans, and if identity redaction ever switches to hashing, the same. Decide a policy now: headings and titles outside fences, path roots allowed/disallowed.
* MEDIUM — **Double-sanitization in three callers.** Delegating "before running their original body" means legacy bodies still run. Harmless compositionally (replacements are additive), but legacy mutations generate no hit telemetry — you've built a control whose hit-rate reporting is incomplete by construction, in exactly the three files with independent histories. Delete the bodies; delegate fully.
* MEDIUM — **`root`/numeric-UID derivations.** In minimal containers `userInfo().username` can be absent (guarded) or numeric (unguarded — pattern `\b1000\b` would rewrite counts/version numbers). Add an assertion: derived identity must match `/[a-zA-Z][a-zA-Z0-9._-]+/`.
* LOW — **Encoding bypasses** (base64 blobs, homoglyphs, split tokens) are real but lower priority given the threat model: these documents are self-authored, not adversarial. Worth a backlog line, not a redesign.
* LOW — **Placeholder collisions pollute telemetry.** Documents legitimately discussing `<REDACTED-KEY>` produce phantom "hits," inflating confidence in the wrong direction. This very packet demonstrates it.

MISSED:

1. A capability-diff matrix: every pattern in every deleted sanitizer mapped to a successor pattern, proving superset coverage. Its absence is why blockers 1–2 exist.
2. Verification of the *generator*, not just the consumer: the 59→61 growth tells you new docs are born dirty; no write-path hook was considered.
3. Whether any consult caller ships stderr/stdout captures of redaction logs back to the model (self-referential leak check).
4. Testing `selfTest` failure modes: deleting a SECRET_SHAPE and confirming the canary fails. Untested fail-closed is unproven fail-closed.
5. Confirming thrown-error messages don't interpolate the identity (invisible in the received artifact).
6. Offline harness for the live-seat 401 test — you spent vendor seats and sent a real (if redacted) incident document externally just to observe redaction that `applyAll` proves locally.
7. The git episode's deeper answer: per-agent `git worktree`, not commit-discipline conventions. `git commit -- <paths>` avoids *your* sweep but adds TOCTOU on the same files mid-pairing and depends on every future agent complying voluntarily. Shared-tree committing should simply be forbidden by protocol; the lock argument was found and cited but the conclusion stopped one step short.

ONE THING: Move the redaction call to the single egress boundary (immediately before payload transmission in a shared send helper), with the corrected pattern order (structural/values first, anchored identities last, bearer + phone restored). Everything else in this review is repairable around a correctly-placed chokepoint; placed only at read sites, even a perfect pattern set guards yesterday's architecture.
