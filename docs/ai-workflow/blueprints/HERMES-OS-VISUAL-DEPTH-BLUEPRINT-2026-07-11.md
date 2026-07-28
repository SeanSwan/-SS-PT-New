# HERMES OS — VISUAL DEPTH & STUNNING UPGRADE BLUEPRINT (binding build spec)

**Author:** Fable 5 (claude-fable-5), 2026-07-11 — authored as the Final Decider after a live
visual audit of the real rendered cockpit. **Worker-bot contract:** build EXACTLY what this
document specifies. Where this doc is silent, the parent spec rules; where both are silent,
STOP and ask Sean — do not invent design.
**Parent spec (still binding):** `docs/ai-workflow/AI-HANDOFF/HERMES-BRAIN-COCKPIT-ULTIMATE-UPGRADE-2026-07-08.md`
(v2 hardened plan + Slice-0 locked decisions). This blueprint re-sequences its unbuilt
Slices 3–6 around the live-audit defects and adds repair work the spec assumed was done.
**Evidence:** screenshots in `docs/ai-workflow/blueprints/hermes-os-visual-2026-07-11/`
(`brain-1920.jpeg` = desktop full page, `brain-414.jpeg` = phone) — captured 2026-07-11 from
Sean's real vault page `~/.hermes/vault/runs/digests/hermes-brain.html`.

---

## 0. GROUND TRUTH (verified 2026-07-11, main @ 5c2eb2f08)

**Shipped:** parent-spec Slices 0–2 only — geometry kit (`graphGeometry.mjs`, VB 1280×700,
HTML-label-overlay + camera parity ≤1e-9), readability shell (grid regions, NBA hero + ranked
rail, HUD tiles, type tokens `--t-*`, spacing `--s*`), camera interactivity
(`brainCamera.mjs` — zoom/pan/focus, view-only client). 171/171 hermes tests green.
**NOT built (why it "looks weak"):** Slice 3 data density, Slice 4 Replay/time-scrubber,
Slice 5 themes+atmosphere, Slice 6 search/radar/idle — the entire depth layer.
**Module map (current):** `brain-view.mjs` 128L (gatherBrainData/renderBrainView) ·
`brainViewTemplate.mjs` (esc, escapeForEmbed, arc, node, stars, sparkline, renderBrainHtml) ·
`brainViewStyles.mjs` (PAL + CSS with `--c-app/--c-routine/--c-memory/--c-skill/--c-fault/
--c-text/--c-muted/--c-dim/--bg-deep/--bg-card/--bg-edge/--aur`) · `brainCamera.mjs`
(computeTransforms, cameraClientJs) · `receipt-digest.mjs` (**computeDigestData — already
computes everything V2 visualizes; do NOT recompute**) · `status-page.mjs` (bare 4KB page) ·
`Hermes-Command-Center.cmd` (opens brain view from pinned `%USERPROFILE%\.hermes\runner-repo`).

## 1. DEFECT REGISTER (from the live audit — every one must die)

