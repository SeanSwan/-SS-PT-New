---
originating_model: claude-opus-5
co_reviewers: none (no external or paid model consulted this turn)
captured: 2026-08-13
surface: mission QA Playwright harness — suppression registry + route-manifest drift gate
boards: SWA-157 (advanced, not closed — two comments posted)
status: shipped (72e07364d, 3c8a038c4, ec4090e6e on claude/qa-harness-slice0-20260811 — committed, not pushed)
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: swept the allowlist duplication (found 28 where the handoff said 3), built the route
      manifest parser and bidirectional drift gate, discovered 45 never-crawled live routes,
      then hostile-reviewed its own gate and found two defects in it
    cost: subscription (flat rate)
skills_touched:
  - id: project_linear_mcp_api_key_auth (memory)
    change: amended
    motivating_failure: the same wrong probe for the Linear API key, ~10 times across sessions.
      Two independent traps (Windows-user env var invisible to Git Bash; CLI absent from stale
      worktrees) and every previous attempt checked only one, producing a confident false
      "board is blocked". The memory now carries the single command correct on both axes.
  - id: rule-20 / rule-54 (sibling sweep)
    change: reinforced — and partially held this time
    motivating_failure: edited before sweeping AGAIN in slice 1 (already written up last session).
      Applying sweep-first in slice 2 is what turned "3 allowlists" into the true 28.
  - id: none created
    change: n/a
    motivating_failure: existing doctrine covered every failure; the gap was ordering and probe
      discipline, not missing doctrine.
---

# Coverage that cannot fail, and probes that lie

Durable lessons from discovering that a production audit reporting 100% coverage had never
visited 45 live routes — including the money path — and from getting the same environment probe
wrong for the tenth time. Privacy: IDs and roles only.

---

## 1. Coverage measured against a hand-written list is a tautology

The crawl reported coverage as `visited / total`, where `total` was the length of a hand-typed
route table. Every run said 100%. The table omitted 45 live dashboard routes, among them the
trainer commission ledger, admin trainer-payouts, session allocation, client-trainer assignments,
trainer permissions, and the owner support inbox.

Nothing was broken. Nothing failed. **The crawl cannot miss a route it has never heard of**, and
the denominator it graded itself against was the same list that was wrong.

**Rule: a coverage number is only meaningful when the denominator is derived from the system under
test, not from the test's own configuration. If the same artifact supplies both what-we-checked and
what-there-was-to-check, the metric measures nothing and reports success.**

This generalises well beyond crawls: any allowlist, route table, fixture set, or enumeration that
a test both consumes and grades itself against has this shape.

---

## 2. A gate with a hole reports green over the hole

The first version of the drift gate covered three of the four crawl roles. It looked complete and
passed. The fourth role (`user`) was skipped because its entries are *tab values* rather than
routes, so it was absent from the config the parser read.

That hole was exactly where an unaudited shipped feature was sitting — `/user-dashboard/groups`.

**Rule: after building a gate, enumerate what it does NOT cover, explicitly, before trusting it.
The output of a partial gate is indistinguishable from the output of a complete one — both say
"pass" — so the coverage of the gate itself has to be asserted, not assumed.** The fix here was a
test that names the role and fails if its route source cannot be parsed.

---

## 3. A budget constant disconnected from the work goes wrong silently

The crawl's per-role timeout was a flat 600s. Correct at 28 routes. After the drift gate added 38
more, admin reached 61 routes and the same 600s would have expired partway through — and because
the report is crash-durable, it would have honestly reported a partial run forever. An audit that
can never pass, for no product reason.

There is no signal at the moment such a constant becomes wrong. It was right, then it was wrong,
and nothing changed in the constant.

**Rule: budgets (timeouts, retries, page sizes, batch limits) must be derived from the size of the
work whenever the work can grow. A literal is only safe where the workload is fixed by
construction.** Keep the explicit override so a human can still pin it.

---

## 4. Suppression expiry only counts where it is the ONLY path

A registry existed so that tolerating a defect expires on a date. Twenty-eight other gates carried
permanent hardcoded copies of the same patterns. On the expiry date the registry would have failed
the build while all 28 kept silently swallowing the identical message.

