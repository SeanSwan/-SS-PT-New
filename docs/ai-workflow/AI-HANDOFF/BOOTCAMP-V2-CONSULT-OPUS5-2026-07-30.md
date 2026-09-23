# Consult reply — Claude Opus 5 (anthropic/claude-opus-5) — 2026-07-31T00:00:36.851Z

> tokens: prompt=9486 completion=16000

# Opus 5 — Product & Craft Consult: Bootcamp Creator V2

**Remit per §9:** Runner-as-product, 20-foot information design, the swap interaction, the portable seam, and a ranked cut list for §5. I stay off Kimi's systems turf except where a product decision forces an architecture correction — there are four of those, and they matter more than anything else in this document.

---

## 0. Top-line verdict — five things I'd change before a line of code

The plan's diagnosis (§3) is excellent and the three-layer brain (§6.1) is directionally right. The **product** sections are where it's weak, and three of the weaknesses are load-bearing.

| # | Change | Why it's not optional |
|---|---|---|
| **0.1** | **§6.3 is designed as an AMRAP screen, not a station-circuit screen.** "Current exercise huge + its video" is wrong for the format Sean actually teaches. During work, 14 people are doing **4 different things simultaneously**. One-exercise-huge tells 10 of them nothing. | This is the single biggest product error in the packet. Fixing it changes the whole screen inventory (§2 below). |
| **0.2** | **The laptop and the TV must show *different* screens, not a mirror.** Sean plugs a laptop into HDMI. That's a second display, not a cast. Open the Runner as a **separate same-origin window** the trainer drags to the TV; the laptop keeps a Trainer Console. Sync via **`BroadcastChannel`** — same-origin, zero network, immune to gym Wi-Fi. | This reframes §8.3. Once the laptop is a real console, the phone remote drops from "critical path" to "nice on the floor," which de-risks the hardest networking problem in the build. |
| **0.3** | **20-foot legibility is a hard physical constraint that bounds station-grid density — and the packet's numbers don't exist yet.** By the signage 1:200 rule, at 20 ft you need ≥30.5 mm cap height. On a **55″ TV that is 6.5vh minimum font size.** An 8-card grid cannot hit that. Physics says: ≤4 cards on 55″, ≤6 on 65″, ≤8 on 75″. | Without this, you ship a beautiful screen nobody can read from the squat rack. See §2.1 for the table and the workaround (**printed station cards are part of the product**, generated from the same `ClassPlan`). |
| **0.4** | **Kill LLM-authored prose "reasons."** §6.1 has the brain "return a selection + a REASON per exercise." Then Layer 3 rejects and *deterministically backfills* — which means some rendered reasons will be **fabricated justifications for exercises the brain didn't choose**. That's worse than no reasons. | Reasons must be **structured facts emitted by Layer 1/3** (`{tag:'targets', value:'glutes'}`, `{tag:'anti_repeat', value:'not used 3 weeks'}`, `{tag:'low_impact', value:'2 knee flags'}`) rendered as chips. The LLM may *rank and order*; it may not *narrate*. Also: chips are legible at 20 ft, prose isn't, and chips survive a Layer-3 backfill because they're derived from the final plan. |
| **0.5** | **Design the `ClassPlan` JSON document first.** Everything else — Runner, PDF, phone card, log-back, offline cache, portable core — is a pure function that produces or consumes it. The packet's §6.2 leads with folders; folders are the wrong first artifact. | This is also the honest answer to the portability question (§4 below): the reusable asset is the **schema**, not the constraint engine. |

Two smaller corrections, both cheap and both fatal if missed:

- **0.6 — One user gesture must acquire everything.** Fullscreen, Wake Lock, `AudioContext.resume()`, and the first `video.play()` all require a user activation and they must happen **in the same `onClick` handler** on "Start Class." Split them across a promise chain and you get silent audio on some browsers and no video on others. Write this as one function, test it on the actual laptop.
- **0.7 — Use absolute deadlines, not accumulated ticks.** §6.2 says drive the clock from `performance.now()`. Correct in spirit, wrong in mechanism: store an **epoch-ms `segmentEndsAt`** per segment, render with `requestAnimationFrame`, and use `performance.now()` only for sub-frame smoothing. Then background-tab throttling degrades *render rate*, never *correctness*, and laptop sleep is recoverable: on resume, diff wall clock and offer **"You lost 4:12 — resume here / skip ahead / extend class."**

---

## 1. The Class Runner as a product

### 1.1 The honest competitive picture

