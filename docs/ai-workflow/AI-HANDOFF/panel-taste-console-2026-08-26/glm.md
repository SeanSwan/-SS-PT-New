# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-CONSOLE-UI-PANEL-PACKET-2026-08-26.md
**Tokens:** 2139 in / 23401 out (reasoning: 17902) | total 25540
**Wall:** 419.0s

---

Seat: GLM. Eight returns, in order.

## 1. A section map

The console has **three sections** in a persistent rail (desktop, left, 72px) / tab bar (≤640px, bottom). The header is deliberately *not* a section.

| Section | Owns | Born from |
|---|---|---|
| **Judge** | The probe grid, session state, reason-before-reveal, Undo, seen-count. Hosts the **Directions panel** as a 280px right rail (a bottom sheet ≤640px). | Judge tab + Directions tab |
| **Make** | Subject input, prompt writing, stills/video toggle, seed queue (1 or 4), ComfyUI handoff, this memory's render results, reseed/vary actions. | Make tab |
| **Gallery** | Kept images at plate quality, presentation mode, full-screen preview, open-in-new-tab, per-memory filter field. | Kept tab (renamed and upgraded) |

**Header (persistent, 56px):** wordmark · memory chip `[owner · riviera-hotel ▾]` (popover: recent memories first, then profile→project browser, then New project) · queue pill (`comfy ●busy 1 · 3 queued`) · presentation toggle.

**MERGED:** Directions → panel inside Judge. Directions are the *read-out* of judging; co-presenting them closes the loop (picks on the left compile into codes on the right), and Make gets read-only direction chips so it never needs the panel. `directions.css/js` keeps its own file, mounted as a panel — the file law holds.

**DELETED (as navigation, not as capability):** the "Taste pictures" button (Judge is always session-ready; a 44px "Taste 12" card appears between sessions — a button that navigates to the thing it names is redundant when the section *is* the thing); the two header selects (absorbed into the memory chip); the Directions tab (demoted to panel).

**Sections that should not exist:** a **Home/Dashboard** (adds one hop between open and work; ambient status lives in the queue pill); an **Insights tab** (one engine, zero credits — see verdict D); a **Settings tab** (a popover off the memory chip covers ComfyUI host and motion); **Studio/System** (verdict E); a **global Portfolio** (verdict F).

**Landing rule per profile:** owner and partner land in Judge; client mode lands in **Gallery** — nobody probes taste in front of a client, and that is the moment the tool must look like a studio.

## 2. ASCII wireframes

**Desktop ≥1024px, primary screen (Judge):**

```
◄─────────────────────────────  ≥1024 px ─────────────────────────────►
┌──────────────────────────────────────────────────────────────────────┐
│▔▔▔ memory spine · 3px · gold=owner / ice=partner / violet=client ▔▔▔▔│
│ ◆ SWAN   [ ● owner · riviera-hotel ▾ ]      comfy ●busy 1 · 3 queued │ 56px
├──────┬──────────────────────────────────────────────┬───────────────┤
│  ▦   │ JUDGE · session 14 · 7/12          [↶ undo]  │ DIRECTIONS    │
│      │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ ┌───────────┐ │
│  ✎   │ │ image  │ │ image  │ │ image  │ │ image  │  │ │01 Noir    │ │
│      │ │  0147  │ │  0148  │ │  0149  │ │  0150  │  │ │tier A·41ev│ │
│  ▤   │ └────────┘ └────────┘ └────────┘ └────────┘  │ └───────────┘ │
│      │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ ┌───────────┐ │
│      │ │ image  │ │        │ │        │ │        │  │ │02 Gilded  │ │
│      │ └────────┘ └────────┘ └────────┘ └────────┘  │ └───────────┘ │
│      │ ── reason lock (probe.css surface, unchanged)│ evidence 41   │
│      │ [closest ✓][miss ✗] rationale ▸ locks first  │ [+ dreamed 3] │
├──────┴──────────────────────────────────────────────┴───────────────┤
│ rail 72px · 56px buttons · keys 1/2/3 · grid owns its scroll · 280px│
└──────────────────────────────────────────────────────────────────────┘
```

Above the fold at 1024×768: spine, header, rail, section title + Undo, two grid rows, the reason-lock bar, and Directions card 01.

**640px:**

