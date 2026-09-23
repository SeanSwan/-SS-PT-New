# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** ./SWAN-FORGE-PACKET.md
**Seed:** (none)
**Tokens:** 2741 in / 13756 out | **Cost:** ~$0.2146 | **Wall:** 618.7s | **finish_reason:** stop

---

# KIMI K3 — REVIEW: Swan Forge UI/UX + Hostile Architecture Pass

**Verdict up front:** §2's shape is right and its sequencing is wrong. The UI below is designed to ship on the backend consumer alone, with MCP and CLI as later doors into the same room. Ten answers first, then I take the blueprint apart.

---

## §A — THE TEN ANSWERS, CONCRETE

### A1. Where it lives: a workspace route, not a modal, not a rail

**Decision:** Dedicated route `/dashboard/content-studio/forge` inside the Content Studio section. Two entry points, zero new chrome:

- `ForgeLauncher` — a card on the Content Studio home: *"Describe it. Get the still. Make it move."*
- "Open in Forge ↗" action on existing project detail pages (deep-links with project pre-selected as save target).

**Rejected:** A modal over any design surface = scope creep and focus-trap hell on mobile. A persistent side-rail = dies at 375px and competes with existing nav. The Forge is a *room you walk into*, not a widget that follows you. Trainer access later = one role check on the route, not a redesign.

```
┌────────────────────────────────────────────────────────────────────┐
│ ◂ Content Studio / Forge                      This session: $0.41  │
├───────────┬────────────────────────────────────────────────────────┤
│ SESSIONS  │  BRIEF                                                 │
│ ▸ Today   │  ┌──────────────────────────────────────────────────┐  │
│  · Glass- │  │ Describe the image you can't stop seeing…     🎙 │  │
│    bone   │  └──────────────────────────────────────────────────┘  │
│  · Tide-  │  [ Guide me ]                       [ Find directions ]  │
│    clock  │                                                        │
│ ▸ Earlier │  ── ROUND 1 of 3 ──────────────────────────────────   │
│           │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ + New     │  │ "Glassbone"  │ │ "Cold Orbit" │ │ "Tideclock"  │    │
│   brief   │  │ A falcon of  │ │ The falcon   │ │ The falcon   │    │
│           │  │ frozen light,│ │ as an orbital│ │ as a clock   │    │
│           │  │ mid-strike…  │ │ relay of bent│ │ of migrating │    │
│           │  │              │ │ starlight…   │ │ birds…       │    │
│           │  │ ▓▓▓ ░░░ ▒▒▒  │ │ ▓▓▓ ░░░ ▒▒▒  │ │ ▓▓▓ ░░░ ▒▒▒  │    │
│           │  │ [ Choose ]   │ │ [ Choose ]   │ │ [ Choose ]   │    │
│           │  └──────────────┘ └──────────────┘ └──────────────┘    │
│           │  Preview all three as images · $0.09                   │
└───────────┴────────────────────────────────────────────────────────┘
```

---

### A2. Input affordance: free text first, "Guide me" as serialized questions, voice for free

`BriefComposer` with `mode: 'free' | 'guided'`.

- **Free text is the default.** Placeholder copy: *"Describe the image you can't stop seeing…"*
- **Voice = the device's own dictation** (keyboard mic on iOS/Android, OS dictation on desktop). A `<textarea>` is voice-compatible for free. Building custom voice infra in v1 is a bonfire.
- **"Guide me"** converts the brief into 3–5 questions asked **one at a time** (the T5 loop, serialized — never a questionnaire wall). Each question offers chips + an "Other…" free-text escape:

```
┌──────────────────────────────────────────┐
│ GUIDE ME · question 2 of 4               │
│                                          │
│ Where is it happening?                   │
│                                          │
│ [ Deep space ]  [ Ocean floor ]          │
│ [ Inside a glacier ]  [ City at 3am ]    │
│ [ Other… ]                               │
│                                          │
│ ◂ back              skip this question ▸ │
└──────────────────────────────────────────┘
```

