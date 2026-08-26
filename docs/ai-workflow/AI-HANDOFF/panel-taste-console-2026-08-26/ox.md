# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-CONSOLE-UI-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 2257 in / 8337 out · **Cost:** ~$0.0000 · **Wall:** 245.7s · **finish:** stop

---

# Ox Alpha — seat review, SWA-186

Read the whole packet twice. Before the eight returns, one framing statement, because it governs everything below:

**This owner does not need more sections. He needs fewer, better-lit ones.** His stated failure mode — surfaces added faster than they can be maintained — means my job here is as much demolition as design. Today's tool has four tabs; my proposal has **three**. Every idea in section 4 that would add a surface, a dependency, or an autonomous writer is refused below, and I refuse more than I adopt on purpose.

---

## 1. Section map

Three top-level sections. Everything else is header context, not a section.

| Section | Owns | Status vs. today |
|---|---|---|
| **JUDGE** | The judging loop exactly as it runs: 12-grid, reason-before-reveal, never-show-twice, Undo. `probe.css` untouched. | **KEPT AS-IS.** It earns sole occupancy because it is a *mode of attention* — the owner must commit a reason before pixels appear. Nothing else may share that screen, including my own chrome beyond the header. |
| **MAKE** | Prompt composition, seed selection, the ComfyUI queue, render results with a "send to Judge" action. | **ABSORBS Directions.** The three named directions become a read-mostly **Evidence Rail** docked inside Make (left column desktop, horizontal chip strip on narrow screens). |
| **KEPT** | The decided body of work for the current memory: gallery-grade grid, full-screen lightbox (`<dialog>`), open-in-new-tab, the client-facing view. | **UPGRADED, NOT EXPANDED.** Same data, presented like a gallery instead of a card list. |

**Merged:** Directions dies as a top-level tab. Justification: a Direction is never a destination — it is an input to Make. As a standalone tab it was a room he walks through to reach the room he works in. Docked as a rail, it is visible while he composes, which is the only moment it matters. This also removes one tab-switch from his most frequent loop (see §5).

**Deleted as sections (named so they stay dead):**
- **No Settings section.** Who/Memory/New-project stay in the header because they are *global context*, not a workplace. A settings page is where maintenance debt goes to breed.
- **No Library / Search section** (this is the refusal of idea C — see §4).
- **No Insights / Dashboard section** (idea D).
- **No System / design-systems section** (idea E).
- **No Publish section** (idea I).

The hidden create-form stays hidden and keeps its current behavior. Do not promote it.

---

## 2. Wireframes

### Desktop (≥1100px) — primary screen is MAKE

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SWAN ◆ TASTE CONSOLE   who: owner ▾   memory: atlas-fall ▾   [+ new]         │
│                                       ╔══════╦══════╦══════╗                  │
│                                       ║ JUDGE ║ MAKE ║ KEPT ║ ← lit sill      │
╞═══════════════════════════════════════╩══════╩══════╩══════╩══════════════════╡
│ EVIDENCE (read-mostly)      │ COMPOSE                       │ QUEUE            │
│                             │                               │                  │
│ ─ Tier 1 · warm analog      │ ┌───────────────────────────┐ │ ▶ RENDER  (44px) │
│   [burger] [dusk] [35mm]    │ │ prompt textarea           │ │ ○ job 1 ·…       │
│ ─ Tier 2 · clean studio     │ │ (Fira Code)               │ │ ○ job 2 ·…       │
│   [packshot] [hard light]   │ └───────────────────────────┘ │ ✓ done → JUDGE   │
│ ─ Tier 3 · …                │ seeds: ( 1 ) ( 4 )            │                  │
│                             │ [ QUEUE TO COMFYUI ]          │                  │
│ (fits without scroll)       │                               │                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Visible without scrolling: header context, all three tabs, the full Evidence Rail, the compose area, and the render button. The queue list may scroll internally; the frame does not.

### 640px

