# SWAN CONTINUATION HANDOFF — 2026-08-14

**Read this file and nothing else to start.** It supersedes
`SWAN-MASTER-HANDOFF-2026-08-13.md` (kept for history; do not work from it — its Part 3
architecture was reviewed and partly rejected the next day, and its cost figures are wrong).

- **Author:** Opus 5, session `ad7c842d`, working tree `c:/tmp/ss-forge-variantrun` on `main`.
- **Delivery state of everything below:** `merged-to-main` unless explicitly marked otherwise.
- **Head when drafted:** `0638bfe4b`. **Delivered at** `5447fc8e7` — the remote moved 37
  commits from parallel agents while this was being written, which is the normal condition
  here, not an anomaly. Re-read `git log origin/main` rather than trusting either SHA.

**Two facts that will waste your day if you skip them:**

1. **The primary checkout `<REPO>` is on a wip branch
   roughly 1,900 commits behind `origin/main`, and drifting further every hour.** Measure it
   rather than trusting that figure — it read 1885 while this was being drafted and 1926
   forty minutes later:
   `git -C <REPO> rev-list --count HEAD..origin/main`.
   Work there and your fixes never reach production; audit there and tooling that exists
   will appear missing. **Use a worktree on `main`.**
   This has already cost multiple sessions — a blocker was re-reported four times because
   the file had been fixed on `main` days earlier.
2. **A push to `main` is a production deploy AND runs migrations** (`render.yaml` →
   `npm run migrate:production`). "I'm only committing docs" describes the diff, not the
   consequence.

---

# PART 1 — WHERE THIS STARTED

Sean's ask, in his words: make the **Swan Brain** a world-class design and image-generation
system — *"$100,000 websites"* quality. The work split into two halves:

- **Generation** (done): the Swan Forge — take a brief, produce Swan-lawful images, judge
  them, keep the winners.
- **Curation** (next): Sean's taste actually shaping the output instead of the AI silently
  choosing references he never sees.

Across the session Sean's standing instructions were: build slice by slice without stopping,
hostile-review everything, **loop until the review runs dry**, then push. He pushed back
whenever I paused for permission mid-batch. Assume that stance still holds.

---

# PART 2 — WHAT IS LIVE (do not rebuild, do not re-litigate)

## 2.1 The Swan Forge

CLI at `scripts/forge.mjs`; library in `shared/`. **16 modules** — 13 in `shared/` plus 3
providers. (`shared/` also holds `clientOnboardingQuestionBank.mjs` and `sectionPatterns.mjs`,
which are **not** Forge modules; counting the folder instead of the feature is how this
document first said "18".)

```
swanPromptCompiler.mjs   brief → 12-slot IR (typed `aspect` field, not regexed from prose)
swanPromptSerializers.mjs  sentence + fragment renderers
swanVocabulary.mjs  swanLawFilter.mjs  aspect.mjs  imageDimensions.mjs  forgeConfig.mjs
variantRun.mjs  variantLineage.mjs  variantVerdict.mjs   append-only JSONL ledger + lineage
bracket.mjs  contactSheet.mjs  pixels.mjs                convergence, gallery, palette audit
providers/openrouterImage.mjs  openrouterModels.mjs  transportRetry.mjs
```

Tests: `backend/tests/unit/` — `swanPromptCompiler`, `swanLawFilter` (+ a 44-prompt
must-pass corpus), `variantRun`, `bracket`, `contactSheet`, `pixels`, `forgeAspectContract`,
`forgeEndToEnd`, `moduleSmoke`.

**The loop that works and should be reused, not reinvented:** generate variants → write a
**local HTML contact sheet** Sean opens in a browser → he rules → `forge review-answer`
appends his verdict to an append-only ledger with `parentVariantId` lineage. `refine()`
(keep the thing, change one axis) and `reroll()` (same brief, new dice) are distinct
operations because they mean different things to a human.

## 2.2 Capability truths — each cost real money to establish. DO NOT re-test.

| Claim | Status |
|---|---|
| Images go to OpenRouter **`/api/v1/images`** | ✅ Chat-completions is ~50× dearer, 7× slower, and has no aspect control |
| **Seed is dead** on this provider | ✅ Probed. Same seed, different images |
| **Image-to-image is dead** | ✅ Probed with a control arm. No influence detectable |
| Cost field is `usage.cost` | ✅ Was `usage.total_cost` — **and my hand-written test stub had the same wrong name**, so 121 passing tests could not catch it. Fixtures are now captured from real responses |
| Capability tri-state `'verified' \| 'claimed' \| false` | ✅ `'claimed'` is treated as absent; dead capabilities are now `undefined`, i.e. unrepresentable, not merely falsy |

