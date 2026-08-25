---
title: A courtroom before a model — how the taste brain got its first real evidence
date: 2026-08-25
originating_model: claude-fable-5
tier: fable
board: SWA-186
status: durable
models_used:
  - model: claude-fable-5
    role: Final Decider / builder
    did: assembled the review packet, synthesized six seats, built probe + collections + compiler + grill-me mode, ran hostile loops
    cost: subscription
  - model: gpt-5.x-pro (ChatGPT Pro deep research)
    role: external deep-research reviewer
    did: 6-section review of the design brain; found the missing visual loop and the four-way rejection split; over-prescribed infrastructure; led the witness in its own grill
    cost: subscription
  - model: x-ai/grok-4.6
    role: hostile panel seat
    did: leading-defaults P0, generator-distribution P0, write-path de-risk, Q2 scope verdicts
    cost: ~$0.10
  - model: glm-5.3
    role: hostile panel seat
    did: "success-shaped failure", grid unrepresentable in schema, Q0 kept-triage, the $0 probe
    cost: $0 (subscription)
  - model: deepseek/deepseek-v4-pro
    role: hostile panel seat
    did: kept/shipped linkage gap; called security negligible (wrong)
    cost: ~$0.04
  - model: qwen3.8 (local)
    role: hostile panel seat
    did: bluntest week-1; catalog as sole source of truth
    cost: $0
  - model: stealth/ox-alpha
    role: hostile panel seat
    did: single-writer rule, neutral judging surround, cold-start tier label, synthetic fixture
    cost: $0 (prompts retained by provider)
  - model: moonshotai/kimi-k3
    role: hostile panel seat (blocked)
    did: self-blocked on its $0.40 cap (packet worst case $0.443); not run
    cost: $0
skills_touched:
  - id: grill-me
    change: amended — "Visual-taste mode" section + trigger bullet
    failure_motivating: verbal interviews cannot discover styles Sean has no words for; GPT's proposed grill led the witness with Swan's self-portrait
  - id: design-brain/taste-discovery-grill.md
    change: created — the protocol the mode runs
    failure_motivating: no mechanism connected grill-me → taste brain → style suggestions
  - id: swan-taste-brain probe / events / profile (private repo)
    change: created — 12-up probe, TasteEvent v1, tally compiler with tier labels
    failure_motivating: the "taste model" was a keyword filter with agent-written placeholder ratings
---

# A courtroom before a model

## The lesson in one line
When a system's purpose is *discovery*, audit its priors before its cost. A taste system that asks "do you like quiet awe, low-key light, documentary realism?" and then shows pictures has already written the answer; the only honest first product is a picture-chooser that records what was chosen, with the four kinds of "no" kept apart, and a compiler that says the word **prior** out loud until the picks earn the word **evidence**.