```
◄──────────────────────  640 px  ──────────────────►
┌──────────────────────────────────────────────┐
│▔▔ spine ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│
│ [ ● owner · riviera ▾ ]       ●busy 1 · 3q    │
├──────────────────────────────────────────────┤
│ JUDGE · s14 · 7/12              [↶ undo 44px] │
│ ┌──────────────┐  ┌──────────────┐            │
│ │              │  │              │            │
│ │    image     │  │    image     │            │
│ │     0147     │  │     0150     │            │
│ └──────────────┘  └──────────────┘            │
│ ┌──────────────┐  ┌──────────────┐  2-up,     │
│ │    image     │  │    image     │  rows      │
│ │     0151     │  │     0152     │  scroll    │
│ └──────────────┘  └──────────────┘            │
│ ── reason lock ─────────────────────────      │
│ [closest ✓ 44] [miss ✗ 44]  rationale ▸       │
│ [⌃ directions · evidence 41 · dreamed 3 ] 44px │
├──────────────────────────────────────────────┤
│      ▦ Judge     ✎ Make     ▤ Gallery         │ 56px
└──────────────────────────────────────────────┘
```

Legend: ▦ Judge · ✎ Make · ▤ Gallery. Directions becomes a labeled 44px chip opening a bottom sheet; the rail becomes a labeled tab bar.

## 3. The one signature visual move

**The Spine and the Stage.** Before any click, the screen shows a colored spine over obsidian, a memory chip in Frost White, and a contact sheet of plates whose hover lights an ice edge — the read is "light table in a studio," not "form with dropdowns." The spine also does safety work: the active profile is visible on every screen, so generating from the wrong memory becomes something you can *see*.

```css
:root{
  --obsidian:#0A0A0F; --carbon:#141419; --graphite:#1A1A24;
  --sapphire:#002060; --royal:#003080; --ice:#60C0F0;
  --gold:#C6A84B; --frost:#E0ECF4; --violet:#8B5CF6;
  --glow-on-blue:var(--violet);   /* palette law: blue surfaces → purple glow */
  --glow-on-purple:var(--ice);    /* purple surfaces → cyan glow */
}
[data-profile="owner"]  { --profile-accent:#C6A84B; --profile-glow:rgba(198,168,75,.55); }
[data-profile="partner"]{ --profile-accent:#60C0F0; --profile-glow:rgba(96,192,240,.55); }
[data-profile="client"] { --profile-accent:#8B5CF6; --profile-glow:rgba(139,92,246,.55); }

body::before{ /* the spine — identity, never color-only: chip text repeats it */
  content:""; position:fixed; inset:0 0 auto 0; height:3px; z-index:60;
  background:var(--profile-accent); box-shadow:0 0 12px var(--profile-glow);
}

.plate{ /* the stage — one class for every image, every section */
  position:relative; padding:8px; border-radius:10px;
  background:
    radial-gradient(120% 70% at 50% -12%, rgba(96,192,240,.07), transparent 55%),
    linear-gradient(180deg, var(--carbon), var(--obsidian));
  box-shadow: inset 0 1px 0 rgba(224,236,244,.06),
              0 14px 34px -16px rgba(0,0,0,.85);
}
.plate img{ display:block; width:100%; border-radius:6px; object-fit:cover; }
.plate::after{ /* edge light */
  content:""; position:absolute; inset:0; border-radius:10px; pointer-events:none;
  border:1px solid rgba(96,192,240,0); transition:border-color 160ms linear;
}
.plate:hover::after{ border-color:rgba(96,192,240,.35); }
.plate[aria-pressed="true"]::after{
  border-color:var(--ice);
  box-shadow:0 0 0 1px var(--ice), 0 0 18px rgba(96,192,240,.35);
}
.plate figcaption{
  margin-top:6px; padding:0 2px; letter-spacing:.04em;
  font:500 11px/1.5 "Fira Code",monospace; color:#8FA3B0; /* 7.4:1 on obsidian */
}
:focus-visible{ outline:2px solid var(--ice); outline-offset:2px; }
@media (prefers-reduced-motion: reduce){ .plate::after{ transition:none; } }
```

The queue pill uses `box-shadow:0 0 10px var(--glow-on-blue)` when busy (sapphire body, violet glow), satisfying the existing glow law. Typography: Sora section headings, Plus Jakarta Sans UI text, Fira Code seeds/codes/captions, Cormorant Garamond Italic reserved for presentation-mode titles in Gallery — client-facing flourish, nowhere else.

## 4. Verdicts on A–J

