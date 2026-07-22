# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\5ee4c5b4-4b1c-41c6-ad8f-580ad41df9e6\scratchpad\kimi-coach-convergence-consult.md
**Seed:** (none)
**Tokens:** 1470 in / 2985 out · **Cost:** ~$0.0492 · **Wall:** 111.7s

---

# HOSTILE REVIEW — Coach Convergence Wave (Kimi K3 / SwanStudios front-end)

## (a) VERDICT

**SEND-BACK** — the architecture thinking is sound, but this doc punts on every decision that determines whether this looks like SwanStudios or like a generic AI-sidebar SaaS product. The three open questions ARE the design.

---

## (b) Design weaknesses, most-severe first

**1. Q2 — Concept C (orbital ring) is dead on arrival. Kill it now.**
An orbital ring around the swan mark is pure decoration: no hierarchy, no scanning order, unreadable at 320px (a ring of 12-16 muscle nodes collapses into a spirograph), and it puts brand mark ahead of data — backwards. It also has no honest way to encode three states + a percentage without becoming illegible. This is the "template feel" option dressed up as brand.

**2. Q2 — Concept B (gem tiles) is the gamification trap.**
"Gem that recharges, count-up % on tap" is fitness-app clipart. Count-up animations are motion debt: they're non-essential animation that must be entirely gated behind `prefers-reduced-motion` (at which point the tile is a static box with a number — the concept evaporates). A grid of identical rounded tiles with glow is exactly what every Mobbin-scraped competitor ships. It has no signature.

**3. Q2 — Concept A (crystalline body-silhouette heat map) is the only defensible winner, and you're underselling it.**
It reuses BodyMap SVG regions (design-system fidelity, zero new asset debt), it's body-literate (clients understand "my legs are dim" instantly), and the refraction-glow-per-state is the actual Crystalline Swan signature moment — IF executed as a prismatic edge treatment, not a flat drop-shadow glow. Flat glow = cheap shadow violation. Requirement: state encoded by **fill luminance + facet edge refraction + shape/texture** (hatch or facet-density shift), never color alone — READY/CAUTION/LOADING on a dark crystalline surface is a red/green colorblindness trap and a WCAG contrast trap otherwise.

**4. Q1 — the dock failure UX question is the real design risk and the doc treats it as an afterthought.**
"LLM proposes an invalid tool" must NEVER be silent and NEVER be a toast that vanishes. It renders inline in the transcript as a first-class message: *"I tried to set 4 rounds, but this screen doesn't support that yet — here's what I can do."* Silent failure in an agentic surface is how you destroy client trust in one session. This is non-negotiable, and the doc lists it as question (d) like it's optional.

**5. Q1 — per-call highlight will become noisy motion if specced loosely.**
"Per-call visible highlight" during a 6-call sequential batch = a strobe of flashing panels. Spec it: highlight = a single traveling focus ring (2px crystalline edge, GPU-safe `opacity`/`transform` only, ~600ms settle), not per-panel background flashes. Under reduced-motion: zero highlight animation, state changes are instant, transcript entries carry the temporal weight.

**6. Weak CTA hierarchy in the dock flow.**
The doc never says what the dock's primary action is. If the user types "make this a fat-loss circuit," what is THE button? If it's "execute live with undo," then the undo chip must be visually louder than any dock chrome for its lifetime — it's the only safety affordance. A ghost-styled undo chip in a corner is a dark pattern.

---

## (c) Implementation-fidelity attacks