Question 1 is always: **"What's the ONE impossible thing happening?"** — it maps directly to `forge_direction`'s impossible-phenomenon slot. The guided answers compile into the same brief object as free text. One data shape, two doors.

---

### A3. Three directions: text cards + facet swatches; paid previews are opt-in

**Key cost decision:** Gate-0 directions ship as **text + a deterministic `FacetSwatchStrip`** — a palette strip derived from the taxonomy facets (Temperature›Arctic → cool token hues, etc.). Zero generation cost, and a non-designer still gets a *visual* differentiator between cards. Generating three preview images by default triples spend before Sean has chosen anything — that violates behavior #4 in spirit. Instead: one explicit paid action, *"Preview all three as images · $0.09."*

**Desktop:** three cards side-by-side (proven pattern). **Mobile 375px:** snap carousel, card at 85% viewport width so the next card peeks in, position label "2 of 3," dot pips. Never a vertical stack of three full cards — that's scroll death.

```
┌─────────────────────────┐
│ ◂ Forge          $0.41  │
├─────────────────────────┤
│ "A falcon of frozen     │
│  light, mid-strike"     │
│                         │
│ ┌───────────────────┐ ┌─│
│ │ DIRECTION 2 of 3  │ │ │
│ │ "Cold Orbit"      │ │ │
│ │                   │ │ │
│ │ The falcon as an  │ │ │
│ │ orbital relay of  │ │ │
│ │ bent starlight…   │ │ │
│ │                   │ │ │
│ │ ▓▓▓▓ ░░░░ ▒▒▒▒    │ │ │
│ │                   │ │ │
│ │ [ Choose this ]   │ │ │
│ └───────────────────┘ └─│
│ ○ ● ○        swipe ▸    │
│                         │
│ [ Preview all 3 · $0.09]│
└─────────────────────────┘
```

`DirectionCard` states: `loading` (calm shimmer skeleton) → `ready` → `selected` (cyan border + glow per Dual-Button language) → `previewed` (thumbnail replaces swatch strip).

---

### A4. Convergence loop: pinned still + taxonomy-generated chips + free text

```
┌──────────────────────────────────────────────┐
│ ROUND 2 of 3          ●●○       Session $0.47│
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │                                          │
│ │            [ PINNED STILL #3 ]           │
│ │                                          │
│ │                         Why this? ▸      │
│ └──────────────────────────────────────────┘ │
│ Make it:                                     │
│ [ Colder light ] [ More empty space ]        │
│ [ Less detail ]  [ Slower feel ]  [ + facet ]│
│ ┌──────────────────────────────────────────┐ │
│ │ Or tell it: "more like #3 but the light  │ │
│ │ should feel like 4am, not noon"       🎙 │ │
│ └──────────────────────────────────────────┘ │
│ [ Generate round 2 · $0.06 ]                 │
└──────────────────────────────────────────────┘
```

The design move that matters: **`RefineChips` are generated from the taxonomy, not hardcoded.** When a still is pinned, the compiler diffs current slot values against adjacent facets and offers 4–6 chips that are *guaranteed compilable* — tapping one sets a slot override. Free text routes through the same compiler. "More like #3 but colder" = tap still #3 → tap [Colder light] → one button. Three taps.

