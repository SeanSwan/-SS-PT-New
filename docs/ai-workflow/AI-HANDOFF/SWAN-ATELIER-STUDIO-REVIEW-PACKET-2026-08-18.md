# SWAN ATELIER STUDIO — N-up design engine · HOSTILE REVIEW PACKET

- **Date:** 2026-08-18 · **Author:** Claude Opus 5 (Fable-tier) · **Status:** DRAFT — round 1 review
- **Reviewers:** GLM-5.3 (hostile + design), Kimi K3 (hostile), Qwen 3.8 (hostile, free standing seat)
- **Prior art this MUST NOT re-invent:** `SWAN-BRAIN-ATELIER-UNIFIED-2026-08-11.md` (Opus 5; reviewed by Kimi K3 + HY3; governed by a Fable Final-Decider ruling)
- **Bar:** outputs defensible as a **$100,000 commissioned site**. Sean's standing verdict: *"none of my sites, even the SwanStudios sites, looks anything like this."*

---

## §0 — WHAT YOU ARE REVIEWING, AND THE TWO WAYS TO FAIL THIS REVIEW

You are reviewing **two things at once**:

1. **The prior Atelier program** (`SWAN-BRAIN-ATELIER-UNIFIED-2026-08-11.md`) — Sean explicitly asked for a fresh hostile pass on work that has sat unbuilt since 2026-08-11. Is it still right? What has rotted? What was wrong on day one?
2. **A NEW proposal** (§4 below) — "Swan Atelier Studio", an N-up parallel-variant design engine, proposed as a module ON that program's spine rather than a replacement for it.

**Failure mode A — rubber-stamping.** If you return "solid plan, minor nits," you have wasted the call. Both documents are written confidently and both contain errors. Find them.

**Failure mode B — re-inventing.** The last reviewer round caught the author committing a **Rule 52 anti-rework violation**: he invented a "Taste Ledger" that duplicated a system Fable had already adjudicated. If your recommendation is "build a new X" and an X already exists in §2, you have repeated his mistake. **Check §2 before proposing anything.**

---

## §1 — CONTEXT: THE ORIGINATING TRANSCRIPT

Sean supplied a practitioner transcript (a YouTube walkthrough of Claude Design) describing a 5-level workflow:

1. **Build a design system** inside Claude Design — a persistent, reusable, shareable brand object. Claude *interviews you* to build it ("what's the product, the vibe, hero products, what to avoid").
2. **Generate a brand asset pack first** via a Higgsfield CLI skill — logos, textures, hero shots — then feed those assets *into* the design system so the design has real material to work with. The transcript calls this the step most people miss.
3. **Build a site from the system**, then **hand it over**: `share → project archive → export` → drop the zip into Claude Code → localhost. Stated explicitly: *"Claude Code can do everything Claude Design can do. Claude Design is using Claude Code."*
4. **Add ONE showstopper** — "the one moving piece," an ornament that makes the site memorable. Delivered via a 3D-website skill that *asks questions* before generating. Recommended clip length ~25s.
5. **Reuse the system forever** — attach it as context to any future asset (video graphics, decks, animations).

Cross-cutting doctrine from the transcript: **one shot is not enough; it is all iteration.** And **UI sniping** — lift components from `21st.dev`, `ui.aceternity.com`, `reactbits.dev`, or just screenshot something you like and say "make it like this."

---

## §2 — GROUND TRUTH: WHAT SWAN ALREADY OWNS `[VERIFIED]`

**Every row below was verified by `git grep` / `git show` against `origin/main` during this session.** Do not propose building any of it.

