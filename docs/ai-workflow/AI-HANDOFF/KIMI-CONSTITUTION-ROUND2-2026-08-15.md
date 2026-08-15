# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\CONSTITUTION-HARDENING-ROUND2-PACKET-2026-08-15.md
**Seed:** (none)
**Tokens:** 2475 in / 2219 out · **Cost:** ~$0.0407 · **Wall:** 28.7s · **finish_reason:** stop

---

# ROUND 2 REVIEW — Constitution Hardening

**(a) VERDICT: SEND-BACK.** The fixes are individually competent, but the round's own centerpiece — the rename hatch — is a deletion-laundering channel, and the B1 confession means the entire round-1 guard was dead code for its whole life, which invalidates every "it caught X" claim made about it in round 1. One defect in a fix is disqualifying when the fix *is* the security boundary.

---

## (b) Defects in the fixes, most severe first

**F1 — The rename hatch launders deletions (Q2 fix is the new hole).**
`SWAN_RULE_RENAME="46=46"` requires only *an addition at the target number*. The added rule's body is never compared to the removed rule's body. Scenario: attacker (or careless author) deletes MANDATORY rule 46 ("never commit credentials"), adds a new rule 46 containing "remember to hydrate," declares `SWAN_RULE_RENAME="46=46"`. Check 3's reversion heuristic doesn't fire — the old body is *gone*, not shrunk. The guard passes. The law changed. This is strictly worse than the pre-fix state, where the removal hatch at least printed a generic refusal that a human might read; now there's a *sanctioned, verified-feeling* path whose verification checks nothing semantic. The fix must compare bodies: a declared rename should require the target addition to share, say, >60% token overlap with the removed rule, or carry the same MANDATORY token and amendment markers. As shipped, "verified against a real addition" verifies existence, not continuity.

**F2 — B1 means round 1's evidence was fabricated-by-omission, and nothing audits for the next B1.**
The guard "protected nothing for its entire existence" because `core.hooksPath` pointed at a stale absolute path. The fix (relative `.githooks`) is correct, but the *class* of bug — enforcement configured but not executing — has no standing detection. The proof offered ("a real commit emitting a line the stale hook does not contain") is one-shot. Scenario that breaks it: any future clone, worktree, or `git config` rewrite that re-points or unsets `core.hooksPath` silently restores the dead-guard state, and every check passes because the checks never run. Minimum: a `git config --get core.hooksPath` assertion in the reference/advertising lint or a repo-level doctor script, plus the hook writing a versioned sentinel line on every run so absence-of-sentinel is detectable after the fact.

**F3 — The absence-announcing branch trusts the attacker's checkout.**
"Blocks when a constitution file is staged without a guard script" — but the *hook itself* is what decides whether the guard script is absent, and the hook lives in the same too-old tree. Scenario: checkout old enough to lack the *announce-absence logic* (pre-B1-consequence-handling), stage a constitution edit, commit. The stale hook runs, knows nothing about announcing or blocking, passes. The B1 fix only protects trees new enough to contain the fix. This is the same bootstrap hole as B1, one layer down, and the document does not acknowledge it. Only a server-side or CI-side check closes it — see Q3.

**F4 — The 15% threshold is unfalsified and gameable in both directions.**
No distribution of historical body-edit sizes is presented; 15% is asserted, not derived. Scenario A (evasion): rewrite a 200-word MANDATORY rule to 175 words with the operative prohibition inverted — 12.5% shrink, MANDATORY retained, amendment markers retained (you keep the marker and amend the *meaning*). Passes. Scenario B (false block): legitimate consolidation of a verbose rule by 20% now requires the removal hatch, training bypass — the exact failure the rename hatch was built to stop. The threshold is a magic number defending against a signature, and F1 already routes around the signature entirely.

**F5 — Reference lint scoped to repo-rooted paths silently exempts the highest-risk references.**
"Deliberately scoped to repo-rooted paths" to avoid 63 false positives — but the five NEVER WRITTEN documents found were presumably repo-rooted. What about MANDATORY pointers to *non-rooted* paths (subdirectory docs, generated files)? The document doesn't say whether the naive 63 included any real misses that are now permanently unflagged. A check whose false-positive suppression is "don't look there" needs a committed enumeration of the suppressed set with per-item justification, or the suppression list becomes a graveyard. The `.ai-workflow/` dead exemption proves the team ships unexercised branches in this exact code.

