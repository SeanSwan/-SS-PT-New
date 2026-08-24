---
decision: Hand Hermes a standing work order to review the accumulated learning corpus and produce a per-model weakness profile of every AI seat SwanStudios uses
status: open
supersedes: none
originating_model: claude-opus-5
owner: Hermes (executor) · Sean (approver)
created: 2026-08-23
---

# Work Order — Hermes AI Review: the weakest link in every AI seat we use

## 1. What Sean asked for

Sean's request, 2026-08-23: hand Hermes a handoff so Hermes runs the AI review over the
reports that have been flowing to it — the learning packets and the inbox memos — and
comes back with **the weakest links of all the AIs we have been using**.

This is a **read-and-judge** job, not a build job. Nothing in this work order writes code,
changes a gate, or spends money. The deliverable is one analysis document.

## 2. Why Hermes and not a terminal agent

The corpus was written *to* Hermes. Every packet and memo was authored by an agent
reporting on its own session — which means every author is a **participant** in the thing
being measured. An agent reviewing its own error ledger grades its own homework.

Hermes is the only seat that (a) holds the whole corpus as its standing input rather than
as a file it must go find, and (b) did not author it. That independence is the point of the
assignment.

Evidence for (b): all 120 packets carry `originating_model:` of `claude-opus-5` or
`claude-fable-5` — `[VERIFIED]`, no Hermes-authored packet exists. Of the 455 pending memos,
285 carry a parseable `**Agent:**` field and none names Hermes; the remaining 170 use
inconsistent formatting and were not individually checked, so "Hermes authored none of the
memos" is `[LIKELY]`, not `[VERIFIED]`. If Hermes finds a memo it wrote, it must exclude
that memo from its own assessment and say so.

## 3. Verified inventory — what Hermes is reviewing

Counted 2026-08-23 on branch `wip/comms-notifications-2026-07-05`. All numbers are
`[VERIFIED]` by direct command, not estimated.

| Source | Path | Count |
|---|---|---|
| Durable learning packets | `docs/ai-workflow/hermes-learning-packets/` | **120** `.md` |
| Inbox memos — pending (undrained) | `.ai-workflow/hermes-inbox/pending/` | **455** |
| Inbox memos — consumed/archived | `.ai-workflow/hermes-inbox/consumed/` | **693** |
| **Total documents in scope** | | **1,268** |

Packet date range: `2026-07-11` → `2026-08-23`.

### Section coverage inside the 120 packets

| Required section | Packets carrying it |
|---|---|
| `## Who did what` | 97 |
| `## Mistakes I made` | 101 |
| `## Error → fix → repeat ledger` | 98 |
| `## External-model calibration` | 100 |
| `## Skills created or changed` | 93 |
| `models_used:` frontmatter | 103 |
| `skills_touched:` frontmatter | 103 |

Pending memos: 452 of 455 carry `## Mistakes I made`; 321 carry `## External-model calibration`.

### Seats that appear in the corpus, by frequency in `models_used:` blocks

`claude-opus-5` 86 · `glm-5.3` 66 · `kimi-k3` 58 · `claude-fable-5` 27 · `deepseek` 26 ·
`grok-4.6` 22 · `hy3` 21 · `sol` 17 · `qwen3.8` 15 · `ox-alpha` 13 · `codex` 9 ·
`gemini-3.1` 7 · `claude-haiku-4` 1.

Name normalisation is required before counting — the same seat appears as `kimi-k3`,
`kimi`, and `kimi.`; as `glm-5.3`, `glm-5.2`, and `glm`; as `qwen3.8`, `qwen-3.8`, `qwen3`,
and `qwen`. Treat the trailing-punctuation and version-suffix variants as one seat, and say
so in the output rather than silently merging.

## 4. Hard constraint discovered while scoping this — read, do not parse

Only **6 of ~100** `## External-model calibration` sections use a markdown table. Those six
tables use **six different column schemas**:

| Packet | Header row |
|---|---|
| `2026-08-21-a-number-survives-by-being-repeated` | Seat / Cost-wall / Findings real vs disproven / Worth it? |
| `2026-08-21-you-cannot-observe-your-own-effect` | Seat / Cost / Real on verification / Keep? |
| `20260818-a-determinism-test-that-never-asserts-difference` | Seat / Findings real / Findings refuted / Cost / Worth |
| `20260821-a-clean-tree-makes-stash-pop-a-loaded-gun` | Seat / Real findings / False positives / Notable |
| `20260821-the-approval-instrument-must-match-the-medium` | Seat / Cost / Wall / Findings real on verification / Worth |
| `20260822-a-git-deletion-is-not-a-retraction` | Seat / Real / Disproven-misread / Unique / Cost |

**Column 2 is a dollar amount in three of them and a finding-count in three others.** Any
script that reads "column 2" across the corpus will average money against counts and
produce a confident, meaningless number.

**Therefore: this review is read-and-judge, not extract-and-tabulate.** If Hermes builds a
parser, the parser's job is to *locate* the sections for a human-grade read, never to
compute the verdict. A weakness ranking produced by column arithmetic over this corpus is
wrong by construction and must not be emitted.

The remaining ~94 calibration sections are prose. They are the richer source — prose says
*how* a seat was wrong, which is the actual question. Tables only say how often.