The handoff documenting this said there were **three**. The count was off by an order of magnitude
because nobody had swept; they had listed the ones they remembered.

**Rule: a deadline enforced in one place and bypassed in N others is not a deadline. When you find
a policy implemented as a copied predicate, the count in the documentation is a lower bound — grep
for the real number before believing it.**

---

## 5. A false negative from a wrong probe is worse than no probe

I reported "Linear board sync BLOCKED — API key unset". The key was set the whole time. The probe
was wrong on two independent axes simultaneously:

- **Wrong shell.** The key is a *Windows user* environment variable. Git Bash launched before it
  was set does not inherit it, and it is not in `.env`. Both `echo $VAR` and
  `grep '^VAR=' .env` report absent while the key is fine.
- **Wrong worktree.** The CLI that uses it landed on `main` recently; a stale worktree returns
  MODULE_NOT_FOUND, which reads as "the tool doesn't exist" rather than "this tree is old".

Each check alone produces a confident, wrong, actionable-looking conclusion. This has now happened
roughly ten times across sessions — the operator had to correct it directly.

**Rule: before reporting that something is missing, broken, or unavailable, validate the
instrument. A negative result from an unvalidated probe is a hypothesis, not a finding — and it is
the most expensive kind of wrong, because it reads as diligence.** Where a probe has two
independent failure axes, the durable fix is one command that is correct on both, written down —
not a resolution to be more careful.

---

## Who did what

- **claude-opus-5 (me)** — all of it. Swept the duplication and found 28 where the handoff claimed
  3; built the manifest parser (parsing rather than importing, because the canonical routes module
  eagerly imports every dashboard page component); built the bidirectional drift gate that surfaced
  the 45 never-crawled routes; then hostile-reviewed my own gate across four vantages and found the
  timeout defect and the ungated role.
- **No external model was consulted.** Nothing here is second-hand; every claim was executed.
- **The operator caught what I did not** — the wrong Linear probe, called out directly after ~10
  repetitions. That correction is the highest-value input this turn received.

## Skills created or changed

No new skill. The governing doctrine (sibling sweep, validate-the-instrument, proof-before-done)
already covered every failure this turn; what failed was **ordering and probe discipline**. The
honest artifact is therefore an amended memory carrying one command that is correct on both failure
axes, not a new skill file. A skill written to restate doctrine that already exists is how a
skill library becomes cargo-cult.

## Mistakes I made

- **Wrong Linear probe, ~10th occurrence, operator-corrected.** Checked one failure axis at a time
  and reported BLOCKED off a false negative. Fixed durably in the memory file.
- **Edited before sweeping — a repeat of a mistake I wrote up last session.** Slice 1 changed the
  first file, then swept. Slice 2 swept first and found 28 instead of 3, which is exactly the
  difference the discipline buys.
- **Corrupted 15 files by splicing text between `\r` and `\n`.** Mixed line endings, 3,372 lines
  rewritten, tests still green. Caught only by inspecting `git diff --numstat`.
- **Used `__filename` in an ESM spec** and **imported a spec from a spec** — two self-inflicted
  test failures, both caught by running rather than by reading.
- **Reported "the site is fine" scope correctly, but nearly shipped a gate that would have made the
  audit permanently red** (the timeout) — caught in hostile round 1, not during construction.

## Error → fix → repeat ledger

| Error class | Times this turn | Previously written up? | What finally stopped it |
|---|---|---|---|
| Wrong probe → confident false negative | 1 (plus ~9 prior sessions) | Partially — memory named the env var but not the two-axis trap | One command correct on BOTH axes, written into memory; "validate the instrument" as a precondition for any absence claim |
| Edited before sweeping | 1 (slice 1) | **Yes — last session's packet, rules 20/54** | Sweep-first applied in slice 2; the payoff was visible (3 → 28), which is the argument that makes the habit stick |
| Text splice breaking CRLF | 1 (15 files) | No | Check `git diff --numstat` for diff *shape* before committing; a green suite does not see line endings |
| Self-inflicted test bug (`__filename`, spec→spec import) | 2 | No | Both surfaced by executing the test; no procedural change needed — running is already the discipline |
| Budget constant left behind by growing work | 1 (caught pre-ship) | No | Derive budgets from workload; hostile round 1 exists to catch consequences of one's own change |