| # | Verdict | Reason and shape here |
|---|---|---|
| A | **REFUSE** | One engine exists: his own ComfyUI. "Never blocked by one vendor" is already true — when the GPU is down, Make still writes prompts and the queue holds (test T10). A routing surface is chrome for engines that don't exist and implies outbound provider calls — breaks local-only (hard constraint 2). Residue absorbed: a second local host, if ever, is one config field in the settings popover, not a UI. |
| B | **ADOPT** | Already the architecture: the subscription is the sole reference source and feeds owner memories only. In the console: a `corpus-linked` badge under the memory chip on owner memories only; partner/client memories show `local evidence only`. |
| C | **ADAPT** | Keep the library instinct, refuse the disk-wide semantic scan: it needs an embedding model (new dependency) and would index corpus reference files alongside every memory's renders — provenance mixing, the exact motion §1 outlaws. Adapted: a filter field in Gallery over the current memory only, matching filename, prompt text, style codes, seed — plain `includes()`, instant, zero deps. |
| D | **ADAPT** | No providers, no credits. The real insight is engine state: the header queue pill (`●busy 1 · 3 queued · last 3m`), updated on queue events, degrading to `offline — prompts still writable`. One pill replaces a dashboard. |
| E | **REFUSE** | A pluggable design system is taste made portable; here taste is evidence-derived and evidence is memory-locked (profile×project, nothing inherited — so even owner→owner project copy crosses the wall). This is the precise motion the six-layer review kept refusing. The legitimate need — reusable style within a project — is already met by Directions, which are per-memory and complete; E would duplicate them and dilute both. |
| F | **ADAPT** | "One place showing everything you made" — yes, but *everything stops at the memory boundary*. Gallery is the portfolio, scoped to the active memory; the cross-memory version would co-present the partner's business work and client role-play output with owner corpus-derived renders. Per-memory body-of-work adopted; global rollup refused. |
| G | **ADOPT** | Click any plate → `<dialog>` overlay: `position:fixed; inset:0; background:rgba(10,10,15,.96)`, image `object-fit:contain`, ←/→ within the current set, Esc closes, Fira Code footer with memory · direction · seed · date. "Open in new tab" is a direct same-origin URL — the Host-gated server already serves it; zero CORS needed. Works in Judge, Make, Gallery. Reduced motion: fade only. |
| H | **ADAPT** | True single-element live edit means region inpainting — a graph/pipeline change, out of scope (§7). Console version: every render plate carries `reseed` (same prompt, new seed) and `vary ×4` (the existing four-seed path) — one tap from any surface, same memory. That is the 80% of H with no pipeline change. |
| I | **REFUSE** | Distribution is an outbound connection; hard constraint 2 says nothing leaves the box, no CORS, Host-gated. The client-facing need is met inside Gallery presentation mode; the OS file manager remains one click away and keeps this tool honest. |
| J | **ADAPT** | The compounding instinct is right; unwitnessed writes are not. The nightly pass may *read* a memory's logs and write *proposals* to a separate pending store — never evidence, directions, or prompts. Morning shows a `+ dreamed 3` tray in the Directions panel: each a one-line diff, one tap to accept (that tap is the witness) or dismiss. Per-memory, always. Contained by test T12. |

## 5. The click-cost table

Assumptions: app already open, last memory loaded; pointer taps only, typing and keyboard shortcuts (1/2/3 sections, P presentation, Esc) noted separately. Today's counts are **inferred from the §2 header inventory** — correct me where the button does more.

| Task | Today | Console | Δ |
|---|---|---|---|
| Taste a grid | Judge tab (1) + Taste pictures (1) = **2** | Judge is landing; grid ready, or one 44px "Taste 12" = **0–1** | −1 |
| Generate prompts | Make tab (1) + focus subject (1) + write (1) = **3** | rail Make (1), field autofocused, Enter writes = **1** (2 if arriving elsewhere); direction chips on screen, no trip to Directions | −1 to −2 |
| Render one | in Make with prompt: queue = **1**; cold: section (1) + find prompt (1) + queue (1) = **3** | queue on the prompt card = **1**; `reseed` from any plate = **1**; status from the pill = 0 navigation | 0 to −2 |
| Show a client | Who select (1) + project select (1) + Kept tab (1) = **3**, then flat cards | chip (1) + recent/client memory (1) → client lands in Gallery = **2**; P for presentation (0 via keyboard) | −1 |

**Where my design costs MORE, defended:**
- **Directions at ≤640px:** today 1 tab; console chip + sheet = **+1**. Defense: at that width directions are reference, not destination; the sheet keeps the grid full-width and targets ≥44px; desktop costs 0.
- **New project:** today button (1) + form; console chip (1) + New (1) + form = **+1**. Defense: rare action, and the extra step is a memory-identity checkpoint — a moment to see the spine and chip before creating — which is the isolation law wearing UI.

## 6. Three ways my own design fails

1. **Icon-rail discoverability.** The desktop rail is icon-only to hold 72px; the partner, an infrequent user, will not know ▦ from ✎, and tooltips don't teach. Persistent labels would widen the rail to ~160px and cost the Judge grid a column — direct pressure on probe.css. Partial fix: labeled rail for the first sessions (localStorage), fading to icons. A real, unpaid cost.
2. **Mid-width collision.** At 1024–1200px or 768px height, Directions panel + 4-up grid + reason bar compete: the second row or the reason-lock bar can drop below the fold, and if the lock bar scrolls, the lock-before-reveal cadence suffers — a constraint-6 regression by layout rather than by code. Fix: panel collapses to a chip below 1200px — which honestly weakens §5's "0 extra taps for Directions" to ±1 at those widths. Both things are true; ship the breakpoint.
3. **Client-mode exposure.** Client-lands-in-Gallery is safe only if (a) the memory popover never lists other profiles' projects while in client mode, and (b) presentation/full-screen never surfaces probe-grid corpus frames — kept renders only. Each is one forgotten `if` away from showing a paying client subscription references (license) or the partner's project names (privacy). This is the failure class the prior six-layer review lived in; my design adds two new surfaces (popover, presentation) that must each carry the guard. Tests T4, T11 exist because of this.

