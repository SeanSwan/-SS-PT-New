# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/design-brain/mockups/hermes-web-chat-mockup-b.html
**Tokens:** 5925 in / 23231 out (reasoning: 20809) | total 29156
**Wall:** 317.9s

---

# 1. Verification of the 10 punch-list items

| # | Item | Verdict |
|---|------|---------|
| 1 | `--ink-3` → `#7d8491` | **Holds** — 5.1:1 on `--bg`/`--bg-rail`. Caveat: 4.7:1 on `--bg-elev` surfaces (`.q`, placeholder). Still AA, but the token comment claims one number that's only true on the darkest surface. |
| 2 | Global `:focus-visible` | **Holds, with two defects.** `border-radius:3px` in the focus rule mutates the *element*, not the outline — `.stopbtn`/`.send`/`.b-y`/`.b-n` (5px) snap corners on focus. And `textarea` gets both the global outline and `.cbox:focus-within` → double ring. Fix in N8. |
| 3 | Real buttons + `aria-expanded` | **Holds for tools/sessions; incomplete for the new toggles.** `#railToggle`/`#actToggle` are buttons but stateless — no `aria-expanded`, no `aria-controls`. Glyph spans pollute accessible names. Fix in N2/N3. |
| 4 | Approval card rebuild | **Holds structurally** (bar ✓, self-contained cmd ✓, queue ✓, static resolved state ✓, focus-to-Deny ✓). Implemented superficially in one respect: the *resolve transition* is unwired — no JS on `.b-y`/`.b-n`; "resolvable" exists only as a painted end-state. Also the pending count "2" is hand-maintained in four places (card `.q`, rail `h2`, turnstate, qcard). Fix in N7. |
| 5 | Tool rows w/ glyphs + timings | **Holds.** Error is text ("exit 1"), not color-alone. Missing: a *running* state in the grammar — every row is terminal. See N5. |
| 6 | Responsive 1280/1060/720 | **Holds at all three widths** (checked the `#railToggle` id-vs-class specificity — no dead-button window). New problem: closed rails keep tab stops. Fix in N2. Nit: header comment says 960/640; code says 1060/720. |
| 7 | `toolout` 264px cap | **Holds** — cap + `overflow:auto` + `overflow-wrap:anywhere`; collapsed outputs are `display:none` so SR skips them. One gap: scroll container isn't keyboard-reachable. Fix in N3. |
| 8 | Restraint cuts | **Holds.** No accent YOU, no dot, no ⚠, no glow; pulse has a reduced-motion guard. |
| 9 | Stop + turnstate | **Holds visually.** Defects: status text is not a live region (N1); Stop's semantics (abort model only? abort tool? what happens to pending approvals?) are undefined — see §3. |
| 10 | Composer border `#5c626e` | **Implemented exactly as I specified — and my spec was miscalibrated.** `#5c626e` on `--bg` is 3.15:1, but the composer/Deny/send borders sit on `--bg-elev`: **≈2.9:1, failing WCAG 1.4.11** (3:1 for control boundaries). My error; fix in N4. |

# 2. What I missed — ranked, exact changes

**N1 · SEV-1 · No live regions anywhere.** Streaming tokens, turn-state changes, approval arrival, and queue changes are all silent to SR users.
```html
<div class="thread" role="log" aria-live="polite">                      <!-- announces appended turns -->
<span class="ts" role="status">waiting on approval · 2 pending</span>   <!-- inside .turnstate, Stop button OUTSIDE this span -->
<div class="h"><span role="alert">Approval required — shell</span><span class="q">2 of 2</span></div>
```
Architecture: `role="log"` announces per appended *child* — append per turn, never per token; mutate the active turn's text node in ≥50ms batches, and make announcement cadence follow batch cadence (they are one design, not two).

**N2 · SEV-1 · Off-canvas rails keep tab stops.** Not literally a trap — a leak: at ≤720px, tab order walks through 6+ invisible session buttons; focus-visible rings render off-screen (2.4.7/2.4.11 fail).
```css
@media (max-width:1060px){ body:not(.act-open)  .act {visibility:hidden;transition:transform .16s,visibility 0s .16s} }
@media (max-width:720px){  body:not(.rail-open) .rail{visibility:hidden;transition:transform .16s,visibility 0s .16s} }
```
HTML: `aria-expanded="false" aria-controls="rail"` / `="act"` on the toggles; JS mirrors the class toggle into `aria-expanded`, and Escape closes whichever is open and returns focus to its toggle.

