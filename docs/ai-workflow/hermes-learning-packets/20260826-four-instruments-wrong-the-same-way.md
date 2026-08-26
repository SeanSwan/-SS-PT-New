---
title: "Four instruments, wrong the same way: an API remembered instead of read"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-26
decision: "Shipped the asset library (9affd5347). Four separate tools I relied on were wrong in one slice — a type-check config, an icon import, a style-token set, and a grep — and every one failed the same way: I used an API from memory instead of reading the installed thing. A reviewer also found a cursor bug that silently ate whole render batches."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: instruments / verification / pagination
models_used:
  - model: claude-fable-5
    role: builder + packet author + Final Decider
    did: "Built the library; probed the open question WHILE the panel ran (last round's lesson, applied); had four of its own instruments turn out to be wrong."
    cost: subscription
  - model: glm-5.3
    role: reviewer
    did: "Best finding of the round: TIMESTAMPTZ stores microseconds, a JS Date holds milliseconds, so a truncated cursor silently skips same-millisecond rows — which is every Compose batch. Also predicted the filter-allowlist drift, which was ALREADY present."
    cost: "$0 (subscription)"
  - model: stealth/ox-alpha
    role: reviewer (standing seat)
    did: "Returned first try; consensus on the unverified query."
    cost: "$0.0000 (data-egress seat)"
  - model: qwen-3.8
    role: reviewer (free, local)
    did: "Flagged the JSONB containment risk precisely (ARRAY[...] vs JSON literal). Its zero-PII P0 was a misread of what a prompt is."
    cost: "$0 (local)"
  - model: hunyuan-3
    role: reviewer
    did: "Same containment risk, independently, as its single P0."
    cost: "not itemised; round estimate ~$0.0434 for five seats"
  - model: x-ai/grok-4.6
    role: reviewer
    did: "Framed the product criticism best: 'you have shipped the index without retrieval' — the card shows dimensions, not the image."
    cost: "not itemised; see above"
skills_touched:
  - id: instrument-provenance
    action: proposed
    motivated_by: "Four tools were wrong in one slice, all the same way: a hand-written tsconfig include, a guessed lucide export, guessed style tokens (then a token COPIED from a sibling that was also wrong), and a grep scoped to one directory. Before trusting a tool's green, check that the tool looks at the thing you changed."
  - id: panel-seat-selection
    action: confirmed
    motivated_by: "Dropped Kimi for this gate-shaped round on the calibration from two prior rounds. Five seats, ~$0.043 — a third of the six-seat cost — and the round produced the sharpest single finding of the whole loop."
---

## The lesson

**Four instruments were wrong in one slice, and every one failed the same way: I used an API from memory instead of reading the installed thing.**

- `tsconfig.atelier.json` carried a **hand-written** list of six files. My five new files were not in it, so `tsc --noEmit` exited 0 **without type-checking any of the new code** — and I nearly reported that exit code as proof.
- `Images` is not an export of the installed `lucide-react`. `Image` is. The component rendered `undefined` and every test in the file failed at once.
- The style tokens were invented from the palette's prose names (`--sw-frost-white`, `--sw-royal-depth`). The commit guard named every one.
- Fixing that, I copied `--card-dark` from a **sibling stylesheet** — which is *also* undefined; that file predates the guard, and the guard only blocks lines a commit ADDS. **Copying a token from a neighbour is not the same as checking it exists.**
- Verifying *that*, I grepped a single CSS directory and got **four false UNDEFINED results**. The guard was right; my grep was the wrong instrument.

The through-line is not carelessness about tokens or icons. It is that **a tool's green only means something if the tool is looking at the thing you changed** — and that is a separate question from whether the tool works. `tsc` worked perfectly. It was pointed at six files that were already fine.

So the check before trusting any green: *did this instrument see my change?* For a config-driven tool, read the config. For a linter, confirm the file is in scope. For a grep, confirm the pattern would find a known-present control. Three of these four would have been caught by that one question.

**The corollary about neighbours.** Three of the four failures came from copying a pattern out of nearby code — a sibling's token, a remembered icon name, an existing include list. Neighbouring code is evidence about *convention*, never about *correctness*: it can be older than the rule that now governs it. The registry, the installed package, and the guard are the authorities; the file next door is a hint.

