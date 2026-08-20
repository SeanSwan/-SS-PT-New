# Next-agent prompt — SwanGuard: make it usable

Paste everything below the line into a fresh session.

---

You are picking up SwanGuard, Sean's private news + creator app. Read
`docs/ai-workflow/AI-HANDOFF/SWANGUARD-MAKE-IT-USABLE-HANDOFF-2026-08-20.md` first — all of
it. It supersedes `SWANGUARD-FEED-GAP-HANDOFF-2026-08-20.md`.

**Sean's goal:** the app should actually work — he wants to pull videos from the creators he
follows, and start pulling news articles.

## Before you touch anything

1. **Check which branch you are on.** The SwanGuard checkout was last seen on
   `merge/newsroom-mainline-v2` with ~436 modified files, mid-merge, and that branch does NOT
   contain the committed creator work. The safe source of truth is
   `codex/swanguard-newsroom-recovery-20260801` @ `7a4cff6` (pushed). **Do not checkout,
   stash, or reset without asking Sean** — you would discard someone else's merge. Read
   committed files with `git show 7a4cff6:<path>` instead.
2. **Run `npm test`** — the repo's own aggregate, not a curated subset. Expect exactly one
   pre-existing failure (`civicOfficialSourcesRoutes.test.ts`, officialConnector lane, not
   ours). A different result is information, not an error.
3. **Snapshot before editing** if the tree is still dirty.

## The one thing that matters most

The database has **zero creators**. Sean's 51 follows live only in `config/owner-seed.json`,
which only the frontend's in-memory service reads. There is no importer. So backend mode —
the mode that persists toggles — shows an empty list, and every correct, proven, well-tested
thing downstream produces nothing because the pipeline starts from an empty set.

**Build F0 first: import the seed into the `creator` table, every row born disabled.** Reuse
the existing `creatorsFromSeed()` mapping rather than writing a second one. Make it
idempotent. Do not point backend mode at the JSON — that rebuilds the in-memory problem the
durable catalog existed to solve.

Then, in order: **F2b** (a trigger for the fetcher, which works but nothing calls) → **F3**
(`GET /api/feed`, which finally makes CM3's caps and filters do something) → **F4** (the home
surface, LAST — until the data exists it could only be a mock). **N1** is the separate news
lane: schema is applied but `outlets` and `news_rss_sources` are empty and no connector has
ever been owner-enabled.

## How Sean expects you to work

- **Proof, not assertion.** Never say done/fixed/passing without current-session evidence in
  the same message. Mutation-test any assertion guarding an invariant.
- **Hostile-review until it runs dry, then one confirming round.** Each round from a new
  vantage — re-reading code is not a round. End with the round ledger.
- **Plain-English summary first, technical second.**
- **Say what you did NOT do.** A named gap beats a smooth omission.
- **Never `git add -A`** — other agents share this tree. Stage explicit paths.
- **Never restate a credential** in a doc, commit, or chat. Check presence and length, never
  the value.
- The laws in §3 of the handoff are not negotiable without Sean, especially: every creator is
  born disabled, and the actor passed to the database comes from the session, never the
  request body.

## Traps that have already cost time

Doubles prove your branching, not the world — run the live path. A silently-skipped live test
looks exactly like a pass. Tests do not type-check; run the build too. A denylist protects
only the fields you thought of. When one contract has two implementations, the weaker one is
usually the default. And validate your own instrument before believing what it tells you —
that produced three false findings in a single session.

Start by reading the handoff, then tell Sean your plan for F0 before you build it.
