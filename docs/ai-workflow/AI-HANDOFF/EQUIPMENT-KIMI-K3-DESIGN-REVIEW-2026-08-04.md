# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md
**Seed:** (none)
**Tokens:** 4985 in / 4074 out | **Cost:** ~$0.0761 | **Wall:** 43.3s | **finish_reason:** stop

---

# Visual UX/UI Review — Equipment Intelligence Overhaul (§10 Response)

**Reviewer remit:** scan-review experience, Equipment IQ panel, My Equipment surfaces, and the F11 workout-logger equipment-profile selection UX. Ranked by impact. Palette assumed: Obsidian `#0A0A0F` base, Midnight Sapphire `#002060` / Royal Depth `#003080` surfaces, Ice Wing `#60C0F0` primary action, Wing Purple `#8B5CF6` uncertainty/AI-adjacent, Gilded Fern `#C6A84B` opportunity/premium, Frost White `#E0ECF4` text.

---

## Top 10 Suggestions, Ranked by Impact

### 1. F11: Make the equipment profile a persistent context chip, never a dropdown
**Impact: highest — this is the "impossible to get wrong" requirement.**

The wireframes never show the logger, and a passive dropdown at `WorkoutLogger.tsx:949` will fail the F11 contract visually. Build:

- A **sticky context pill** pinned to the top of the Workout Logger and planner, always visible: `⬡ Planning from: Main Gym ▾` — 44px tall, Midnight Sapphire fill, 1px Ice Wing border at 40% opacity, profile-name in Frost White.
- **One tap opens a bottom sheet** (mobile) / popover (desktop) listing profiles as cards: name, location type icon, item count, last-scanned date. Active profile gets an Ice Wing left-edge bar. Switching is one tap, no confirmation modal.
- **Derive, don't ask:** when a workout is opened from a generated plan, the chip is pre-set from `plan.equipmentProfileId` and shows a lock hint ("Set by plan · tap to change"). Never launch the logger with no profile resolved — if the user has exactly one profile, it's silently active and the chip just shows it.
- **Mismatch enforcement is visual, not blocking:** if a logged exercise isn't in the active profile's approved inventory, the exercise row gets a Gilded Fern left border + inline note "Not in Main Gym — log anyway?" with one-tap "Switch profile" as the primary action. This turns the enforcement layer into a correction loop instead of an error wall.
- Logged sessions stamp the profileId and show it read-only in history ("Logged with: Home") so progress charts stay honest.

### 2. Scan review: replace raw rectangles with a numbered "constellation" overlay
The signature moment deserves better than engineering-style bounding boxes.

- Draw boxes as **rounded-corner brackets** (corners only, not full rectangles) in Ice Wing with a soft outer glow (`box-shadow: 0 0 12px rgba(96,192,240,0.45)`), each anchored by a **numbered node dot** (24px circle, Obsidian fill, Ice Wing numeral). This reads as "Swan Coach saw these objects," not "CV debugging output."
- **Uncertain items** (<0.55): dashed Wing Purple brackets + pulsing node, with a `?` in the dot. The pulse is the only ambient animation on screen — attention goes exactly where human judgment is needed.
- **Two-way sync with focus isolation:** tapping a chip (or box) dims the photo to 40% brightness everywhere *except* the active box region (CSS mask/clip-path), and the chip list auto-scrolls. This is the premium alternative to "highlight the box" — it makes the photo itself the interface.
- Reduced-motion fallback: no pulse, no dim transition — instant opacity change, same information.

### 3. Kill the raw confidence decimals — use tiered trust labels
`0.94` / `0.48` in the wireframe is developer telemetry leaking into UI. Replace with three tiers:

| Tier | Range | Label | Treatment |
|---|---|---|---|
| Confident | ≥0.80 | "Confident" | Ice Wing, no badge needed |
| Likely | 0.55–0.79 | "Likely — quick check" | Frost White, subtle Wing Purple dot |
| Uncertain | <0.55 | "Not sure — look closer?" | Wing Purple dashed, `🔍 Look closer` primary |

Exact numbers live one level down in the Edit sheet for trainers who want them. This also fixes the approval hierarchy: "Approve all confident" becomes a meaningful bulk action instead of a math decision.

### 4. Equipment IQ: replace progress bars with a pattern-coverage constellation
The ASCII bars in wireframe 4.1 are the most template-feeling element in the doc (see flags below). Premium alternative:

- A **7-spoke radial** (push/pull/hinge/squat/lunge/carry/core) rendered as a heptagon web on Obsidian. Coverage fills each spoke in Ice Wing gradient; the **weakest spoke renders in Gilded Fern** — the eye lands on the gap, which is the entire point of the panel.
- Center of the web: overall coverage % in Frost White numerals.
- Below the web, a single **Coach insight strip** (not a chat bubble): `✦ "A loop band unlocks 11 pull exercises" [Ask →]` — Gilded Fern text for the unlock count, Ice Wing for the CTA. One insight, rotated per visit, never a stack of cards.
- Mobile: the radial collapses to a horizontal 7-segment arc gauge; same color logic. Reduced-motion: no draw-in animation, static render.
- Empty state (no approved items): web renders as a faint dashed heptagon outline with "Scan your space to light this up."

### 5. Cinematic scan capture flow with staged honesty states
The capture → result transition is where "premium" is won or lost.

- **Camera-first on mobile:** the Scan card's primary action opens an in-app viewfinder (full-bleed, Obsidian chrome, Ice Wing shutter ring). No intermediate "Take Photo / Gallery" choice screen — gallery is a secondary icon in the viewfinder corner.
- **On capture:** shutter ring contracts with a crystalline shard burst (Ice Wing particles, ~400ms), then the photo cross-fades in and **boxes stagger in one at a time** (80ms stagger, 240ms ease-out each) — the "constellation forming" moment from the master prompt, made literal.
- **Loading is staged copy, not a spinner:** "Scanning the room…" → "Identifying equipment…" → "Matching to your inventory…" — each stage a Frost White line with a thin Ice Wing progress hairline. This covers the real latency of a two-stage pipeline without a fake determinate bar.
- **Degraded scan honesty UI:** not an error state. Gilded Fern banner: "Limited scan — we could only confirm one item. Better lighting or a closer shot usually fixes it." with [Retake] as primary. Never red; the user did nothing wrong.
- Reduced-motion: skip burst and stagger; boxes render instantly, staged copy still shows.

### 6. Approval gestures: swipe-to-approve with undo, not three buttons per row
Each chip row currently shows `[✓ Add] [✎ Edit] [✗]` — three 44px targets per item is thumb-hostile on mobile and visually noisy with 12 items.

- **Swipe right on a chip = approve** (Ice Wing wash sweeps the row, haptic tick). **Swipe left = reject** (row collapses). Tap = expand to edit sheet.
- Keep the three actions as visible icon-buttons on desktop hover and as the expanded state on mobile (accessibility: gestures must not be the only path).
- **Bulk bar:** sticky footer `[✓ Approve 9 confident]` — GlowButton, Ice Wing, count is live. After any approval, a 4-second **undo snackbar** (Obsidian, Frost White text, Ice Wing "Undo") — this is what makes fast gesture approval safe.
- Approved items animate out of the review list and a counter ticks up in the background: "Inventory: 24 → 27."

### 7. My Equipment: camera-first hero, gear grouped by what it unlocks
Wireframe 4.3 is close but the inventory is a plain list. For clients/users (non-experts), organize by *capability*, not by item:

- Group gear under movement-pattern headers with tiny coverage dots: "Pulling — pull-up bar, loop bands" — this teaches the Equipment IQ model implicitly and sets up the upsell ("You have nothing for hinges yet").
- The Coach nudge card (`"Your next workout uses all 3 — start now →"`) is the strongest element in the wireframe — promote it to directly under the hero CTA, styled as a Midnight Sapphire card with Gilded Fern left border, not inline text.
- Item rows: category line-icon (custom stroke icons in Frost White at 60% — **not emoji**), name, quantity stepper (44px −/+), pending items show a Wing Purple "review" dot.
- Trainer viewing a client's profile: the read-only banner should be a slim top strip in Royal Depth with a lock icon — "CLIENT-OWNED · used for their home workout plans" — not a modal or a card competing with content.

### 8. Walk-the-Gym: filmstrip session model with merge transparency
Multi-photo merge is a trust risk ("did it double-count my rack?"). Make the merge visible:

- During capture, a **horizontal filmstrip** of session thumbnails sits above the shutter; each thumb gets a tiny badge with its detected-item count.
- On finish, the review screen shows **one merged photo set**: tabs or a swipeable strip per photo, with a header "3 photos · 14 unique items · 2 duplicates merged." Tapping the "2 duplicates merged" text expands a merge receipt ("Dumbbell Rack seen in photos 1 & 2 → kept once"). This single receipt prevents the most predictable support complaint.
- Per-photo degraded flags surface in the filmstrip (Gilded Fern corner dot) so users know which shot to retake.