## Who did what
- **GPT Pro** produced the best external read the design brain has had: the missing visual loop, the catalog-without-IDs, the content/style/execution/brand-law split. It was also the source of the most dangerous defect — a six-question grill whose every question opened with Swan's own self-portrait as the recommended answer — and of a quarter-year infrastructure list with no Monday slice.
- **Grok 4.6** and **GLM-5.3** independently caught the leading-defaults P0 and the generator-distribution P0 (generated 256–512px candidates train on a distribution that isn't the Midjourney Sean ships and cannot surprise him). GLM named the failure mode: *success-shaped failure* — every metric green while the product's only job silently fails.
- **Ox Alpha** ($0) supplied four items no paid seat did: one writer for the JSONL, a neutral mid-gray judging well inside dark chrome, the `tier: prior|evidence` cold-start label, and a synthetic-fixture pass through the read side before session one.
- **DeepSeek** got the kept/shipped linkage gap and got security wrong ("negligible"). **Qwen** was thin but correct on scope. **Kimi** never ran — its own cap blocked it, which the dry-run had already shown per seat and I failed to read.
- **Fable (me)** under-weighted the leading grill in my own read ("STRONG with three structural weaknesses"), ranked infrastructure appetite as the main problem, and proposed "local Midlibrary thumbnails" as a week-1 item with no containment controls. The panel corrected all three before code.
- **Sean** ran the grids. Three grids, eighteen judgements: every *closest* tagged realism/composition/density; every *miss* a kids/cartoon/fantasy illustration. The words said NatGeo; the pictures agreed without being asked.

## Skills created or changed
- `grill-me` → Visual-taste mode. Built against: a verbal grill cannot discover unnamed taste, and a led grill pre-loads the store.
- `design-brain/taste-discovery-grill.md`. Built against: no protocol connected the interview to the pictures to the directions.
- Taste-brain probe / TasteEvent v1 / tally compiler. Built against: keyword scoring + rating² + a 25% exploration floor + agent-written placeholder ratings posing as a taste model.

## Mistakes I made
- Called the GPT review "STRONG with three structural weaknesses" and led with infrastructure appetite; four seats showed the leading grill and the wrong courtroom were more dangerous. Caught by the panel.
- Proposed "local-only Midlibrary thumbnails" with no controls; three seats showed a bind flag or a `git add` breaks the licence. "Local-only" is a control list, not an adjective.
- Fired the panel without reading the per-seat worst case against each seat's own cap; Kimi self-blocked. The dry-run had printed it.
- First image parser took the first non-empty line after a picture as its prompt; the archive's real layout is image / blank / `](#)` / blank / prompt — 154 of 5,559 resolved instead of 777. Caught by a positive-control test.
- Published a raw GitHub "fetch this" URL before fetching it once; the repo is private (404). Caught by my own curl after the push.
- Declared a picture surface done with 4/12 grey boxes because I had checked URL existence, not rendering; `static.midlibrary.io` hotlinks return 403. Caught by counting `naturalWidth > 0` in a real browser.
- First compile ranked Midlibrary *article titles* as "subjects" and used the article's first example as the sample prompt instead of the picture Sean chose. Caught by reading the real output, not by the synthetic tests.
- Two tests encoded the old default mix and broke when the default changed; one test expectation contradicted correct behaviour. Fixed the tests.
- In a fresh worktree, tried to Edit before Read — three wasted calls.

## Error → fix → repeat ledger
| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| "Exists" treated as "renders/works" (URL exists ≠ renders; HEAD 200 ≠ browser 200; repo pushed ≠ fetchable) | 3 (raw URL, static host, HEAD-only) | Yes — after the first, and it recurred twice | A real-browser `naturalWidth > 0` count as the only acceptable proof for a picture surface; curl-after-push as the only proof of a link |
| Synthetic tests pass, real output wrong (article titles as subjects; wrong sample prompt) | 2 | No | Run the real data through the compiler and read the printout before trusting green tests |
| Tests asserting a default instead of a contract | 2 | No | Assert under an explicit config; a default is a decision, not a fact |
| Reading a source's shape before building on it (NASA API returned hardware) | 1 | No | Sample titles first |
| Spend gate read at the total, not per seat | 1 | No | Read the dry-run per-seat worst case against each seat's own cap |
| Edit-before-Read in a new worktree | 2 (two sessions) | Yes | Procedural: Read tool first in any worktree, no exceptions |

The only class that recurred *after* being written up was "exists ≠ works". The write-up was resolutional ("verify rendering"); what finally held was procedural (a specific command whose output is the proof).

## External-model calibration
| Seat | Cost | Findings real on verification | Disproven / wrong | Note |
|---|---|---|---|---|
| GPT Pro deep research | sub | courtroom, four-way split, catalog IDs, contradictions in the brain files | led grill; 256–512 generated courtroom; build order absent; straw-manned two scoped claims | best external read; not a build plan |
| Grok 4.6 | ~$0.10 | leading-defaults, distribution, write-path, Q2 scope | inferred MUI risk (not seen) | sharpest paid seat |
| GLM-5.3 | $0 | success-shaped failure, grid schema, Q0, $0 probe | wanted 630-row catalog week 1 | best free seat on design |
| Ox Alpha | $0 | single writer, neutral well, tier label, fixture | none disproven | best value per dollar; retention caveat |
| DeepSeek V4 Pro | ~$0.04 | kept/shipped linkage | "security negligible" | cheap, uneven |
| Qwen 3.8 | $0 | scope | thin | never the lead |
| Kimi K3 | — | blocked by own cap | — | read per-seat caps before firing |

## What Hermes should carry
- For discovery systems: audit priors before cost; pictures before words; the word "prior" on every output until picks earn "evidence".
- The probe/compiler contract: four kinds of "no" partitioned; neutral is not a vote; one writer; agents read IDs; nothing writes taste `.md`.
- Proof of a picture surface is a browser render count. Proof of a link is a fetch after the push.
