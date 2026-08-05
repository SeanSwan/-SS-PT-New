# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md
**Seed:** (none)
**Tokens:** 5150 in / 6425 out | **Cost:** ~$0.0041 | **Wall:** 103.3s | **finish_reason:** stop

---

**Visual UX/UI Review — Section 10 Remit**  
*Consult: Kimi K3 + HY3 · Platform: SwanStudios (Crystalline Swan, dark-first)*  
*Palette: Obsidian `#0A0A0F` · Royal Depth `#003080` · Ice Wing `#60C0F0` · Wing Purple `#8B5CF6` · Gilded Fern `#C6A84B` · Frost White `#E0ECF4` · Midnight Sapphire `#002060`*

---

## A. Generic / Template Patterns Flagged (from §4 wireframes)
Before the ranked list, these wireframe elements read as off-the-shelf admin templates and must be elevated:

1. **Equipment IQ horizontal bars (`Push ████████ 92%`)** — A generic linear progress bar set. It communicates nothing premium and hides the "next-best-action" opportunity.
2. **`[Profile: Main Gym ▾]` native-style dropdown** — A passive `<select>` hides the critical F11 context (how many items, whose gear, read-only state). Easy to ignore; dangerous for data truth.
3. **Scan-review "photo on top, static list below" (§4.2)** — A utility-app cliché. The list and photo are spatially disconnected; the user must map "item 3" to "box 3?" mentally.
4. **My Equipment plain vertical list (`▣ Adjustable dumbbells`)** — Looks like a phone settings page, not a premium fitness surface. No sense of "gear unlocking potential."
5. **`[Take Photo] [Gallery]` button row** — Generic utility buttons; zero cinematic "Crystalline Swan" feel for the signature capture moment.

---

## B. Top 10 Buildable Suggestions (Ranked by Impact)

### 1. Workout-Logger: Persistent "Planning From" Equipment Chip (F11)
**Area:** Workout-logger equipment-profile selection · **Impact:** P0 (data truth, core loop)  
**Buildable:** Replace the passive dropdown at `WorkoutLogger.tsx:949` with an always-visible, sticky **SheenChip** reading `Planning from: Main Gym ▾` (Ice Wing `#60C0F0` glow when active). Tapping opens a bottom-sheet (mobile) or radial menu (desktop) listing profiles with item-counts and "last scanned" dates. If none selected, a Gilded Fern `#C6A84B` pulsing prompt blocks logging.  
**Premium dark-first:** Chip sits on Obsidian `#0A0A0F` with a 1px Ice Wing inner border; 44px tap target; reduced-motion uses opacity fade, not glow pulse.

### 2. Scan-Review: Cinematic "Constellation" Bbox Overlay (F2)
**Area:** Equipment scan-review · **Impact:** P0 (trust + signature beauty)  
**Buildable:** Render detected items as luminous rounded rectangles (radius 8px) with a 4px Ice Wing `#60C0F0` border and subtle backdrop-blur (Crystalline Sheen). Each box gets a numbered node pip. Uncertain items (`conf < 0.55`) use a Wing Purple `#8B5CF6` dashed border with a faint scanline shimmer. Tap box ↔ chip linkage via spring animation.  
**Premium dark-first:** On tap, box scales to 1.03 with a Frost White `#E0ECF4` halo; reduced-motion users get a border-color brighten only.

### 3. Scan-Review: Scroll-Linked List & Sticky Batch-Approve (F2/F9)
**Area:** Equipment scan-review · **Impact:** P0 (review efficiency)  
**Buildable:** Make the item list (§4.2) scroll-linked to the photo: scrolling to "Item 2" auto-highlights its bbox. Move `[✓ Approve all confident]` to a sticky 44px GlowButton fixed to the mobile viewport bottom (not inline). Edits open a slide-in SheenCard panel rather than page reflow.  
**Premium dark-first:** GlowButton uses Gilded Fern `#C6A84B` fill on Obsidian; list rows separated by 1px Royal Depth `#003080` hairlines.

### 4. Equipment IQ: Radial "Swan Wing" Coverage Ring (F8)
**Area:** Equipment IQ panel · **Impact:** High (at-a-glance next-best-action)  
**Buildable:** Replace the `███ 41%` bars with a single SVG radial visualization: 6 concentric arcs (push/pull/hinge/squat/lunge/carry/core). Strong = Ice Wing `#60C0F0`, Weak = Wing Purple `#8B5CF6`, Unlocked potential = Gilded Fern `#C6A84B` dashed segment. Tap arc → Coach card slides in.  
**Premium dark-first:** Centered on Midnight Sapphire `#002060` panel; arcs use `stroke-linecap: round`; reduced-motion disables arc draw-on and uses static render.

