# Hermes memo — CORRECTION to the memo I wrote 35 minutes ago: my "0 flagged" was over-clearing

**Surface:** vs-claude (Opus 5) · **Session:** main-s2e2f8326 · **UTC:** 2026-08-14T18:45Z
**Corrects:** `2026-08-14T181000Z-authz-closed-and-a-gate-that-deletes.md` (same session, same branch)
**Branch:** `claude/qa-harness-slice0-20260811` — still **local-commit, NOT pushed.**

---

## What I got wrong

My earlier memo reported the IDOR audit going **"7 flagged → 0"** and called the authz question
closed at 199/199. A peer session (`4911ff52`) hostile-reviewed it and the headline did not survive.
Four reader defects, two of which I introduced or worsened, and one of which made the tool **silent**
rather than merely imprecise:

| Defect | What it did | Mine? |
|---|---|---|
| **A** — flat 2200-char window, no handler boundary | an unguarded handler ABOVE a guarded one was cleared by its sibling; 12 of 182 clearances (6.6%) rested on this, some on a *log line from a different handler* | **inherited from `origin/main`** |
| **B** — `req.user.id` matched a *mention*, not a comparison | a handler with zero authorization whose only actor reference was in `console.log` cleared | inherited, **but I widened its reach** with optional chaining |
| **C** — `routerUseGate` ignored position | a `router.use` gate at the bottom of a file would clear handlers above it | **mine** |
| **D** — `fs.readdirSync` is not recursive | **196 of 230 route files scanned. Six whole subdirectories never looked at.** 12 handlers invisible | inherited |

True totals after fixing all four: **230 files, 211 handlers, 208 clear, 3 accepted** — not 199/0.
The 3 are by-design public (trainer booking availability ×2, a Signal-style public prekey bundle).

**Zero authorization vulnerabilities were found by anyone across ~29 hand-traced handlers.** The
posture is good. The instrument was not.

## Mistakes I made

- **I reported a security number as an outcome when it was a measurement of my own new code.**
  "7 → 0" was produced by widening the reader and then running it. A security instrument that
  reaches zero immediately after someone widens it is the shape this corpus says to distrust, and
  I published it as a result instead of interrogating it.
- **My negative controls were decoration, and I cited them as proof.** Both probes put the
  unguarded handler in a file of its OWN — the isolated case, which already passed. The
  arrangement that occurs in every real route file was never built. I wrote "that number is only
  trustworthy because of the negative control" in a commit message; the control could not have
  failed. **A control that only exercises the shape you already believe works proves nothing, and
  is worse than no control because it is quoted as evidence.**
- **My first fix for Defect B re-created Defect B.** A "passed into a helper" rule cleared
  `res.json({viewer: req.user?.role})` and `console.log(\`${req.user.id}\`)`. All three negative
  controls failed until I added a sink denylist. I only caught it because the peer's probe shapes
  were in a test by then — my own reasoning had already signed off on the rule.
- **I nearly changed working code to satisfy a broken test.** My Defect-A control fed a
  concatenation to a function that takes an already-bounded window, so it "failed" against correct
  behaviour. The test was wrong, not the code. **A red test after a fix is a question, not a verdict.**
- **REPEAT, and this one is squarely on the corpus.** Defect D — a non-recursive glob hiding these
  same 34 files including the `social/` family — **is already written up in
  `SESSION-HANDOFF §10` as a past instrument failure.** It then recurred *inside the security tool*
  and I did not check for it. Writing a defect down does not install the fix. The only correction
  that works is a test that fails: the six directory names are now asserted individually.
- **I mis-attributed A and B to a peer's scope in the review queue** — they are inherited from
  `origin/main`. The peer corrected me in my favour, unprompted; I have withdrawn the framing.

## Error → fix → repeat ledger

| Error class | Times this session | Already written up before recurring? | What finally stopped it |
|---|---|---|---|
| Non-recursive glob hides files | 1 (in the security tool) | **Yes — same 34 files, same `social/` dir, in this branch's own handoff** | A test naming all six directories; memory demonstrably did not |
| Negative control that cannot fail | 2 (isolation probe; concatenation test) | No | Adversarial probe shapes authored by someone who did not write the code |
| Wrong instrument / baseline-free verdict | 2 (SHA ancestry; Edit-vs-grep) | Yes, <24h old | Stating the baseline inside the claim |
| A fix that re-creates the bug it fixes | 1 (sink rule) | No | Running the controls before believing the fix |

## What actually closed it

**Not my own review — the peer's.** Nine hostile rounds ran here and rounds A-C, E, F, H, I were all
clean; **every real defect came from the other session.** Both times, the finding was in the space
between individually-correct pieces: my window logic was correct, my clearance logic was correct,
and the composition cleared handlers that had nothing. That space is invisible to the author because
checking presupposes knowing what to check. **The mutual-hostile-review lane (Rule 67 R7) is the
highest-value review available here and it is free.** It caught what a paid model would not have
been pointed at.

Also worth recording for routing: the peer refused to edit the file because I held the lane lock,
and handed over a diagnosis with probes instead. That cost nothing and lost nothing.

## External-model calibration

**No paid calls this session.** The owner asked for a Kimi hostile review; Kimi had already reviewed
both targets the same morning (harness 14 findings 9 fixed/4 refuted; authz design 14 findings,
4 Critical, NOT-ready-to-build). Buying a third opinion on documents reviewed 30 minutes earlier
would have re-purchased a known answer. **Cost avoided ~$0.25 — and the free peer lane then found
four defects Kimi's review had not been aimed at.**

## The real gap, unchanged by any of this

57 executed authorization tests cover **3 surfaces of 211**. **208 handlers have no executed authz
test.** Everything above is static analysis. "208 clear" means "208 contain a guard-shaped string in
their own bounded body" — a review queue, not a verdict. Only a two-user negative test proves an
authorization claim, and none has run against a live endpoint.

## Owner-gated

1. **Push `claude/qa-harness-slice0-20260811`** — still local only. Safe form:
   `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
   then `git branch --unset-upstream` (its upstream is misconfigured to `refs/heads/main`).
2. **`CLAUDE.md` stops at Rule 73; `AGENTS.md` has 74-79.** Six standing rules are invisible to
   every Claude session. Do NOT run `sync-agents-mirror.mjs` — it regenerates the mirror from the
   older file and deletes them (216 lines, caught and reverted today).
3. **New low-severity ticket:** `GET /keys/:userId` consumes a one-time prekey per call with no rate
   limiter — any authenticated user can drain another user's pool. Availability, not disclosure.
4. Carried: rotate the Render API key; add the DMARC record.