| ID | Defect | Evidence | Fixed in |
|----|--------|----------|----------|
| D1 | Phone ≤414px tab model NEVER shipped — graph squeezes under tiles; labels clip off-canvas and collide ("2 anchorwitnedigest", "iscord broker") | brain-414.jpeg | V1 |
| D2 | Desktop left column dies below the graph card — huge black void while the rail runs ~500px longer | brain-1920.jpeg lower half | V1 |
| D3 | Node discs render DARK (unlit voids with faint rims) — "lights showing the brain thinking" reads OFF/dead | brain-1920.jpeg graph | V1 |
| D4 | Label collisions at cluster boundaries even at 1920 ("R2 anchor witness"+"receipt-digest", "Brainstorms (15)"+"Continuity log") | brain-1920.jpeg | V1 |
| D5 | Skills cluster = 25 anonymous unlabeled dots + a raw text blob in the rail — decoration, not information | brain-1920.jpeg | V2 |
| D6 | Thought stream monotone — six identical gray "health-sweep (T0) ok — green" rows; no timestamps, no tier badges, no actor, no variety | brain-1920.jpeg rail | V2 |
| D7 | "Thinking today" sparkline is a micro-glyph lost in whitespace; dashed baseline dominates the data | brain-1920.jpeg rail | V2 |
| D8 | HUD tiles flat — no trend vs yesterday, no deltas, identical weight whether 0 or 14 | brain-1920.jpeg | V2 |
| D9 | Operator ring = cryptic color-only pills (red HEADLESS_RUNNER etc.), no grouping, color is the sole signal (a11y violation) | brain-1920.jpeg rail | V2 |
| D10 | **DATA-TRUTH BUG:** page written 2026-07-11 06:00 shows header date 2026-07-08 and footer "generated 2026-07-10T17:37:42Z" — days-stale data with zero staleness alarm | vault file mtime vs page content | V1 (P0) |
| D11 | `hermes-status.html` is a bare 4KB page sharing none of the cockpit's visual language | file size + source | V5 |
| D12 | Atmosphere barely perceptible (46 static star dots); nothing "stunning"; core glow subtle; canvas mostly empty black | brain-1920.jpeg | V1+V5 |

Also operational: the pinned `runner-repo` is **22 commits behind main** — after every merged
slice the runner-repo refresh step (§7) is MANDATORY or Sean literally cannot see the work.

## 2. STANDING INVARIANTS (every slice, non-negotiable, test-locked)

Single self-contained generated file · data embedded at gen time · view-only JS (zero
network: no fetch/XHR/WebSocket/EventSource/remote img; zero action surface: no
form/input/button-that-executes; grep-tested) · deterministic render (same snapshot →
byte-identical; NO `Math.random`/`Date.now` in render paths — seed from snapshot data; the
existing `jitter(i,m)` hash pattern is the approved randomness) · `prefers-reduced-motion`
neutralizes ALL ambient animation (no running rAF) · every source file ≤300 lines ·
`node --test scripts/hermes/` green + fixture render smoke · T0 receipt written per render ·
secret scan per commit · no text below 13px at any matrix width · every text/bg pair ≥4.5:1 ·
Crystalline Swan tokens only (no Galaxy-Swan `#0a0a1a/#00FFFF/#7851A9`) · Windows-safe paths.

## 3. BUILD SLICES (ship independently, IN THIS ORDER)

### V1 — REPAIR & TRUTH (P0 — fixes what's broken before adding depth)

**V1.a Staleness alarm + root cause (D10).** First DIAGNOSE: run
`node "%USERPROFILE%\.hermes\runner-repo\scripts\hermes\brain-view.mjs"` and diff the
footer "generated" stamp against wall clock; inspect `daily-chain.cmd` for date passing;
compare runner-repo HEAD vs main. [HYPOTHESIS candidates, verify in this order: (1) pinned
runner-repo predates the `data.when` stamp fix, (2) daily-chain passes/derives a stale
`--date`, (3) receipts dir divergence between repo checkout and vault.] Fix the real cause.
THEN build the alarm: `gatherBrainData` gains `dataAgeDays = floor((now - isoDate)/86400s)`;
when `dataAgeDays >= 1` the template renders a full-width amber banner directly under the
global bar: `DATA IS {N} DAY(S) OLD — generated {when}; today is {today}. Double-click the
Command Center to refresh.` styled like `.fault-strip` but `background:var(--c-routine)`
gradient, and the aurora forces `health='amber'` floor. Test: fixture with isoDate=today-3 →
banner text present; isoDate=today → banner absent.