| Capability | Where it lives on `origin/main` | State |
|---|---|---|
| **Claude Design workflow doctrine** | `design-brain/field-techniques.md` **§T5** — native questionnaire, Figma ≫ screenshot, 3 edit modalities (`edit`/`comments`/`tweaks`), BYQ named-designer transfer with KEEP-list, Mobbin-in-loop (spacing/layout not aesthetics), MagicPath side-by-side, portable `design.md`+`PRD.md`, model picker + effort slider, `share → send to Claude Code` MCP | **Captured 2026-08-11** |
| **Archetype library** | `design-brain/website-archetypes.md` — **61,393 bytes, 21 archetypes**, comparison matrix, "how to pick an archetype", motion budgets | **Shipped** |
| **Style taxonomy** | `design-brain/style-taxonomy.md` — 2-axis Midlibrary matrix (15 source categories ≈5,525 styles × 51 quality facets), Swan PREFER/BANNED mapping | **Shipped** |
| **Typography / grid / spacing** | `design-brain/typography-grid.md` | **Shipped** |
| **Interview engines** | `.claude/skills/grill-me` (extraction) + `.claude/skills/design-dialogue` (proposes alternatives Sean did not ask for; records rejected options + why) | **Shipped** |
| **Creation spine** | `.claude/skills/create-with-context` — expert brain as *creative peer*, creativity ~50/50, authorship 100% Claude | **Shipped** |
| **Design corpus integrity gate** | `scripts/design-brain/check-brain-links.mjs`, `npm run brain:links`, 73 tests, 6 defect classes, all with executed positive controls | **Shipped `f17502bf9`** |
| **Variant tournament doctrine** | `field-techniques.md` **§T4** — A → {A,B,C,D} → judge → branch from winner, **2–3 rounds then stop** (practitioner + Kimi, independently) | **Captured** |
| **Batch-and-select law** | Convergent across T1/T2/T4/T5 — per-generation satisfaction ~30–50%; **never judge from one output** | **Captured** |
| **Awe-surface breadth law** | **Rule 40** — net-new awe surfaces require an **8–12 concept breadth pass**, taste-cut by Sean; maximalist option is **C13 Scroll-Bound Macro Journey** | **Constitution** |
| **Video generation** | `backend/services/contentStudioVideoGenerationService.mjs` + 5 test files. `apiKey = SEEDANCE_API_KEY \|\| DREAMINA_API_KEY`; `apiUrl` falls back to **`HIGGSFIELD_API_URL`**. Fail-closed by design. Adding a provider is a **registration, not a rewrite**. | **Shipped** |

### §2.1 — Confirmed ABSENT (grep on `origin/main` returned **0 hits** for each)

`21st.dev` · `reactbits` · `aceternity` · `artboard` · `.dc.html` · `"design canvas"`

**These are the only genuinely new items the transcript contributes.** Everything else in §1 is already in the corpus under Swan's own vocabulary — e.g. the transcript's "one moving piece" is Swan's **signature moment** (Rule 40 / Atelier B6).

### §2.2 — The four unbuilt mechanism gaps (Atelier §2, `[VERIFIED]`)

The prior program's central finding, which this packet accepts as still true:

> The gap is **not taste and not doctrine.** Swan already holds C13, WFX-05, the Enchantment Ratio, and a taste ceiling above Mobbin. Four **mechanism** gaps explain the whole delta:
> 1. **No custom creative** — every transcript site is carried by a bespoke ~8s generated hero. Swan generates almost none.
> 2. **No frame interpolation** — 30fps scroll-scrub shows every discrete frame. This is the "janky/weak" feeling.
> 3. **No reference depth** — Mobbin is capped at "exactly one query and one result" (P-mode).
> 4. **No convergence in pixels** — Swan converges in React, orders of magnitude costlier per iteration, so iteration stops early and the first mediocre draft ships.

**Prior program state: no code written, no brain file modified. Sequencing was `B0.0 → B0 → B7 → B3 → B2 → B4 → B1 → B6 → B9 → B5`.**

---

## §3 — SEAN'S NEW REQUIREMENTS (2026-08-18) — the actual novelty

Three asks, in his words:

**R1 — N-up parallel options.** *"I need a way where I can get more than one view… maybe five or maybe seven different options whenever I tell it to build something, so I can choose which one I like best, or tell it to combine whatever."*

**R2 — Explicit differentiation from Claude Design.** *"Claude Design is different to the point where it's building one asset at a time, and I fully understand that. So we need to differentiate against that and build this plan accordingly."* — Claude Design converges on ONE artifact iteratively. Sean wants **divergence first, then convergence.**