The top two rows are the signal. Both were documented before and both recurred. The difference
between them: the sweep lesson recurred but was **self-corrected within the same turn** once the
payoff was concrete, while the probe lesson recurred **across ten sessions** until the operator
intervened — because its written form was resolutional ("check LINEAR_API_KEY") rather than
executable. The durable correction is always a command someone can run, never an instruction to
remember something.

## External-model calibration

No external or paid model was consulted this turn, so there is nothing to calibrate. Recording the
absence deliberately: the 45-route finding came from parsing the app's own source, and the two
gate defects came from self-review. Neither would have been better bought. One Kimi review is
authorised for after the remaining slices land, and its findings should be calibrated then.

---

## RECURRENCE — 2026-08-14 (appended by claude-opus-5, Fable-tier)

**This packet was written on 2026-08-13. The class it documents recurred four times on 2026-08-14,
twice by an agent that had read this file.** Recording the repeat here rather than opening a new
packet, because a second overlapping entry would dilute both — and because the repeat count is the
finding.

### The four instances

| # | Instrument | What it claimed | Truth |
|---|---|---|---|
| 1 | `git cat-file -e` on six commit SHAs | all six present → "right branch" | Dangling objects still resolve after a rebase. 5 of 6 were not ancestors of HEAD. |
| 2 | `backend/routes/*.mjs` (shell glob) | 33 route files in the authz gap | Non-recursive. Hid 34 subdirectory files incl. the entire `social/` family. True count 37. |
| 3 | Vite's documented `NODE_ENV` replacement | a dev-mode auth bypass is dead code in production | Never verified in-repo: no `define` in vite config, no build to grep. Unproven, asserted as "verified". |
| 4 | `grep -oE "[A-Za-z/]+\.mjs"` | a document's file list mismatched reality | Digit-blind; split `gamificationV1Routes.mjs` at the `1`. The document was already correct. |

### What this changes about the packet above

**The original scope is too narrow.** This packet was framed around probes that lie by returning a
*false negative* — "it's missing / it's broken" when the thing exists. Instances 2 and 4 are
different shapes of the same failure and are not covered by that framing:

- **False counts** (2) — the instrument answers a *narrower question* than the one asked, and the
  number it returns is confidently wrong rather than absent. Nothing looks like an error.
- **False positives** (4) — the instrument invents a discrepancy. The near-miss here was
  "correcting" a document that was right.

Instance 2 is the most dangerous: it would have produced a security test matrix built with the
`social/` routes — the most likely home of user-to-user IDOR — entirely absent, which would then
have reported **full coverage of its own target list**. A coverage instrument that is blind and
self-consistent is worse than one that fails.

### The correction that actually survives

Documenting this class did not prevent it. Four recurrences in ~24 hours, two of them post-read,
is proof that a written lesson is not a control. Resolutional phrasing ("be careful with tools",
"validate the instrument") failed because it names a virtue, not an action.

**Procedural replacement — executable, and the only form worth keeping:**

> Before any **count**, **absence claim**, or **presence claim** becomes load-bearing, re-derive it
> with a **second instrument of a different shape** and require the two to agree. Shell glob vs
> `git grep`. `cat-file` vs `merge-base --is-ancestor`. Documented default behavior vs grepping the
> actual build output. If the two disagree, the disagreement is the finding — investigate it before
> reporting either number.

Corollary learned from instance 3: **"the tool usually does X" is not evidence.** A safety property
taken from a framework's documented default, with no command run against this repo, must be tagged
`[LIKELY]` and converted into a required check — never reported as `[VERIFIED]`.

### Routing note

All four were caught by the *same* mechanism: re-deriving the fact a different way during a dry
loop. None were caught by recall. Weight dry-loop rounds accordingly — for any claim shaped as a
number or an absence, a round that merely re-reads the prior reasoning is worthless; only a round
that re-measures counts.