**V1.b Phone tab model (D1, parent spec §4c verbatim).** At `≤700px` viewport the shell
switches to three tabs — `Overview | Graph | Detail` — CSS-only via three hidden radio
inputs + label bar (no JS dependency, works with camera JS present): Overview = NBA hero +
HUD tiles 2-up + health word; Graph = the canvas at FULL viewport height (graph never
renders below its design width — horizontal pan handles overflow, labels keep ≥13px);
Detail = the entire inspector rail. Tab bar: sticky bottom, 3 × 44px min targets, active tab
`var(--c-app)` underline + `aria-pressed` semantics on labels. Test: string-assert the
radio/label structure exists; Playwright 414×896 → screenshot shows NO svg text under 13px
and NO clipped label (assert zero horizontal page scroll at Overview/Detail tabs).

**V1.c Node illumination (D3).** Every node disc gets a lit rendering: inner radial
gradient (`state=live`: cluster color at 42% alpha center → transparent 70%), 1.5px rim in
cluster color, and an outer glow halo `filter:drop-shadow(0 0 {6+activity*2}px color)`
where `activity` = receipts today attributable to that node (0 → soft idle glow 4px, never
fully dark). `state=idle`: 18% alpha center. `state=dark`: rim only + 35% opacity.
`state=fault`: `--c-fault` center + 2px rim + slow 2.2s pulse (reduced-motion: static).
The dead-bulb look is banned: assert in test that the node template never emits
`fill:none` + no-gradient combination for live/idle states.

**V1.d Label collision resolver (D4).** New module `scripts/hermes/brainLabels.mjs`
(≤300L incl. tests? no — module ≤300L, tests separate `brainLabels.test.mjs`): pure
function `resolveLabelLayout(nodes, renderedWidth) → [{id, x, y, anchor, tier}]` — greedy
pass per cluster arc, sorted by angle; when two label boxes (est. width = chars × 0.62em ×
font-px, height = 20px, 2-line stack allowed) overlap, push the later one radially outward
in 18px steps (max 2 steps) then flip anchor side; if still colliding, demote to
`tier:'hover'` (rendered at 60% muted, full label in `title` + camera-focus state).
Deterministic (no randomness). Template imports it; delete the inline jitter-only
placement for labels. Test: feed the REAL brain-map.json node set at widths 1280/1920/2560
→ assert zero overlapping label rects at each width.

