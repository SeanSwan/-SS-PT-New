# C5 — The One Intent Bar · Design Contract

**Slice:** C5 (Swan Coach Hive-Mind, SWA-65) · **Status:** ideation gate — awaiting Sean's direction pick. **No code written.**
**Routed through:** `swan-design-router` (Rule 40). Load-order items 1–4 verified present and in sync (design system 464 ln, storyboarding 406 ln, design-brain 86 ln; only retired-token hit is the ban list itself at `SWAN-CINEMATIC-DESIGN-SYSTEM.md:56`).

---

## 0. Grounding — what already exists (8th correction in this program)

Seven planned "build this" items in this program turned out to already exist. C5 makes it **eight**, and one grounding fact **blocks the slice as written**.

| Claim in the master prompt | Reality on `main` | Consequence |
|---|---|---|
| C5 builds a role-aware Cmd+K palette | **No global palette exists.** Only hit for `cmdk\|CommandPalette\|Cmd+K` is `Social/Reels/VerticalReels.tsx` (unrelated key handler) | The overlay itself IS net-new — the ideation gate genuinely applies |
| "the voice lane as a single object" | **`ClientTrainingCommandBar.tsx` (296 ln) already is one** — `useCoachCommand` (execute/confirm/cancel) + `useCoachBrowserSpeechInput`, placeholder *"Dictate sets, reps, load, pain, notes…"* | C5 **generalizes an existing bar**; it does not invent the intent+voice pairing |
| 🔴 "resolve by audience via `resolveAudienceFromPath`" (SWA-64) | **NOT ON MAIN.** `git grep resolveAudienceFromPath origin/main` → zero hits. It lives in 3 **unpushed** commits on `feat/admin-trainer-normalization` (worktree `c:/tmp/ss-admin-trainer-norm`) | **C5 cannot call it.** Building against it produces code that does not compile on `main` |

**Five command surfaces already exist** and are what "one intent bar" must converge:
`CoachCommandCenterPage.tsx` · `ClientTrainingCommandBar.tsx` · `SwanCoachActionLauncher.tsx` · `LogFoodCommandCenter.tsx` · `CoachInputBar.tsx`

### The audience-routing decision Sean must make
- **(a) Land SWA-64 first** — push the 3 commits, then C5 consumes `resolveAudienceFromPath` as designed. Cleanest, but blocks C5 on another branch.
- **(b) Ship C5 without audience routing** — destinations resolve by explicit role prop; add audience routing when SWA-64 merges. Unblocks now, carries a known follow-up.
- **(c) Absorb the resolver into C5** — duplicates SWA-64's work. **Not recommended** — that is the drift this program exists to remove.

---

## 1. External reference receipt (Mobbin — working-surface lane)

A command palette's job is **task completion**, so per the router's two-lane doctrine this is the Mobbin lane, not the cinematic-journey lane. Six web references examined:

| Ref | Principle extracted |
|---|---|
| [Linear](https://mobbin.com/screens/8a6d227b-63e6-483c-925f-d256d0989a10) | **Context chip above the input** (`Issue - JOH-1`) — the palette declares *what it is acting on* before you type. **The single most important pattern for Swan.** |
| [Vapi](https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b) | Dark operator density; grouped sections (Actions / Recent / All Pages); footer legend **plus a live result count** |
| [StackAI](https://mobbin.com/screens/bbcc94bb-f535-4dca-8532-56b135fce5c3) | Two-line rows (label + description); **footer actions change with the selected row** |
| [Juicebox](https://mobbin.com/screens/2af813bf-0129-45d1-81ed-069edee76e16) | Trailing ↗ glyph distinguishes *navigate* from *execute*; left accent bar marks the active row; `Tab` jumps sections |
| [Fey](https://mobbin.com/screens/ff52ac90-4d18-4765-98da-df1e362a5ee1) | Single-letter shortcut chips, right-aligned; shortcuts are *taught* in-place |
| [Navattic](https://mobbin.com/screens/c65971cf-c4ea-45e9-99a5-555930cb5d73) | `⌘K to open` persisted in the footer as ambient discovery |

**What none of them solve — Swan's actual differentiator:** not one reference treats **voice as a co-equal input**. Every palette is keyboard-only. The mic cannot be bolted on as an icon; the directions below each answer *"what is voice here"* differently. This is where Swan invents rather than borrows.

**Swan-specific requirement no reference covers:** the palette must make **whose record this writes to** impossible to miss. C0.5 proved a wrong-client write path was live in production on a *destructive* command. Linear's context chip is the closest prior art; Swan's version carries higher stakes.

No external UI, URLs, tokens, or screenshots are copied into the repo. `SWAN-CINEMATIC-DESIGN-SYSTEM.md` wins every conflict.

---

## 2. The three concept directions

> Dashboard-class surface → 4-phase arc (orientation / current state / progress-insight / next-best-action). Breadth pass **skipped** (awe is not this surface's job — router doctrine). C13 **not offered** (default is no; this is a working surface).

---

### === CONCEPT DIRECTION 1 ===

**NAME:** *The Lock*

**PAGE STORY ARC (4-phase):**
- **Orientation:** the overlay opens and the first thing that resolves is **not** the input — it is the client chip. "Working with Client #84." The bar knows who before you know what.
- **Current state:** grouped commands beneath, scoped to that client. Sections: *Log* / *Review* / *Plan* / *Go to*.
- **Progress-insight:** each row carries a trailing state hint drawn from the C2 memory projection — "3 sets logged today", "no movement screen on file".
- **Next-best-action:** the top group is `Suggested`, derived from intake coverage gaps + today's session.

**SECTION PATTERN STACK:** orientation → C12 (glass panel) · state → C5 (shelf/grouped rows) · insight → C9 (media-first metric chips inline) · next-action → C10 (narrative divider between Suggested and the rest)

**EMOTIONAL JOBS:** orientation → **safety** · state → trust · insight → momentum · next-action → intimacy

**SIGNATURE MOMENT:** **The lock, and the break.** The client chip sits above the input with a Midnight Sapphire fill and Ice Wing edge. The instant a typed or spoken command would act on a *different* client, the chip flips to **Gilded Fern** with a slow 2s pulse and the primary button's glow inverts — you cannot execute a cross-client action without seeing the chip change. This is the C3 `deliberate` tier made visual.

**ASSET TYPE NEEDED:** none (A-tier assets not required — pure UI). No Seedance run.

**MOTION TIER:** tier-2 lean (chip state transition + row focus; no cinema)

**WHY IT FITS:** It makes the program's catastrophic failure mode — writing to the wrong client — a *visual constant* rather than a backend guarantee the trainer never sees. It is the only direction where safety is the opening beat.

**WHY IT COULD BE WRONG:** The chip costs vertical space above the input on mobile, and if a trainer works with one client for an hour the chip becomes wallpaper — the classic "always-on warning stops being read" failure.

---

### === CONCEPT DIRECTION 2 ===

**NAME:** *The Lane* — **the restrained one**

**PAGE STORY ARC (4-phase):**
- **Orientation:** there is no overlay. A slim 56px bar is **persistently docked** at the bottom of every Coach surface, always showing the locked client and a mic. Nothing to summon.
- **Current state:** typing or speaking expands it upward into a 5-row result list; it collapses on execute.
- **Progress-insight:** the collapsed bar carries one live token — the pending/unsynced count from the C2 log ("2 not yet synced").
- **Next-best-action:** long-press the mic surfaces three suggested commands as chips inline.

**SECTION PATTERN STACK:** orientation → C12 (glass dock) · state → C5 (compact shelf) · insight → inline status token · next-action → chip row

**EMOTIONAL JOBS:** orientation → **calm** · state → trust · insight → trust · next-action → momentum

**SIGNATURE MOMENT:** **The bar that is already open.** `Cmd+K` *focuses* it rather than opening a modal — so keyboard and voice reach the same object with no mode change, and on mobile the trainer's thumb is already on it. Zero-summon is the whole idea.

**ASSET TYPE NEEDED:** none. No Seedance run.

**MOTION TIER:** tier-3 reduced baseline (height transition only; fully functional with `prefers-reduced-motion`)

**WHY IT FITS:** DoD #1 is a voice-originated set log in **≤2s, screen-off**. An overlay you must summon is a mode; a docked bar is not. This is the only direction that is genuinely one-handed on a gym floor, and it is the fastest to ship — it is closest to generalizing `ClientTrainingCommandBar.tsx`, which already exists.

**WHY IT COULD BE WRONG:** Permanently occupies 56px on every Coach surface, and on a phone in landscape that is real estate the Logger wants. Less impressive than an overlay — it will not demo as well.

---

### === CONCEPT DIRECTION 3 ===

**NAME:** *The Console*

**PAGE STORY ARC (4-phase):**
- **Orientation:** full overlay, two columns. Left: intent list. Right: **a live consequence preview** of the highlighted command.
- **Current state:** the preview renders the actual diff — "Squats · 185 lb × 8 → adds set 3 to today's session for Client #84."
- **Progress-insight:** the preview pane shows the relevant history inline — last session's numbers for that exercise, so the trainer sees the delta before committing.
- **Next-best-action:** the preview names the confirmation tier it will require (silent / read-back / spoken yes) before you press enter.

**SECTION PATTERN STACK:** orientation → C12 · state → C5 left + C11 right (chart environment for the history sparkline) · insight → C9 · next-action → C6 (the preview is the "back" of the command card)

**EMOTIONAL JOBS:** orientation → clarity · state → trust · insight → **momentum** · next-action → celebration

**SIGNATURE MOMENT:** **The consequence pane.** You see what a command will do to the record *before* it happens — the C3 read-back tier rendered visually instead of spoken. Numbers are shown large enough to catch a misheard digit at arm's length.

**ASSET TYPE NEEDED:** none, but requires a Victory sparkline (rule 10 — Victory only) in the preview.

**MOTION TIER:** tier-1 full cinema available (preview cross-fade, number roll-up) with tier-2/3 fallbacks

**WHY IT FITS:** It is the only direction that closes the loop C2 opened — the memory knows what *did* happen; this shows what *will*. It is also the strongest answer to "digits are the highest-error class in gym noise," because the number is on screen, big, before commit.

**WHY IT COULD BE WRONG:** Two columns do not survive a phone. It would need to degrade to Direction 1 on mobile, which means **building two things**. It is the heaviest, slowest, and most likely to be over-built for a trainer who just wants to log a set.

---

## 3. Recommendation

**Direction 2 (*The Lane*) as the base, with Direction 1's client chip fused into it.**

Rationale: DoD #1 is a ≤2s screen-off set log, and an overlay is a mode-switch that fights it. Direction 2 is also the shortest path from `ClientTrainingCommandBar.tsx`, which already pairs intent + dictation — consistent with this program's 8-for-8 finding that the win is generalizing what exists. Direction 1's chip is the safety mechanism and should not be optional: fused, the docked bar carries the client chip inline at its left edge, flipping to Gilded Fern on cross-client.

Direction 3's consequence pane is genuinely the best idea in the set, but it is a **later slice** — it needs the confirmation tier (SWA-67) wired first, and it needs a mobile answer that does not exist yet.

If Sean picks the hybrid, the router requires a **fourth combined direction** written out and signed off before code.

---

## 4. Pre-task receipt (fills on direction pick — NOT yet valid)

```
SURFACE:          [pending direction pick]
SECTION TYPE:     C12 glass panel + C5 grouped rows
EMOTIONAL JOB:    orientation → safety
SIGNATURE MOMENT: [pending]
STACK CHECK:      styled-components-first ✓ | Victory if any chart ✓ | no Tailwind ✓ | no MUI ✓
PALETTE CHECK:    Crystalline Swan only ✓ | no Galaxy-Swan ✓ | Dual-Button Glow (blue bg→purple glow, purple bg→cyan glow) ✓
FALLBACK TIERS:   tier-1 [pending] | tier-2 [pending] | tier-3 reduced-motion [pending]
ASSETS NEEDED:    N — no Seedance brief required for any direction
```

## 5. 2026 surface standard (fills on direction pick)

```
PRIMARY JOB:            log/act on the right client, hands-busy, in under 2s
PRIMARY ACTION:         execute the resolved intent
SECONDARY ACTIONS:      switch client · toggle voice · undo last  (max 3)
DEAD-CONTROL SWEEP:     [to verify at build]
DESKTOP SCALE PLAN:     [pending direction]
SCROLL MODEL:           one scroll owner — the result list; no nested scroll
MOBILE COLLISION PLAN:  [pending direction]
REAL-DATA STRESS CASE:  longest exercise name · zero results · 40+ results · no client locked · offline with pending queue
```

## 6. Open blockers before any code

1. **Sean picks a direction** (or the hybrid).
2. **Audience-routing decision (a/b/c)** from §0 — this one blocks compilation, not taste.
3. Confirm whether the C3 tier (SWA-67) is wired in observe-only mode first, or C5 ships tier-unaware.