### 5. My Equipment: Crystalline Shelf Grid (F5)
**Area:** My Equipment surfaces · **Impact:** P1 (activation)  
**Buildable:** Replace the §4.3 vertical list with a responsive grid of SheenCards (icon/thumbnail, name, qty). The primary CTA "Scan my equipment" becomes a hero GlowButton card spanning the top row, not a small banner.  
**Premium dark-first:** Cards on Royal Depth `#003080` with Ice Wing top-edge sheen; Gilded Fern accent dot if item unlocks new workouts.

### 6. Workout-Logger/Planner: Trainer Context Ribbon (F11/F5)
**Area:** Workout-logger equipment-profile selection · **Impact:** P0/P1 (role scoping, privacy)  
**Buildable:** For trainers/admin, add a persistent "Context Ribbon" beneath nav: `Planning for: [Main Gym] 👁 24 items · Client: Jane (read-only)`. Use Wing Purple `#8B5CF6` background tint when viewing client-owned home gear (answers Open Q2 visually).  
**Premium dark-first:** Ribbon is a frosted Obsidian bar; client context gets a Wing Purple left-border flag (44px tall for tap-to-switch).

### 7. Scan-Review: Immersive Walk-the-Gym Viewfinder (F7)
**Area:** Equipment scan-review (capture) · **Impact:** P2 (coverage + delight)  
**Buildable:** Replace `[🎥 Walk-the-Gym mode]` + icon row with a live viewfinder overlay: faint Ice Wing frame, counter `3 captured · keep walking`, and a shutter GlowButton emitting a Gilded Fern ripple. Post-capture filmstrip sits at bottom (Obsidian thumbnails).  
**Premium dark-first:** Viewfinder frame uses `#60C0F0` at 30% opacity; ripple is a CSS transform scale (disabled under reduced-motion).

### 8. Equipment IQ / My Equip: "Pattern Unlocked" Micro-Interaction (F10)
**Area:** Equipment IQ panel · **Impact:** P3 (adherence/upsell, premium feel)  
**Buildable:** When an approved item completes a movement pattern (e.g., first hinge), trigger a Gilded Fern `#C6A84B` sweep across the IQ radial + a Swan Coach toast: "Hinge unlocked — 12 new exercises."  
**Premium dark-first:** Sweep is a gradient wipe on Royal Depth; toast is a SheenCard sliding from bottom-right (desktop) / bottom (mobile).

### 9. Scan-Review: Honest Degraded/Loading Narratives (F1/F3)
**Area:** Equipment scan-review · **Impact:** P0 (trailhead truth)  
**Buildable:** No generic spinners. Loading = shimmering Ice Wing orb + "Swan Coach is mapping your space…". Degraded (caption fallback) = photo dims to Royal Depth, Wing Purple "Limited Scan" badge, single item glows. Copy per §8 but visually distinct.  
**Premium dark-first:** Orb is a styled-component with `keyframes` glow; degraded badge uses Wing Purple `#8B5CF6` text on Obsidian.

### 10. My Equipment: Cinematic Empty State & Camera-First Onboarding (F5)
**Area:** My Equipment surfaces · **Impact:** P1 (first-run activation)  
**Buildable:** Empty state is not a "no items" text. Use a dark "unchartered space" illustration (Crystalline constellation) + 44px GlowButton "Scan your space" + Frost White `#E0ECF4` reassurance: "Swan Coach identifies what you've got and what it unlocks."  
**Premium dark-first:** Background Obsidian `#0A0A0F` with faint Ice Wing starfield (CSS radial-gradients); button is Gilded Fern `#C6A84B` to signal premium self-serve.

---

## C. Premium Dark-First Alternative — Summary Directive
Decompose all `<select>` and `████` bars. Use **Obsidian/Royal Depth** as structural sinks, **Ice Wing** as the "system sees you" detection color, **Wing Purple** as the "uncertain/privacy" color, and **Gilded Fern** as the "premium unlock" color. Every interactive target is 44px, every animation has a `prefers-reduced-motion` opacity/transform fallback, and every surface uses SheenCard/GlowButton chrome to fulfill the Crystalline Swan rebuild (F9).
