# PART A — Hostile review of the existing plans (A1) and of this draft (A2)

The code-level findings are in the archive record (C1–C3, H1–H8, M1–M6, L1–L2). This part
reviews the **plans**.

## A1 — Existing blueprints

| # | Sev | Plan / evidence | Scenario | Fix in v4 | Status |
|---|---|---|---|---|---|
| A1-01 | CRITICAL | `BLUEPRINT-coach-cc-ai-harness-2026-09-20/00-README.md` "Review basis: … HEAD `ffe4f805e`" (fork, 2,510 behind main) | A builder follows its S2 "durable operations" and rebuilds what `pendingOperationStore.mjs` already does on the coach branch; or builds on fork code that will never reach main | P0 consolidates first; S2 is not re-specified (03 §C reuses the store) | CONFIRMED |
| A1-02 | HIGH | Same package: "Preserve Talk, Review, and History. This is a harness upgrade … not a replacement dashboard design" | Six rounds harden a layout the owner calls cluttered; the plan forbids fixing it | UI is its own phase (P4) with measurable clutter gates | CONFIRMED |
| A1-03 | HIGH | Harness rounds 1–6: findings 16 → 10 → 5 → 5 → 7 → 7; R6-01 "the vocabulary IS the content" | The privacy admission contract cannot reach dry while it tries to pass clinical prose through a regex it must also refuse | §P: roster aliasing + structure + provider allowlist; regex demoted | CONFIRMED |
| A1-04 | HIGH | Harness package "Builder Contract … zero-repository-access builder" + a 10-item source supplement | Every slice pays a packet-assembly tax and loses the facts that live in code; three rounds were spent on the packet itself (round-1 D9/D10, round-6 §5) | The builder works in the canonical repo with the lane lock; evidence comes from runs, not packets | CONFIRMED |
| A1-05 | HIGH | Live package: S4-minimal "frozen snapshot → editable draft" on the fork only; `CoachFreestyleOverlay.tsx` absent from main and coach branch | Mounting it on the coach branch requires porting three files of 1,587 LOC that exist nowhere else | P6 ports by slice under the live contract; the overlay is split first (605 lines) | CONFIRMED |
| A1-06 | HIGH | Neither 09-20 package mentions streaming as a precondition; the chat constraints cite the 30 s proxy (`aiChatService.mjs:2029`) | Tool loops, memory and long answers all hit the same timeout ceiling | P1 streams first and measures the proxy (U1) before anything is built on it | CONFIRMED (proxy limit UNVERIFIED) |
| A1-07 | MEDIUM | S83 completion package (coach branch) validators check artefacts, not meaning (Review 7 R7-01/03), and the manifest `baseHead` was a literal off-history commit | Completion can be declared on a delivery that loses a migration or a backend delta (C3) | P0.1 requires a pushed commit that contains the backend files, checked by `git cat-file`, not by a receipt | CONFIRMED |
| A1-08 | MEDIUM | JARVIS ultimate blueprint (`dce965656`, 07-31) and `SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md` (SUPERSEDED, "210 files" stale by 114) | The vision exists; no document binds it to an order of work that ships | This package is the index; the vision's intent is kept in `00-README` Outcome | CONFIRMED |
| A1-09 | MEDIUM | No existing plan measures natural-language reach (the H1 probe) | "Hands-free Jarvis" is planned while 9 of 12 natural phrasings cannot act | T-J04 and the golden set gate P2 | CONFIRMED |
| A1-10 | MEDIUM | No existing plan wires `CoachFact` into a prompt (H3) | The memory layer is reviewed (G09) but never consumed | P5.2 is its first production caller | CONFIRMED |

## A2 — Self-check of this draft (not independent approval)

| # | Risk in *this* package | Mitigation, or open |
|---|---|---|
| A2-01 | Budgets (first token ≤ 1.5 s, ≤ 8 tools, ≤ 45 s) are proposed, not measured | P1.0 spike and T-J03c set them from data; the numbers change if the evidence says so |
| A2-02 | Lexical top-32 tool selection may miss the right tool on vague speech | T-J04 and T-J10 measure it; the fallback is the full role list for low-confidence turns (cost noted) |
| A2-03 | Roster aliasing misses nicknames that are not in the roster, and misspellings | Defence-in-depth regex still runs; the canary set includes misspellings; D3 still requires a de-identified-clinical provider class |
| A2-04 | P0's `git merge origin/main` into the coach branch could conflict widely | Measured: the coach branch is 159 ahead and **140 behind** main (merge base `4c2fd507e`, 09-01). 990 files changed on main since then, but only **24 on coach paths**. The merge is bounded; the fork, 2,510 behind, is not merged |
| A2-05 | The C2 root cause was isolated against a mocked harness | U2: re-run T-C2 against a real backend during P0.2 before closing C2 |
| A2-06 | This draft was written by a seat with no push rights and while other agents were active | It lands as untracked docs; one PR on the canonical branch after D1 carries it |
| A2-07 | Retiring `coach-assistant/**` after P4 touches 433 files | Retire behind the flag only after the default flip, with a revert-only rollback window of 2 weeks |

**A2 verdict:** the plan is internally consistent. It is *not* plan-ready until D1 is
decided and P0.1 has landed. An independent hostile round (another seat) is still owed,
and it must run against the canonical branch.
