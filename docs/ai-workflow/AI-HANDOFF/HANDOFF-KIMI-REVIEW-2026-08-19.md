# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-CM-CONTINUATION-HANDOFF-2026-08-19.md
**Seed:** (none)
**Tokens:** 3362 in / 1329 out | **Cost:** ~$0.0300 | **Wall:** 378.5s | **finish_reason:** error

---

# Hostile Review: SwanGuard Continuation Handoff

## BLOCKER

**B1. §0.1's destructive-operation warning protects the guard files but not the *SwanGuard* work, and the doc never says what a fresh agent should DO on day one to protect either.** "Do not run destructive git operations" is a don't, not a do. The obvious first move — **commit or at least `git stash create` / bundle / copy the untracked guard files and the `apps/web/src/creators/` tree to a safe location** — is never recommended. §5 lists "Commit decision — Sean decides when and how," which means a fresh agent is told the work is one accident away from annihilation AND told it cannot fix that without Sean, AND given no interim mitigation. A fresh agent's first action should be a non-destructive snapshot (e.g., `git diff > backup.patch`, copy untracked files to a dated folder). The doc's silence here is the single most damaging gap: it correctly identifies the risk and then leaves it fully exposed.

**B2. §1's "verified, not remembered" table is unverifiable by the reader.** "348 passed / 8 skipped," "76/76," "38/38," "0 errors" — asserted with no commands attached in the table itself. §0.3 gives generic commands, but the table never binds numbers to invocations, and "measured at handoff time" is exactly the claim a fresh agent cannot check. Worse, the numbers will be **stale the moment the agent changes anything** — and the doc never says "re-run these first to establish your baseline; if your numbers differ, the tree is not what this doc describes." That one instruction would convert unverifiable assertions into a falsifiable baseline. Its absence violates the doc's own §7 law ("proof, not assertion").

## MAJOR

**M1. The recommended first slice (3.1, HTTP creator service) is wrong — or at least unjustified against the safer first move.** The doc itself establishes that (a) everything is uncommitted and fragile, (b) the H0.5 owed test is an *owner-facing commitment* that is outstanding, and (c) approval `be60fd2c92e5bc61` is a text-only fix with a command already written. A fresh agent's best first move is the **smallest, highest-trust, lowest-blast-radius item**: the owed operator-path test or the approval text fix — both are completable in one session, both retire explicit debts, both build the agent's calibration against the repo before it writes a new persistence layer. Starting a brand-new HTTP service + API routes on an uncommitted tree with no baseline re-verification is the highest-risk possible opening move. The doc argues 3.1 is "the last untrue thing on a shipped screen" — a product argument, not a handoff-sequencing argument. At minimum the doc should say: "Before 3.1, re-run the §1 baseline and confirm it reproduces."

**M2. §0.2's cross-repo confusion warning is asserted, not operationalized.** "The blast-radius guard hooks *every* tool call, including ones targeting SwanGuard" — a fresh agent cannot verify this, doesn't know where the hook is installed, and isn't told how to tell a *correct* block from a *false* block beyond "suspect the gate." §4.1 says Class B abstains for out-of-snapshot files — but gives no command to check which classes fired or where the guard's log lives. A fresh agent blocked on day one has no diagnostic path. This is the trap the doc itself says cost "a full evening," and the remedy is one paragraph of "here's how you check."

**M3. §4.3's "10 of 28 approval-directory write routes remain open" is a precise, unverifiable, and likely-to-drift number.** No file, no command, no list. Within a day of anyone touching the guard it's wrong, and nothing flags it as perishable. Same class of problem: "152 tables," "160,057 videos," "24,054 / 24,915 / 420" — decorative precision that a fresh agent will quote as fact and cannot check without re-deriving it.

**M4. "What works end to end" over-claims.** "Live path. `Swan Guard.cmd` boots backend mode + dev Postgres, applies migrations, opens the app" — was this run *this session*, or is it remembered? The doc's own standard (§1 header: "verified, not remembered") is asserted for the table but not for this list. "Credentials… both verified live" — verified *when*? API keys expire and quotas die; the doc gives the verify command (good) but never says "re-run it; do not trust this claim." The four-attack trigger verification is the strongest claim in the doc and has no reproduction script — a fresh agent told "the DB enforces default-off" has to take it on faith or re-derive four attack vectors from scratch.

## MINOR

- **m1.** No staleness legend anywhere. The doc is dated 2026-08-19 but never says which sections decay fastest (test counts, the 10/28 figure, HEAD `64cb2f7` — which changes the moment anyone commits, i.e., the moment §5's "commit decision" is executed, making §0.1's recovery instructions silently wrong).
- **m2.** `Swan Guard.cmd.bak-20260817` — a `.bak` file referenced as reassurance; if it's also untracked, it's part of the B1 exposure and the doc doesn't say so.
- **m3.** §3.3 references `docs/266-...md` "§A" and Sean's restatement of criterion 4 — a fresh agent must read a second doc to understand an *
