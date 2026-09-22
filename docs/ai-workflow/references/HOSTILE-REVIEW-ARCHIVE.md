# HOSTILE-REVIEW-ARCHIVE.md — Rule 86 protocol

**Status:** canonical · **Established:** 2026-09-19 by Sean · **Rule:** Rule 86
**Archive root:** `Z:\HostileReviews` (WSL `/mnt/z/HostileReviews`)
**Archive contract (read this one):** `Z:\HostileReviews\README.md`

> **Numbering:** this protocol is Rule **86**, not 74. `origin/main`'s canonical sequence ends
> at Rule 85 and main's Rule 74 is Proof-Before-Done; this branch's own `scripts/review-debt.mjs`
> already cites 74 as Proof-Before-Done. Rules 74–85 are absent from this branch by design, so
> the gap between Rule 73 and Rule 86 is expected, not a lost rule. **Do not renumber this rule down.**

---

## 1. The problem this solves

A hostile review that lives only in a chat transcript is not findable by the next agent.
The consequences are concrete and both have already happened:

- **The same defect gets re-found.** A later pass re-reads the same files and re-reports
  the same findings in new words. That is restatement, not review, and it burns a paid
  seat to produce nothing new.
- **A stale verdict gets read as current.** A `CLEAN` verdict from three weeks ago gets
  treated as describing the code as it is today, when the code has since changed. Nothing
  in the old review says it is stale, because nothing was recording what revision it
  described.

Before this rule, hostile reviews were written wherever the session happened to be
working: `C:\tmp\`, `.ai-workflow/reviews/`, `docs/ai-workflow/reviews/`,
`.ai-workflow/swan-viz-reviews/`, `.ai-workflow/brain-review/`, root-level
`review-roundN-packet.md` files, and Hermes inbox memos. A search for `*hostile*` across
the SS-PT repo alone returns **hundreds of files**, and none of them is *the* place to look. (The measured breakdown is in the archive `README.md` §7.)

The fix is a single archive with a fixed address and a fixed header, so that
*"has this been reviewed, what did they find, and does it still apply?"* is a query rather
than an archaeology project.

## 2. The core law

> **Every hostile-review pass leaves exactly one file in `Z:\HostileReviews`.
> A review that is not filed there did not happen.**

Filing is part of the review, not a follow-up task. File at the end of the pass, before
the completion claim that Rule 73 governs.

This applies to:

- the hostile pass Rule 73 requires before any completion claim on substantial work;
- any review Sean asks for by name;
- any review an agent runs on its own initiative (Rule 61 slice-internal passes included);
- subagent and workflow reviews — the dispatching agent files the artifact, since a
  subagent's verdict is a hypothesis until verified (Rule 30).

## 3. The filename is the lookup key

```
<YYYY-MM-DD>-<HHMMSS>-<subject-slug>.md
```

| Part | Rule |
|---|---|
| `YYYY-MM-DD` | Local date |
| `HHMMSS` | 24-hour local clock, zero-padded |
| `subject-slug` | lowercase `a-z0-9-`, hyphens not spaces, ≤ 48 chars, no trailing hyphen |

Local date first means a plain directory listing is already in chronological order, and
the slug means the subject is visible without opening anything. The **filename stem is the
`review_id`** and is the join key to `index.jsonl` — they must match, and `reindex.mjs`
fails if they do not.

If two reviews land in the same second on the same subject, append `-r2`, `-r3`.

## 4. The header is the lookup surface

Every review opens with YAML front-matter carrying exactly this key set. Full field
definitions are in the archive `README.md` §3; the schema is:

```yaml
review_id:        # filename stem
status:           # draft | published — publication is the act of setting `published`,
                  # not the file existing; a `draft` is excluded from the index
date_local:       # ISO8601 with offset
date_utc:         # ISO8601 Z
subject:          # one line
reviewer_agent:
reviewer_seat:    # harness / model — be honest; a review answered by the wrong seat
                  # is a real defect and belongs in the record
round:            # 1 for the first pass on a subject
repo:             # repo name, or n/a
repo_path:
branch:
commit:           # sha | dirty | n/a — a verdict against a dirty tree is only valid
                  # for that tree