Be clear-eyed: **a whiteboard and a phone timer are a very good product.** Zero setup, zero failure modes, works in a power cut, and Sean already owns them. You do not beat them on features. You beat them on exactly three axes, and every design decision should be traceable to one of them:

**Axis 1 — Give Sean back the demo.**
Today Sean demonstrates ~8 exercises at the top of class. That's 6–8 minutes of a 45-minute class spent as a mime. A looping demo video at each station, plus the joint-friendly variant *shown without being asked*, deletes that block. **3 classes/week × 7 min = 21 min/week of instruction returned.** That is the entire ROI story and it should be the first line of the marketing page. Nothing else in this build has a payoff that legible.

**Axis 2 — Make the participants stop asking questions.**
The five questions a participant asks per class: *what am I doing / how long / what's next / how do I do it / what if my knee hurts.* A whiteboard answers 1 and 2. The Runner must answer all five **without Sean speaking**. Answering #5 silently is a dignity feature and a retention feature — the 58-year-old with a bad knee gets the low-impact option on screen instead of raising a hand in front of 13 people. Do not underrate this; it's the thing trainers will talk about.

**Axis 3 — It remembers.**
Whiteboards have no memory. Anti-repeat + progression + "you ran this 3 weeks ago" + attendance log-back is the only axis where the software category wins structurally.

**The failure mode that kills adoption is setup friction, not features.** If getting a class on the TV takes more than ~45 seconds and one decision, Sean uses the whiteboard, permanently, and the whole build is dead. Therefore:

- Opening the Bootcamp surface **resumes today's plan** if one exists (this is why the weekly schedule in §8.4 matters — see §6.1).
- **One** primary action on the page: `Start Class`. Dual-Button Glow, ≥64px on desktop.
- The Runner window opens pre-fullscreened-on-request with a single "Move me to the TV" affordance.
- A printed PDF of today's class lives in the folder as disaster recovery, and the PDF must be **plan-identical**, not a legacy artifact.

### 1.2 The three-surface model (correcting §8.3)

```
                    ┌──────────── ClassPlan (JSON, versioned, offline-complete) ────────────┐
                    │                                                                       │
   ┌────────────────▼──────────────┐   BroadcastChannel   ┌─────────────────────────────┐
   │  AUDIENCE  (TV, fullscreen)   │◄─────same-origin────►│  TRAINER CONSOLE (laptop)    │
   │  clock · phase · rotation     │   zero network       │  next-up · roster · swap ·   │
   │  station cards or hero        │                      │  timing controls · notes     │
   │  NO chrome. NO AI branding.   │                      │  keyboard shortcuts          │
   └───────────────────────────────┘                      └──────────────┬──────────────┘
                                                                         │ optional WS
                                                          ┌──────────────▼──────────────┐
                                                          │  FLOOR CARD (phone)          │
                                                          │  5 commands + swap + mods    │
                                                          │  fire-and-forget, degradable │
                                                          └──────────────────────────────┘
```

Three consequences:

1. **The Audience screen has no controls, no menus, no AI purple, no logo lockup competing for pixels.** Every pixel earns its place by answering one of the five participant questions. Wing Purple appears on the Trainer Console and Floor Card only — participants do not care that an AI picked their squat, and putting "AI-selected" on the TV is noise.
2. **The phone is not a remote — it's a Floor Card.** Reframe §8.3. What Sean needs walking the floor is (a) who's at which station, (b) the modification for the person who just winced, (c) swap. Pause/skip is the *fourth* need, not the first. Build it as a **coach card with commands**, not a mirror of Runner state.
3. **The Floor Card sends idempotent commands, never mirrors state.** `{cmdId, type:'PAUSE'|'SKIP'|'PREV'|'EXTEND_30'|'SWAP', at: epochMs}`. Optimistic local echo for 2s, then reconcile or show "not delivered." If it disconnects: **the TV never shows an error.** The class continues; only the phone shows the degraded state. Gym Wi-Fi dying must be invisible to 14 people.

### 1.3 Screen inventory (replaces the single screen in §6.3)