**V1.e Kill the desktop void (D2).** Grid main row becomes `grid-template-rows:
minmax(560px, 1fr) auto` inside the left column: the graph card stretches to match the
rail's natural height (canvas SVG scales via existing aspect contract, extra vertical space
feeds the atmosphere padding), and a NEW full-width strip lands UNDER the graph card:
**30-day health heat-strip** (placeholder data-shape in V1 — real history wiring lands in
V2.f; render today's cell only + 29 `no-data` cells so the geometry ships now): 30 × 18px
rounded cells, gap 4px, green/amber/red/empty per day, Fira Code 13px date ticks every 7th
cell. Test: fixture render contains 30 `.heat-cell` elements; left column height ≥ rail
height − 24px at 1920 (Playwright measure).

**V1.f Atmosphere floor (D12, CSS-only tier).** Replace the 46 static stars with 3
parallax star layers (46/80/120 dots at 100%/60%/35% opacity buckets, sizes 2/1.5/1px,
seeded by the existing `jitter` hash — deterministic), plus per-cluster nebula: 4 radial
gradients (`--c-app/--c-routine/--c-memory/--c-skill` at 7% alpha, 480px radii) positioned
behind each cluster's arc centroid, plus a slow 90s hue-drift on the core glow only
(reduced-motion: all drift off, layers static). Byte cost ≤6KB added CSS. Test: generated
file contains 3 star layers; `prefers-reduced-motion` block sets all new animations to none.

**V1 files:** `brainViewTemplate.mjs` (will exceed 300L — split: extract node/label/star
builders into `brainLabels.mjs` + new `brainGraphSvg.mjs`; template keeps shell/regions),
`brainViewStyles.mjs` (split theme-independent layout into `brainViewLayout.mjs` if >300L),
`brain-view.mjs` (dataAgeDays, activity counts), `daily-chain.cmd`/runner-repo fix per
V1.a diagnosis. **V1 acceptance:** all §1 D1–D4+D10+D12-floor defects dead at 414/1920/2560
screenshots; 171+ tests still green; render smoke from fixtures byte-stable across two runs.

### V2 — DATA DENSITY (parent Slice 3 — computeDigestData is ALREADY the source; wire, don't recompute)

`gatherBrainData` calls `computeDigestData(vaultRoot, isoDate)` once and passes through:
**V2.a Tier Saturn rings** around the core: 5 concentric ellipses (T0 innermost → T4
outermost), ring stroke-width `1+log2(1+count)` px, ring label `T{n} {count}` Fira Code
13px at ring's 45° point; **T4 ring ALWAYS drawn** (dashed when 0; pulses 3s when >0).
**V2.b Refusal thorns:** for each refusal cluster (`clusters` field), a thorn spike
(8-14px triangle, `--c-fault`) on the core's rim pointing at the actor's ring position,
`title` = "{who}: {n} refusals"; flood-cap hits get a doubled thorn.
**V2.c Integrity crack:** when `unparseable.length + tierless.length + chainBroken.length
> 0`, the core's circle gains a jagged crack path (single SVG path, `--c-fault`, 70%
opacity) + inspector line "INTEGRITY: {n} unparseable · {n} tierless · {n} broken chains".
**V2.d Approval countdown ring:** per open queue entry, a 28px ring-timer node on the
operator orbit — circumference stroke-dasharray proportional to time-remaining
(`expiresAt` from queue entry), amber <2h, red <30min, label = command name 13px.
**V2.e By-actor orbit:** `actorRows` top 6 as small satellites (14px) spaced on a dedicated
orbit between routines and skills, size `10+2×log2(1+count)`, label "{who} {count}".
**V2.f 30-day heat-strip GOES LIVE:** brain-view reads the last 30 daily receipt files
(`readReceipts` per date, cheap counts only: green = receipts>0 & no attention, amber =
attention>0, red = any chainBroken/fault receipt, empty = no file); fills V1.e's strip.
**V2.g Skills get names (D5):** top 12 skills by today's receipt mention get 13px labels
via `brainLabels` tiers; remainder collapses to ONE aggregate node "+{N} more" (spec §6);
rail text-blob becomes a 2-col 13px grid with per-skill receipt-count badges.
**V2.h Thought stream upgrade (D6):** each row gains: HH:MM UTC Fira Code stamp · tier
badge chip (T0-T4, tier color) · actor prefix · outcome word color-coded (ok green /
partial amber / refused-failed red) · stream grows to 10 rows + "{n} more in digest →" link
to the digest md. Attention receipts (from `attention`) sort FIRST with a left
`--c-fault` 3px bar.
**V2.i HUD trends (D8):** each tile gains a delta glyph vs yesterday (`↑n ↓n ·0` computed
from yesterday's receipts file), 13px, green/amber semantics per tile kind; APPROVAL tile
shows `medianMin` when >0 ("median 12m").
**V2.j Sparkline → skyline (D7):** 24 bars fill the rail card width (each bar
`flex:1`, min 3px), hour ticks 00/06/12/18, peak hour labeled, bars in `--c-app` with
tier-mix stacking (T2+ portions in `--c-routine`); dashed baseline removed.
**V2.k Operator ring humanized (D9):** pills grouped under 13px uppercase headers
(BROKERS / ROUTINES / SAFETY), each pill gains a state WORD ("on/off/tripped") next to the
name — color never the sole signal — and `title` = one-line explanation from a static map
in `brain-map.json` (extend it with `"explain"` per switch).
**V2 files:** `brainDensity.mjs` (NEW ≤300L: rings/thorns/crack/countdown/actor/heat
builders) + `brainDensity.test.mjs` · template/styles wiring · `brain-map.json` explain map.
**V2 acceptance (parent spec):** "the visual shows what the digest computes; density
triples; nothing conflated" — plus: every §6-v1 parent feature present; zero-receipt day
still renders (silence state: flatlined skyline + "silent day" core dimming, from
`silence` field).

### V3 — REPLAY-THE-DAY + TIME (parent Slice 4, unchanged scope, sharpened contracts)

`gatherBrainData` gains `{days: 14}` mode → `snapshots[]` (one per day, same shape, capped
~250KB total — measure; if over, thin per-day thought streams to 4). New inline
`brainReplay.mjs` client (pattern: `cameraClientJs` — string-embedded, textContent-only
DOM writes): **time-scrubber** in the global bar (14 dots + day label, ←/→ keys, 44px
targets) re-renders all data-bound regions from the selected snapshot; **Replay** button
(view-only choreography, NOT an action: replays the day's receipts as 600ms/receipt node
flashes + stream fill, Esc stops, reduced-motion = instant summary); **diff banner**: on
load, compare against `localStorage['hermes-last-seen']` (write-only-this-key, still zero
network) → one line "since you last looked: +{n} receipts, {switches changed}, {new
faults}"; **trend arrows** on HUD tiles vs scrubbed-day-minus-one. Acceptance: parent
Slice-4 line — "press play → the real day fires across the brain; scrub → last Tuesday
renders" — at 60fps, keyboard-operable, deterministic per snapshot.