scope:            # one line naming what is IN and what is OUT
verdict:          # CLEAN | DEFECTS-FOUND | PARTIAL | INCONCLUSIVE
defects:          # { critical: N, high: N, medium: N, low: N }
unproven:         # count of things this pass could NOT establish
supersedes:       # review_id | null
superseded_by:    # review_id | null
tags: []
```

Five of these carry rules that are easy to get wrong:

- **`status` is the publication boundary, and a draft is not a review.** `new-review.mjs`
  stamps `draft`, which is excluded from the index; publication is setting `published`. A
  draft's existence never establishes supersession — a review is retired by a **published**
  successor, never by a stamped template (Astra F02, reproduced). A file with no `status`
  key is treated as published, for everything filed before 2026-09-20.
- **Both timestamps, always.** Local for a human reading the folder, UTC so two machines
  can be ordered against each other. **Order by `date_utc`, then `review_id`** — filename
  order is not chronological order, because the stamp is local time (Astra F14).
- **`UNKNOWN` is not a verdict.** If you do not know, the verdict is `INCONCLUSIVE` and §3
  of the review says why.
- **`unproven` is not optional.** It is the count of things the pass could not establish.
  Zero unproven on a non-trivial review is a smell, not an achievement. "Unopened" is not
  "clean" (Rule 56), and absence of a grep hit is not evidence of safety.
- **`scope` states the boundary.** An unstated boundary is exactly how a `CLEAN` verdict
  gets over-read by the next agent.

Severity grades and the definition of `CLEAN` are in the archive `README.md` §3 under
`severity-policy-1` — `CLEAN` means **zero unresolved defects within this pass's declared
`scope`**, not "found nothing new".

## 5. Reviews are superseded, never corrected

- **Never edit a filed review into correctness.** If a later round changes a finding,
  write a NEW file with `supersedes: <old-review_id>`, and set `superseded_by` on the old
  one. The record of what was believed at the time is the value; a quietly corrected
  review is a fabricated history. **The one edit that is required, not forbidden:** setting `superseded_by` on the old
  review is the backward half of the same link, not a correction — it changes no finding,
  no verdict and no count, and leaving it unset makes the older review still read as
  current. `new-review.mjs --supersedes` records the forward half; `relink.mjs` writes the backward half once the successor is published,
  and `reindex.mjs` reports a link that is not reciprocal.
- **Never append a second review to an existing file.** It destroys the `review_id` join
  and makes the index a lie.
- **Never delete.** Same reason as Rule 34.

The archive is on `Z:`, outside any git repo. There is no `git log` safety net, so these
three rules are enforced by discipline rather than by tooling. Treat every file as
append-only and permanent.

## 6. Look before you review

Before starting a hostile pass:

```bash
node Z:/HostileReviews/query.mjs --subject "<subject>"
node Z:/HostileReviews/query.mjs --repo SS-PT --unproven
node Z:/HostileReviews/query.mjs --verdict CLEAN
```

If a review exists, read it. Your job is then to test **whether its findings still hold
and whether the code has changed since** — not to re-derive it from scratch. Note the
`commit` it was written against and compare.

The `--verdict CLEAN` list is the dangerous one: those are the verdicts most likely to be
stale and most likely to be trusted.

**And check that you are not looking at an empty shelf because the shelf is broken.** A review
filed with a header `reindex.mjs` cannot parse is **EXCLUDED** — it sits on disk, looks filed,
and is unreachable by *every* `query.mjs` filter. No query will ever return it, which is the
"a review nobody can find is not a review" failure this archive exists to prevent. It happened:
a review hand-written with `filed:`/`reviewer:`/`commit_under_review:` and a prose `verdict`
was stranded and unfindable for a day.

```bash
node Z:/HostileReviews/audit.mjs            # every file on disk NOT in the index, and why
node Z:/HostileReviews/audit.mjs --strict   # exit 1 if a published review is stranded
```

Read-only. It separates a **draft** (excluded by design — not a defect) from a **malformed**
review (excluded as an error — the Rule 86 failure). Run it **after any hand-edit of a filed
review**, and whenever a review you expect does not come back from `query.mjs`. Repair a
stranded review by fixing its **front-matter only** — never its findings; preserve the values
you replaced in `header_repaired_note:` (archive `README.md` §8.5).

`audit.mjs` answers *"what is missing from the index?"*; `reindex.mjs --check` answers *"is
the index current?"* — and the two are not the same question. `--check` exits `0` (current,
nothing excluded), `1` (**drift** — the index is stale, answers may be wrong), or `3` (current,
but files are excluded — answers are right about what they can see). The split exists because
a single non-zero code for both conditions left `query.mjs`'s staleness warning permanently on
whenever any file was excluded, which is how a warning gets tuned out.

## 7. Guaranteed to fire, not "maybe"

Mirroring Rule 69's structure, five layers so this does not depend on an agent remembering:

1. **This rule in boot context** — it is installed in `CLAUDE.md`, `AGENTS.md`,
   `CODEBUDDY.md` and `SOUL.md`, plus the user-level harness instruction files.
2. **A skill** — `hostile-review-archive` carries the write + query procedure.
3. **Folded into `closeout-evidence-lock` (Rule 41)** — so it recurs at every substantial
   task close, not only when someone remembers.
4. **Rule 73's gate amended** — the hostile pass it demands must cite the filed
   `review_id`. A pass with no `review_id` is not a pass.
5. **Tooling makes the right thing the easy thing** — `new-review.mjs` stamps the correct
   filename and front-matter and `--supersedes` sets both halves of a supersede link in one
   step, and `reindex.mjs` fails loudly on a malformed header and on a non-reciprocal link,
   and `audit.mjs` reports any file left out of the index, distinguishing a draft from a
   malformed review.
   **What it cannot do:** detect a supersede link that *should* exist and is declared nowhere.
   `reindex.mjs` checks the links it is given, so a review that silently replaces an earlier
   one without saying so is invisible to it and the older verdict keeps reading as current.
   That one is on the reviewer: pass `--supersedes`.

**Enforcement honesty (measured 2026-09-19):** layers 1–5 are **prose, skill, and tooling** —
none is a hook. The closeout hook that actually runs is `scripts/hooks/hermes-closeout-gate.mjs`
(wired in `.claude/settings.json`); it enforces review *debt* (rules 46/74/82) but has **no
notion of a filed `review_id`**, and `.git/hooks/` is empty. So layer 3 fires only when the
agent loads the `closeout-evidence-lock` skill. Wiring `review_id` into that existing hook is
the next step, and it is **Sean-gated** because it would newly fail closeouts for every agent.

## 8. Distinct from related rules

| Rule | What it is | How Rule 86 differs |
|---|---|---|
| **73** Proof-Before-Done | The **gate** that requires a hostile pass before any completion claim | Rule 86 is the **artifact** that pass must leave. 73 says *do the review*; 86 says *file it*. |
| **69** Hermes Inbox | The **learning channel** — ephemeral memos, drained daily, archived to `consumed/` | The archive is the **durable verdict** and is never drained. A memo may point at a review; it does not replace one. |
| **48** Phase Completion Audit Record | Per-phase permanent file artifact | Rule 48 records a *phase*; Rule 86 records a *review*. A phase may contain many reviews. |
| **61** Slice-Internal Hostile Review | The **practice** — review before reporting | Rule 86 is where that practice's output lives. |
| **56** Tier-A Baseline Disclosure | Requires disclosing what was not measured | Rule 86's `unproven` field is the durable version of the same honesty. |

## 9. Legacy locations

Nothing was migrated into the archive, deliberately: moving the whole pre-2026-09-19 corpus would break inbound
links and the vault's snapshot history. Reviews that predate 2026-09-19 live at the
locations listed in the archive `README.md` §7. If you are looking for an older review,
start there.

## 10. Why

Sean, 2026-09-19:

> *"Whenever we do a hostile review, that hostile review has to be saved in the hostile
> review folder, and it needs to be dated... the header needs to be very easy to be able
> to look up for other agents trying to find it. So that way if there were some issues or
> things change or whatever, or we had different ideas, we can always just have the agent
> just kind of just go look in this folder."*
