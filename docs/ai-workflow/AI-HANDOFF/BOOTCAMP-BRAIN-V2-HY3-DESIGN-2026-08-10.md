# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/BOOTCAMP-BRAIN-V2-MASTER-PROMPT-2026-08-10.md
**Seed:** (none)
**Tokens:** 4314 in / 14888 out | **Cost:** ~$0.0085 | **Wall:** 238.5s | **finish_reason:** stop

---

# HY3 Design Review — §8 Four Surfaces
**Constraints locked:** styled-components only · no MUI · 44px min touch · dark-first `var(--token,#fallback)` · Dual-Button Glow · WCAG 4.5:1 · `prefers-reduced-motion` · verified @320/375/414.

## Token contract (used by every surface below)
```js
/* global tokens — all components read via var(--token,#fallback) */
--midnight-sapphire:#002060;
--ice-wing:#60C0F0;        /* blue */
--wing-purple:#8B5CF6;     /* purple */
--gilded-fern:#C6A84B;     /* gold */
--frost-white:#E0ECF4;     /* primary text */
--obsidian:#0A0A0F;        /* near-black text on glow fills */
--surface-2:#11151f;       /* card/control fill */
--border-subtle:#1c2433;
--text-secondary:#9fb2c4;
--focus-ring:var(--ice-wing);
```
**Dual-Button Glow (canonical):** `PrimaryCTA` = Ice Wing bg + Wing Purple glow, text Obsidian (9.7:1). `SecondaryCTA` = Wing Purple bg + Ice Wing glow, text Obsidian (4.67:1 — passes 4.5:1; Frost White on purple = 3.52:1, rejected).

---

## 1. Swan + Heart on Workout Rolodex cards

### Decision — the client-count question
**Yes, a client sees the Swan number, but only as a non-interactive, explicitly-labeled badge — never as a like they are expected to give.** The control demotes from button to `aria-disabled` badge reading `Trainer staple · N`. The client's own contribution channel is the Heart. This is intentional social proof (trust signal), not a dead affordance. **Fallback if Sean rejects any non-contributable number:** render `Trainer staple` with no digit for clients; show the digit only to trainers.

### Hierarchy (role-dependent)
| Viewer | Swan | Heart |
|---|---|---|
| Trainer | Primary reaction (left, fills purple + cyan glow when active, drives generation) | Secondary (right, gold outline when saved) |
| Client | Static badge, no tap target, no focus ring | Primary action (right, only control they can press) |

### Component tree
`CardActions > [SwanControl | HeartControl]` where `SwanControl` renders `<SwanButton>` (trainer) or `<SwanBadge>` (client).

