# C0.5 wrong-client write hotfix SHIPPED TO MAIN — c168f4138

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 · **On main:** `c168f4138` (deployed, /health 200 across ~5.5 min)

---

## What shipped and why it jumped the batch

A wrong-client write on a **destructive** path — `dispatchCancelSession` fed the
speech-classifier's client id into the query that decides *which session gets
cancelled*. Same class as the S0 IDOR that shipped immediately on 2026-07-23, so
Rule 70's security exception applied and it went out standalone rather than
waiting three slices deep in an unpushed branch.

**17 lines of runtime change, 322 lines of tests.** Four dispatchers converged onto
`clientScope.mjs#resolveCommandClientId`; two of the four were live defects, two
were inline copies that yielded `NaN` on a malformed id.

## Judgment call worth carrying: what ships alone vs what waits

C1 (equipment subject fix) was ready in the same branch and I deliberately **held
it**. The distinction that decided it:

- **C0.5** — 17 runtime lines, four one-line precedence changes, RED→GREEN proven,
  tiny blast radius. Ships.
- **C1** — a SQL subject change on the hot path of *every* Coach enrichment, inside
  a 2267-line file, with **no ability to execute against a real database**. Static
  proof is not sufficient for that blast radius. Waits for CI or a DB probe.

**Rule of thumb:** blast radius × verification depth decides the ship, not
"is the code correct." Both changes were correct. Only one was *verified enough
for production*.

## Cherry-pick technique that kept it clean

Cherry-picked onto a fresh worktree off `origin/main`, NOT the working branch. The
only conflict was a docs artifact created in a commit I deliberately did not pick —
dropped it, so the hotfix carried **zero docs, code and tests only**. Then
**re-ran the full proof harness on the rebased tree before pushing**: a cherry-pick
can apply cleanly and still be wrong, so clean-apply is not verification.

## Standing gap this exposed — worth fixing once, helps every deploy

**This repo exposes no release/commit marker.** `/health` returns only
`{status, timestamp, server, checks, message}`, and there is no
`RENDER_GIT_COMMIT`/`releaseSha` anywhere in routes/server/core. So after any
backend push we can prove the service is **up and not crash-looping**, but we can
**never prove the new commit is the running code**. Every backend deploy carries
this same blind spot and every closeout has to disclose it.

One `/health` field echoing `process.env.RENDER_GIT_COMMIT` would make deploy
verification real instead of inferential. Cheap, one-time, retires a recurring
disclosure.

## Open for Sean

`AI_CHAT_CLIENT_ACCESS_SOFT` — confirm unset in Render env. Fail-closed by default
(requires `=== 'true'`) and absent from committed config, so the default is safe;
just not visible from a terminal.

**Provenance:** Opus 5 (sub-Fable). Working memo only — not eligible for the durable
Fable-tier learning corpus (Rule 68).
