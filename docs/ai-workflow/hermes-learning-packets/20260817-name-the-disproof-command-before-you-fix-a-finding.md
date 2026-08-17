---
title: Name the disproof command before you fix a review finding
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, hostile rounds to dry (5 rounds — verification pass, apply pass, live re-export, CLI regression sweep, post-rebase retest)
date: 2026-08-17
decision: A review finding is a hypothesis until you have run the one command that would prove it FALSE. If you cannot name that command, you do not understand the finding well enough to act on it.
status: shipped
supersedes: none
privacy: repo-relative paths, model ids, table names and counts only. No client PII, no credentials, no absolute paths, no connection strings.
models_used:
  - model: claude-opus-5
    role: builder, packet author, verifier, final decider
    did: built the system-graph tooling; wrote the hostile packet against its own work; verified all 18 returned findings; applied 15, refuted 3, deferred 2; built the table classifier
    cost: subscription
  - model: z-ai/glm-5.2
    role: external hostile reviewer
    did: returned 18 findings + VERDICT REVISE on a 31 KB self-contained packet; caught a directed-graph defect that had already been published as fact in two documents
    cost: OpenRouter, one call, 8147 prompt / 9192 completion tokens
skills_touched:
  - name: rule-30 (subagent/external output is a hypothesis)
    change: extended with a concrete instrument
    why: the rule says treat external findings as hypotheses but names no test. "Write the disproof command first" is the missing procedure — it is what separated the 15 real findings from the 3 false ones.
  - name: hermes-learning-packet (this corpus)
    change: exercised
    why: the campaign's ephemeral memos carried this lesson; without a durable packet it would have died with the session.
---

# Name the disproof command before you fix a review finding

An external model reviewed three days of schema work and returned 18 findings with a
verdict of REVISE. **Three were wrong.** Not sloppy — *plausible*. Each was written
with the same confident structure as the fifteen real ones: a file reference, a
failure scenario, a "why I'm sure," and a fix.

What separated them was not judgement. It was that each false finding could be
destroyed by exactly one command.

| Finding | Disproof command | Result |
|---|---|---|
| "the missing-table predicate is too broad; a dropped COLUMN gets swallowed" | read the predicate's source | it gates on SQLSTATE `42P01` first; the regex is relation-specific; `42703` never matched |
| "you should have queried the page-views table before deleting those endpoints" | read the model's columns | it stores frontend page strings and geo/IP — visitor analytics, never an API access log |
| "no smoke test covers that import" | grep the contract test | it has imported the route module since a commit three days earlier |

Three commands. Under a minute. Had I skipped them and "fixed" all 18, I would have
narrowed a predicate that was already correct, built a deletion gate on a table that
never held the data, and written a duplicate of an existing test — a day of work that
made the codebase worse while feeling productive.

## The procedure

For each finding, **before** touching code, write the single command whose output
would prove the finding FALSE. Then run it.

- If you cannot name that command, you do not understand the finding well enough to
  act on it. Ask, or go read the thing it is about.
- If the command refutes it, record **REFUTED** with the output. Do not fix it. Do not
  quietly half-fix it to be safe — a defensive change against a non-existent defect is
  still unexplained code someone will trip over later.
- If it confirms, you now own evidence, and the fix has a test to be written against.

The asymmetry is the whole point: confirming a finding is expensive (you must fix it),
refuting one is cheap (one read). Run the cheap operation first.

## The corollary that cost more

GLM's best finding was that the graph tool's `path` command walked an **undirected**
edge set. Asked "how does Users connect to workout_logs," it answered with a route
that is only traversable in reverse — the real direction being
`workout_logs → workout_sessions → Users`.

**I had already published that false answer** in a handoff document and in a memo. I
never checked it, because the output came from a tool I wrote and looked authoritative.

Tool output is evidence only after you know what the tool computes. A tool that answers
confidently in the wrong direction is worse than no tool, because it launders a guess
into a citation. The fix was to make direction explicit in the output — each hop now
names the constraint behind it, and an undirected fallback is *labelled as such* rather
than silently rendered like a real path.

## Reviewer quality is bounded by packet quality, not by model

Across this campaign the same pattern held three times:

- The first packet asked the reviewer to "run these commands yourself." A hosted model
  cannot. It reviewed the *description* of the evidence.
- An earlier reviewer produced several confident findings that were false because the
  packet omitted state — it reported a backup as "absent" that had restore-tested three
  times, and a tool "never run against production" after four runs.
- The packet that produced 15/18 real findings included full source, real command
  outputs, one remit, and an explicit list of the author's own weakest claims.

Naming your weakest claims does not make the reviewer lazy — it makes it go *past*
them. All five of mine were named in that packet; GLM engaged every one and then found
better defects elsewhere.

## Who did what

- **claude-opus-5** (me): built the graph tooling, then wrote a packet designed to get
  it attacked rather than admired. Found a hardcoded machine-specific path in my own
  exporter before sending it. Verified all 18 findings, applied 15, refuted 3, deferred
  2 with reasons. Built the classifier that turned the campaign's counts into
  classifications.
