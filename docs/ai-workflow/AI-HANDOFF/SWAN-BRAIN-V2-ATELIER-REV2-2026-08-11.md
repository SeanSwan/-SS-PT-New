# SWAN BRAIN v2 "ATELIER" — REV 2 · Revised Work Order & Review Packet

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** DRAFT — second review round
- **Supersedes:** `SWAN-BRAIN-V2-ATELIER-MASTER-PROMPT-2026-08-11.md` (REV 1)
- **Branch:** `feat/swan-brain-v2-atelier` (worktree, cut from `origin/main`)
- **Reviewers:** Kimi K3, HY3, AI Village, Gemini 3.1 Pro, Codex — all re-reviewing after REV 1
- **Bar:** outputs defensible as a **$100,000 commissioned site**. Sean's verdict on the current state: *"none of my sites, even the SwanStudios sites, looks anything like this."*

---

## §0 — WHAT CHANGED SINCE REV 1, AND WHY

REV 1 was reviewed by Kimi K3 and HY3 (paid, $0.0506 total). Both landed real hits. Then git archaeology found a **Fable 5 Final-Decider ruling** that REV 1 had entirely missed. Then Sean supplied **six practitioner transcripts**. REV 2 is materially smaller and better-sequenced as a result.

### The big correction: I re-invented an already-locked system

**`FABLE-SWAN-DESIGN-BRAIN-VISUAL-LEDGER-FINAL-RULING-2026-07-25.md`** — Fable 5, as Final Decider, ruled **LOCK-WITH-CHANGES** on a Visual Ledger program with a binding S0→S10 build sequence.

- **D4 — "Mobbin reference-only, no bytes/URLs/HTML: CONFIRM. Non-negotiable licensing hygiene."**
- **D5** — no licensed-image archive absent written permission: CONFIRM.
- **D1** — visuals explain, never corroborate.
- **D6** — trial gate, not auto-canon; **override any fast path**. Two gates, both mandatory, forever.

**Build state `[VERIFIED]`:** `scripts/design-brain/tests/fixtures/visual-card-golden.svg` **EXISTS** (15,117 bytes) — Sean cleared Fable's one blocking de-risk. But **S1–S10 were never built**: `visual-contract.mjs`, `visual-tokens.mjs`, `visual-card-svg.mjs`, `log-visual-card.mjs`, `trial-contract.mjs`, `log-trial.mjs` are all absent from `origin/main`.

**Consequences:**
1. REV 1's "Taste Ledger" (B1.3) is **DELETED**. It was a re-invention of an adjudicated system — a Rule 52 anti-rework violation on my part. Replaced by: **finish the locked S1–S10.**
2. The panel's ledger dispute is **resolved by authority, not opinion.** Kimi said the principles-only firewall was "legally coherent, not laundering." HY3 said it was laundering and predicted a cease-and-desist. **Fable's D4 already ruled a reference-only ledger permissible — Kimi was right, HY3 was wrong.** HY3 asserted a rationale for `egress-policy.mjs` it had never read; treat that finding as unevidenced.
3. Both reviewers demanded "find the basis before touching the cap." **That was correct process and I had the sequencing backwards.** The basis is now found.

### The remaining open question on the cap
Fable's ruling governs the **ledger**, not explicitly the **one-query Probe cap**. Whether P-mode's "exactly one query and one result" was a deliberate rate/legal decision or collateral hardening is **still `[UNKNOWN]`** — commit `9599539d8` has a bare message. **B1.1 stays blocked until Sean confirms.** Reviewers: assume it is NOT yet cleared.

---

## §1 — ROOT CAUSES (revised)