### V4 — THEME SYSTEM (parent Slice 5a: 10 themes, tokenized)

New `brainThemes.mjs`: exactly the parent §5 contract — every theme fills the 11 Tier-1
vars, hue families fixed (fault stays RED in all 10), Glacier/Ice default, Aurora Galaxy +
James Webb ship first, then Zebra/SoCal Dusk/Mojave/Redwood/Pacific/Alpine/Bioluminescent.
Theme switcher `<select>` in global bar (view-only state, persists to
`localStorage['hermes-theme']`), 350ms crossfade (reduced-motion instant). Move any
remaining baked `${PAL.*}` in core glow/rings to `var()` (parent bug list). **Gate:
7-pair contrast lint runs per theme in tests (70 assertions) — a theme failing ANY pair
does not ship.** Tier-2 textures: one scoped `background-image` block per theme, ≤2KB each.

### V5 — ATMOSPHERE UPGRADE + ONE VISUAL SYSTEM (parent 5b + D11)

**V5.a** `brainAtmosphere.mjs`: Canvas2D particle field (200-400 particles, cluster-hued,
drift + node-activity gravitation), auto-degrade ladder: 4K/60fps → halve particles at
<45fps (rAF budget check) → static CSS fallback; reduced-motion = CSS layers only (V1.f
stays the floor). WebGL is OPTIONAL polish behind the same interface — Canvas2D is the
requirement, WebGL only if the fps gate proves out.
**V5.b Status page joins the system (D11):** rebuild `status-page.mjs` output on the
cockpit shell — same tokens/type ramp/tiles (global bar + fault strip + HUD row + switch
groups + receipts table), NO graph. Extract the shared shell CSS into
`brainViewLayout.mjs` so both pages import one source (no copy-paste divergence — the kit's
first proof, parent §10). Digest + briefing md files get a linked row in both pages'
footers. Acceptance: side-by-side screenshots read as one product; status page ≤40KB.

### V6 — REACH (parent Slice 6, unchanged)

Fuzzy search (inline, over embedded node+receipt names, cross-highlights graph + rail) ·
filter chips (tier/actor/outcome) · "jump to the problem" pill on the aurora when
health≠green (camera-flies to the worst node) · ambient idle mode (60s no-input →
slow-orbit screensaver, any key exits; reduced-motion never enters it) · per-command
reliability board (30-day success-rate table, Fira Code, in Detail tab/rail) · PNG export
button (canvas snapshot of the graph card, `toDataURL` download — still zero network) ·
optional WebAudio cues OFF by default. Acceptance: parent Slice-6 line + all invariants.