- **z-ai/glm-5.2**: the external hostile reviewer. Caught the directed-path defect,
  the invisible-staleness defect (a warning on stderr that no stdout-capturing agent
  ever saw), the unbounded `COUNT(*)` load against a production primary, and — most
  usefully — that "62% of tables are empty" and "41 disconnected components" were
  *counts dressed as findings*. It was also wrong three times and proposed one piece of
  invalid SQL (a `FROM` table name cannot be parameterized).
- **GLM-5.3 does not exist** on the dispatch route available here: 414 models in the
  catalog, the family topping out at 5.2. Repo documents reference a 5.3 that is not
  wired. I ran 5.2 and labelled the output 5.2 rather than let a false model
  attribution into the record.

## Skills created or changed

- **`classify-tables.mjs`** (new). Turns counts into classes. 158 empty tables became
  37 unmodelled / 70 modelled-called / 51 modelled-uncalled; 41 detached components
  became 11 drift-suspect / 26 truly-isolated / 16 app-ref. Built because GLM was right
  that a count nobody can act on is not a finding. **It corrected my own alarm**: I had
  framed 41 disconnected components as a problem; only 11 warrant investigation.
  Motivating failure: a Sequelize association declared with `constraints: false` emits
  no database FK, so absence of an FK is weak evidence of drift on its own.
- **`rule-72` compliance claim: retracted.** I had asserted the tool did not violate
  the no-knowledge-graph rule. GLM called it motivated reasoning and I could not refute
  it. The doc now states the tension and puts three outcomes to the owner. Motivating
  failure: I had flagged that claim as my own weakest in the packet — meaning I knew —
  and shipped it anyway instead of escalating a decision that was not mine to make.
- **Six-test precision pin** on the missing-table predicate. The finding was refuted,
  but the *suggestion* was kept as a regression pin so a future loosening fails loudly.
  Refuted ≠ worthless.

## Mistakes I made

- **Published a false structural claim.** "path Users workout_logs → 2 hops" went into
  a handoff and a memo. My own tool computed it and I never asked what it computed.
- **Asserted a compliance claim I had privately flagged as my weakest.** Knowing a
  claim is weak and shipping it anyway is worse than not noticing.
- **Committed an absolute path containing a username** in the exporter two days
  earlier, making it unrunnable on any other machine or CI runner. Caught only when I
  hostile-checked my own code before handing it to a reviewer — one grep that belonged
  at the original commit.
- **Called the exporter "read-only and therefore safe."** True about writes; silent
  about portability, load, and SSL verification — which is where all three real defects
  were. A safety property proven on one axis says nothing about the others.
- **Hit the bash→node path trap three times in one session** — a `/c/tmp/x` path
  becomes `C:\c\tmp\x` inside node. I wrote it into a handoff's "traps that cost me
  twice" section and hit it again two hours later.
- **Two of three scripted edits silently no-op'd** because I wrote the anchors from
  memory instead of reading the file first.
- **Wrote "I suspect" into a review packet** for a defect that one command settled.
  Suspicion in a packet spends the reviewer's budget on work the author should have
  done.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| bash path passed into `node -e` / `node -` | **3** | **Yes — by me, in the handoff, hours before recurring** | Nothing yet. Procedural fix adopted: never pass a `/c/`-style path across the bash→node boundary; always `C:/`. The write-up did not work because it was resolutional ("watch for this"), not procedural. |
| Scripted multi-edit silently applies nothing | 2 | Yes, in the same handoff | Grepping for a token that can only exist if the edit applied. This one **works** — it caught both. Keep it. |
| ESM resolves from file dir, not cwd | 2 (earlier turn) | Learned mid-turn, repeated minutes later | Put the script where the package is installed. |
| Trusting own tool's output without knowing what it computes | 1, but **published twice** | No | Direction is now explicit in the output itself, so the tool can no longer imply a claim it cannot support. Structural, not vigilance-based. |
| Shipping a claim already flagged as weak | 1 | No | Escalate to the owner instead of asserting. A claim you have to defend to yourself belongs in a decision, not a doc. |

The top row is the important one: **a lesson I wrote down and then repeated within the
same session.** That is proof the write-up was not a fix. The correction that survives
is procedural ("always use `C:/` across that boundary"), never resolutional ("be more
careful with paths").

## External-model calibration

| Model | Findings | Real | Cost | Notes |
|---|---|---|---|---|
| z-ai/glm-5.2 | 18 | 15 | 1 call, ~8.1k in / 9.2k out | Best structural catch of the campaign. Strong on "your count is not a finding." One invalid SQL fix. Three plausible-but-false findings, all refutable by one command each. |
| moonshotai/kimi-k3 | 7 | 7 | 1 call | High precision on a narrow, well-specified slice. |
| tencent/hy3 | ~6 | ~3 | 1 call | Accuracy tracked packet completeness, not model quality — its false findings were all packet omissions. |

Routing lesson: for a broad hostile review of shipped code, a complete self-contained
packet matters more than which frontier model receives it. One remit per reviewer;
never a dual-remit packet, which makes a single model role-play both seats and produces
correlated findings.