### 9. Inventory list: category-grouped cards with status tokens, not a table
The `▣ name x1 ✓` rows in 4.1 read as an admin table. Premium treatment:

- Group by category (Strength / Cardio / Bands & Mobility / Benches & Racks) with collapsible headers and per-group counts.
- Status as **edge tokens**, not symbols: approved = nothing (default state needs no badge), pending = Wing Purple left-edge bar + "Review" text, degraded-source = Gilded Fern dot.
- The `[filter ▾]` dropdown becomes **segmented filter chips** (All / Pending / Strength / Cardio…) — one tap instead of two, and the pending count is a badge on the chip: `Pending ●3`.
- Desktop: two-column card grid at ≥1024px; the scan card and inventory should not be locked in a 50/50 split (see flags).

### 10. Wording pass — specific string upgrades
- Button: "Scan Equipment" until S6 lands (already in doc — hold this line; it's the cheapest trust win in the whole blueprint).
- "Look closer" → **"Scan this spot closer"** (the action is a re-scan, not a zoom; ambiguity will cause mis-taps).
- "Approve all confident" → **"Add 9 confident items"** (verb + count + tier; "approve" is bureaucratic for clients).
- Empty state (approved in doc) is good; add a secondary line under it: "Takes about 30 seconds." — reduces first-scan abandonment.
- Duplicate prompt is good; add the resolution action names: [Add second unit] / [Keep one].
- Equipment IQ empty: "Scan your space to light this up" (ties the visual metaphor to the action).
- Zero instances of "AI," "detection," "confidence score," or "bounding box" in user-facing copy. "Swan Coach spotted…" / "Not sure about…" carry the same truth.

---

## Generic / Template Patterns Flagged — with Premium Alternatives

| # | Template pattern in the wireframes | Why it feels generic | Premium dark-first alternative |
|---|---|---|---|
| A | **ASCII progress bars in Equipment IQ** (`Push ████████ 92%`) | Bootstrap-era dashboard widget; six identical bars = no hierarchy | 7-spoke radial web (suggestion #4); weakest spoke in Gilded Fern; one Coach insight, not a list |
| B | **50/50 two-card grid** (Scan card beside Inventory card, 4.1) | Default admin-template layout; gives the cinematic feature equal weight to a list | Asymmetric: IQ as a full-width hero band; Scan as a tall, visually dominant left card (40%) with the last scan's thumbnail as its background at 20% opacity; Inventory flexes right (60%) |
| C | **Emoji as icons** (📷 🎥 ✦) | Emoji render inconsistently across platforms and read consumer-grade, not premium | Custom 1.5px stroke icon set in Frost White/Ice Wing; ✦ becomes the Swan glyph mark; consistent 24px grid |
| D | **Raw confidence decimals** (0.94, 0.48) | Developer telemetry in consumer UI | Tiered trust labels (#3); numbers demoted to the edit sheet |
| E | **Full-rectangle bounding boxes** | CV-debugger aesthetic; visually heavy at 12 items | Corner-bracket + numbered node constellation (#2); dim-outside-focus isolation |
| F | **Three text buttons per review row** | Form-builder pattern; thumb-hostile | Swipe gestures + sticky bulk-approve bar + undo (#6) |
| G | **`[filter ▾]` dropdown** | Two taps, hides options | Segmented filter chips with live count badges (#9) |
| H | **Generic spinner for scan loading** | Wastes the most dramatic moment in the flow | Staged honest copy + hairline progress + constellation reveal (#5) |
| I | **Plain `▣ name x1 ✓` inventory rows** | Spreadsheet energy | Category-grouped cards, edge-token statuses, quantity steppers (#9) |
| J | **"📷 Scan my equipment" as a static button** | Standard CTA card; undersells camera-first mobile | Button opens live viewfinder directly; on returning visits the card shows the *last scan's photo* with item count overlaid — the surface remembers you |

---

## One structural note for the build slices
Suggestions #1 (logger chip) and #3 (trust tiers) are cheap and touch the F11 P0 contract — consider folding the logger chip into **S2** rather than leaving it implicit, since F11 is ranked P0 but has no dedicated slice. The radial IQ web (#4) belongs in S8 as specced, but the *data* it needs (pattern coverage per profile) is already produced by the gap-report service in S6 — build the API shape once there.

**Highest-leverage single change:** #1. The equipment-profile context chip is the difference between "equipment system exists" and "equipment system is the ground truth" — and it's the one surface in this blueprint with no wireframe at all.