**No draw-on-image in v1.** Masked inpainting is unverified (risk #3); don't promise it. The chip system is designed so a future "brush mode" slots in as a third input mode without redesign.

**The 3-round cap is a soft cap, not a wall** — because Sean *will* want round 4, and a hard wall becomes the most-hated feature in week one. After round 3:

```
│ Your three rounds are done.                  │
│ [ Pick a still → ]   [ One more round · $0.06│
│                        Round 4 rarely beats  │
│                        round 3. Your call. ] │
```

Friction and honesty, not a locked door.

---

### A5. Cost: on the action, quiet in the corner, loud only at thresholds

The taxi-meter anxiety comes from a *ticking, animating* total. Kill that. Three surfaces, three volumes:

1. **Cost on the button** — every spend action carries its estimate in the label: `Generate round 2 · $0.06`. Estimate comes from the adapter's `estimateCost(provider, op)`, shown *before* the click, never after.
2. **`SessionCostPill`** top-right: `This session: $0.41`. Static text, no count-up animation, no color on default.
3. **Thresholds:** pill turns amber (`var(--color-warning, #d9a441)`) at $5 session spend; at $10 a hard confirm dialog: *"You've spent $10.24 this session. Continue?"* Both thresholds configurable per-role.

Transparency without a meter: the number is always findable, never waving.

---

### A6. Still → video: a deliberate friction sheet with a two-step price

The approved still gets the primary action **"Make it move"** — and this is where Dual-Button Glow does semantic work: normal generation buttons are blue-bg→purple-glow; the money door is **purple-bg→cyan-glow**, so the expensive action is visually distinct before a word is read.

`VideoGateSheet` (bottom sheet on mobile, centered dialog on desktop):

```
┌─────────────────────────┐
│ ═══                     │
│ MAKE IT MOVE            │
│ ┌───────────────────┐   │
│ │  [ still thumb ]  │   │
│ └───────────────────┘   │
│ Motion:                 │
│ ┌───────────────────┐   │
│ │ Camera pushes in  │   │
│ │ slowly; light     │   │
│ │ shifts across the │   │
│ │ wing.          ✎  │   │
│ └───────────────────┘   │
│ Length:  ( 5s )  ( 10s )│
│                         │
│ Step 1  Preview 480p    │
│         $0.60           │
│ Step 2  Final 1080p     │
│         $1.80 — unlocks │
│         after you       │
│         approve preview │
│                         │
│ Video can't be un-made. │
│ The preview is the      │
│ cheap way to check.     │
│                         │
│ [ Generate preview      │
│            · $0.60 ]    │
└─────────────────────────┘
```

Motion prompt is **pre-filled by the compiler** from the still's slots — Sean edits, doesn't author from blank. 480p is the default and 1080p is *visually locked* until preview approval (behavior #2, enforced in the session service — see §B.4). After preview plays: `ApproveBar` = `[ Render final 1080p · $1.80 ] [ Regenerate preview · $0.60 ] [ Back to stills ]`.

---

### A7. Empty / loading / error / partial: the build *is* the loading state

**Empty** — `ForgeEmptyState`: crystalline swan line-art (SVG, token-stroked), headline *"Describe the image you can't stop seeing."*, three tappable example briefs (doubles as onboarding).

**Loading (40–120s)** — no spinner. `GenerationTheater`: the compiled prompt materializes slot-by-slot. It's `forge_explain` doing double duty — information holds attention; animation just marks time.

```
┌──────────────────────────────────────────────┐
│ BUILDING YOUR PROMPT                         │
│                                              │
│ the impossible thing ▸ frozen light, mid-    │
│                        strike                │
│ environment          ▸ high stratosphere,4am │
│ light                  cold rim from below   │
│ palette                arctic blue, violet   │
│ lens                 ▒▒▒▒▒▒▒▒▒▒                │
│                                              │
│ ████████████░░░░░░  usually 60–90s · 0:47    │
│                                              │
│ LAW checks: kill-list ✓ · gold ✓ · LAW 4 ✓   │
└──────────────────────────────────────────────┘
```

**Reduced motion is handled in JS**, per constraint — a `useReducedMotion` hook reads `matchMedia('(prefers-reduced-motion: reduce)')` and the theater consumes it: `const stagger = reduced ? 0 : 120`. Lines render instantly; the progress bar still updates (that's state, not motion). No CSS-only media query making decisions the component can't see.

**Error (fail-closed)** — `ForgeErrorCard`:

```
┌──────────────────────────────────────────────┐
│ Nothing was generated. Nothing was charged.  │
│                                              │
│ The image provider didn't answer in time.    │
│ Your brief is saved — nothing is lost.       │
│                                              │
│ [ Try again ]       [ Change the brief ]     │
│ Technical details ▸ (admin only)             │
└──────────────────────────────────────────────┘
```

First line is contractual copy — it never changes, because it's the trust the whole surface runs on. Raw provider JSON is admin-only, behind disclosure.

**Partial failure** (2 of 3 variants land): show the two; the third card enters `failed` state: *"This one didn't make it. [ Retry just this one · $0.03 ]"* — never re-run the batch.

---

### A8. `forge_explain` in UI: `WhyThisPanel`, written in human language

Every generated still carries a disclosure row: **"Why this? ▸"**. Desktop: right-side panel. Mobile: bottom sheet. Content: the 12 slots as a table — but slot names are translated (*"The impossible thing"*, never `phenomenon_slot`), each with a **craft note** naming its source, plus LAW badges:

```
┌──────────────────────────────────────────────┐
│ WHY THIS?                                    │
│ ┌──────────────────────────────────────────┐ │
│ │ The impossible thing                     │ │
│ │ "frozen light, mid-strike"               │ │
│ │ From your brief · round 1                │ │
│ ├──────────────────────────────────────────┤ │
│ │ Cold palette: arctic blue / violet       │ │
│ │ From your chip "Colder light" · round 2  │ │
│ │ Facet: Temperature › Arctic              │ │
│ └──────────────────────────────────────────┘ │
│ LAW: kill-list ✓   gold ✓   LAW 4 optics ✓   │
│ Full prompt string ▸              [ copy ]   │
└──────────────────────────────────────────────┘
```

The craft notes are the teaching layer: after ten sessions Sean has absorbed the vocabulary ("Temperature › Arctic") without a single tutorial. The full prompt string is one tap deeper for the day he wants it.

---

### A9. Mobile: first-class for the core loop, honestly scoped at the edges

**Not** "desktop-first with phone review-only" — that fails Sean's actual behavior (he dictates and reacts on his phone). Phone gets the full money loop: brief → directions → refine → approve still → trigger video preview → approve 1080p. What phone does *not* get in v1: the side-by-side tournament grid (variants render as a swipe deck instead) and multi-session management.

Mobile rules: single column; all gates as bottom sheets; `SnapCarousel` for directions; `StickyActionBar` pins the primary action in the thumb zone; **44px minimum targets everywhere**; the 🎙 dictation affordance sits inside every text field.

---

### A10. IA relationship: Forge is the verb, Projects is the noun

The Forge is the **generation front-end**; Content Studio projects remain the **storage back-end**. No new media library, no bolted-on tab:

- Content Studio nav order becomes: **Forge** · Projects · (existing items). Creation first, archive second.
- Every Forge session saves into a real project via the existing `contentStudioProjectService` — outputs appear in Projects with a badge: *"Made in Forge · Resume session ↗"* (deep link restores the session state).
- Nothing is duplicated. If you delete the Forge tomorrow, Projects still holds every asset.

---

### Component inventory (300-line cap respected by decomposition)

```
/forge
  ForgeWorkspacePage.tsx          // layout + routing only
  components/
    BriefComposer.tsx             // free/guided modes
    GuidedQuestionStep.tsx
    DirectionCardStack.tsx        // desktop grid
    SnapCarousel.tsx              // mobile
    DirectionCard.tsx
    FacetSwatchStrip.tsx
    RoundPips.tsx
    PinnedReference.tsx
    RefineChips.tsx
    GenerationTheater.tsx
    WhyThisPanel.tsx
    VideoGateSheet.tsx
    ApproveBar.tsx
    SessionCostPill.tsx
    StickyActionBar.tsx
    ForgeEmptyState.tsx
    ForgeErrorCard.tsx
  hooks/
    useForgeSession.ts
    useGenerationJob.ts           // polls server-side job status
    useReducedMotion.ts
```

Constraint compliance, demonstrated once:

```tsx
const GenerateButton = styled.button`
  min-height: 44px;
  background: var(--color-action-blue, #1d4ed8);
  color: var(--color-text-on-action, #f8fafc); /* AA: ≥4.5:1 on bg */
  transition: box-shadow 240ms ease;           /* calm, LAW 6 */
  &:hover, &:focus-visible {
    box-shadow: 0 0 18px var(--color-glow-purple, #a855f7);
  }
`;
/* VideoGateSheet confirm: purple bg → cyan glow. Money door looks different. */
```

---

## §B — HOSTILE PASS ON §2

**B1. "One brain, three consumers" is the right shape shipped in the wrong order.** Three consumers on day one = three auth contracts, three error shapes, three rate-limit policies, while you're *also* still tuning prompt quality. MCP-first is vanity: you'd be debugging agent transport before the brain has produced fifty good prompts for a real human. And the doc's own §4.5 admits an unregistered MCP server is BLOCKED — so the blueprint's lead consumer is gated behind paperwork the doc files as an "open question." Sequence: **backend service → CLI (nearly free, thin wrapper) → MCP** (a week of work once the core is stable). The diagram presents peers; they are not peers.

**B2. "Deterministic" is the wrong invariant, and the doc already knows it.** Behavior #6 promises determinism; risk #4 admits provider seed determinism is unverified. Those two bullets contradict each other in the same document. Worse, `forge_variants` *requires* controlled non-determinism — full determinism is anti-product. The honest, testable invariant is **replayability**: every generation persists a `GenerationRecord` (brief, slots, seed, model slug, compiled prompt string, estimated vs. actual cost) so any output can be re-derived and any prompt can be snapshot-tested. Rename behavior #6 before someone holds you to the word "deterministic" in a review six months from now.

**B3. The 15×51 taxonomy is the largest unvalidated assumption in the packet.** §1.4 diagnosed the real defect as *drift*. Drift is cured by one module — not by 765 facets. Nobody has shown that 765 facets compile into better prompts than the 3-line string they replace, and v1 would drown in taxonomy curation wearing a product costume. Ship the ~60 facets the LAW filter and launch directions actually reference; grow the taxonomy only when a direction can't be expressed. The taxonomy is a garden, not a foundation.

**B4. The cost ladder is in the wrong layer.** "480p → approve → 1080p, enforced in the adapter" — no. That ladder is *workflow state*: it needs an approval record, which lives in the session/project model. Adapters should declare capabilities and estimate cost; the gate belongs in the core session service. Put it in the adapter and the CLI and MCP each re-implement approval state — congratulations, you've rebuilt §1.4's three-way drift one floor down.

**B5. Spend has no server-side gate, and the doc commits the exact sin it condemns.** "Cost confirmation before spend" is client-side theater without a server-enforced cap. The doc's own grep surfaced `lib/cost-gate.mjs` — an existing cost gate in the repo — and the blueprint never says whether the Forge reuses it or builds a second one. A document whose central thesis is "one brain, no drift" cannot stay silent on whether it's about to duplicate the cost gate.

**B6. Job persistence is absent, and it's the thing that kills the product on day one.** Generations run 40–120s. Sean is on his phone. He switches apps, the tab suspends, the socket drops. Without a server-side job record the client can re-attach to, that $0.06 — and, worse, his trust — evaporates. Related: the claim that Hailuo is "a provider registration, not a rewrite" is probably true for auth/transport and probably **false for lifecycle**. MiniMax video is submit→poll→fetch async; the existing service is a generic synchronous POST. If that's the case, you need a job state machine, not a registry entry. Verify before promising.

**B7. `forge_variants` and the tournament are referenced but never scoped.** In or out? It haunts the tool table and §3's questions without a single state, route, or cost line. (My call: out of the first slice — §C.)

**B8. The registry gate is a launch dependency misfiled as an open question.** If unregistered = BLOCKED, the registry entry belongs on the critical path of the first slice, not in §4.

---

## §C — SMALLEST FIRST SLICE: **"FIRST LIGHT"**

**Brief → Still, inside Content Studio, admin-only.**

| IN | OUT (and why) |
|---|---|
| Route `/dashboard/content-studio/forge`, admin-only, **registry entry filed first** (unblocks §4.5/§B8) | Hailuo / video — blocked on §4.1, the packet's own highest-risk unknown |
| `BriefComposer`, free-text only (native dictation = voice for free) | GPT-image — slug verification risk; Gemini path is already configured, zero new provider risk |
| `forge_direction` → 3 text directions + `FacetSwatchStrip` | Guided mode — add after watching 5 real briefs fail/succeed |
| `forge_image` via the **existing Gemini service** | MCP server, CLI migration (§B1 sequencing) |
| One refinement round via `RefineChips` (proves the loop) | Tournament / `forge_variants` (§B7) |
| **`GenerationRecord` persisted + `WhyThisPanel`** — explain is the differentiator, it ships in the slice | Inpainting — unverified (risk #3) |
| **Server-side job record + `useGenerationJob` polling** (§B6 — non-negotiable even here) | |
| Cost-on-button + `SessionCostPill` + fail-closed `ForgeErrorCard` | |
| Saves into a Content Studio project via existing `contentStudioProjectService` | |

**Why this proves value end-to-end:** Sean's verbatim ask was *"I tell the brain what I want, and it creates pictures."* FIRST LIGHT delivers exactly that sentence — type, see three intelligent directions (the "smart brain" claim), refine once, get a still saved in his existing studio, with the brain's reasoning visible. It routes around both highest-risk unknowns (Hailuo's existence, GPT-image slugs) while laying the spine everything else plugs into: compiler + `GenerationRecord` + job persistence + project storage. Video, variants, MCP, and CLI all become *additions to a proven loop* instead of bets placed in parallel.

**Done means:** Sean completes brief → saved still in under 3 minutes, twice, without asking how — and compiled-prompt snapshot tests pass in CI.

---

## §D — WHAT BREAKS FIRST AT REAL USAGE

1. **The 90-second wait on mobile.** If job persistence gets cut from the slice, the first backgrounded tab loses money and trust. This is why it's non-negotiable in §C.
2. **Silent prompt-quality regressions.** No golden-set is specified anywhere in the packet. Without snapshot tests of compiled prompts per direction, the first "these got worse" from Sean is undiagnosable. The "smart brain" claim is unfalsifiable until this exists.
3. **Estimate vs. actual billing drift.** Adapter estimates will diverge from real provider billing. Log actuals against estimates from day one, or the first surprise charge destroys the cost UI's credibility permanently.
4. **The 3-round cap.** Sean will hit it and want a 4th. Hence the soft-cap design in A4 — a nudge with friction, not a wall.
5. **Direction sameness.** If the three directions read as the same image with adjectives swapped, the "smart brain" claim dies in the first session. This is the real product risk, and it's a prompt-engineering problem — no UI in this document can save it.

## §E — ABSENCE-FIRST, RANKED BY VALUE LEFT ON THE TABLE

1. **Job persistence / resumability** — without it, mobile is a coin flip with money in it.
2. **Golden-set regression tests for the compiler** — the brain's quality is otherwise unmeasurable.
3. **Server-side `SpendGate` reusing `lib/cost-gate.mjs`** — per-role caps; answers §4.6 with enforcement, not policy.
4. **Rejection-signal capture** — when Sean rejects all three directions, that event is the most valuable tuning data the system will ever produce. Nothing records it. One line on `GenerationRecord` (`outcome: accepted | refined | rejected_all`) fixes it.
5. **Asset lineage** — `parent_id` on `GenerationRecord` (which still fathered which video). Cheap today, a painful retrofit the week video ships.

**One-line summary for Sean:** the brain shape is right — cut MCP from v1, rename "deterministic" to "replayable," shrink the taxonomy to what the LAWs actually use, move the cost ladder into the session service, and ship FIRST LIGHT: type a sentence, get three smart directions, get a still in your studio, see exactly why it looks that way.