| # | Root cause | Status |
|---|---|---|
| RC-1 | Mobbin capped at "exactly one query and one result" (P-mode) | `[VERIFIED]` — cause of the 5–10 image ceiling |
| RC-2 | Router says "**I** is the default"; protocol **refuses `I`** (`E_LEGACY_MODE_REFUSED`) | `[VERIFIED]` — self-contradicting spec; agents resolve it by doing the minimum |
| RC-3 | Approved fix exists but is **10% built** — S0 done, S1–S10 absent | `[VERIFIED]` — *this*, not missing design, is why Mobbin value never materialized |
| RC-4 | `generate-image.mjs` = Gemini + a **3-line** `SWANSTUDIOS_STYLE` string; no OpenRouter path | `[VERIFIED]` |
| RC-5 | No frame-interpolation step anywhere; WFX-05 scrub exists but has no path to its own 60fps gate | `[VERIFIED]` — zero motion-domain interpolation hits repo-wide |
| RC-6 | Brain is website-only; no audio/video/3D/generative contracts | `[VERIFIED]` — no Swan Visualizer exists on `origin/main` (voice-capture only) |
| RC-7 | **Typography, grid, and spacing are absent** from the upgrade entirely | Kimi's catch — accepted |

**Kimi also correctly flagged that REV 1 overclaimed RC-6** from a `frontend/src`-only grep. Now re-verified repo-wide on `origin/main`. Claim stands; the original evidence scoping was sloppy.

---

## §2 — WHY SEAN'S SITES DON'T LOOK LIKE THE TRANSCRIPTS

The gap is **not taste and not doctrine.** Swan already holds C13 Scroll-Bound Macro Journey, WFX-05, the Enchantment Ratio, and an explicit taste ceiling above Mobbin (rule 40). Four **mechanism** gaps explain everything:

1. **No custom creative.** Every transcript site is carried by a bespoke ~8-second generated hero. "The creative is really the heavy lifter." Swan generates almost none.
2. **No frame interpolation.** 30fps scroll-scrub shows every discrete frame — the exact "janky/weak" feeling. Fix is one post-process step to 60fps.
3. **No reference depth.** RC-1/RC-2 starve every surface of the references that determine output quality.
4. **No convergence in pixels.** Swan converges in React — ~100× costlier per iteration — so iteration stops early and the first mediocre draft ships.

None require changing a LAW.

---

## §3 — THE REVISED MODULES

### **B0 — Unblock (do first, cheap, no new design)**
- **B0.1** Delete the `I`-mode reference from the router (RC-2). A self-contradicting spec is a bug regardless of the cap decision.
- **B0.2** Ask Sean the P-mode question. Blocking for B1.1.
- **B0.3** **Finish Fable's locked S1–S10.** Already reviewed, ruled, and de-risked; the golden fixture is done. Apply Fable's 10 binding changes (renumber M1–M7, role-ID-only `createdBy`/`verifiedBy`, banned-lexicon gate, determinism vs. timestamps, `refType` enum, stem-match denied-key scanner, packet ceiling displacement, readiness = `seanTasteVerdict==='approve'`, two-product provenance, token-name drift test). **S10's two clean hostile rounds remain mandatory.**

### **B1 — Reference Depth** *(revised per Kimi)*
- **Six-Facet Sweep** (archetype / motion / competitor / adjacent-excellence / anti-pattern / component atom) — but **gated on facet COVERAGE + justification, not a call-count floor.** Kimi: a hard 150-ref minimum "will be gamed or will stall small tasks." Correct. Small surfaces justify fewer facets in one line.
- Tool ceilings `[VERIFIED]`: `search_screens` 30/call, `search_sections` 30/call + paging, `search_flows` 10/call + 20 pages. **50+ refs is two calls.** The tool was never the constraint.
- **Honest caveat (T3):** Mobbin is **mobile-strong, web-weak**. SwanStudios is web-first. Expect thinner `platform:"web"` results; lean on `search_sections` and mobile→web pattern transfer. This tempers expected ROI.
- Borrow **spacing and layout, not aesthetics** — the discipline that keeps intake inside Fable's D4.