**N3 · SEV-1 · Tool-row disclosure semantics.** Accessible name of row 1 is currently "▸ ✓ read_file dashboard-9119.log 3 lines · 12ms".
```html
<span class="car" aria-hidden="true">▸</span><span class="gl ok" aria-hidden="true">✓</span>
```
Success loses its status once glyphs are hidden — put the outcome in words: `.meta` → `ok · 3 lines · 12ms` (failures already say "exit 1"). Add `role="group" aria-label="Tool calls"` on `.tools`, and `tabindex="0"` on expanded `.toolout` so keyboard-only users can scroll 400-line output (collapsed ones are `display:none`, so tab stops stay bounded).

**N4 · SEV-2 · `--edge` fails on elevated surfaces.** `--edge:#5c626e` → `#646b78` (3.3:1 on `--bg-elev`, 3.6:1 on `--bg`). One-token fix covering composer, Deny, send, and stop borders.

**N5 · SEV-2 · No running state in the tool grammar.** Every row is terminal ok/bad; the mid-turn UI — the one users actually stare at — has no representation. Add `.gl.run` (ink-2 glyph) + `aria-busy="true"` on `.tools` while any row runs, and enumerate turnstate's full state list: `{thinking, running <tool>, waiting on approval · N, streaming, stopped}`. Must exist **before** the renderer is written (§3).

**N6 · SEV-2 · 200-message thread.** No SR navigation structure and no paint bounding:
```css
.turn{content-visibility:auto;contain-intrinsic-size:auto 180px}
body{height:100vh;height:100dvh}
```
Make `.who` an `<h2 class="who">` — the reset already zeroes UA styles, and it gives per-turn heading navigation in long threads. Architecture: rely on native scroll anchoring while pinned, unpin on user wheel-up, offer a "↓ latest" chip to re-pin — don't hand-roll autoscroll. The 264px cap bounds 400-line output visually; full text stays in DOM, which is acceptable.

**N7 · SEV-2 · Does the 272px rail earn it? Partially.** Queue: yes — the only place to see work behind the current approval. Now: yes, while scrolled away from the thread. Context bar: cheap, keep. **MCP · 5 of 6: no** — static settings data that never changes mid-session, ~150px of dead rail. Cut it to a topbar popover or collapsed `<details>`, or take 244px as the default width. Architecture: single approval store; card `.q`, rail `h2`, qcard list, and turnstate count all render from it — the mockup hand-writes "2" in four places, plus the unwired Approve/Deny transition (flip `.done`, decrement store, focus next pending `.b-n`).

**N8 · SEV-3 · Focus-rule defects.**
```css
:where(button,a,[tabindex]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
```
Drop `border-radius:3px` (mutates control corners); drop `textarea` from the selector — `.cbox:focus-within` is the affordance.

**N9 · SEV-3 · Resolved-card opacity.** `opacity:.72` lands `.d` at ≈4.5:1, on the AA line. Replace with explicit colors: `.appr.done{opacity:1}` + `.appr.done .cmd{color:var(--ink-2)} .appr.done .d{color:var(--ink-3)}` (4.7:1 ✓).

**N10 · SEV-4 · Nits.** Comment drift (960/640 vs 1060/720); annotate `--ink-3`'s per-surface ratios; `@media (prefers-reduced-motion:reduce){.rail,.act{transition:none}}`; `aria-current="page"` on sessions.

# 3. Decision: attack the spike recommendation

The reviewer is right that design review has hit diminishing returns, but the recommendation **fails both probes**:

**Cheaper invalidating question first.** The gateway's *approval and stop semantics* — can more than one approval pend; is the agent halted while pending; does Deny terminate the turn or trigger re-planning; can Stop cancel mid-tool. That's an hour of API reading or curl, no UI. It invalidates or confirms the densest-designed third of this mockup: the "N of M" queue grammar, the rail's Approval-queue section, the turnstate copy, focus-to-Deny flow, the resolved-state design, and Stop semantics. The transport spike answers chunk cadence — but the decision that feeds (batching constants) is among the *cheapest* things to change later.

**What the spike locks in.** A spike necessarily builds the event→DOM renderer. Run it before N1/N3/N5 land and it gets written without announcements, without the running-state grammar — and retrofitting live regions into a mature diff pipeline is the expensive version of this work, because the batching *is* the announcement strategy.

**Order:** (1) land N1–N8 — a day, mockup-local; (2) curl the approval/stop semantics — an hour; (3) freeze and run the transport spike, with "NVDA and VoiceOver announce batched tokens without chaos over `role=log`" as an explicit exit criterion. The reviewer had the right instinct and the wrong next slice.