**R3 — Voice-first autonomy + archetype adaptivity.** He wants to talk — "wild imaginations and dreams" — and have the brain interview him, make the design choices he would have made, and drive the tooling. Adaptive by project type: *"since you're building a construction business, you might want this."*

**R4 — Ease of recall (implicit but stated).** *"You say it has all this stuff already, but I need to be able to easily utilize it when the time comes to build these sites."* A 61KB archetype file that no agent reliably loads is, from Sean's chair, **indistinguishable from a file that does not exist.**

---

## §4 — THE PROPOSAL: SWAN ATELIER STUDIO (attack this)

**Positioning:** module **B11** on the existing Atelier spine. NOT a new program, NOT a second design brain.

**The one-line thesis:** *Claude Design converges on one artifact. Swan diverges into a fleet, judges side-by-side on one canvas, and merges by instruction.*

### §4.1 — The boundary finding that shapes everything `[VERIFIED]`

The `design` skill is **available to Claude Code in this session** and is described as *"an early preview of Claude Design inside Claude Code"* — it publishes **multi-artboard `.dc.html` canvases** as Artifacts with a click-to-select property editor.

Three consequences:

1. **Swan CAN drive the canvas programmatically.** Sean's "without me touching the UI" is achievable for authoring.
2. **The multi-artboard canvas IS the N-up judging surface.** T5 recommended MagicPath for side-by-side variant viewing. **Swan does not need MagicPath — N artboards on ONE canvas is natively side-by-side.** This collapses an external tool dependency out of the plan.
3. **The one thing Swan cannot do is create a claude.ai "Design System" *object*** — that is web-app UI. **It does not need to:** `design-brain/design.md` + a per-project `brand.md` is the portable equivalent, and T5 already concluded *"Swan is already ahead here."*

### §4.2 — The N-number, reconciled with existing law

Sean asked for 5 or 7. Rule 40 already mandates **8–12 concepts** for awe surfaces. These are reconciled by **medium cost**, not by picking a number:

| Stage | Medium | N | Cost/unit | Who cuts |
|---|---|---|---|---|
| **Breadth** | text concept lines | **8–12** (Rule 40, unchanged) | ~free | Sean's taste cut |
| **Render** | HTML artboards on one canvas | **5** default, **7** for awe surfaces | cents | Sean picks / merges |
| **Creative** | generated image plates | winner only | cents | — |
| **Motion** | 8s video hero | winner only | $1–2 | — |

**Rationale for 5 default / 7 awe:** odd numbers avoid tie-votes; 5 artboards stay legible at canvas zoom; 7 matches Rule 40's awe tier. **This is a proposal, not a finding — attack the numbers.**

### §4.3 — Module breakdown

- **A1 · Brief Engine.** Voice → structured design brief. Routes `design-dialogue` (propose alternatives) then `grill-me` (fill gaps). **Archetype adaptivity = a lookup into the existing 21-archetype matrix**, plus proactive suggestion: "you said construction → licensing/trust band, project gallery, quote-request flow." *Gap: trades/construction is not among the 21 archetypes.*
- **A2 · Divergence Engine.** N parallel variants. **The hard problem: one model asked for 7 variants returns 7 near-identical ones.** Proposed diversity contract: each variant is seeded with a distinct `(archetype × style-taxonomy axis × motion budget)` triple drawn from the shipped corpus, generated by **parallel subagents that cannot see each other's output**, then a post-hoc similarity check regenerates any pair above a threshold.
- **A3 · Judgment Surface.** All N rendered as artboards on ONE canvas via the `design` skill. Each artboard carries a caption: the ONE phenomenon, what it trades away (per `design-dialogue` rule 3), and its archetype seed.
- **A4 · Merge Engine.** "Take 3's layout with 5's palette and 1's hero." Requires each variant to expose a **structured token/section manifest**, not just pixels — otherwise merge is a re-generation, not a merge.
- **A5 · Convergence Loop.** Branch from winner. **Hard cap 3 rounds** (T4 + Kimi, independently). Then escalate to Sean with two finalists.
- **A6 · Handover.** Canvas → Claude Code → React with Swan tokens. Rule 1 (no MUI), Rule 6 (token-with-fallback), Rule 4 (300-line cap) apply at this boundary.
- **A7 · Recall Fix (answers R4).** The corpus is shipped but not reliably *reached*. Proposal: a router-level index so archetype/taxonomy/typography lookups are one hop, never a 61KB bulk load. **HY3 previously warned against "a 400KB index.md no agent can parse."**