### **B2 — Convergence Loop** *(revised; now runs AFTER B3)*
- **Sequencing inverted per HY3:** *"B2 is building a mansion on a tent — you cannot converge on pixels using a generator that has a 3-line hardcoded string."* Correct. **B3 ships before B2.**
- **Round cap = 3**, then escalate to Sean with two finalists. Independently recommended by Kimi (hostile review) and T4 (practitioner). No more "loop forever."
- **Tournament shape, not linear revision:** A → {A,B,C,D} → judge → branch from winner. AI supplies breadth; Sean's taste is the judge function.
- **Round 0 = Claude Design's native questionnaire** (T5), supplemented by `grill-me` depth only where shallow. Do not rebuild the interrogation — it already exists.
- **Variants must be viewable side-by-side** (MagicPath pattern). You cannot judge what you cannot see simultaneously.
- **Cost model** (answers Kimi's "no cost model"): stills are cents, video is $1–2, React iteration is hours. Converge in stills; commit once.

### **B3 — Image Forge** *(honest framing; ships FIRST)*
- **12-slot prompt architecture** — retained; both reviewers called it sound.
- **DROP the "SREF portability" claim.** Both Kimi and HY3 independently called it cargo-cult. Honest statement: *our provider has no style-reference embedding; we compensate with disciplined prompt presets and seed locking.* A saved preset is a prompt template, **not** a latent-space style handle.
- **BLOCKING VERIFICATION before any Super-Tiling work:** does the chosen provider support **masked inpainting** at all? The entire parallax-plate pipeline assumes it. Kimi caught this; REV 1 missed it. Also verify OpenRouter image-model slugs live (Rule 18 — never from memory).
- **Model-specific syntax must be quarantined.** `--chaos`, `--stylize`, `--tile`, `--sref` are Midjourney flags. Non-MJ models largely ignore numeric params. Keep the *intent* (abstraction level, style strength, tileability), express per-provider.
- **Style taxonomy is captured and landed** → `design-brain/style-taxonomy.md`: 15 source categories / ~5,525 styles × 51 quality facets, with Swan's ban-list mapped on (Psychedelic banned as the iridescent-gradient failure mode; Animals/Characters only as dark occluders per LAW 4).
- **Personification formula** (highest-value craft extraction): `[Artist]'s [their actual medium] depicting [subject]` — never `[subject] by [Artist]`.
- **Image-first → then video**, triple-confirmed (T1/T2/T6). **480p test (~$0.10–0.50) → approve → upscale 1080p.** Never full-res while exploring.
- **Transparent PNG, never vector** → add to kill-list. Screenshot-only references are what trigger vector-slop.

### **B4 — Motion & Dimension** *(now has its missing step)*
- **Frame interpolation 30 → 60fps before frame extraction.** This is the single highest-value technical addition in the whole document: it closes a `[VERIFIED]` gap between rule 40's mandated 60fps scrub gate and WFX-05's silence on how to reach it.
- Scroll-as-timeline law: entry/exit ranges, pin regions, scrub vs. play-once, **designed static frame for reduced motion** (LAW 5 R1 — the CSS-only guard is a lie for JS scroll animation), mobile degradation.
- Parallax law: depth = layer count × differential rate × **atmospheric perspective**. Flat multi-speed scrolling is banned.
- Three.js tier: when a real 3D scene beats a faked 2.5D stack (rarely). **Canvas UI (`canvasui.dev`)** as the cheaper middle path — shader effects over live HTML. Water/refraction is on-law (LAW 4 optics); cloth is decorative and needs justification.
- 8-second single continuous macro journey; 16:9 desktop / 9:16 mobile; batch 3.

### **B5 — Beyond-Web** *(cut hard per both reviewers)*
Both called it a monolith. HY3: *"that is how you get a 400KB index.md no agent can parse."*
- **SHIP NOW: the law-split only.** Separate (i) universal taste law from (ii) Swan-specific palette/content law. **T5 gives its concrete form: a droppable `design.md` + `PRD.md` pair.** This is Sean's "versatile, not just one thing," and it is the best-evidenced module in the plan.
- **DEFER all three medium contracts** until their `[UNKNOWN]`s close. M-AUDIO is blocked — **no Swan Visualizer exists on `origin/main`**, so it is net-new, not an enhancement. M-MOTION bridges to the existing Seedance skills. MiniMax-Hailuo integration remains unverified.
- Structure as **`mediums/` lazy-loaded by the router**, never bulk-loaded.

### **B6 — Taste Ceiling** *(now measurable)*
- **NEW — measurement instrument** (Kimi's #1 absence-first gap; REV 1 had none): a repeatable scoring rubric, named benchmark set, defined scorer and cadence. Without it the whole upgrade's ROI is unverifiable.
- **NEW — reference quality ladder as a Gate-0 requirement** (T6): every net-new surface declares its tier — **S** (URL + repo + prompt + demo + stack) / A (URL) / B (screen recording) / C (screenshot) / D (none). Below B on an *awe* surface must be justified. Free, mechanical, and it directly explains generic output.
- **"Why is this worth $100k"** test at Gate 3: name the ONE phenomenon, the signature moment, and what a competitor cannot copy in a week. "Clean and modern" fails.
- Homepage ultra-redesign as the live proof. **`Swans.mp4` is KEPT** — upgrade the treatment around it, never replace the footage.

### **B7 — NEW: Typography, Grid & Spacing** *(Kimi's catch)*
Absent from REV 1 entirely. For a $100k bar, type and spatial rhythm determine perceived quality more than hero art. Hero plates over a weak grid still read cheap. Needs: type scale + pairing doctrine, baseline/spacing rhythm, measure/leading rules, optical alignment, and a grid contract per archetype.

### **B8 — NEW: Agent-Behavior Spec & Rollback** *(Kimi's gaps 2 & 3)*
- **Token budget per phase.** How does an agent sequence 6 sweep calls + ledger write + a 12-slot prompt inside one task context? REV 1 "designed a museum, not a machine."
- **Failure & rollback path.** Kill criteria if the ledger fills with junk or the Forge produces *worse* images than the 3-line string. A/B against current output. Revert plan.

---

## §4 — TOOLING TO REGISTER
Mobbin MCP (have) · Claude Design + its MCP export path · Higgsfield MCP (art-director model routing, per-op cost confirmation) · BYQ (`byq.supply`, named-designer styles) · MagicPath (side-by-side variants) · Canvas UI · shaders.com. **Every one must pass the AI Skill & Operator Registry gate — unregistered capability is BLOCKED.**

**Codex economics:** `consult-codex.mjs:37` uses metered `openai/gpt-5.5` while Sean holds a **$100/mo flat-rate Codex CLI subscription** — paying twice. Routing consults through the CLI makes Codex free-at-the-margin, which materially changes B2 (a reviewer on every round becomes affordable).

---

## §5 — QUESTIONS FOR THIS REVIEW ROUND

1. **Is B0.3 right?** Should we finish Fable's locked S1–S10 as-is, or has enough changed in 3 weeks that the lock should be re-opened? Note Fable said "no further review round is required before build."
2. **Sequencing:** B0 → B3 → B2 → B1 → B4 → B7 → B6 → B5. Is B3-before-B2 correct (HY3's mansion/tent argument)? Where would you cut further?
3. **B7 typography/grid** — is this bigger than a module? Should it precede everything, since it gates perceived quality on every surface?
4. **B3 provider reality:** is prompt-preset + seed-locking a genuine substitute for style reference, or should Swan drop style-consistency ambitions until a provider supports it?
5. **What in REV 2 is still vaporware?** Rank by shipped-wrong-code risk.
6. **Absence-first:** what is missing entirely? Rank by value left on the table.
7. **Design-specific (HY3/Gemini/Village):** given the taxonomy, the C13 journey, and the interpolation fix — what would you actually design for the SwanStudios homepage? Name direction, the ONE impossible phenomenon, signature moment, motion grammar. `Swans.mp4` must be kept.

---

## §6 — HONEST GAPS
- P-mode cap rationale `[UNKNOWN]` — blocks B1.1; needs Sean.
- OpenRouter image slugs + **masked-inpainting support** unverified — blocks Super-Tiling/parallax plates.
- Swan Visualizer does not exist on `origin/main` — M-AUDIO is net-new.
- MiniMax-Hailuo integration `[HYPOTHESIS]`; "Cense 2.0" ≈ Seedance 2.0 `[HYPOTHESIS]`.
- Panel tooling (`consult-opus5.mjs`, `consult-hy3-design.mjs`, `run-newsroom-top-ai-panel.ps1`) is **uncommitted, working-tree-only** — the review capability is not durable.
- No code written; no brain file modified. Plan awaiting steer.