```
┌────────────────────────────────┐
│ SWAN ◆   owner ▾  atlas-fall ▾ │
├────────────────────────────────┤
│ EVIDENCE                       │
│ [burger][dusk][35mm][studio] → │  ← horizontal scroll strip, one row
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ prompt textarea            │ │
│ └────────────────────────────┘ │
│ seeds: ( 1 ) ( 4 )             │
│ [    QUEUE TO COMFYUI     ]    │  ← full-width, 44px+
├────────────────────────────────┤
│   JUDGE  │  MAKE  │  KEPT      │  ← bottom bar, 56px tall,
│          ●                   │     44px hit areas each
└────────────────────────────────┘
```

On narrow screens the tabs move to a **bottom bar**, not a hamburger. A hamburger hides the tool's three verbs behind one tap plus a hunt; a bottom bar keeps every section one 44px tap away and matches how a phone is held. Images live in the same places as desktop — Judge's grid fills the viewport above the bar; Kept's gallery is a two-column grid above the bar.

---

## 3. The one signature visual move

**The Lit Sill.**

One horizontal line under the header, 2px tall, running the full width:

```css
.sill {
  height: 2px;
  background: linear-gradient(90deg, #002060, #8B5CF6 55%, #60C0F0);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.35);
}
.sill-indicator {
  position: absolute;
  height: 2px; width: 72px;
  background: #C6A84B;
  box-shadow: 0 0 8px rgba(198, 168, 75, 0.5);
  transition: transform 0.2s ease;
}
@media (prefers-reduced-motion: reduce) {
  .sill-indicator { transition: none; }
}
```

The active tab's Gilded Fern marker *slides along the sill* when he switches sections. That is the entire move: a quiet dark instrument with one live gold indicator traveling a blue-violet-cyan lightline.

Why this and not something bigger: the first-two-seconds read of a professional creative tool comes from **chrome that recedes so the photographs carry all the color**. Midjourney reads professional because its interface is nearly monochrome and the images scream. So the rule paired with the sill is: Obsidian/Carbon backgrounds everywhere, Frost White text, and the only saturated elements are the sill, the gold indicator, and the photographs themselves. One move, executed everywhere, beats five moves executed once.

---

## 4. Verdicts on A–J

| Idea | Verdict | Reason and shape |
|---|---|---|
| **A** Model-agnostic routing | **REFUSE** | There is exactly one render path in this tool: his own ComfyUI graph, plus Midjourney prompts copied out by hand. A routing abstraction over one engine is a surface with no function — pure maintenance weight, and the owner's precise failure mode. If a second engine ever exists, add a second button then. |
| **B** Use the subscription you already have | **ADAPT** | This is already true here and must simply be *protected*: prompts go out as text he pastes into his Midjourney subscription; renders come back through his own GPU. Concretely: the compose panel's copy button copies the full prompt with seeds formatted for paste. Zero new integration. Refuse any "connect your account" feature forever. |
| **C** Semantic local scan ("type burger, find burgers") | **REFUSE** | Real semantic search needs an embedding model and an index — a new dependency (constraint 7) and a standing maintenance surface (his failure mode). **Cheap substitute already paid for:** every judged picture already carries subject chips and style codes. Kept gets a chip-filter row over those. That is filename-free search he already owns the data for. |
| **D** Insights / spend per provider | **REFUSE** | Marginal cost here is electricity on his own GPU. A spend dashboard is a section that exists to be looked at twice and maintained forever. Cut. |
| **E** Studio + pluggable design systems | **REFUSE** | Breaks the corpus law outright: a pluggable system is a style package that travels between contexts, and "only a memory generates from its own evidence" forbids exactly that movement. Also redundant: Directions *are* this tool's taste system, already scoped per memory. |
| **F** Portfolio view | **ADAPT (narrowed)** | A portfolio **within one memory** is legitimate and is what Kept becomes: gallery grid, lightbox, client-ready. The cross-everything portfolio is **refused on sight** — it aggregates across memory boundaries, which the law forbids. If he wants to show the partner's work, he switches the memory select. Two taps, zero law violations. |
| **G** Full-screen preview + open in new tab | **ADOPT** | Native `<dialog>` with `::backdrop` — no dependency, satisfies constraint 7. Click an image in Kept or a finished render in Make → fullscreen on Obsidian, Esc or backdrop-click closes, focus returns to the invoking image. "Open in new tab" is a plain link; local-only is unaffected. |
| **H** Live edit / regenerate a single element | **REFUSE** | Inpainting-style region editing reaches into the render pipeline and the prompt grammar — both explicitly out of scope (§7) — and would be the single largest new surface in the tool. The honest cheap version already exists: judge the render as a miss, regenerate with an adjusted prompt. |
| **I** Publish / distribute | **REFUSE** | Violates constraint 2 (local-only, nothing leaves the box) in the most literal way possible. This is not an adaptation candidate; it is a different product. |
| **J** Nightly "dreaming" pass | **REFUSE** | An autonomous process writing to memory without a witness contradicts the tool's core epistemics — the entire design records *witnessed* decisions (reason-before-reveal exists precisely to stop unwitnessed rationalisation). A nightly pass is unwitnessed rationalisation at scale. If he wants proposals, he runs a pass himself and *judges* its output through the normal loop. |

