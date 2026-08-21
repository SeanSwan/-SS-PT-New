# Next-agent prompt — SwanGuard F3 onward

Paste everything below the line into a fresh session.

---

You are picking up **SwanGuard**, Sean's private news + creator hub. It lives in its own repo at
`C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom` — **not** the SS-PT tree you may be started in.

**Read `docs/ai-workflow/AI-HANDOFF/SWANGUARD-F3-ONWARD-HANDOFF-2026-08-21.md` (in SS-PT) first —
all of it.** It supersedes `SWANGUARD-MAKE-IT-USABLE-HANDOFF-2026-08-20.md`. It contains the
verified state, the laws, ten traps that have already cost real time, and the exact commands.
Do not re-derive any of it — that is the point of this handoff.

## Your job

**Run the remaining slices back-to-back as a continuous loop. Do not stop between them to ask
permission — this prompt IS the approval.** Order:

1. **F3 — `GET /api/feed`** ← start here. No such route exists yet (grep confirms). It computes
   `enabled ∩ active-profile − snoozed` and finally applies the CM3 settings that are already
   stored and read by nothing: `daily_cap`, `min`/`max_duration_sec`, `muted_keywords`,
   `priority`, and the `include_uploads`/`shorts`/`live`/`premieres` toggles.
2. **F2c** — put the ingest on a schedule (reuse the existing single-flight runner, do not call
   `runCreatorIngest` directly or you lose the overlap protection).
3. **N2** — take ONE of the 39 seeded news sources all the way through to an article landing.
4. **F4 — the home surface, LAST.** Shelves + default landing section. Until F3 and N2 exist it
   could only be a mock, and a mocked home screen is the lying receipt at full size.

Commit each slice locally with **explicit paths**. **Do not push** — the branch has no upstream
and Sean owns how the merge resolves.

## State, verified 2026-08-21 (so you don't have to look)

```
creators = 51    enabled = 0    creator_item = 0
outlets  = 39    news_rss_sources = 39
official_connector_states = 0    official_connector_items = 0
```

The catalogs are full and every switch is off. Nothing is broken; nothing is turned on.
F0, F2b, F2's fetcher, and the news-source seed are all shipped and proven.

Baseline: api **495 passed** + **1 pre-existing failure** (`civicOfficialSourcesRoutes.test.ts` —
not yours, do not fix it), web 379, database 90, domain 242, type-check exit 0.
A different number is information, not an error.

## Before you touch anything

1. `cd C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom && git branch --show-current` — expect
   `merge/newsroom-mainline-v3`, working tree clean apart from two `*.bak-20260802` files.
2. `npm test && npm run type-check` — as ONE command. Tests do not type-check; 19 green tests
   once shipped two type errors.
3. **Another agent (Codex) is in this tree working the news lane.** Read before you edit, stage
   explicit paths, and **never `git add -A`**.

## How Sean expects you to work

- **Proof, not assertion.** Never say done/fixed/passing without current-session evidence in the
  SAME message, ending with a `PROOF:` line naming what you actually ran. Mutation-test any
  assertion guarding an invariant: break the rule, confirm exactly one test fails, revert.
- **Hostile-review each slice until it runs dry, then one confirming round** — two consecutive
  clean rounds. Each round from a NEW vantage; re-reading code is not a round. End with the
  round ledger and `DRY-LOOP: CLEAN×2 (rounds: N)`.
  **A clean dry loop bounds how long you searched; it does not certify correctness** — the last
  agent's ran clean over code that contained live data loss.
- **Plain-English summary FIRST, technical second.**
- **Update Linear SWA-70** unprompted at each slice close.
- **At close:** a Hermes inbox memo in `.ai-workflow/hermes-inbox/pending/` with a literal,
  unnumbered `## Mistakes I made` heading (the gate matches it exactly); plus a learning packet
  if you are Fable-tier and the lesson is permanent.
- **Say what you did NOT do.** A named gap beats a smooth omission.
- **Never restate a credential** — presence and length only.

## The laws (§3 of the handoff — not negotiable without Sean)

Every creator is born disabled and only `enable_creator(id,'owner',reason)` may change that. The
actor comes from the session, never the request body. **Anything that shapes the feed FILTERS the
enabled set; nothing but the owner WRITES to it — F3 is the direct application of that.**
`creator_item` has no `enabled` column and must never get one. Empty lanes say they are empty:
"fetched 0" and "the fetch threw" must never look the same. Legal-only acquisition — headline and
link-out, never a stored body or transcript.

## Traps that have already cost time (full list in §4)

Exit 0 does not mean it ran — three separate tools did this in two days, including
`consult-gemini.mjs`, which leaves a stale artifact in place; check the artifact's own timestamp,
not the exit code. An absent value is not an instruction to erase (an upsert writing
`col = excluded.col` destroyed a column on 40 rows). You cannot establish "did I change X" by
reading X before and after when others can change X too. Global assertions in shared-database
tests are coin flips — two live suites passed alone and failed together. And `duration_sec IS
NULL` means *unknown*, not zero: a naive `>= min` filter silently excludes every live stream.

## When the loop is done

Run the hostile panel — Sean's named seats are **GLM 5.3 + Gemini 3.1 Pro + Grok 4.6 + you**, plus
free local Qwen. Commands, per-seat calibration, and cost reality (~$0.11 for the last run) are in
**§6**. **Always `--dry-run` first and disclose worst-case spend to Sean before spending.** Treat
every finding as a hypothesis and verify it before acting — on the last run one seat's headline
blocker was wrong on the facts, while two seats independently found a real data-loss bug.

Start by reading the handoff, then begin F3.