**The rule these produced:** HTTP 200 and a higher bill are not evidence a feature works.
Only varying the input, measuring output tracking, **and running a control arm** is.

## 2.3 Also shipped in this workstream

- **Deleted 927 lines** of speculative code at closeout (`forgeReadApi`, `dropFolderImage`,
  `providerPricing`, the `tag` serializer, `compileVideo`) — a reviewer said "over-built"
  twice before I acted on it.
- Skills: **`stale-check`** (re-verify a carried claim before repeating it; ship
  `CLAIM / CHECK / AS-OF`), **`design-dialogue`** (a brainstorming *partner*, not an
  interviewer — see Part 4.3).
- `CLAUDE.md` rule 16's Village cost corrected to the receipt-based **$0.4396–$1.8937, mean
  ~$1.01 across ten distinct runs** (it had said $0.33; I "corrected" that to $27–147, then
  published "eight runs, mean ~$1.10" — **all three were wrong**; see Part 6).

---

# PART 3 — WHAT SEAN OWES (blocking)

1. **The blind A/B ruling.** Arms tagged A–F; decoder in a separate `ab-blind-key.json`.
   It settles whether the negative-prompt "kill list" helps. **It ships OFF
   (`FORGE_KILL_LIST=1` to enable) until he rules.** Known residual: filenames and mtimes
   are neutralised, byte-size is not — disclosed.

   ⚠ **The file is at `.ai-workflow/forge-runs/ab-blind.html` in the PRIMARY CHECKOUT
   ONLY** — `<REPO>/`. `.ai-workflow/` is gitignored,
   so it does **not** exist in the `main` worktree this document tells you to work from.
   Verified 2026-08-14 (3072 bytes, 245-byte key, both dated Aug 13 18:32). This is the
   document's own "delivered where its reader looks" lesson biting the document itself:
   the artifact Sean must open lives in the one tree I told him not to use.
2. **Village panel on taste curation — or not.** Kimi's blueprint (Part 4) may be enough.
   Receipts put a Village run at **~$1–2**, not the $27 the gate estimates. Sean's budget
   is tight and explicit: *"I only got, like, thirty bucks on there."*
3. Longer-standing, from `MEMORY.md`: **the DMARC record (SWA-13)** — his standing
   every-session reminder; branch protection on `main` + PR #36; Linear API key re-auth.

---

# PART 4 — THE NEXT BUILD: TASTE CURATION

## 4.1 The problem, in Sean's words

> *"I'm using the Mobbin MCP so I can look at different sites and get ideas. But I'm not
> really looking at it. The AI is just picking ten or twenty and automatically using them.
> It's not really coming from a design creation for me if I'm not putting as much input
> into it."*

What he asked for: **ask first** (quick or in-depth) — never automatic; in-depth pulls all
relevant designs **~50 at a time**; he browses, keeps what he likes and **says what
specifically he likes**; the system takes notes; next 50; repeat; then create from his picks
**plus** the existing Swan Brain protocol.

## 4.2 The constraint that explains today's behaviour — verified from live tool schemas

- `search_screens` / `search_sections`: `limit` **max 30**; `exclude_screen_ids` max 100.
- `search_flows`: `limit` max 10.
- **Images return INLINE INTO MODEL CONTEXT.**

**So the shallow behaviour is context economics, not laziness** — and any design that pipes
50 images through model context fails the same way. The fix is the Forge's own pattern:
images to a **local gallery**, only Sean's picks and reasons return to the model.

## 4.3 The reviewed plan — `docs/ai-workflow/AI-HANDOFF/KIMI-TASTE-CURATION-BLUEPRINT.md` (211 lines, $0.2479)

**Verdict: REJECT AS WRITTEN, APPROVE CONDITIONALLY** on (a) Slice 0 landing first and
(b) a dual-input deck replacing keyboard-only. All seven open questions were settled:

| Question | Decision |
|---|---|
| **How taste enters generation** | **A router pre-brief consuming `taste.profile.json`** — not compiler slots, which freeze the taxonomy too early. This was the load-bearing unknown |
| Where browsing happens | In-app `/admin/taste/[batchId]` — holdout + ledger need server state; static HTML is false "zero infra" |
| What "why" captures | Hybrid: one-tap chips + optional ≤280 chars, **keepers only** |
| Currency | Append-only rows; distil weights by 90-day half-life; axis reset bumps `profileVersion` |
| Trust threshold | **50 verdicts per surface type + Cohen's κ ≥ 0.3** |
| Owner | New `swan-brain/taste`; Forge imports the UI; router consumes the artifact |