Score: 1 ADOPT, 3 ADAPT, 6 REFUSE. That ratio is the point.

---

## 5. Click-cost table

Counts are taps/clicks from app-open, excluding typing. "Today" is reconstructed from the described header + four tabs.

| Task | Today | Proposed | Delta |
|---|---|---|---|
| Taste a grid (returning session) | 5 — who, memory, Taste pictures, pick best, pick miss (+reason typing) | 3 — who/memory persist from last session; Judge opens straight to a fresh grid | **−2** |
| Taste a grid (first ever session) | 5 | 5 | 0 |
| Generate prompts | 4 — Make tab, open/scan Directions, pick direction, generate | 2 — Make tab, tap a direction chip in the Evidence Rail (generate is one confirm) | **−2** |
| Render one | 3 — generate, choose seeds, queue | 2 — compose visible with queue beside it; seeds toggle + RENDER | **−1** |
| Show a client his work | 2 — Kept tab, scroll (flat cards) | 2 — Kept tab, tap image for fullscreen lightbox | 0 (but quality up) |

**Nothing costs more taps.** The savings come from two mechanisms, both cheap: (a) who/memory persist as header state and are restored on load; (b) Directions moved from a destination tab to always-visible rail chips. I will defend the one place I was tempted to add a tap and didn't: I considered a confirmation step before QUEUE TO COMFYUI to prevent accidental GPU jobs. I rejected it — the queue list shows pending jobs and a job can be cancelled cheaper than a confirmation modal can be dismissed four hundred times.

---

## 6. Three ways this design fails

1. **The Evidence Rail stops being read-mostly.** The moment inline direction-editing feels convenient, someone adds it — and Make absorbs what Directions used to do, blowing past the 300-line file cap and regressing a surface that currently works. The rail ships with *zero* editable controls, and the test in §7 item 9 exists specifically to fail the day someone sneaks an input into it.
2. **Kept gets heavy and janky exactly when it matters most.** Gallery-grade presentation with a few hundred kept images, without `loading="lazy"` and explicit `width`/`height` on every `<img>`, means slow first paint and layout shift — and he will discover this *in front of a paying client*, which is the worst possible failure venue for this specific tool.
3. **Stale-context leakage through the persisted header.** Persisting who/memory is my biggest click-cost win and my biggest risk: if switching `who` fails to hard-reset the memory select, the owner sees one profile's prompts or kept work labeled under another's memory. That is the closest the console UI can come to brushing the corpus law. The reset must be structural (changing who clears memory to empty, forcing a re-select), not a best-effort handler.

---

## 7. Test list

