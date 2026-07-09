# Hermes Brain Cockpit — ULTIMATE UPGRADE SPEC (binding decision)

- **Date:** 2026-07-08 · **Process:** AI-Village two-stage — FREE panel (6 specialist lenses: rendering · data-viz · art-direction · interaction/motion · IA/readability · feature-invention) → FINAL DECISION. Fable was the intended decider; Fable hit its usage ceiling mid-synthesis, so per the Co-Orchestrator fallback chain the binding decision is rendered by **Opus 4.8 (deputy Final Decider)** on the complete panel pool. When Fable capacity returns, this spec is the ratification target — nothing here contradicts a Fable-tier constraint.
- **Panel pool preserved at:** `c:/tmp/brain-upgrade-panel/01..06-*.md` (durable).
- **Replaces:** `scripts/hermes/brainViewTemplate.mjs` + `brainViewStyles.mjs` + parts of `brain-view.mjs`.
- **Companion:** `OPUS-48-HERMES-OS-BUILD-HANDOFF-2026-07-04.md` §12 (brain-view shipped 2026-07-07; Sean judged it "weak" — this is the redesign).

---

## 1. VERDICT SUMMARY (binding)

1. **Readability is P0 and its cause is proven, not aesthetic.** Every text role in the current file renders 9–13px against a 15–28px operator floor, and SVG text baked into a fixed 1280×640 viewBox collapses to **~3px on a phone or any window narrower than ~1720px** (the common case: half-maximized 2560, 13–14" laptop). ACCEPTED in full — this is slice 1 and gates everything.
2. **Rendering = HYBRID, ruled decisively.** SVG for vectors (edges, node circles, glow, orbit rings) + **an absolutely-positioned HTML label overlay** (real device-px text, WCAG-tunable, selectable, screen-reader-reachable, Ctrl+F-able, 44px tap targets) + an **optional WebGL/Canvas atmosphere layer** behind (stars, nebula, synapse particles, bloom, parallax). REJECTED: WebGL/canvas text (blurry across zoom — that is literally Sean's complaint) and inlining Three.js (~600KB to draw particles). Atmosphere is hand-rolled (~150–250 lines) or a Canvas2D fallback; it renders ONLY when motion is allowed.
3. **Doctrine ruling — view-only JS is PERMITTED, with a hard boundary.** The old "Zero JS by doctrine" line is superseded for THIS surface. The new invariant: *client JS may manipulate the VIEW only — zoom, pan, focus, filter, search, replay, theme — with ZERO network calls and ZERO action/command surface. The page still "grants nothing": approving/flipping/executing stays in Telegram/CLI.* The data is a snapshot embedded at generation time; JS never fetches. This is recorded as an amendment to the brain-view security note (§8).
4. **Deterministic render preserved** — seeded jitter, no `Math.random()`; two generated files diff cleanly (audit culture).
5. **Reduced-motion fully neutralizes ambient motion** (no rAF loop, static frame); pan/zoom/focus stays operable (user-driven, same category as scroll).
6. **"Show more data" is mostly FREE.** `receipt-digest.mjs` already computes tier counts, refusal clusters, integrity breaks, approval-flow, by-actor, silence-check — the visual never shows them. Slice 3 wires these in; roughly triples density with near-zero new backend.
7. **Theme system = 10 skins, tokenized; ship 3 in v1.** Glacier/Ice (safe default, IS the readability fix), Aurora Galaxy (matches "galaxies," lowest build risk), James Webb (highest emotional payoff). The other 7 (Zebra, SoCal Dusk, Mojave, Redwood, Pacific Islands, Alpine, Bioluminescent/Xeno) ship in slice 5 once the tokenization contract is proven. Every theme fills the SAME 5 semantic hue slots so the legend never has to be relearned — this is what makes it reusable across Sean's future apps.
8. **Two real code bugs folded in as fixes:** (a) `--aur` is referenced in `.aurora` but never declared in `:root` (a concrete contributor to "dim"); (b) `.core-glow/.core-ring/.core-spin` bake `${PAL.app}`/`${PAL.skill}` at generation time instead of `var(--c-app)`/`var(--c-skill)`, so live theme-switching can't recolor the core. Both fixed in slice 1/5.
9. **Hero feature = "Replay the Day"** — independent #1 from BOTH the interaction and feature lenses. Press play, watch the real day's receipts fire chronologically across the living brain, each lighting its source node and comet-tailing to the core, thought-stream typing itself, HUD ticking. All inputs already gathered — pure choreography. Slice 4.
10. **Interactivity = zoom/pan/semantic-zoom/focus-drill**, the load-bearing foundation every other feature rides. Slice 2.
11. **NBA becomes the LOUDEST element by construction** (32px hero band, urgency-coded) and a **ranked rail** (collect ALL true conditions, not first-match short-circuit). The current NBA is the *smallest* element — the single worst hierarchy violation.
12. **Skills get readable identity.** The current `small:true` path suppresses skill labels entirely (name only via hover title = invisible on touch/keyboard/SR). The HTML overlay makes a compact labeled pill sit beside a tiny dot; high-count rings cap to top 8–10 + a "+N more" node expanding a searchable list.
13. **SwanStudios product health is a SEPARATE satellite** — never conflate "Hermes is green" with "the business is up." Wire the already-registered `health-sweep` output as its own clearly-labeled orb.
14. **Reusable "AppOps Cockpit Kit"** is an explicit goal, not a side effect: the gatherer pattern, radial-graph renderer, aurora+HUD, time-scrubber engine, fuzzy-search, boot/idle shell, PNG exporter, ranked-NBA resolver, tokenized skin — all extractable for Sean's other apps.
15. **CUT/DEFER (with reason):** cost/token meter (needs per-call instrumentation that doesn't exist yet — data-source gap, not a view gap); Timelapse-over-months (needs history retention to mature — degrade to "N days available"); WebAudio sound cues (nice, low priority, slice 6); constellation easter-egg (slice 6). None of these block the award-winning core.

---

## 2. ARCHITECTURE

**Generation stays a Node script that embeds a snapshot; the generated file gains layers + a view-controller.**

```
scripts/hermes/
  brain-view.mjs            (orchestrator; gathers, calls renderer, writes receipt)   ≤180 L
  brainGather.mjs      NEW  (data gather: today + trailing N days for scrub/replay)   ≤300 L
  brainViewTemplate.mjs     (assembles the HTML shell + embeds snapshot JSON)          ≤220 L
  brainViewStyles.mjs       (tokenized CSS: type ramp, grid shell, themes tier-1)      ≤300 L
  brainThemes.mjs      NEW  (the 10 theme token blocks + tier-2 texture rules)         ≤300 L
  brainClient.mjs      NEW  (the inlined view-controller JS: camera, focus, replay,    ≤300 L
                             search, theme-switch, reduced-motion guards — as a string
                             inlined into the file; NO network, view-only)
  brainAtmosphere.mjs  NEW  (inlined WebGL/Canvas atmosphere init, optional layer)      ≤300 L
```

**Runtime layer stack inside the single generated HTML (back-to-front):**
1. **Atmosphere** — `<canvas>` (WebGL, Canvas2D fallback): starfield, nebula wash, synapse particles, bloom, 3-layer parallax. Reduced-motion → one static frame or omitted.
2. **Vector graph** — `<svg>`: orbit rings, edges, node circles, glow, core. Camera transform on one `<g class="camera">` (GPU-composited translate+scale; never mutate viewBox).
3. **Label overlay** — `<div class="label-layer">`: absolutely-positioned HTML labels at `left:x/1280*100%; top:y/640*100%`, real px type ramp, real tokens, focusable, searchable. Shares the camera transform.
4. **HUD/chrome** — grid regions A–D (global bar, NBA hero, vitals, inspector rail).
5. **View-controller** — inlined vanilla JS: pointer-events camera, semantic-zoom bucketing (`data-zoom`), focus/drill, replay/scrub, fuzzy search, theme swap, `aria-live` announcer, `matchMedia` reduced-motion guards.

**Gatherer change:** `brainGather.mjs` embeds **today + a trailing window** (default 14 days, capped by retention) as one JSON blob so the time-scrubber and Replay-the-Day operate client-side with zero queries at view time. Node positions from `arc()` stay deterministic; only per-day state/color/counts change.

---

## 3. MERMAID DIAGRAMS

### 3a. Generation pipeline + runtime layers
```mermaid
flowchart TD
  subgraph GEN["Generation (Node, T0 brain-view)"]
    V[(Vault runs/: receipts, queue, digests, runner-state)]
    R[(registry.generated.json + brain-map.json)]
    S[[.claude/skills, hermes-inbox, learning-packets]]
    G[brainGather.mjs<br/>today + trailing 14d snapshot]
    T[brainViewTemplate.mjs<br/>embed snapshot JSON + shell]
    V --> G
    R --> G
    S --> G
    G --> T
    T --> H[/hermes-brain.html<br/>single self-contained file/]
    T --> RC[receipt: brain-view T0]
  end
  subgraph RUN["Runtime (browser, view-only, ZERO network)"]
    H --> ATM[Canvas/WebGL atmosphere]
    H --> SVG[SVG vector graph + camera g]
    H --> LBL[HTML label overlay]
    H --> HUD[Grid regions A-D]
    H --> JS[brainClient view-controller]
    JS -. zoom/pan/focus/replay/search/theme .-> SVG
    JS -. same transform .-> LBL
    JS -. reduced-motion guard .-> ATM
  end
  H -.opened by.-> CMD["Hermes Command Center.cmd / 06:00 task"]
```

### 3b. Data flow (stores → snapshot → layers → view)
```mermaid
flowchart LR
  subgraph SRC["Local stores (read at gen time)"]
    A1[receipts JSONL]
    A2[queue lifecycle]
    A3[digest analytics<br/>tiers/refusal-clusters/integrity/by-actor]
    A4[runner-state<br/>fails/demoted/handled]
    A5[switches + anchor]
    A6[skills / memory / inbox / packets]
    A7[health-sweep = SwanStudios product]
  end
  A1 & A2 & A3 & A4 & A5 & A6 & A7 --> SNAP{{Embedded snapshot JSON<br/>today + trailing 14d}}
  SNAP --> L1[Atmosphere: density -> particle count]
  SNAP --> L2[Graph: node state/color/edges]
  SNAP --> L3[Overlay: labels + values]
  SNAP --> L4[HUD: NBA rail, vitals, tier-rings, radar, heatmap]
  L1 & L2 & L3 & L4 --> VIEW([Operator sees it])
  VIEW -->|scrub day| SNAP
```

### 3c. User-interaction flow
```mermaid
stateDiagram-v2
  [*] --> Boot: open file
  Boot --> Overview: 1.9s boot seq (skippable / reduced-motion=instant)
  Overview --> Overview: read NBA + aurora + HUD (is everything OK in 2s)
  Overview --> Focus: hover node
  Focus --> Overview: unhover
  Focus --> Drill: click / Enter
  Drill --> Detail: camera fly-to + inspector rail (node history)
  Detail --> Overview: Esc / click core
  Overview --> Replay: press Replay-the-Day
  Replay --> Overview: finished / pause
  Overview --> Scrub: drag time-scrubber
  Scrub --> Overview: release (whole view re-renders as of that day)
  Overview --> Search: type in omnisearch
  Search --> Drill: pick a hit (cross-highlights node)
  Overview --> Theme: switch skin
  Theme --> Overview: crossfade (first-touch = 1.5s establishing flourish)
  Overview --> Idle: N sec no input
  Idle --> Overview: any input (ambient screensaver mode)
```

---

## 4. WIREFRAME

### 4a. Desktop / 4K full-screen (grid shell; no hard page max-width; padding-inline clamp(24,2vw,64))
```
+==============================================================================+
| A  GLOBAL BAR (sticky 64px)                                                  |
|  HERMES BRAIN   [ search... ]   [<==== time-scrub  day ====>]   [theme v] LIVE|
+------------------------------------------------------------------------------+
| ! FAULT STRIP (40px, sticky, appears ONLY when fail-closed) : switches null   |
+------------------------------------------------------------------------------+
| B  NEXT-BEST-ACTION HERO (full width, 32-48px pad) = LOUDEST, urgency-coded   |
|    >>  2 approvals waiting - resolve reschedule_session (expires 04:11)  >>   |
|    (ranked rail: then set anchor key ; then wire inbox drain)                 |
+------------------------------------------------------------------------------+
| C  VITALS HUD (full width, ~110px) - tiles differentiate by STATE not color   |
|  [14 receipts ^]  [25 skills]  [3 memory ^]  [4 routines]  [1 await !]  [OK]  |
+-----------------------------------------------------+------------------------+
| D-1  GRAPH CANVAS (62-68%, real height, own domain) | D-2  INSPECTOR RAIL    |
|                                                     | (minmax 480..~700px,   |
|        . Applications .        . Routines .         |  ONLY scroll owner)    |
|            \\        |        //                     |  THINKING TODAY spark  |
|             \\  [ HERMES ]  //   <- dual-glow core   |  THOUGHT STREAM (live) |
|             //   pulsing   \\    orbit rings         |  OPERATOR RING         |
|            //       |       \\                       |  TIER RINGS / RADAR    |
|        . Memory .        . Skills (+N more) .        |  30-day heat-strip     |
|   [atmosphere: stars/nebula/particles behind]       |  (on node click ->     |
|   [minimap / cluster-jump buttons corner]           |   node history here)   |
+-----------------------------------------------------+------------------------+
```

### 4b. Node-focus / drill state
```
D-1 (dimmed to 8%, camera flown to selected node)     D-2 INSPECTOR (this node)
    ...ambient.....  ( FOCUSED NODE )  .....ambient    | brain-view (Skill, T0)  |
                       bright + ring                    | last run: 4 min ago     |
                                                        | 30/30 days on schedule  |
                                                        | fuse: [#][#][ ] 0/3     |
                                                        | last 20 runs: ||||.|||| |
   [Esc / click core = fly back, 500ms, un-dim]         | recent receipts (list)  |
```

### 4c. Phone (<=414px) — TAB MODEL (kills the 0.27x SVG shrink entirely)
```
+---------------------------+     +---------------------------+     +----------------+
| HERMES BRAIN      [=]      |     |  (full-height graph tab)  |     | DETAIL         |
| ! NBA hero (urgency)       |     |   pan / pinch-zoom        |     | thought stream |
| [Overview][Graph][Detail]  |     |   [Overview][Graph][Det]  |     | operator ring  |
| [tiles 2-up, snap-scroll]  |     |   labels stay >=13px      |     | tier / radar   |
| health dot + word          |     |   (own tab = never 3px)   |     | [Ov][Gr][Det]  |
+---------------------------+     +---------------------------+     +----------------+
```

---

## 5. THEME SYSTEM

**Ship v1 (3):** Glacier/Ice (default; the readability fix embodied), Aurora Galaxy, James Webb.
**Ship v2 (slice 5, 7):** Zebra, SoCal Dusk, Mojave Desert, Redwood Cathedral, Pacific Islands, Alpine Summit, Bioluminescent/Xeno.

**Tokenization contract — every theme fills exactly these 11 Tier-1 vars (swap = re-skin ~90%, zero JS):**
```
--c-app  (cyan/teal family)     --c-routine (gold/amber)   --c-memory (periwinkle)
--c-skill (violet/magenta)      --c-fault  (RED, NEVER reassigned - universal alarm)
--c-text (HSL L>=92%, sat<=15%) --c-muted (HSL L>=62%)      --bg-deep (L<=8%)
--bg-card (L<=14%)              --bg-edge (hairline)        --aur (header aurora accent - MUST be declared; current bug)
```
Only saturation/value/warmth shift per theme; each slot stays in its hue family so the legend is never relearned — the property that makes this reusable across future apps. **Tier-2** = one small scoped texture block per theme (nebula / hexagon watermark / stripes / god-rays / cellular veins) — honest caveat: textures are `background-image`, not a flat var.

**Readability guarantee (structural, not eyeballed):** `--c-text` L≥92%/sat≤15% against `--bg-deep` L≤8% forces an ~80-pt lightness gap → sub-4.5:1 is essentially impossible by construction. `--c-muted` floor L≥62% (the current `#8b93a7` ≈4.3:1 is THE readability bug). Accents are for dots/fills/glows/badges ONLY — never body copy. A 7-pair contrast lint runs per theme (Rule 50 Tier-A).

**Bug fixes:** declare `--aur` in `:root`; move `.core-glow/.core-ring/.core-spin` from baked `${PAL.*}` to `var(--c-app)`/`var(--c-skill)` so themes recolor the core live.

**Switch UX:** 300–450ms crossfade default; a 1.2–1.8s cinematic "establishing" flourish the FIRST time a skin is picked per session (not every toggle); reduced-motion = instant; persist last choice; Glacier is the non-negotiable default.

---

## 6. DATA & FEATURES (phased)

**v1 (slices 1+3) — density + readability:** ranked NBA rail · state-differentiated HUD · tier-count Saturn rings (T4 ring always drawn, pulses when >0) · refusal-cluster thorns · integrity-crack core state · approval countdown rings · by-actor ring · 30-day health heat-strip · silence flatline state · SwanStudios product satellite · sharpened 3-sec OK dot · skills with real labels + "+N more".
**v2 (slice 2 then 4) — interactive + alive:** zoom/pan/semantic-zoom · focus-drill inspector · boot sequence · live motion-as-information (health cadences, throughput-driven core spin) · **Replay-the-Day** · time-scrubber (14-day) · trend arrows vs yesterday · "what changed since I last looked" diff.
**v3 (slices 5+6) — polish + reach:** 7 more themes · WebGL atmosphere upgrade · fuzzy search + filter chips · "jump to the problem" pill · ambient/idle screensaver mode · threat/integrity radar · per-command reliability board · shareable State-of-the-Brain PNG · optional WebAudio cues.
**Deferred:** cost/token meter (instrumentation gap), months-timelapse (retention), constellation easter-egg.

---

## 7. TYPE RAMP + LAYOUT SYSTEM

**Type ramp (px; Plus Jakarta Sans unless noted):** NBA hero 32 (28 phone)/700 · fault-strip 18/700 · wordmark 20/700 (smaller than NBA on purpose) · HUD number 28/600 Sora · H2/cluster 15/600 .12em uppercase · **body / node-label / thought 16** · data 15 Fira Code · sub-label 13/500 · caption/chip 13 (hard floor — nothing below 13px).
**Spacing (8px):** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64; gutters `clamp(24px,2vw,64px)` scale WITH breakpoint (turns 4K dead-space into intentional space).
**Grid shell:** rows `64px auto auto 1fr` (bar / nba / hud / main); main split `minmax(0,2.2fr) minmax(480px,1fr)`; no hard page max-width — the column *ratio* + rail floor fill 4K intentionally; cap text *measure* (~70–90ch) inside regions, not the regions.
**Label fix (core):** all SVG `<text>` → HTML overlay divs at percentage positions, real px, real tokens, 44px tap targets — hits the 15–18px floor at any zoom/window and un-suppresses skill labels.
**Responsive:** 4K 68/32 rail→~700px · 1920 62/38 · 1440 58/42 (rail floor 480) · 1024 stack (graph 420–480px fixed height) · 768 3-tiles + skills "+N more" · ≤414 **tab model** (Overview/Graph/Detail) so the graph never renders below its design width.

---

## 8. PHASED BUILD PLAN (each slice ships independently; invariants preserved every slice)

Standing invariants every slice keeps: single self-contained file · data embedded at gen time · **view-only JS, zero network, zero action surface** · deterministic (seeded) · reduced-motion neutralizes ambient motion · registered T0 `brain-view` writes a receipt · files ≤300 lines · tests + live render smoke.

- **Slice 1 — Readability + Layout Foundation (the biggest bang for the stated pain).** Grid shell (regions A–D), type ramp, 8px spacing, HTML label overlay replacing SVG text, NBA hero band + ranked rail, state-differentiated HUD, fault strip, `--aur` declared, core → `var()`, responsive down to the phone tab model. Files: brainViewStyles, brainViewTemplate, brain-view, +brainThemes(Glacier only). Tests: text-never-<13px assertion, zero-action-surface lock, contrast lint, responsive snapshot at the matrix widths. **Acceptance: Sean can read every label at 375px and at 4K; NBA is the loudest thing on screen.**
- **Slice 2 — Interactivity (camera).** Inlined brainClient: pointer-events zoom/pan/pinch, semantic-zoom buckets, focus-drill + inspector, minimap/cluster-jump, keyboard nav, `aria-live` announcer, reduced-motion guards. **Acceptance: zoom/pan/focus at 60fps desktop; fully keyboard-operable; reduced-motion static but navigable.**
- **Slice 3 — Data density (free win).** Wire `receipt-digest` analytics into the visual: tier rings, refusal thorns, integrity-crack, approval countdowns, by-actor ring, 30-day heat-strip, SwanStudios satellite, "+N more" skills. **Acceptance: the visual shows what the digest computes; density triples; nothing conflated.**
- **Slice 4 — Replay-the-Day + time-scrubber.** brainGather embeds 14-day window; scrubber re-renders the whole view per day; Replay choreography; trend arrows; diff banner. **Acceptance: press play → the real day fires across the brain; scrub → last Tuesday renders.**
- **Slice 5 — Theme system (10) + WebGL atmosphere.** brainThemes full 10, tokenization proven, theme switcher; brainAtmosphere WebGL particle/nebula/bloom with Canvas2D + reduced-motion fallbacks. **Acceptance: all 10 themes pass the 7-pair contrast lint; atmosphere holds 60fps desktop / 30fps mobile floor with auto-degrade.**
- **Slice 6 — Reach polish.** Fuzzy search + filter chips, jump-to-problem pill, ambient/idle mode, threat radar, per-command reliability board, PNG export, optional sound. **Acceptance: search cross-highlights nodes; idle mode is second-monitor-worthy.**

---

## 9. ACCEPTANCE CRITERIA (whole redesign)

- **Readability:** no text renders below 13px at ANY of 320/375/414/768/1024/1280/1440/1920/2560/3840; body/labels ≥16px on desktop; NBA hero ≥28px. Every text/bg pair ≥4.5:1 (7-pair lint per theme).
- **Responsive:** the audit matrix widths each verified — no tiny-island-at-4K, no sub-3px labels, no phone tab collision, no nested-scroll maze (one scroll owner = the inspector rail).
- **Motion/a11y:** `prefers-reduced-motion` neutralizes ALL ambient motion (no rAF); every node keyboard-focusable with `aria-label`; `aria-live` announces state in plain English; color never the sole signal.
- **Governance:** zero network calls (grep the generated file — no fetch/XHR/WebSocket/img-to-remote); zero action surface (no button/form/onclick that executes a command); deterministic render (same snapshot → byte-identical file); T0 receipt written; Crystalline Swan base + no banned tokens; Dual-Button Glow honored.
- **Perf:** 60fps desktop interaction; 30fps mobile floor with auto-degrade ladder; single file ≤ ~250KB.

---

## 10. REUSABLE "APPOPS COCKPIT KIT" (future apps)

Extractable primitives (the tokenized-skin split already proves the pattern): snapshot-gatherer · deterministic radial-graph renderer · health-aurora + HUD-tile row · multi-day embedded time-scrubber engine · client-side fuzzy-search + filter-chip engine · boot + ambient-idle shell · snapshot-to-PNG exporter · ranked-NBA resolver · reliability/trend aggregator · HTML-overlay-label-on-SVG technique · 11-var tokenized theme contract. Any of Sean's future apps gets an agent/system observability cockpit by swapping the gatherer + the palette object.

---

### Sean decision queue for this spec
1. **Ratify the plan** (or adjust the theme order / feature phasing).
2. **Greenlight Slice 1** (readability + layout foundation) as the next build — highest bang for the "weak/unreadable" pain, and it stands alone.
3. When Fable capacity returns, optionally have Fable ratify this Opus-rendered verdict (nothing here should conflict).
