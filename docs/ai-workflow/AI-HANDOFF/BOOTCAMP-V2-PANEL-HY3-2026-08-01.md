# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** C:\tmp\BOOTCAMP-V2-EXECUTION-PANEL-2026-08-01.md
**Seed:** (none)
**Tokens:** 2170 in / 5322 out | **Cost:** ~$0.0031 | **Wall:** 96.2s | **finish_reason:** stop

---

**SwanStudios Bootcamp Creator V2 — Visual & Interaction Critic Memo (Focus: Direction Set + Recommendation)**

*Critic role: Primary visual & interaction design critic. The full packet’s architecture (single workflow: Build → Preflight → Run, laptop authoritative, phone read‑only) is sound. Slice order 2‑10 is logical but Slice 5/6/7 should be merged into one “Runner UI” gate (see note at end). The five highest‑risk failure modes for real‑gym usability are: (1) Start‑gesture failure leaving trainer without fullscreen/audio, (2) Timer drift from relative counting, (3) TV view showing >4 cards or text too small at 20 ft, (4) Mid‑class swap applied immediately breaking frozen snapshot, (5) Phone Floor Card becoming a fragile mandatory mirror instead of bounded cheat sheet.*

Below are **three distinct operator‑grade directions** that cover **Build, Preflight, laptop console (Run), 4K TV audience view (Run), and mobile Floor Card**, respecting every Swan token, WCAG 2.2, `prefers-reduced-motion`, single‑scroll ownership, 44 px targets, and 20‑foot legibility.

---

## Direction A — “Crystalline Console” (Restrained / Low‑Motion)
*Meets the mandated low‑motion, 6 AM clarity brief.*

**Information hierarchy**  
1. Phase / absolute clock / next transition (always top)  
2. Active station(s) or hero exercise  
3. Modifications first, swap second  
4. Structured fact chips for relaxed constraints  

**Desktop / QHD / 4K composition**  
- **Build** (`/dashboard/*/bootcamp`): 12‑col CSS grid. Left 4‑col intent panel on `Carbon` with `Midnight Sapphire` field borders; right 8‑col `Graphite` timeline preview. Sticky footer `Generate / Prepare Class` button (`Gilded Fern`, 44 px). No animation beyond 200 ms focus ring.  
- **Preflight**: Single‑column checklist on `Obsidian`, each row a status chip (`Arctic Cyan` data, `Gilded Fern` attention). `Start Class` button uses `Ice Wing` active emphasis.  
- **Laptop console (Run)**: Fixed viewport, no scroll. Top status bar (`Frost White` on `Obsidian`): phase • wall‑clock end • next transition. Center 2×2 station grid (`Midnight Sapphire` cards, `Ice Wing` border on active). Bottom: huge `Arctic Cyan` absolute‑deadline clock + `Pause`/`Advance` (44 px, `Ice Wing`).  
- **4K TV audience**: Mirrors console 2×2 grid; each card ≥960×540 px at 3840, type ≥48 px `Frost White`, mod icon `Gilded Fern`. Synchronized phases (warmup/finisher) collapse to one hero card centered. Max four cards ever.  

**Mobile Floor Card**  
Vertical stack of station cards (read‑only). Tap card → modifications sheet (44 px targets) first, “Swap” secondary. Single page scroll if >4 cards. `Graphite` surface, `Ice Wing` active tag.

**Scroll ownership**  
Build & Preflight: one primary page scroll (intent panel internal if needed but never nested). Run console & TV: zero scroll. Mobile: one scroll owner.

**Signature visual decision**  
Flat `Obsidian/Carbon` planes with `Midnight Sapphire` structural frames; `Ice Wing` used *only* for the live active element; `Gilded Fern` only for earned/attention (e.g., warning chip). No gradients beyond token fields.

**Accessibility / reduced‑motion**  
All transitions `<200 ms` or disabled via `prefers-reduced-motion`. Contrast `Frost White` on `Obsidian` > 7:1. Keyboard focus ring `Ice Wing` 2 px. No hover‑only actions.

**Why it could be wrong**  
May feel too utilitarian for a “premium OS” marketing impression; lacks delight motion that some trainers expect.

---

## Direction B — “Fluid Swan” (Motion‑Purposeful)
*Same tokens, adds calibrated motion.*

**Information hierarchy**  
Same as A, but round‑shift emphasis animated: first round `Ice Wing` glow on movement names; later rounds glow moves to rep/pacing.

**Desktop / QHD / 4K composition**  
- Build/Preflight: identical layouts to A but with `Ice Wing` 300 ms slide‑in panels.  
- Laptop console: Active station card gently pulses `Ice Wing` (respecting reduced‑motion). Phase change triggers `Royal Depth` field wipe.  
- 4K TV: Station cards scale‑in on round start; hero phase uses full‑screen `Midnight Sapphire` field with `Frost White` 64 px type.  

**Mobile Floor Card**  
Modifications sheet slides up (44 px handle). 

**Scroll ownership**  
Same as A.

**Signature visual decision**  
“Swan‑wing” arc progress meter (SVG, `Ice Wing` stroke) around the absolute clock; `Wing Purple` appears *only* when AI‑Coach ranking is shown (e.g., swap candidates).

**Accessibility / reduced‑motion**  
All motion behind `@media (prefers-reduced-motion: no-preference)`; fallback is Direction A static.

**Why it could be wrong**  
Early‑morning motion may distract; pulse could drain battery or conflict with wake‑lock; more code risk >300‑line limit if not modular.

---

## Direction C — “Tactical Data” (Extreme Legibility)
*Arctic Cyan‑forward, grid‑strict.*

