---
packet: the-three-recurring-failures-are-one
date_utc: 2026-08-14
originating_model: claude-opus-5
tier: fable-tier
surface: security / QA doctrine / corpus synthesis
supersedes: none
extends: 20260813-coverage-that-cannot-fail-and-probes-that-lie.md
models_used:
  - model: claude-opus-5
    role: author, corpus miner, authz tracer, dry-loop reviewer
    did: mined 783 memos + 21 packets for recurring classes; ran and interpreted the standing IDOR
         audit; traced 4 of 7 flagged handlers to their guards; disproved 2 escalated hypotheses by
         code-read; wrote and then had rejected a cross-role authz matrix design
    cost: subscription, $0 marginal
  - model: moonshotai/kimi-k3
    role: external hostile reviewer (design)
    did: 14 findings, 4 Critical; killed the matrix design by finding a contradiction between two
         individually-correct sections; 2 findings disproven on verification
    cost: $0.2495
  - model: tencent/hy3
    role: external hostile reviewer (design) — FAILED
    did: consumed 60k tokens on internal reasoning, emitted zero visible text, produced no artifact
    cost: ~$0.03
  - model: codex
    role: parallel independent auditor (separate worktree, dashboard/workout lane)
    did: independently surfaced the same failure class — a planner test reading source instead of
         behavior, a skipped security test, suites reporting empty-as-pass
    cost: n/a (separate session)
skills_touched:
  - id: rule-71 (model/effort routing)
    change: reinforced
    failure: --effort high set reflexively on two external calls; HY3 then burned its entire token
             ceiling on reasoning and returned nothing. The rule was in context and was not applied.
  - id: rule-30 (subagent/external output is a hypothesis)
    change: reinforced
    failure: 2 of 14 external findings were wrong; both would have caused real edits had they been
             accepted on authority
  - id: hermes-learning-packet
    change: amended sibling packet rather than duplicating
    failure: the sibling's scope was too narrow — it framed the class as false negatives only
---

# The three recurring failures are one failure

## The finding

Mined the whole Hermes corpus — **783 memos + 21 learning packets**, ~a month of Claude, Codex and
Qwen work — for what actually recurs. Measured with `grep -rlia`, not recalled:

| Class | Files | Share |
|---|---|---|
| stale state (branch/doc/session behind reality) | 241 | 31% |
| fake-green / tests that lie | 204 | 26% |
| schema drift | 200 | 26% |
| unverified claims treated as fact | 127 | 16% |
| wrong instrument / tool lied | 101 | 13% |
| not-mounted / dormant / orphan surfaces | 91 | 12% |
| IDOR / authz | 90 | 12% |
| silently skipped tests | 67 | 9% |

**The top three are not three problems. They are one problem wearing three coats.**

- A **stale branch** reports "the code is X" while the code is Y.
- A **fake-green test** reports "the behavior is correct" while asserting nothing.
- **Schema drift** reports "the column is `trainer_id`" while the database has `trainerId`.

Every one is **a source of truth that reports success while describing a world that does not
exist.** They cluster at 26-31% each not because three separate disciplines are weak, but because
one discipline is: *we do not verify our verifiers.*

That accounts for **83% of the corpus by tagged class**, and it explains the next two rows too
(unverified-claims-as-fact, wrong-instrument) — those are the same failure caught one step earlier.

## Why this reframes hostile review

The standing hostile-review question is "is the code wrong." Against this failure class that
question is **structurally unable to help**, because the evidence you would use to answer it is the
thing that is broken. A reviewer asking "is the code wrong" against a fake-green suite gets told
"no," correctly, by an instrument that never looked.

**The replacement question: "what would this gate look like if it were blind?"**

If a blind gate and a passing gate are indistinguishable in the output, the gate proves nothing —
regardless of how green it is. Concretely, for any green result, ask:

- Would this pass if the fixture were **empty**? (empty-suite-as-pass — Codex found this live)
- Would this pass if auth **never attached**? (all-401-as-all-green — Kimi found this in my design)
- Would this pass if the file it reads **did not exist**? (source-reading tests — Codex found this)
- Would this pass if the branch were **1900 commits stale**? (it would, silently)
- Does it have a **positive control** — a case that must FAIL, proving the gate can fail at all?

A gate with no failing case is a decoration.

## Live corroboration — five instrument failures in one session

Not theory. All five in a single working day, by an agent that had already read the packet
documenting the class:

1. `git cat-file -e` returned success for six commit SHAs after a rebase — dangling objects still
   resolve. Five were not ancestors of HEAD. The check "passed" on orphaned history.
2. `backend/routes/*.mjs` (shell glob, non-recursive) hid **34 route files**, including the entire
   `social/` family. Reported 33 targets; truth was 37.
3. A safety property ("this dev bypass is eliminated in production") asserted from Vite's documented
   default `NODE_ENV` replacement, with no `define` in the repo's vite config and no build to grep.
4. `grep -oE "[A-Za-z/]+\.mjs"` — digit-blind — split `gamificationV1Routes.mjs` at the `1` and
   invented a mismatch in a document that was already correct. **A false positive.**
5. The repo's standing IDOR audit script flagged 7 handlers as unguarded; **4 were guarded** via
   `router.use()` or multi-level controller delegation the script cannot follow.

And independently, in a parallel Codex session on the same repo, same class: a planner test reading
source instead of behavior, a skipped security test, backend suites reporting empty-as-pass.