**F6 — D2 remains a live bypass and the OVERRIDE banner is cosmetic.**
Still keyed by number, still not commit-scoped. Scenario: set `SWAN_RULE_REMOVE=12` for a legitimate removal; forget it; three commits later an unrelated renumber trips it; the "stale override" warning prints *after* the damage commit that the stale variable silently authorized. A warning emitted at the moment of misuse is not expiry. The banner trains the same habit as before: see OVERRIDE, shrug, proceed.

---

## (c) Section 5 — direct answers

1. **What passes all four checks and changes the law:** the F1 rename-laundering mutation — delete MANDATORY rule N, add unrelated rule N, declare `SWAN_RULE_RENAME="N=N"`. Also: a body rewrite under 15% shrink that inverts meaning while keeping the MANDATORY token and appending a fresh amendment marker (markers are checked for *presence*, not authenticity).
2. **15% threshold:** not defensible as stated — no derivation shown. Principled setting: measure the shrink distribution of all historical honest amendments in git history, set the threshold at the observed minimum honest shrink (or at 0% for MANDATORY rules, requiring the hatch for *any* shrink — shrink of a mandatory rule is the incident signature; expansion is not). Better: drop size entirely and diff on negation/imperative tokens for MANDATORY rules only.
3. **Rename hatch:** yes, launders deletions — see F1. Content continuity is never checked. This is the round's worst shipped defect.
4. **Relative `core.hooksPath`:** breaks (a) submodules, which resolve `.githooks` relative to the *submodule* root — hooks silently absent there; (b) CI checkouts that don't run `git config` at all — no hooks, which is fine only if CI enforces independently (it doesn't — startup_failure ×30); (c) any tooling that invokes git with a different working directory. Detached-HEAD worktrees are fine (path is repo-relative, not worktree-relative). Windows: forward-slash relative path is fine in git for Windows; the risk is a `.githooks` symlink or case-collision, unaddressed.
5. **Absence-announcing branch:** the non-blocking branch is acceptable *only* for trees new enough to contain the logic; for older trees it's a hole (F3). The blocking branch is correct in spirit but enforced by the very component whose absence it's guarding against.
6. **Exemption list:** already too permissive — 28 of 136 citations exempt (~21%) with no per-item justification committed, and one exemption was dead code, meaning the list is not test-covered as a list. Every exemption needs a test asserting it fires.
7. **Ordering:** guard → references → advertising is safe for *hiding* (checks are read-only on disjoint artifacts), but a guard BLOCK aborts before references runs, so a commit with both a clobber and a dead citation reports only the clobber; the author fixes the clobber, and the dead citation surfaces on retry — minor annoyance, not a hole. No tree-state misreading since none of the checks mutate.

## Section 3 — verdicts on the four non-decisions

1. **Q1 trailer rejected: WRONG call, right facts.** Yes, `pre-commit` can't see the message — but `commit-msg` as a "second bypass surface" is a non-argument: every hook is equally `--no-verify`-able; two hooks are not twice as bypassable as one. The real reason to defer is that F1 must be fixed first — a trailer on body edits is moot while renames launder deletions. Revisit after F1.
2. **Q3 CI: correct to defer, but the bypass is therefore OPEN and the document should say so in one sentence at the top.** Cheapest real closure given startup_failure ×30 and 403 on branch protection: a `pre-receive` hook on whatever host accepts pushes (if self-hosted), or a scheduled local job that runs the guard against `origin/main` and pages on failure — detective, not preventive, but it's the cheapest thing that executes in this environment. Do not spend effort reviving CI for this alone.
3. **Q4 provenance ledger: correctly deferred.** With AGENTS.md still committed (item 4), a ledger is bookkeeping on top of a structural flaw. Fix the structure first.
4. **Q5 half-measure: YES, worse than either extreme.** A DO-NOT-EDIT banner on a writable committed file is the worst of the three states: full regeneration (extreme A) makes drift mechanically impossible; no banner (extreme B) at least invites edits that the drift hook then catches honestly; the banner suppresses honest edits while doing nothing against dishonest or accidental ones, and its presence will be cited as "handled" in future reviews. Finish the job: make AGENTS.md a build artifact, gitignore it, generate in a `post-merge`/`post-checkout` hook.

---

## (d) Single highest-impact remaining change

**Close F1: require body-continuity evidence for a declared rename** — token-overlap or marker+MANDATORY parity between the removed rule and the target addition, else reject. It is the only shipped mechanism this round that converts a previously-alarming event (a MANDATORY rule vanishing) into a *passing, verified-looking* event. Every other defect is a gap in coverage; this one is a sanctioned laundering channel, and it exists because of this round's fix.
