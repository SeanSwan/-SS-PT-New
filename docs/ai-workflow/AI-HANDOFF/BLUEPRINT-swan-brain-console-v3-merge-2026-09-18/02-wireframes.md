# 02 — Wireframes (console as built + the two new surfaces)

Every string below is the **exact copy** from `scripts/swan-brain-console/app/index.html`. The
builder must not paraphrase it. Palette tokens are the closed Crystalline Swan set.

## 0. Layout rules that apply to every screen

- Dark-first. Background `var(--bg-primary, #0D1117)`; surface `var(--bg-surface, #161B22)`.
- Every interactive control **≥ 44×44px** (measured in `console-verify.mjs`, not assumed).
- Focus ring is the house signature: `2px solid var(--ice-wing, #60C0F0)` + 2px offset.
- Text on surface must meet **WCAG 4.5:1**; the console's measured worst is **8.72:1**.
- **No horizontal overflow at 320 / 375 / 414 / 768 / 1280 / 2560.** Long unbreakable strings (file
  paths, ISO timestamps, `nav|hero|grid` tuples) must carry `overflow-wrap: anywhere`.
- Tabs are an ARIA `tablist` with **one tab stop** (roving tabindex), `←`/`→` to move.

---

## 1. Console shell — desktop (≥1280px)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ◆  Swan Brain Console                                        ?                      │
│     Design Brain operator surface — read-only                                        │
│                                                                                      │
│     Doctrine      Variants      Archetypes      Engine                               │
│     design.md    20             22              DECLARED_BLOCKED                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  [ Doctrine ] [ Fleet ] [ Canvas ] [ Copy ] [ Engine ] [ Seats ] [ Memory ] [ Ship ] │
│  Tip: use ← → arrow keys to move between tabs.                                       │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Start here — what this console is ─────────────────────────────────────────────┐ │
│  │ Twenty AI-built homepage designs (the "fleet") are competing to become the next │ │
│  │ SwanStudios front page. This console is the briefing room: the design rules they │ │
│  │ follow, their structural line-up, and an honest report of what the system can   │ │
│  │ and cannot do yet.                                                              │ │
│  │                                                                                 │ │
│  │ Nothing here can break anything. The console is read-only and runs only on your │ │
│  │ machine — there is no button anywhere that writes to the site, the repo, or the │ │
│  │ learning engine.                                                                │ │
│  │                                                                                 │ │
│  │ The loop is three steps:                                                        │ │
│  │   1 · Skim the Doctrine tab — the rules every variant was built against.        │ │
│  │   2 · Shortlist in the Fleet tab — then open a variant's Watch it move link.    │ │
│  │   3 · Check the Engine tab — what the system saves today, and why.              │ │
│  │                                                                                 │ │
│  │ The winner never ships from here: promotion happens as a normal reviewed        │ │
│  │ commit, so every design, accessibility and review gate still applies. Links     │ │
│  │ marked Watch it move open the live gallery — if one does not load, the gallery  │ │
│  │ harness is not running: start it with npx vite --port 5199 from frontend/.      │ │
│  │                                                                                 │ │
│  │                        [ Got it — don't show this again ]                        │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│  ▸ Glossary — the words this console uses                                            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**States:**
- `welcome` visible on a **fresh browser context** (no `localStorage` key). Non-modal — it must never
  block automation.
- Dismissed → persisted; reopenable via the 44×44 `?` button (`aria-label="Reopen the getting-started
  briefing"`).
- `#engine-banner` — `hidden` unless `durableWrites === 'UNKNOWN'`. `DECLARED_BLOCKED` is the
  **expected** state and must render calm-neutral, not red.

## 2. Console shell — 375px

```
┌──────────────────────────────┐
│ ◆ Swan Brain Console      ?  │
│   Design Brain operator      │
│   surface — read-only        │
│                              │
│ Doctrine       design.md     │
│ Variants       20            │
│ Archetypes     22            │
│ Engine         DECLARED_     │
│                BLOCKED       │
├──────────────────────────────┤
│ [Doctrine][Fleet][Canvas]    │  ← horizontally scrollable
│ [Copy][Engine][Seats]        │    tab strip, one tab stop
│ [Memory][Ship]               │
├──────────────────────────────┤
│  (panel content, single      │
│   column; tables get a       │
│   mobile scroller — never    │
│   a page-level h-scroll)     │
└──────────────────────────────┘
```

## 3. Fleet tab — the judging surface

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  Fleet                                                                            │
│  Twenty front-page candidates. Each row shows how that variant differs: where      │
│  navigation lives, how the hero moves, how content grids — plus the cost it        │
│  accepts for that choice. What to do here: shortlist the structures you like,      │
│  then use a row's Watch it move link to judge it live in the browser gallery.      │
│                                                                                   │
│  ┌ 20 variants ┐ ┌ 20 nav models ┐ ┌ 20 grids ┐ ┌ 8 scene families ┐ ┌ 1 wildcard ┐│
│                                                                                   │
│  Structural divergence contract per variant                                        │
│  ┌─────┬───────────────┬───────────────┬───────────────┬──────┬────────┬────────┐  │
│  │ ID  │ Title         │ Nav model     │ Hero mechanic │ Grid │ Cost   │ Render │  │
│  ├─────┼───────────────┼───────────────┼───────────────┼──────┼────────┼────────┤  │
│  │ v01 │ …             │ vertical-index│ scroll-scrub  │ full-│ …      │ Watch  │  │
│  │ v02 │ …             │ stepper-left  │ measured-…    │ time-│ …      │ Watch  │  │
│  │ …   │               │               │               │ spine│        │ it move│  │
│  │ v18 │ …  ★wildcard  │ command-strip │ terrain-fly   │ edit-│ …      │ Watch  │  │
│  │ v20 │ …             │ horizon-bar   │ pointer-par…  │ edit-│ …      │ Watch  │  │
│  └─────┴───────────────┴───────────────┴───────────────┴──────┴────────┴────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

`Cost it accepts` is the **tradeoff string** — the judgement instrument (blueprint R10). It must be
non-empty and ≥13 characters per variant, asserted by `fleet.contract.test.ts`.

## 4. Engine tab — the honesty surface

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  Engine                                                                           │
│  The Design Brain learning loop. It is fail-closed by design, and this panel       │
│  reports that state rather than offering controls that cannot work. What to do     │
│  here: nothing to operate — this tab exists so the console cannot lie to you       │
│  about what is being saved.                                                       │
│                                                                                   │
│  State: DECLARED_BLOCKED                                                          │
│  Evidence (quoted from scripts/design-brain/README.md, not paraphrased):           │
│  "…new receipt writes remain fail-closed until the signed source-classification    │
│   authority adapter has production keys, trusted time, and revocation state…"      │
│                                                                                   │
│  Write controls: (none — and none may be added)                                    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Three states, and `BLOCKED` is never emitted bare:**

| State | Meaning | Render |
|---|---|---|
| `DECLARED_BLOCKED` | the engine's docs declare the gate, without negation | calm-neutral — **expected today** |
| `VERIFIED_BLOCKED` | a probe read the gate itself | **currently unreachable** — no probe exists |
| `UNKNOWN` | declaration absent, negated, or unreadable | red banner + demand for human review |

## 5. NEW — Judge Mode (S2)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  Judge   Round 2 of 10 · 5 variants · verdicts saved locally (14 so far)           │
├──────────────────────────────────┬────────────────────────────────────────────────┤
│                                  │                                                │
│        ┌──────────────────┐      │      ┌──────────────────┐                      │
│        │                  │      │      │                  │                      │
│        │      v07         │      │      │      v12         │                      │
│        │  progress-spine  │      │      │    no-nav        │                      │
│        │  instanced-field │      │      │  layered-shells  │                      │
│        │   rail-well      │      │      │  stacked-bands   │                      │
│        │                  │      │      │                  │                      │
│        └──────────────────┘      │      └──────────────────┘                      │
│         [ 1 · pick left ]        │       [ 2 · pick right ]                        │
├──────────────────────────────────┴────────────────────────────────────────────────┤
│  [ E · either ]   [ N · neither ]        [ ← back ]   [ → next pair ]              │
│                                                                                   │
│  Verdicts: 14 · [ Export receipt ↓ ]  →  judge-2026-09-18.json + .md               │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Contract:** verdicts live in `localStorage` only. The export is a **file download** — no server
write, so the GET-only contract holds. The exported receipt IS the promotion evidence.

**Exact copy:**
- `1 · pick left` · `2 · pick right` · `E · either` · `N · neither`
- `← back` · `→ next pair`
- `Export receipt ↓`
- Empty state: `No verdicts yet — pick a side to start.`
- Complete state: `All 10 pairs judged. Export the receipt, then name the winner in chat.`

## 6. NEW — Gate Health tab (S4)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  Gate Health          last run: 2026-09-18T09:30Z (re-run now)                    │
│                                                                                   │
│  ┌ Engine contract      ✅  12 / 12 ┐ ┌ Fleet contract      ✅  17 / 17 ┐          │
│  ┌ Runtime contract     ✅  49 / 49 ┐ ┌ gallery-verify      ⚠  not run  ┐          │
│  ┌ console-verify       ⚠  not run ┐ ┌ scoped tsc          ⚠  not run  ┐          │
│                                                                                   │
│  ⚠ "not run" is not a pass. A gate that has not executed is UNVERIFIED.            │
└───────────────────────────────────────────────────────────────────────────────────┘
```

This panel exists to stop the exact failure the CI header names: *"a guard nobody runs is not a
guard."* It must render `not run` distinctly from `pass` — never a green tick for an unexecuted gate.