### §4.4 — The cheap wins from §2.1

Add the **UI-sniping corpus** (`21st.dev`, `ui.aceternity.com`, `reactbits.dev`) to the reference ladder as a **component-atom** source — which is already one of the Six-Facet Sweep facets in Atelier B1. Licensing posture must match Fable's **D4** (reference-only, no bytes/URLs/HTML in the durable ledger). **Note the unresolved conflict: Atelier B0.4 flagged that the reference ladder stores URLs at tiers S/A, which D4 appears to forbid. That conflict is still open and this proposal inherits it.**

---

## §5 — QUESTIONS FOR YOU (answer all; be specific)

1. **On the prior program:** it has sat unbuilt since 2026-08-11 with sequencing `B0.0 → B0 → B7 → B3 → B2 → B4 → B1 → B6 → B9 → B5`. Is that order still right given R1–R4? What in it is now **dead weight** and should be cut outright?
2. **Is B11-as-a-module correct**, or does the N-up engine deserve to displace something and move earlier? Where exactly does it slot?
3. **A2 is the crux — attack it.** Will the diversity contract actually produce materially different variants, or 7 flavors of the same layout? What is the *cheapest reliable* mechanism for genuine divergence? Cite anything you know that works.
4. **A4 merge:** is a structured section/token manifest per variant sufficient for "combine 3 and 5", or is merge-by-instruction a fantasy that will always degrade into regeneration? If fantasy, say so plainly.
5. **N-number:** is 5/7 right? Argue for a different number with reasoning about judging capacity and cost, not aesthetics.
6. **R4 / recall** is the highest-value item in Sean's message and the least specified here. **How do you make a 61KB archetype file reliably reachable** by an agent mid-task without bulk-loading it? Be concrete.
7. **The Sean-serialized bottleneck.** Kimi's prior #1 absence: Sean is the judge function at every gate; throughput is one human. N-up makes this **worse** — 7 options is 7× the judging load. Does a proxy rubric solve it, or does N-up need a different answer?
8. **Absence-first:** what is missing entirely from this plan? Rank by value/money left on the table.
9. **Vaporware ranking:** what here is most likely to ship as broken code? Rank by risk.
10. **Design question (GLM especially):** given the shipped taxonomy, C13, and the interpolation fix — what would you actually design for the **SwanStudios homepage**? Name the direction, the ONE impossible phenomenon, the signature moment, the motion grammar. **`Swans.mp4` must be KEPT** (standing Sean decision — upgrade the treatment around it, never replace the footage).

---

## §6 — HONEST GAPS IN THIS PACKET

- The `design` skill's programmatic surface is `[VERIFIED]` **as available**, but its exact API — how many artboards one canvas holds, whether variants can be regenerated in place, capability limits — is **`[UNKNOWN]`**. A2/A3 feasibility depends on this and it has not been probed.
- **Cost per artboard is unmodelled.** §4.2's ladder asserts "cents" without measurement.
- The **D4 vs reference-ladder conflict** (Atelier B0.4) is inherited unresolved.
- The **P-mode one-query Mobbin cap** rationale remains `[UNKNOWN]`; commit `9599539d8` has a bare message. Atelier B1.1 stays blocked pending Sean.
- **Construction/trades is not among the 21 shipped archetypes** — R3's own worked example is uncovered.
- No measurement instrument exists for "is the output actually better?" — Kimi's prior #1 gap (Atelier B6), still open.
- This packet's author has **not built anything yet**. Nothing here is proven in code.
