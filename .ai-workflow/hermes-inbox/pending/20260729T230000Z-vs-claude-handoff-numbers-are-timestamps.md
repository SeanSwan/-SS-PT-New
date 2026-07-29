# A count in a handoff is a timestamp, not a fact — 4 of 5 inherited numbers were wrong

**When:** 2026-07-29 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Artifact:** `docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-CONTINUATION-PROMPT-2026-07-29.md` (on `main`)

## The headline lesson

**Statistics carried forward between sessions decay silently, and a decayed "all clear" is worse than no data — it talks the next agent out of auditing the thing.**

Wrote a continuation prompt for a fresh agent, then ran hostile rounds against it. Re-derived every inherited number. **Four of five were wrong:**

| Inherited claim | Re-derived | Verdict |
| -- | -- | -- |
| "204/232 routes guarded, **0 unguarded**" | 219 route files, **1,421** `router.<verb>(` decls | **scoped subset presented as the whole surface** |
| "1,094 direct `res.status(5xx)` across 203 files" | **1,153** across **237** | drifted up |
| "48 commits unlanded" | **51** | drifted 47→48→51 *within one session* |
| "six auth rate limiters" | 9 call sites | ambiguous — call sites ≠ distinct limiters |
| failing baseline "23" | (grew 21→23 mid-session from another agent) | drifts under you |

**The dangerous one was "0 unguarded."** It reads as "auth is cleared, skip it." But there is a live counter-example in the same document — two unguarded DELETE routes on `main` (`grep -c ownerAdminOnly` = 0). A figure that coexists with its own refutation is proof the figure was scoped, and I had propagated it as blanket ground truth. Fixed by marking coverage `[UNKNOWN]`, keeping only the two genuinely-verified auth *mechanisms* (`protect` re-reads role from DB; impersonation is owner-gated/audited/de-escalating), and explicitly re-opening auth as a target.

**The systemic fix beat patching each number:** a standing table at the top of the ground-truth section listing which inherited figures were wrong and why, plus "re-derive before you cite" as a law. Then the section header itself had to change — it still said *"verified, do NOT re-prove"* while the body said the numbers were stale (Rule 75: the header is the first thing read, and it was over-claiming).

## Transferable rules

- **Separate mechanisms from measurements in any handoff.** Mechanisms ("`protect` re-reads role from the DB") stay true. Measurements ("204/232") rot. Label them differently and give the derivation command, not just the number.
- **A "0 problems found" figure needs its scope recorded or it becomes a lie.** The scope definition did not survive into the handoff, so the number outlived the context that made it true.
- **Verify a handoff's paths and commands by executing them, not by reading them.** Found that `.ai-workflow/continuity/rolling-last-done.md` and the three coordination lane files are gitignored and exist **only in the primary tree** — an agent starting in a worktree would have read empty results and concluded no other agents were active. Added a tree-topology table.
- **Check that your top recommendation is actionable before recommending it.** Verified `supertest` is installed and 52 existing tests already mock the auth middleware, then cited three copyable exemplars. A recommendation whose tooling is missing wastes the whole first round.

## Method notes

- **`grep -c` exits 1 on zero matches** and truncates `&&` chains — append `|| true`. Bit this session repeatedly.
- **Never edit backtick-bearing markdown through a bash heredoc** — the shell runs command substitution on the backticks and silently corrupts the text. Produced `"Three defects on ,"` in a headline. Use the file-edit tool.
- **A `python` replacement that doesn't match fails silently.** Two replacements no-op'd because the surrounding `**` differed from what I assumed; caught only by re-grepping for the stale string afterward. **Always verify the replacement fired.**
- **Two trees, and the gitignored operational files live in only one.** Read coordination/continuity from the primary tree; read `main` truth and push from a main-tracking worktree — the primary tree is ~1,240 commits behind and will lie to you.

## Round ledger (this turn)

R10 execute the prompt's own commands → CLEAN · R11 re-derive route count → **1 defect** (scoped figure as blanket truth) · R12 re-derive remaining statistics → **3 defects** · R13 contradiction/structure/numbering → CLEAN · R14 is the top vantage actionable → actionable, added exemplars · R15 header-vs-content honesty → **1 defect** · R16 full structural re-verify → CLEAN.

`DRY-LOOP: CLEAN×2 (rounds: 16 cumulative, 7 this turn)`

*IDs, paths and SHAs only. No PII, credentials, or customer data.*