## 5. The question, stated precisely

For each seat, answer four things, each with packet-file citations:

1. **Characteristic failure mode.** Not "sometimes wrong" — the *shape* of its wrongness.
   Does it hallucinate specifics? Over-rank severity? Miss the whole class? Agree too
   readily? Produce a right concern with a wrong mechanism?
2. **Where it is genuinely strong.** A weakness profile that omits strength produces a bad
   routing table. Several seats in this corpus were the only one to catch a real defect.
3. **Cost of its failure mode.** A seat that produces confident false positives costs
   verification time on every run. A seat that misses things costs only what it missed.
   These are not equally bad and must not be ranked on one axis.
4. **Trend.** The corpus spans six weeks. Is the seat's failure rate flat, improving, or
   degrading? Cite early vs late packets. A single bad run is not a weakness profile.

Then, across seats: **what is the single weakest link in the current arrangement** — which
may be a seat, or may be *how* seats are combined (panel composition, review order, who
gets the final word). Say which.

## 6. Method

**Pass 1 — normalise.** Build the seat-name alias map (§3). Record every alias collapsed.

**Pass 2 — read `## Mistakes I made` and `## Error → fix → repeat ledger` across all 120
packets.** These are self-reported, so they under-report by nature. Note that bias in the
output; do not correct for it silently.

**Pass 3 — read the ~100 `## External-model calibration` sections.** These are the
cross-seat judgements — one agent grading another. Higher evidentiary value than
self-report, and the only place a seat's false positives are recorded by someone with no
incentive to soften them.

**Pass 4 — the repeat count is the highest-signal field in the corpus.** An error class
that was written up and then recurred proves the write-up was not a fix. Rank by
*recurrence after documentation*, not by raw frequency. A frequent error that stopped after
one packet is a solved problem; a rare one that came back three times is not.

**Pass 5 — sample the 455 pending memos, do not read all of them.** They are ephemeral
working notes and heavily redundant with the packets. Take a dated stratified sample
(≈40 memos spread across the range) and stop when a new sample adds no new failure class.
Report the sample size and the point at which it ran dry.

## 7. Output contract

One document at:

```
docs/ai-workflow/AI-HANDOFF/HERMES-AI-WEAKEST-LINKS-REVIEW-<YYYY-MM-DD>.md
```

Required sections, in order:

1. **Verdict in one paragraph** — the single weakest link, named, with the reason.
2. **Per-seat profile** — one block per seat, carrying the four answers from §5 with
   file citations. Seats with fewer than 5 appearances get a profile marked
   `INSUFFICIENT EVIDENCE` rather than a thin guess.
3. **Ranked weakness table** — ordered by *cost of the failure mode*, not by error count.
   State the ordering axis explicitly.
4. **Recommended routing changes** — which seat should stop being used for which task
   class, and what should replace it. Tie each to a cited failure, never to a general
   impression.
5. **What the corpus cannot tell us** — the blind spots. Self-report bias, the six
   incompatible table schemas, seats that appear too rarely to judge, and any seat whose
   record exists only in packets *it* authored.
6. **Confidence tags** — every non-trivial claim carries `[VERIFIED]`, `[LIKELY]`,
   `[HYPOTHESIS]`, or `[UNKNOWN]` per Rule 51.

## 8. What would make this answer wrong

Named in advance so the review can be checked against them:

- **Ranking on count alone.** Seats used 86 times will out-error seats used 13 times.
  Normalise per appearance, or the ranking just measures usage.
- **Treating self-report as complete.** An agent reports the mistakes it *noticed*. The
  worst failure mode is the one its author never saw — which by definition is absent from
  `## Mistakes I made` and present only in another seat's calibration line.
- **Parsing the tables.** See §4. Six schemas, three of them costs, three of them counts.
- **Grading the corpus authors on the corpus they wrote.** `claude-opus-5` and
  `claude-fable-5` wrote every packet. Their self-assessments are structurally different
  evidence from the external seats' records, which arrive filtered through a Claude author.
  Say so; do not put them in the same column without a note.
- **Confusing a bad run with a bad seat.** Require ≥3 independent appearances before
  asserting a characteristic failure mode.

## 9. Constraints

- **No spend.** This is a read of existing files. If Hermes concludes an external seat
  should be consulted to adjudicate something, it stops and asks Sean (Rule 16).
- **No writes outside the one output document.** Do not edit packets, do not drain the
  inbox, do not archive memos, do not "fix" the six table schemas. Corpus repair is §10,
  a separate proposal, and it is Sean's call.
- **Privacy (Rules 8/44/59).** IDs and roles only. The output is committed. No client PII,
  no secrets, no absolute paths beyond the repo root.
- **Nothing is deleted** (Rule 34).

## 10. Follow-on proposal (do not execute — propose only)

The six-schema calibration table is a real corpus defect: it makes the single most valuable
field in the learning system unaggregatable. Once the review lands, propose *one* canonical
calibration schema and a validator, so future packets are born comparable. Do not
retrofit the existing 120 — a rewritten record is a damaged record. Fix forward only.

## 11. Handback

When the review document lands, Hermes drops a pointer memo in
`.ai-workflow/hermes-inbox/outbox/pending/` naming the output path and the one-paragraph
verdict, so the next terminal session sees it without reading the whole document.