## 4. VISUAL LANGUAGE LOCKS (so the worker cannot drift)

Palette: existing `PAL`/Crystalline tokens; NEVER Galaxy-Swan. Type: parent §7 ramp
verbatim (NBA 32/28, HUD 28 Sora, body/labels 16, data 15 Fira Code, floor 13 — hard).
Spacing: 8px scale, gutters `clamp(24px,2vw,64px)`. Grid: parent §7 shell + V1.e row fix.
Motion: every animation ≤3 concurrent ambient loops; every loop has a reduced-motion
kill; nothing hover-only; 44px interactive minimum. Density doctrine: every pixel that is
not atmosphere must ENCODE state (count, age, tier, trend) — decoration that encodes
nothing is banned; atmosphere is background-layer only and never overlaps text at >8% alpha.

## 5. TEST & VERIFICATION PROTOCOL (per slice, before its commit)

1. `node --test scripts/hermes/` — full suite green (Windows path-safe).
2. Fixture render × 2 → byte-identical (determinism gate).
3. Governance greps on the generated file: zero
   `fetch(|XMLHttpRequest|WebSocket|EventSource|src="http` hits; zero
   `<form|onclick=.*exec|type="submit"` hits (extend `brain-view.test.mjs` lock).
4. Playwright screenshot matrix: 320/414/768/1024/1440/1920/2560/3840 — assert per §2
   (no sub-13px text, no horizontal body scroll, no label-rect overlaps at
   1280/1920/2560 via `resolveLabelLayout` re-check in-page).
5. Contrast lint (V4+: × 10 themes).
6. `bash scripts/scan-secrets.sh <changed files>` + Rule 42 backend audit (should be
   empty — this work never touches backend/).
7. Live render from the real vault (`node scripts/hermes/brain-view.mjs`) + open — the
   builder LOOKS at it (hostile design pass, Rule 61) before claiming the slice.

## 6. REVIEW GATES

Per slice: builder self-hostile-review → REQ in `.ai-workflow/coordination/review-queue.md`
for the other agent → proceed (batch-push cadence, Rule 70: commit per slice, push at batch
end unless Sean says ship). **HARD CHECKPOINT after V2:** Fable reviews screenshots of
V1+V2 against the §1 defect register before V3–V6 build (mirrors the parent's Sean
decision queue + the Style-Lens sentinel pattern). Do not build past V2 without that pass.

## 7. OPS — MAKE SEAN SEE IT (mandatory tail of every shipped batch)

The Command Center runs from the pinned `%USERPROFILE%\.hermes\runner-repo` (currently 22
commits behind). After each merged batch: refresh the pinned runtime (git pull in
runner-repo or re-pin per its activation script), re-run
`Hermes-Command-Center.cmd`, and verify the footer "generated" stamp is NOW and the header
date is TODAY. Add to `.cmd` (V1.a): a warning line when runner-repo HEAD ≠ the repo main
HEAD file marker. A slice is not "done" until the page Sean double-clicks shows it.

## 8. ROLLBACK

Each slice = its own commit(s) on a `claude/hermes-os-visual-*` branch; revert = `git
revert <slice SHAs>` (no amend, Rule 45). The generated HTML regenerates on next run —
no data migration anywhere. Theme/localStorage keys are additive; removing them breaks
nothing. Runner-repo can re-pin to any prior main SHA (§7 procedure) — that alone restores
Sean's view to the previous state.

## 9. WHAT THE WORKER MUST NOT DO

No backend/, frontend/, or SwanStudios product-code edits · no new npm dependencies (the
whole cockpit is dependency-free by doctrine) · no network calls or action surfaces in any
generated page · no Material-UI/Recharts anywhere · no redesign of the parent's locked
decisions (S0.4) · no scope beyond the slice being built · no "should be fixed" claims —
Rule 61 consolidated report per slice with screenshots at 414 + 1920 minimum.