## 7. A test list

| ID | Assertion | Level | Fails when |
|---|---|---|---|
| T1 | serve.mjs rejects foreign `Host`; no response ever carries `access-control-allow-origin` | **node** (spin server, fetch with overridden Host) | the gate is removed |
| T2 | every UI file ≤ 320 lines | **node** (walk files) | a section grows instead of splitting |
| T3 | declared text/background token pairs compute ≥4.5:1 (violet ≥3:1 large/non-text only) | **node** (parse tokens, WCAG math) | someone swaps a palette token |
| T4 | in partner/client memories: zero network hits on `/corpus/`, zero corpus `img.src` in DOM, no `corpus-linked` badge | **browser** | the profile gate (B/law) regresses |
| T5 | after switching memory A→B, no `img` from A remains in the DOM | **browser** | stale-node leak |
| T6 | reveal class applies only after the reason-lock event; second pick impossible before reveal | **browser** | probe flow is touched |
| T7 | Undo restores the identical src set; no image repeats within a memory; ledger resets across memories (node variant: 30 draws, no repeats) | **browser** + **node** for the ledger | seen-ledger scoping breaks |
| T8 | all interactive elements ≥44px in both layouts (new chrome; any sub-44 probe finding gets *filed*, not silently patched — probe.css is not edited) | **browser** | cramped chrome ships |
| T9 | with emulated `prefers-reduced-motion: reduce`, computed transition/animation durations resolve to 0s; no glow pulse | **browser** | motion is ungated |
| T10 | ComfyUI unreachable → pill reads `offline`, prompt writing still succeeds, queue retries with backoff | **node** (mock fetch) | offline bricks Make |
| T11 | client-mode presentation contains only kept-render srcs; popover lists no other profiles' projects in client mode | **browser** | failure #3's guard is forgotten |
| T12 | dreaming pass leaves memory store byte-identical; proposals exist only in the pending store with accept/dismiss | **node** (fixture memory, diff files) | J's autonomy leaks past the witness |
| T13 | directions built from memory A contain no style code or chip from fixture memory B | **node** | E/F seep in at the data layer |

Browser-level: T4, T5, T6, T7 (DOM half), T8, T9, T11. Pure node: T1, T2, T3, T7 (ledger half), T10, T12, T13.

## 8. What I checked and found sound

- **The current IA maps to real verbs.** Every existing control has a home in the new map (Who/Memory → chip; New project → popover form; Taste pictures → Judge-ready state; four tabs → three sections + panel). No capability is deleted; I verified each row before claiming the merge.
- **Palette contrast, computed:** Frost on Obsidian ≈16:1; Frost on Carbon ≈15:1; Ice on Obsidian ≈9.5:1; Gold ≈8.4:1; the caption grey `#8FA3B0` ≈7.4:1. All pass. **One caveat:** Wing Purple on Obsidian ≈4.6:1 — passes 4.5:1 only just; sound *if reserved for large text and non-text* (spine, dots), which is how I specified it.
- **The glow law** (blue surface → purple glow, purple → cyan) needed no change — two CSS custom properties encode it exactly.
- **The typography set is sufficient.** Four faces cover UI, data, headings, and the one client-facing flourish. No new fonts.
- **Vanilla feasibility.** Rail, popover (native `popover` attribute or `<details>` fallback), overlay (`<dialog>`), keyboard nav — all hand-written within the ~300-line file law. Gallery ships as new `gallery.css/js`; `directions.*` keeps its file with a new mount point; nothing grows past budget (T2 enforces it).
- **Zero-CORS + Host gating survives verdict G.** Same-origin "open in new tab" needs no headers and no server change; checked, no conflict.
- **probe.css is structurally untouched.** Judge gives the grid its own container and scroll region; the reason bar stays where probe puts it. T6/T7 exist so "layout moved it" can never quietly mean "behavior changed."
- **serve.mjs needs no changes.** New sections are just more static files it already serves.
- **Landing-per-profile adds zero taps** and matches the roles as written — the client moment costs less *and* looks like a studio, which is the actual request.
- **Reason-before-reveal, never-show-twice, and Undo are left exactly as built.** Nothing in this console requires them to change, and the design leans on them staying proven.