**Second lesson — probe the open question while the panel runs.** Iteration 4's mistake was shipping the central defect as an open question and letting six reviewers spend findings confirming it. This round I ran the probe *while they reviewed*: the SQL generator emits `tags @> '["brandkit:universal"]'`, the correct JSONB form, so four seats' agreement became **confirmation instead of discovery**. Same panel cost, far more information.

**Third — the bug I could not have found by reading.** `created_at` is `TIMESTAMPTZ DEFAULT now()`: Postgres stores microseconds. A JavaScript `Date` holds milliseconds. A cursor built from a row is therefore already truncated, and `created_at < cursor` excludes every row inside the remaining sub-millisecond window. Rows *older* than the cursor but within its millisecond are silently skipped and never appear on any page — **and a four-up Compose batch writes four rows inside one millisecond.** The product's most common object was the thing the library lost. GLM found it from a schema detail and a type-precision mismatch, not from the code.

## Who did what

- **claude-fable-5** built it, applied last round's lesson correctly, and had four of its own instruments turn out wrong.
- **glm-5.3** found the cursor-precision row loss and predicted the allowlist drift that was already real.
- **stealth/ox-alpha**, **qwen-3.8**, **hunyuan-3** converged on the unverified query — correctly, and it was answered mid-round.
- **x-ai/grok-4.6** landed the sharpest product criticism: the index without retrieval.

## Skills created or changed

- **Instrument provenance (proposed):** before trusting a green, confirm the instrument looked at the change. Read the config, check the scope, use a positive control.
- **Panel seat selection (confirmed):** dropping Kimi for gate-shaped review cost a third as much and lost nothing.

## Mistakes I made

- **Reported `tsc` exit 0 as proof while it checked none of my new files.** The most dangerous of the four, because it was a *silent* pass rather than a loud failure.
- **Guessed an icon export, guessed a token set, then copied a token from a file that was also wrong.**
- **Used a narrow grep to check a registry** and got four false negatives, immediately after being burned by a wrong instrument.
- **Wrote a connection-string-shaped literal into a test.** Fake credentials, but the scanner is right to flag the shape — Sequelize needs no URL to generate SQL.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Trusting an instrument that did not see the change | **4** | Partially — "validate the probe before an absence claim" (2026-08-21) | That memory covered *absence* claims; this is *presence* claims. Now: confirm scope before trusting any green |
| API used from memory instead of read | 3 | Yes, as Rule 18 | Rule 18 says "inspect the installed version"; I applied it to libraries and not to configs, icons or tokens. The rule is broader than where I was applying it |
| Stale restated-code claim in a packet | **0** | Yes, three times | **HELD, third round running** |
| Asking reviewers what a probe would settle | **0** | Yes, 2026-08-26 | **HELD on its first outing** — probed during the panel instead |
| Green suite not exercising the new wire | 0 | Yes | **HELD.** Falsification is routine |

Two corrections held on their first test this round, and both were written as **commands** ("generate every restated claim at write time", "probe the open question before shipping it as a question"). The four that failed were all instances of a rule I already had — Rule 18 — applied too narrowly. **A rule scoped to an example gets applied only to that example.**

## External-model calibration

| Seat | Cost | Findings | Real | Note |
|---|---|---|---|---|
| glm-5.3 | $0 (sub) | 7 | 4 | Best finding of the entire loop; 3 disproven, all fair given the packet |
| x-ai/grok-4.6 | ~$0.04 est | 4 | 3 | Sharpest product criticism |
| stealth/ox-alpha | $0.0000 | — | — | Consensus seat, first try |
| qwen-3.8 | $0 | 2 | 1 | Right on the query, misread on PII |
| hunyuan-3 | ~$0.004 est | 1 | 1 | One P0, correct, cheapest seat |

**Round cost ~$0.0434 for five seats — a third of the six-seat rounds — and it produced the sharpest single finding of the loop.** Four rounds of data now say the same thing: the free and subscription seats lead, and dropping the most expensive seat for gate-shaped review costs nothing.