| ID | Phase | Layout | Notes |
|---|---|---|---|
| **S0** | Lobby / Setup | Floor map + equipment per station + group colors + "starts in 3:00" | Runs while people arrive. **Participants set up their own stations.** Near-zero build cost, removes Sean's setup lap. Underrated. |
| **S1** | Warmup | Hero: one exercise, huge, looping | Synchronized — hero layout is correct here |
| **S2** | Work (circuit) | **Clock band + N station cards** | The primary screen. §0.1's correction. |
| **S3** | Transition | Clock huge + `MOVE →` + **rotation diagram** + next exercise per station in small type | Where the rotation map lives. Also: this is the one screen where you *can* be dense, because everyone is walking and looking at the TV. |
| **S4** | Rest (within station) | Clock huge + **next exercise's demo + one cue** | Turns dead time into instruction. Free. |
| **S5** | Full-group / AMRAP / finisher | Hero, single exercise | §6.3's original design, correctly scoped |
| **S6** | Cooldown | Hero stretch + hold timer + auto-advance | 4 stretches, 1 screen each. The thing that always gets skipped — automate it so it can't be. |
| **S7** | Complete | Total work time · rounds · **Gilded Fern moment** · 3-tap feedback | Capture §5.12 *here*, while Sean is standing in front of it. If you defer this, you never get the training signal. |

Two details that will make trainers evangelize:

- **Show the wall-clock end time** — `ENDS 6:47` — persistently, small, top-right. Participants and trainers both silently want this. It costs one line of code and people love it disproportionately.
- **Hierarchy decays across rounds.** Round 1: exercise *name* dominant (people are learning it). Rounds 2+: **rep scheme / work interval** dominant, name demoted. The information need genuinely changes and almost no product does this. This is a "world renowned" detail.

---

## 2. Information design at 20 feet

### 2.1 The physics — do this math before you design

Signage legibility: cap height ≥ viewing distance / 200 (readable) or / 150 (comfortable for sustained reading by a mixed-age, sweating, out-of-breath audience). **Use 1:150.** At 20 ft (6096 mm), required cap height = **40.6 mm**. Cap height ≈ 0.70 × font-size ⇒ required font-size ≈ 58 mm.

| TV | Screen height | Min font (1:200) | **Design target (1:150)** | Max readable station cards |
|---|---|---|---|---|
| 55″ | 685 mm | 6.4 vh | **8.5 vh** | **4** |
| 65″ | 810 mm | 5.4 vh | **7.2 vh** | **6** |
| 75″ | 934 mm | 4.7 vh | **6.2 vh** | **8** |

**Implications you cannot design around:**

1. **Size everything in `vh` / `cqh`, never `px`.** The TV viewport is fixed and the viewing distance is fixed; `vh` *is* the correct unit. This also makes Rule 24's 2560×1440 and 3840×2160 free.
2. **Station-grid density is capped by hardware.** If `stationCount > cardCapacity(tvSize)`: do **not** shrink the cards. Instead — (a) alternate the grid in two halves on a 6-second cross-fade, or (b) drop to the rotation-only screen and rely on **printed station cards taped at each station**, generated by `BootcampBuilderPdfExport` from the same `ClassPlan`. Option (b) is better in a real gym. Don't fight physics; make the paper a first-class output.
3. **Ask Sean for his TV size and measure the actual farthest station.** This is a 60-second measurement that determines the entire layout. It should be a stored field on `BootcampSpaceProfile` (`tvDiagonalIn`, `maxViewDistanceFt`) and the Runner should **adapt density from it**. That is the kind of thing that makes a product feel psychic.

### 2.2 The TV type scale

```css
/* --tv-* is a TV-only token layer. Rule 6: var(--token, #fallback). */
:root {
  --tv-scale: 1;                        /* derived from tvDiagonalIn / viewDistanceFt */
  --tv-timer:        calc(24vh * var(--tv-scale));  /* tabular-nums, 700, -0.03em */
  --tv-hero-name:    calc(11vh * var(--tv-scale));  /* 700, sentence case, max 2 lines, auto-fit → 7vh floor */
  --tv-hero-scheme:  calc(7vh  * var(--tv-scale));
  --tv-card-name:    calc(5.5vh * var(--tv-scale)); /* 600 — validate against §2.1 table */
  --tv-card-scheme:  calc(4vh  * var(--tv-scale));
  --tv-equipment:    calc(2.6vh * var(--tv-scale)); /* +0.06em tracking, uppercase, short strings only */
  --tv-mod-line:     calc(2.8vh * var(--tv-scale)); /* ALWAYS visible. Never behind an interaction. */
  --tv-meta:         calc(2.2vh * var(--tv-scale)); /* "ENDS 6:47", round position */
}
```

Rules of craft, all of which get violated by default:

- **No font weight below 600 anywhere on the Audience screen.** Thin type at distance under gym lighting is invisible.
- **Sentence case for exercise names, uppercase only for ≤12-char labels.** Uppercase destroys word-shape recognition, which is exactly the cue you rely on at distance. `WORK` / `REST` / `MOVE` — yes. `DUMBBELL ROMANIAN DEAD