**Information hierarchy**  
Data first: numeric readouts dominate; exercise names secondary; modifications as `Gilded Fern` tags.

**Desktop / QHD / 4K composition**  
- Build: Spreadsheet‑like `Carbon` grid with `Arctic Cyan` column headers.  
- Preflight: Terminal‑style checklist with `Arctic Cyan` status codes.  
- Laptop/4K: 2×2 cards with monospaced `Arctic Cyan` timers, `Frost White` names; TV uses 52 px min type, rigid 4‑cell frame.  

**Mobile Floor Card**  
Compact data rows, big mod buttons.

**Scroll ownership**  
Same as A.

**Signature visual decision**  
Visible `Midnight Sapphire` grid lines separating every region; `Gilded Fern` only for alerts; no `Ice Wing` glow—reserved for strict active border.

**Accessibility / reduced‑motion**  
 inherently static; meets WCAG easily.

**Why it could be wrong**  
Abandons “Crystalline Swan” premium feel; may read as generic fitness app, not Sean’s brand.

---

## Recommended Direction: **A — Crystalline Console**
*Beats B and C for a 6 AM operator because it removes motion noise, guarantees 20‑ft legibility, stays within file‑size and token constraints, and makes the primary action (Generate / Start / Clock) unmistakable.*

### Exact Layout & Responsive Behavior (Direction A)

**Tokens enforced**  
Surfaces: `Obsidian` (app bg), `Carbon` (panels), `Graphite` (preview). Fields: `Midnight Sapphire`, `Royal Depth`. Emphasis: `Ice Wing` (active), `Gilded Fern` (earned/attention), `Wing Purple` (AI only), `Arctic Cyan` (data). Text: `Frost White`.

**Build Mode**  
- Grid: `display:grid; grid-template-columns: repeat(12,1fr); gap:16px;`  
- Left intent: `grid-column: span 4;` surface `Carbon`, border `1px Midnight Sapphire`.  
- Right preview: `grid-column: span 8;` surface `Graphite`.  
- Footer action: `position:sticky; bottom:0;` `Generate` btn `background:Gilded Fern; min-height:44px; min-width:44px;`  
- Scroll: page only.  
- Breakpoints: <768px → single column (span 12), footer fixed.

**Preflight Mode**  
- Single column `Obsidian` max‑width 1024px centered. Rows: `min-height:44px` with chip. `Start Class` btn `Ice Wing` bg, `Frost White` text.

**Laptop Console (Run) — authoritative**  
- `height:100vh; display:grid; grid-template-rows: 64px 1fr 96px;`  
- Row1 (status): `Frost White` on `Obsidian`, shows phase • `Arctic Cyan` wall‑clock end • next transition.  
- Row2: `grid-template-columns: repeat(2,1fr); gap:24px;` max 4 `Midnight Sapphire` cards; active card `border:2px Ice Wing`. If synchronized phase → one card `grid-column:1/3`.  
- Row3: `Arctic Cyan` clock `font-size:48px`; `Pause/Advance` buttons `44px` `Ice Wing`.  
- No scroll. Wake‑lock/fullscreen acquired on `Start Class` gesture.

**4K TV Audience View (mirrors console)**  
- Same grid but `row2` cards scale: at 3840px each card min‑height 540px, title `font-size:48px`, mod icon `Gilded Fern` 64px.  
- Only 4 cards; hero phase uses `Royal Depth` field, title 96px `Frost White`.  
- Legible at 20 ft validated by 1/20 visual angle: 48px @ 3840px ≈ 1.2° glyph subtence.

**Mobile Floor Card (read‑only)**  
- `width:100%;` single column `Graphite` cards.  
- Tap card → bottom sheet (`position:fixed; bottom:0;`) shows modifications (44px targets) first, then `Browse all` swap escape.  
- Scroll: one owner (page).  
- Breakpoints: 320‑414px single col; 768px can show 2‑up but phone remains read‑most.

**Reduced Motion & A11y**  
`@media (prefers-reduced-motion: reduce) { * { transition:none!important; animation:none!important; } }`  
Focus: `outline:2px Ice Wing solid;` all interactive ≥44px. No hover‑only.

**Component size guard**  
Each surface split into `<300`‑line styled‑components: `BuildIntent.tsx`, `BuildPreview.tsx`, `PreflightList.tsx`, `ConsoleClock.tsx`, `StationCard.tsx`, `TvAudience.tsx`, `FloorCard.tsx`.

---

### Critic Notes for Implementation Agent (precise)
- Use **styled‑components only**; no MUI/Tailwind.  
- Absolute timer: store `segmentEndsAt` epoch; render via `Date.now()` diff, never accumulate.  
- Start gesture handler must call `requestFullscreen()`, `navigator.wakeLock`, `AudioContext.resume()`, and prime `<video>` playback in same tick; on reject show `Gilded Fern` retry chip.  
- TV never receives participant/pain data; only anonymous mod required flag.  
- Swap flow: tap station → mod sheet → “Swap” reveals exactly 3 prevalidated candidates (`Wing Purple` only if AI ranked) + `Browse all`. Default apply at next round boundary; long‑press 800ms applies now with confirm.

### Assumptions Requiring Sean’s Taste
- Exact `Gilded Fern` hex value for “earned” vs `Ice Wing` for “active” needs final token sheet sign‑off.  
- Whether phone Floor Card may vibrate on phase change (haptic) is pending operational input.  
- Approval of merging Slices 5‑7 into single Runner UI gate to avoid half‑wired state.

*End critic memo — advisory only; repository truth authoritative.*