1. **Undo decision — answering directly:** aggregate undo chip, execute live, zero clicks. Sean's right. Per-batch "Apply" confirm turns every coach interaction into a modal tax and makes the agent feel like a form wizard. Per-call undo is a history-management nightmare on a multi-panel builder (BootcampBuilder is already over-file-budget). Spec: one aggregate chip, 15-second window, label echoes the batch ("Undid: 4 rounds × 6 stations"), chip is min **44px height**, fixed position within the dock, not floating over surface content (it will occlude builder panels at 768px otherwise).
2. **Digest size:** enums/counts is correct, but add `focusedRegionId` / `selectedStationId` — without the user's current selection context the LLM will propose tools against the wrong scope and you'll get wrong-surface mutations, the worst agentic failure mode.
3. **Grid/concept A touch targets:** SVG region hits on a body silhouette at 320px will fail 44px. Small muscle groups (forearms, calves, neck) are physically tiny on the silhouette. Required: invisible 44px hit-proxy shapes per region, or a companion stacked list under 375px (silhouette scales down to ambient hero at top, list below carries interaction).
4. **Heat-map color contrast:** state text (READY etc.) on a glowing crystalline fill will not hit 4.5:1 if you put text on the glow. Text goes on the surface below/beside the silhouette, or in the list rows. Test the CAUTION state specifically — mid-luminance amber on dark crystalline is where 4.5:1 goes to die.
5. **The 48-72h recovery curve sparkline (per-muscle detail):** Victory ONLY. If anyone reaches for Recharts or a hand-rolled SVG path for this, reject. A tiny Victory `Area` with `animate` gated behind reduced-motion.
6. **File budget:** `BootcampBuilder` is already a flagged multi-panel monster. The dock contract integration goes in a NEW `useSurfaceToolContract.ts` hook + `CoachDock.tsx` panel — do NOT inline tool registration into BootcampBuilder's existing panels or you'll push them over 300 lines and create a merge war zone.
7. **Keyboard/focus:** the dock conversation panel, tool transcript entries, undo chip, and every readiness region must be in a sane tab order. Tool-call execution must move focus to the mutated surface region (announce via `aria-live="polite"` on the transcript) — otherwise keyboard/screen-reader users get invisible mutations, which is exactly the "agent did something somewhere" failure.
8. **Nested interactive elements:** readiness regions inside tappable cards inside a grid — watch for `<button>` inside `<button>` when tiles get both a tap-to-detail and a count-up interaction. One interactive element per region; detail opens a sheet.
9. **Theme check:** any "refraction glow" must use `var(--token, #crystalline-fallback)`. If I see `#00FFFF` or `#7851A9` resurrected from the retired Galaxy-Swan palette in a glow gradient, it's an instant reject. Crystalline refraction ≠ Galaxy neon.
10. **Responsive honesty:** at 1440+ the dock + builder is fine; at 768 the dock must collapse to a bottom sheet (side panel + multi-panel builder at 768 = 40% usable surface); at 320 the readiness silhouette is hero + list, full stop. Nobody has spec'd the 2560/3840 behavior — crystalline glows band badly on wide-gamut 4K; cap glow spread, don't scale it.

---

## (d) The ONE highest-impact change

**Make the readiness heat map "The Crystalline Body" — the literal face of the site — and commit to it as the signature moment.** Concretely: the silhouette renders as faceted crystal (not a flat medical body icon — that reads clinic, not swan). Each muscle region's recovery state drives a slow, GPU-safe prismatic shimmer along its facet edges — a `transform`/`opacity` caustic sweep at ~0.2 opacity, fully frozen under reduced-motion. A client opening their home sees their own body as a dim-lit crystal that brightens as they recover. Nothing in the fitness-SaaS space looks like that. Everything else in this wave (dock, chips, transcripts) is table stakes a competitor can copy in a sprint; a hand-tuned faceted-crystal body tied to real recovery data is not. Pair it with an honest label (below).

## On the scoring overclaim question (Q2 tail): YES, label it.
Ship it as **"Recovery estimate"** with a one-tap explainer ("based on your last sessions and restore work — your trainer makes the call"). This isn't hedging, it's the trainer-indispensability law rendered in UI: the grid informs, the trainer decides. Client view stays read-only ambient — correct in the doc, keep it.

## Q3 copy register — direct answer
Two-tier, non-negotiable: **clients never see syndrome names.** Client chip: *"Built around how you move"* → tap expands → *"Your trainer focused on your left shoulder and hips this block."* Trainer view gets the NASM vocabulary ("lower-crossed pattern", "UCS/LCS") — it flatters the trainer's expertise where expertise belongs. Syndrome language to a client is diagnosis-flavored liability AND scary copy; it fails both legal caution and tone in one move.

---

## (e) What a design-savvy competitor out-builds here

1. **They ship the readiness reveal as cinema.** Day-one homescreen: the crystal body is dark, one restored region kindles with light. If we ship a static SVG with three fill colors, their Lottie-grade reveal wins the screenshot war.
2. **Their dock shows tool execution as a visible cursor driving the surface** — a highlighted "ghost pointer" travels to each mutated control. Ours currently spec's a highlight ring; if that ring is a box-shadow pulse it looks 2019. Spring-physics travel or nothing.
3. **They nail the undo feel** — chip slides up with a progress-ring countdown draining the 15s window. Ours, as spec'd ("undo chip"), is a wireframe noun, not a designed moment.
4. **They do per-muscle detail sheets** with the Victory recovery curve, "last trained 41h ago," and the client's actual restore log. If our grid is a dead read-only ambient with no drill-down on the trainer side, the trainer (the paying user) gets less value than the client.
5. **They'll beat us on 320px density** if we try to keep the silhouette interactive on small phones instead of degrading gracefully to hero + list.

**Bottom line:** approve the tool contract (execute-live + aggregate undo + inline failure transcript), lock Concept A as the signature Crystalline Body with an "estimate" label, split Q3 copy by audience, and spec the motion/focus/touch details above before a line of styled-components is written.