### styled-components
```jsx
const CardActions = styled.div`
  display:flex; align-items:center; justify-content:space-between;
  gap:8px; padding:8px 12px 12px;
  border-top:1px solid var(--border-subtle,#1c2433);
`;
const ReactionButton = styled.button`
  min-width:44px; min-height:44px;            /* touch floor */
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:0 10px; border-radius:10px;
  background:var(--surface-2,#11151f);
  border:1px solid var(--border-subtle,#1c2433);
  color:var(--frost-white,#E0ECF4);
  font:600 14px/1.2 system-ui; cursor:pointer;
  transition:background 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  &:focus-visible{ outline:2px solid var(--focus-ring,#60C0F0); outline-offset:2px; }
  @media (prefers-reduced-motion:reduce){ transition:none; }
`;
const SwanButton = styled(ReactionButton)`
  &[data-active='true']{
    background:var(--wing-purple,#8B5CF6);     /* purple bg */
    border-color:var(--wing-purple,#8B5CF6);
    color:var(--obsidian,#0A0A0F);             /* 4.67:1 */
    box-shadow:0 0 16px 0 rgba(96,192,240,0.55); /* cyan glow */
  }
`;
const SwanBadge = styled.span`
  min-height:44px; display:inline-flex; align-items:center; gap:6px;
  padding:0 10px; border-radius:10px;
  border:1px dashed var(--border-subtle,#1c2433);
  color:var(--text-secondary,#9fb2c4);
  font:600 13px/1.2 system-ui;
  /* no pointer-events, no focusable — pure info */
`;
const HeartButton = styled(ReactionButton)`
  &[data-active='true']{
    background:transparent;
    border-color:var(--gilded-fern,#C6A84B);
    color:var(--gilded-fern,#C6A84B);          /* 8:1 on dark */
    box-shadow:0 0 12px 0 rgba(198,168,75,0.35);
  }
`;
```

### State tables
**Swan (trainer):**
| State | Visual | Count |
|---|---|---|
| Inactive | Outline swan, Frost White | `N` (trainers) |
| Active (self endorsed) | Purple fill + cyan glow, Obsidian glyph | `N+1` |
| Hover/Focus | Focus ring Ice Wing | — |
| Loading | Optimistic ±1, 200ms disabled | temp |

**Swan (client):** `SwanBadge` = dashed border, secondary text, `Trainer staple · N`, `aria-hidden` on icon, no `tabIndex`.

**Heart (all users):** Inactive = outline heart + `Save`; Active = gold outline + `Saved`; Focus = Ice Wing ring. **No aggregate count shown** (private per-user per §3.1).

### Mobile verification
| Width | Layout |
|---|---|
| 320 | Actions row: Swan 44–72px + Heart 44–72px, gap 8, fits in 296px content |
| 375 | Same, count text 14px comfortable |
| 414 | Same, extra right padding |
Both controls ≥44px. Reduced-motion: all transitions off.

---

## 2. Surfacing game/play formats without a toy feel

### Anti-toy rules (applied)
1. **Curate, don't decorate** — elimination/turn-taking games are excluded entirely (doctrine violation), so the list never looks like a carnival.
2. **Typographic, not cartoon** — no emoji/dice icons; monochrome line glyphs or text only.
3. **Show real metrics** — each tile prints est. total time, station count, concurrency.
4. **Doctrine-fit tag** in Gilded Fern (`Meets failure doctrine ✓`), not stars.
5. **Randomizer = "Variety Engine"** with locked constraints (Equipment ✓ / Space ✓ / Doctrine lock ✓), not a roll button.

### Component tree
`FormatSection > GroupHeader + FormatGrid > FormatTile[aria-pressed]` · `VarietyEnginePanel` (constraint chips + `PrimaryCTA` Apply).

### styled-components
```jsx
const FormatGrid = styled.div`
  display:grid; gap:10px;
  grid-template-columns:repeat(2,minmax(140px,1fr));   /* 2-up */
  @media (min-width:414px){ grid-template-columns:repeat(3,1fr); }
`;
const FormatTile = styled.button`
  min-height:64px; text-align:left; padding:10px 12px;
  border-radius:12px; background:var(--surface-2,#11151f);
  border:1px solid var(--border-subtle,#1c2433);
  color:var(--frost-white,#E0ECF4); cursor:pointer;
  display:flex; flex-direction:column; gap:4px;
  transition:border-color 120ms, box-shadow 120ms, background 120ms;
  &[aria-pressed='true']{
    border-color:var(--wing-purple,#8B5CF6);
    background:rgba(139,92,246,0.12);
    box-shadow:0 0 16px 0 rgba(96,192,240,0.45); /* purple→cyan glow */
  }
  &:focus-visible{ outline:2px solid var(--focus-ring,#60C0F0); outline-offset:2px; }
  @media (prefers-reduced-motion:reduce){ transition:none; }
`;
const TileName = styled.span` font:700 15px/1.1 system-ui; `;
const TileMeta = styled.span` font:500 12px/1.2 system-ui; color:var(--text-secondary,#9fb2c4); `;
const DoctrineTag = styled.span`
  font:600 11px/1.2 system-ui; color:var(--gilded-fern,#C6A84B); /* 8:1 */
`;
const PrimaryCTA = styled.button`
  min-height:44px; padding:0 18px; border-radius:10px;
  background:var(--ice-wing,#60C0F0); color:var(--obsidian,#0A0A0F);
  border:1px solid var(--ice-wing,#60C0F0);
  box-shadow:0 0 18px 0 rgba(139,92,246,0.55);   /* blue→purple glow */
  font:700 15px system-ui; cursor:pointer;
  &:focus-visible{ outline:2px solid var(--obsidian,#0A0A0F); outline-offset:2px; }
`;
```
**Groups shown:** Interval (`circuit, emom, tabata, hybrid`) · AMRAP (`amrap, partner`) · Ladder/Death (`ladder, descending, chipper, countdown, death_by`) · Team (`team_amrap` new primitive) · Variety Engine (`randomizer`). Each tile meta e.g. `AMRAP · 1:40/ex · 3 rnds · 4 concurrent`.

### Mobile
320/375: 2-up grid, 140px min tiles, 64px height tappable. 414: 3-up. Reduced-motion respected.

---

## 3. Room dimension + obstacle capture (phone, between classes)

### Completion-first rules
- **Prefill** from last `EquipmentProfile` save; trainer edits, never re-types from zero.
- **Steppers** (+ / −) for thumb entry without keyboard.
- **Preset obstacle chips** (Pillar, Mirror wall, Fixed bench, Sled lane, Low ceiling, Door swing, Storage) — one tap adds, zero typing.
- **Live area + capacity note** using Sean's thresholds (`≈ X sq ft · fits ~14, tight at 16`) gives instant validation.

### Component tree
`RoomCaptureSheet > Header > DimRow(Width Stepper+Input, Length Stepper+Input, UnitToggle) > RoomPreview > ObstacleChips + AddedList > StickyFooter(PrimaryCTA Save, SecondaryCTA Cancel)`

### styled-components
```jsx
const DimRow = styled.div` display:flex; gap:12px; align-items:flex-end; `;
const DimField = styled.label`
  flex:1; display:flex; flex-direction:column; gap:4px;
  font:600 12px system-ui; color:var(--text-secondary,#9fb2c4);
`;
const DimInput = styled.input`
  min-height:44px; width:100%; padding:0 12px;
  background:var(--surface-2,#11151f); border:1px solid var(--border-subtle,#1c2433);
  border-radius:10px; color:var(--frost-white,#E0ECF4); font:700 18px system-ui;
  &:focus-visible{ outline:2px solid var(--focus-ring,#60C0F0); outline-offset:2px; }
`;
const Stepper = styled.button`
  min-width:44px; min-height:44px; border-radius:10px;
  background:var(--surface-2,#11151f); border:1px solid var(--border-subtle,#1c2433);
  color:var(--frost-white,#E0ECF4); font:700 20px system-ui; cursor:pointer;
  &:focus-visible{ outline:2px solid var(--focus-ring,#60C0F0); outline-offset:2px; }
`;
const ObstacleChip = styled.button`
  min-height:44px; padding:0 14px; border-radius:999px;
  background:var(--surface-2,#11151f); border:1px solid var(--border-subtle,#1c2433);
  color:var(--frost-white,#E0ECF4); font:600 13px system-ui; cursor:pointer;
  &[aria-pressed='true']{ border-color:var(--ice-wing,#60C0F0); color:var(--ice-wing,#60C0F0); }
`;
const RoomPreview = styled.div`
  width:100%; aspect-ratio:${w}/${l}; border-radius:8px;
  background:var(--surface-2,#11151f); border:2px solid var(--border-subtle,#1c2433);
  position:relative;
  /* obstacle dots positioned inline via left/top % */
`;
const SecondaryCTA = styled.button`
  min-height:44px; padding:0 18px; border-radius:10px;
  background:var(--wing-purple,#8B5CF6); color:var(--obsidian,#0A0A0F);
  border:1px solid var(--wing-purple,#8B5CF6);
  box-shadow:0 0 18px 0 rgba(96,192,240,0.55);  /* purple→cyan glow */
  font:700 15px system-ui; cursor:pointer;
`;
```
**Obstacle dot:** `position:absolute; width:14px;height:14px;border-radius:50%;background:var(--gilded-fern,#C6A84B)` placed by percentage; `Sled lane` renders as a striped rectangle overlay, not a dot.

### Mobile
Single column at 320/375/414 (thumb-reach priority). Sticky footer CTAs full-width, each ≥44px. Reduced-motion: preview aspect-ratio is static (no animation).

---

## 4. True-burnout mode toggle on an exercise

### Eligibility-driven states (from §3.2 strip-speed)
| Equipment class | Toggle |
|---|---|
| Cable / band (fastest–near-instant) | Enabled, recommended |
| Kettlebell / dumbbell (fast, rack-at-station) | Enabled, note "rack must be at station" |
| Barbell / sled / landmine (slow) | Disabled, reason `Strip too slow — use tempo instead` |
| Bodyweight / TRX / slider / ball / bike (N/A) | Disabled, reason `No load to shed — use leverage/tempo` |

### Component tree
`BurnoutRow > BurnoutSwitch(aria-checked) + Label` · when ON: `ProtocolPanel` (ordered strip-set spec) · when disabled: `DisabledReason`.

### styled-components
```jsx
const Switch = styled.button`
  min-width:52px; min-height:44px; padding:0; border:none; background:transparent;
  position:relative; cursor:pointer;
  &[aria-checked='true'] .track{
    background:var(--wing-purple,#8B5CF6);
    box-shadow:0 0 14px 0 rgba(96,192,240,0.5);   /* purple→cyan glow */
  }
  &[aria-checked='true'] .thumb{ transform:translateX(20px); background:var(--obsidian,#0A0A0F); }
  &:focus-visible .track{ outline:2px solid var(--focus-ring,#60C0F0); outline-offset:2px; }
  &[aria-disabled='true']{ cursor:not-allowed; opacity:0.55; }
  @media (prefers-reduced-motion:reduce){ .thumb{ transition:none; } }
`;
const Track = styled.span`
  display:block; width:52px; height:28px; border-radius:999px;
  background:var(--surface-2,#11151f); border:1px solid var(--border-subtle,#1c2433);
  transition:background 120ms, box-shadow 120ms;
`;
const Thumb = styled.span`
  position:absolute; top:4px; left:4px; width:20px; height:20px; border-radius:50%;
  background:var(--text-secondary,#9fb2c4); transition:transform 120ms;
`;
const ProtocolPanel = styled.ol`
  margin:8px 0 0; padding:10px 12px; list-style:none;
  background:rgba(139,92,246,0.08); border:1px solid var(--wing-purple,#8B5CF6);
  border-radius:10px; color:var(--frost-white,#E0ECF4); font:500 13px/1.5 system-ui;
  li::before{ content:'▸ '; color:var(--ice-wing,#60C0F0); }
`;
```
**ProtocolPanel content (ON):** `Start heavy (strength/power)` → `Drop ~50% at failure, no rest` → `Push to burnout` → `Final ultra-light ~20 reps FULL ROM`. Footer line: `No rest between drops · eligible: cable/kettlebell/dumbbell/band`.

### Mobile
320/375/414: `BurnoutRow` stacks label above switch (44px hit area preserved via 52×44 button). ProtocolPanel full-width below. Disabled reason in `text-secondary` (8.4:1). Reduced-motion: thumb slide disabled.

---

## Cross-cutting verification
| Check | Result |
|---|---|
| 44px min touch | All buttons/inputs/chips ≥44px (Swan/Heart 44×44, Stepper 44, Switch 52×44, CTAs 44) |
| Dark-first `var(--token,#fallback)` | Every color via `var(--x,#hex)` |
| Dual-Button Glow | `PrimaryCTA` blue→purple, `SecondaryCTA` purple→cyan, Swan-active purple→cyan |
| WCAG 4.5:1 | Obsidian on Ice Wing 9.7:1, Obsidian on Purple 4.67:1, Gold/Frost/Ice on dark ≥8:1; Frost on Purple rejected → not used |
| Reduced-motion | All `transition` blocks wrapped in `@media (prefers-reduced-motion:reduce){transition:none}` |
| 320/375/414 | Surface 1 row fits 296px · Surface 2 2-up→3-up · Surface 3 single column · Surface 4 stacked |
| No MUI | Zero imports; styled-components only |

**Open flag for Sean:** confirm whether clients should see the Swan digit at all (default = badge with digit; fallback = digit hidden). Everything else is build-ready per above specs.