**Slices (each independently shippable, exit criteria measurable):**

| # | Slice | Exit criteria |
|---|---|---|
| **0** | ⛔ **SUPERSEDED 2026-08-19 — do NOT build this.** The verdict row shipped with the Swan Atelier Studio (PRs #48/#49); a ruling of record forbids a second ledger. Read `SWAN-TASTE-NEXT-SLICE-HANDOFF-2026-08-19.md` for the revised Slice 0′. | — |
| 1 | Harvest | 5 angles, 150 raw → 0 dupes across a 150-id seenSet despite the 100-cap |
| 2 | `ReviewDeck` UI | 50 refs verdicted ≤2:30 by dwell timestamps; axe 0; all targets ≥44px @375; reduce-motion honoured |
| 3 | Distil loop | Ledger-only input; correction rows logged; artifact updates |
| 4 | Holdout + trust gating | κ computed; cold/warm/hot enforced |
| 5 | Grill upgrade | Budget chip, BUILD NOW escape, one-tap recommended, counter-proposal rows |
| 6 | Provenance | Every concept emits ref citations with `mobbin_url` links |

**Start at Slice 0.** Everything downstream is wrongly shaped until the contract exists —
that was the review's second blocker and it is the single most important instruction here.

## 4.4 Three errors the review caught in my brief — carry the generalisations

1. **A metric that certifies itself.** I proposed "predict which 10 of a holdout Sean keeps,
   measure the hit rate" and called it *"what turns a note-taker into a brain."* If Sean
   keeps 15%, a model predicting *"discard everything"* scores **85%** and certifies itself.
   → **Before shipping any predictive gate, ask what the dumbest possible predictor scores.**
   Fixed with κ ≥ 0.3 against a base-rate predictor.
2. **I violated constraints I listed in the same document.** The brief mandated nine
   breakpoints and a 44px floor, then specified a **keyboard-only** UI — unusable at four of
   them, and single-key shortcuts violate WCAG 2.1.4. → **A constraints section constrains
   nothing. Constraints bind when something checks them.**
3. **Inverted sequencing.** I specced capture in detail while "how does taste reach
   generation" was still open. **The consumer determines the schema**; building collection
   first guarantees re-annotating everything already collected.

Also self-contradictory: per-item annotation on 50 items *and* "50 in ~2 minutes." Resolved:
**fast pass is keep/discard/skip only; annotate keepers afterward.** Interrogating six
keepers is depth; interrogating fifty is a form.

## 4.5 The companion skill — `design-dialogue` (shipped)

Sean also asked to be *"grilled on my design… long deep conversations… give me options based
off what I'm talking about."* `grill-me` already existed, so the new skill covers the gap in
**kind**: grill-me gets what is in his head OUT; design-dialogue puts things IN it.

Its load-bearing rule: **never accept the first framing** — reply with "here is what I think
you mean, here is a different way to get the same outcome, and here is why you might prefer
it." Its most-forgotten output: **record rejected alternatives WITH REASONS.** A rejection
with a reason is permanently settled; without one it returns every session and Sean
re-argues a question he already answered.

**Do not let curation quietly cap the ceiling.** CLAUDE.md rule 40: Swan's top tier is the
cinematic scroll-journey, ABOVE conventional app-UI reference. Mobbin is the lane for
conventional working surfaces. "Best of Mobbin" is a floor, not a target.

---

# PART 5 — HOW TO WORK HERE

This part is the accountability system Sean asked for: *"make sure the AI agents are always
moving forward and not working so hard to not double-check whether other agents may have
fixed it — because I always work with a lot of agents at once."*

## 5.1 The rules that exist because something broke

- **`node scripts/lane.mjs digest` at session start; `claim` before your first edit.**
  Many agents run this repo across ~184 worktrees. Locks are advisory hints; the value is
  *visibility*. Never write another session's lane file.
- **`stale-check` skill.** Before repeating a carried blocker, re-verify it. Ship
  `CLAIM / CHECK / AS-OF`. A blocker in this workstream was reported four times after
  another agent had fixed it.
- **Committed ≠ delivered.** `local-commit` → `pushed-branch` → `merged-to-main`. An
  artifact is delivered only where its reader looks. Branches, gitignored dirs, and unmerged
  worktrees are where finished work goes to be invisible.
- **Rule 73 — proof before done.** No "done/fixed/working" without current-session command
  output **and** a hostile pass that ran dry, in the same message.
- **Rule 70 — batch push.** Commit per slice locally, push once at batch end. One deploy,
  one verification. Do not wait per slice.
- **Rule 45** — no amend/rebase/force-push without Sean. **Rule 34** — nothing deleted
  without grep evidence and approval. **Rule 16** — the Village needs per-run permission.

## 5.2 Failure modes from this session, each of which cost real time

- **I deleted two real images from the live store — including the marked WINNER — running
  `--apply` to test a guard that had silently failed to install.** Winners are now
  protected, root is allowlisted, non-TTY needs a second flag, six tests prove it.
  **Never run a destructive command to check whether its guard works.**
- **A pruner reported "2 rows marked" having marked zero** — it counted intent
  (`pruned.size`), not effect. **Count what happened, not what you decided to do.**
- **A retention check measured 3.6 MB of a real 14.1 MB** — it watched `images/` and ignored
  a sibling directory. **Coverage is a claim; verify the denominator.**
- **A contact sheet linked `images/<basename>` for every sibling directory** — a live bug I
  shipped. Fixed by collapsing to ONE path function with link verification.
- **My own blinding leaked** — filenames contained `with`/`without` in the `<img src>`.
- **`export … from` creates no local binding** — three ReferenceErrors during module splits.
  `moduleSmoke.test.mjs` now guards it.
- **`cmd | head` then `$?` reads head's exit code**, not the command's. Bit me five times.

## 5.3 Model routing, from receipts

- **Kimi K3 is the correct default for single-perspective architecture review.**
  Ten rounds this session at **$0.027–$0.2479** each, delivering the workstream's highest-
  value findings. **Excellent on sequencing, severity and what to delete; verify anything it
  asserts about current code.** Roughly a fifth of a Village run.
- **AI Village: real cost $0.4396–$1.8937, mean ~$1.01**, from **ten distinct** runs
  (11 `cost-summary.md` files; `latest/` duplicates the newest). The pre-run gate estimates
  $27–147 — a **safety ceiling, not a forecast** — which makes `SWAN_VILLAGE_MAX_USD`
  unusable at any sane value. Fixing the estimator to price against observed history is a
  small unclaimed slice. *(I first published "eight runs, mean ~$1.10" — a miscount of the
  very receipts I was citing to correct someone else's number. Re-count with `find
  AI-Village-Documentation -name cost-summary.md` before quoting; new runs land often.)*
- **`fusion-triangle.mjs` is not standalone.** It is a shared-folder polling board that waits
  for other *live* agent sessions. With no siblings it waits ~280s and aborts. Free and real
  — but only when other agents are actually running.

---

# PART 6 — THE MISTAKE MOST WORTH INHERITING

I told Sean the Village cost $0.33 (quoted from a doc). The gate then said $27–147, so I
"corrected" the doc to $27–147 and advised against running it. Sean: *"every time I use AI
Village, it never goes over two dollars."* He was right; the receipts were in the repo the
whole time.

**A freshly-computed number is not a measured number.** The estimate was new, precise to
four decimals, and produced by the system itself — every signal of authority except the one
that matters. I made that error **one hour after shipping a skill about exactly this failure
mode**, and my cost prediction missed again by 3.5× on the very next call.

**When a number can be measured, measure it. When someone with hands-on experience
contradicts your fresh calculation, they are usually right.**

---

# PART 7 — RECOMMENDED ORDER

1. **Slice 0** — the taste contract. Nothing else is correctly shaped without it.
2. **Slice 1 → 2** — harvest, then the dual-input `ReviewDeck`. Slice 2 is the one Sean
   actually experiences; its exit criteria are measurable and non-negotiable (≤2:30 for 50,
   axe 0, ≥44px @375).
3. **Ask Sean for the A/B ruling** whenever he next surfaces — it is 60 seconds of his time
   and it unblocks a shipped feature currently defaulted off.
4. **Fix the Village cost estimator** to price against `cost-summary.md` history. Small,
   real, and it makes the spend cap usable instead of decorative.
5. **Slices 3–6** in order.

**Do not** re-probe seed or i2i. **Do not** rebuild the contact-sheet/ledger loop. **Do not**
start curation UI before Slice 0. **Do not** work from the primary checkout.