**Two agents, separate worktrees, no coordination, same disease.**

## The operational rule

Resolutional phrasing has failed repeatedly — "be careful with tools" and "validate the instrument"
are virtues, not actions, and the class recurred anyway. The procedural form:

> Before any **count**, **absence claim**, or **presence claim** becomes load-bearing, re-derive it
> with a **second instrument of a different shape** and require the two to agree. Shell glob vs
> `git grep`. `cat-file` vs `merge-base --is-ancestor`. Documented default behavior vs grepping the
> built artifact. **If the two disagree, the disagreement is the finding** — investigate it before
> reporting either number.

Corollary: **"the tool usually does X" is not evidence.** A property taken from a framework's
documented default, with no command run against this repo, is `[LIKELY]` and must convert into a
required check — never `[VERIFIED]`.

Corollary two: **a tool that cries wolf gets ignored.** The IDOR script false-positived on 4 of 7.
Fixing an instrument's precision is not polish; it is what keeps its true positives believed.

## Who did what

- **claude-opus-5 (me)** — mined the corpus, ran the standing IDOR audit, traced 4 of 7 flags to
  their guards, disproved 2 hypotheses I had wrongly escalated to the owner, wrote the matrix design
  that Kimi then killed.
- **Kimi K3** — found the defect my own four-round dry loop **structurally could not**: a
  contradiction between two individually-correct sections (rows elevated to P0, fixtures specified
  that cannot express those rows). Every fact I checked was right; the defect was in the space
  between facts. **This is the empirical case for external review** — not more eyes on the same
  facts, but a reader reasoning about the whole.
- **HY3** — nothing. Reasoning consumed the ceiling.
- **Codex** — parallel confirmation of the same class from an independent lane.

## Skills created or changed

None created. Amended `20260813-coverage-that-cannot-fail-and-probes-that-lie.md`: its framing
covered false *negatives* only, and two of this session's five instances were a false **count**
(silently narrower scope) and a false **positive** (invented discrepancy). Chose amendment over a
new overlapping packet; this packet extends it with the corpus-wide synthesis, which is genuinely
new and not a restatement.

## Mistakes I made

- **Designed a solution without checking whether one existed.** Spent a session designing a
  cross-role authz matrix. The repo already had `backend/scripts/audit-idor-surface.mjs` (added
  2026-08-04 under SWA-134 item 4 — *the same gap*), six security test files, and a shared
  `ensureScopedClientAccess` helper across ~15 route files. One command answered the question better
  than the design would have. **The most expensive error of the session, and the same class as all
  the others: I did not validate my belief that the gap was uncovered.**
- **Escalated two questions to the owner that the codebase answers.** "Can trainers self-assign?"
  and "is the `user`→`client` alias a paywall hole?" Both answerable by reading code in five
  minutes; both turned out to be non-issues. Asking a human what a `grep` answers is a rule
  violation and it wastes the scarcest resource in the loop.
- **Asserted a production safety property from framework defaults**, tagged `[VERIFIED]`, with no
  command run. Caught in my own round 1 and downgraded.
- **Non-recursive glob, digit-blind regex** — two instrument defects in my own verification passes,
  one producing a false count and one a false positive.
- **Set `--effort high` on both paid calls reflexively**, against Rule 71 which was in context. HY3
  burned its whole budget and returned nothing.
- **Voiced an objection before checking it.** Told the owner his branch might be dangerously stale,
  from a session-start figure that described a *different* branch. I did verify before acting — but
  I spoke first, and on a launch decision that costs trust.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| Trusted an instrument's scope without validating it | **5** | **YES** — the sibling packet, and a prior session's own SHA write-up hours earlier | Nothing yet. Each was caught by re-deriving with a *different* instrument, never by recall. |
| Built/designed without checking for existing tooling | **1** (but the costliest) | Not previously written up as its own class | Reading the import list of a helper I was inspecting for another reason — i.e. **luck** |
| Asked the owner what the repo answers | **2** | YES (Rule 49, grill-me discipline) | Self-caught, one turn late |

**The repeat count is the signal.** Five recurrences of a documented class, by a model that had read
the documentation, is proof that documenting a lesson does not install it. Only a procedure that
*runs* — a second differently-shaped instrument, required to agree — has any chance.

## External-model calibration

| Model | Effort | Result | Cost |
|---|---|---|---|
| Kimi K3 | high | 14 findings, 4 Critical. 12 survived verification (10 solid + 2 explicitly conditional), 2 disproven. Found the one defect self-review could not. **Worth it.** | $0.2495 |
| HY3 | high | Zero output. Reasoning consumed the 60k ceiling before any visible text. | ~$0.03 |

**Routing rule:** on a long adversarial document with a multi-part remit, `--effort high` is not a
quality dial — it is a gamble against `max_tokens` on reasoning-heavy models. Kimi absorbed it
(15.8k output tokens); HY3 did not. Route HY3 low or send the work to Kimi. Codex independently lost
a Kimi call the same day to a Windows `EPERM` on save with no recoverable generation ID — **budget
for external calls returning nothing, and never let a silent failure read as a clean pass.**

**Where external review earns its money:** not more eyes on the same facts. A dry loop verifies
facts and will keep returning clean while a design contradicts itself between two correct sections.
That gap is invisible from inside, because checking presupposes knowing what to check.