**Must be browser-level (real DOM, real rendering):**
1. **Reason-before-reveal holds:** with a fresh grid, assert every image is not visible/painted until its reason is confirmed; assert the reason input cannot be edited after confirmation. *Fails if anyone "improves" probe.css flow.*
2. **Never-show-twice:** judge all 12; request a new grid; assert zero intersection between judged IDs and the new set. *Fails if the exclusion guard is removed.*
3. **Undo restores the exact prior grid** — same 12 IDs, same positions, reason state rolled back.
4. **Lightbox behavior:** `<dialog>` opens on image click, traps Tab focus, closes on Esc and backdrop click, returns focus to the invoking image.
5. **Touch targets:** walk all focusable/clickable controls with `getBoundingClientRect`; assert min dimension ≥ 44px. *Fails the day someone adds a dainty icon button.*
6. **Reduced motion:** with `prefers-reduced-motion: reduce` emulated, assert the sill indicator has no transition and no animation runs.
7. **Who-switch resets memory:** change `who`; assert the memory select is cleared and no prompt/kept content renders until a memory is chosen. *This is the corpus-law tripwire from §6.3.*

**Can be pure node:**
8. **Line-count guard:** script asserts every file under `prompter/` is ≤ 300 lines. *Fails on the day Make starts absorbing Directions editing.*
9. **No-editable-controls-in-Evidence-Rail:** static parse of the make module's rail markup; assert zero `<input>`/`<select>`/`<button>` inside the rail container except none. Deliberately brittle — brittleness is the feature.
10. **Dependency guard:** parse all `.mjs`/`.js` import statements; assert only `node:` builtins; assert `package.json` has no runtime dependencies.
11. **Host-gate:** spin up `serve.mjs` in-process, send requests with a foreign `Host` header, assert rejection; assert no CORS headers present on any response.
12. **Contrast table:** compute WCAG ratios in node for every text/background pair actually used from the §5 palette; assert ≥ 4.5. See §8 for the pair this test will catch.
13. **Memory isolation at the store boundary:** unit-test the data layer — a read/write keyed to memory X with memory Y's id is refused.

---

## 8. What I checked and found sound

- **The palette, with one exception.** I computed WCAG ratios for the working pairs: Frost White `#E0ECF4` on Obsidian `#0A0A0F` ≈ 15:1; Ice Wing `#60C0F0` on Obsidian ≈ 9.7:1; Gilded Fern `#C6A84B` on Carbon `#141419` ≈ 8:1; Frost White on Royal Depth `#003080` ≈ 10.9:1. All comfortably clear 4.5:1. **One exception:** Wing Purple `#8B5CF6` measures ≈ 4.7:1 on Obsidian (barely passing) but ≈ 4.0:1 on Graphite `#1A1A24` — **failing**. Rule going forward: Wing Purple is a glow/border/sill color only, never body text on anything lighter than Obsidian. Test 12 enforces this permanently.
- **The four-tab file split.** Already conforming to the ~300-line cap with room for the Evidence Rail absorption. Sound; guard it with test 8 rather than restructuring it.
- **`probe.css` and the judging interaction.** Reason-before-reveal, never-show-twice, and Undo are the epistemic core of the tool. My design deliberately routes *around* it — JUDGE gets no new chrome beyond the shared header — rather than through it.
- **Multi-tenant-by-memory with empty start.** No inheritance between memories is the correct default and the strongest structural defense of the corpus law. Untouched.
- **The vanilla HTML/CSS/JS stack itself.** I checked whether the "professional console" goal secretly required a framework. It does not: the signature move is two CSS rules, the lightbox is a native `<dialog>`, lazy loading is an attribute. Constraint 1 and constraint 7 survive contact with the design.
- **Existing labeled controls and per-tab explainers.** Accessibility groundwork is already laid; the redesign inherits it rather than replacing it.
- **The scope boundary in §7.** Judging interaction, prompt grammar, corpus laws, render pipeline, ComfyUI graph — all correctly fenced off, and every REFUSE in §4 was issued partly *because* respecting that fence is what protects the owner from his own additive instinct.

— Ox Alpha
