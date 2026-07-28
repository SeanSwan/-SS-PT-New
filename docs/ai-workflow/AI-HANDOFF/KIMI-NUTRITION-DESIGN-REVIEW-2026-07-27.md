# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/MASTER-PROMPT-nutrition-swancoach-userdashboard-2026-07-27.md
**Seed:** (none)
**Tokens:** 10649 in / 15706 out | **Cost:** ~$0.2675 | **Wall:** 271.4s

---

# KIMI — DESIGN PACKAGE + GAP REGISTER + HOSTILE PASS

**Blockers first (per §11):**
1. I have no repo access this session. Every claim about current code is sourced from §2 of the prompt itself and tagged accordingly. Nothing below is `[VERIFIED]` against the filesystem — Claude must confirm every `file:line` assumption before Fable locks slices.
2. The prompt references a canon it does not include: `swan-design-router`, C-patterns (C6/C9/C10/C11/C12/C13), "B2 arc," Rule 4, Rule 58, CLAUDE.md. I am applying the §12 receipt's glosses of these. Where my interpretation could diverge from the real canon, I flag it. **This is also hostile-pass finding #1 — the prompt is unbuildable as dispatched.**
3. The §12 receipt pre-concludes the 3-surface shell (`Today / Capture / Plan`) while §C1 simultaneously demands I propose a new IA through an ideation gate. I resolve this honestly: **the shell is treated as receipt-locked; the three concept directions compete on the organizing metaphor of the Today surface and the signature visual moment.** If Fable wants the shell itself re-opened, that's a ruling to record.

---

# PART 1 — WORK PACKAGE C: CONCEPT DIRECTIONS

## 1.0 The three directions (ideation gate)

### Direction A — "FUEL GAUGE" (remaining-first command deck)

**Organizing metaphor:** the day as a depleting resource budget. One horizontal luminous fuel band — not a ring, not a donut — fills the Today header: remaining kcal as an Ice Wing fill against a sapphire depth track, segmented by macro.

**Applies from receipt:**
- Q1 convergence #1 (hero = *remaining*, never consumed) — taken as the entire page logic, not just a number.
- Q5/BitePal: every stat card carries a plain-language verdict + action.
- Q6/Ultrahuman+Alma: inline disclaimer + 👍/👎 on every generated output.

**Rejects from receipt:**
- The giant calorie ring as unconditional emotional centerpiece (receipt anti-pattern #3) — the band is deliberately *not* circular, reads left-to-right like a fuel gauge, and in gentle mode collapses to a qualitative band ("on pace / check in with your coach") with zero numerals.
- Bevel's composite "Nutrition Score" — a single rolled-up score invites gaming and ED-adjacent obsession; Swan shows component verdicts instead.

**Signature moment:** the fuel band itself, with a chrome-edge tick marking *now* against the day's expected burn curve.

**Weakness (self-hostile):** it's the safest direction — a very good MacroFactor. It does not, by itself, ship the §4 wedge.

---

### Direction B — "ORBIT" (session-anchored day) ★ RECOMMENDED

**Organizing metaphor:** today's training session is the sun; nutrition orbits it. The Today surface is headed by a horizontal day-timeline where the session sits as a fixed event and the **pre- and post-session fuel windows render as shaded zones**. Meals land on the timeline as they log; unlogged meal slots render as the *plan* (recommended kcal ranges, per Q2/Lifesum).

**Applies from receipt:**
- Q2 (empty state = the plan): the Orbit timeline *is* the empty state — a day with zero logs still shows the session, the windows, and three recommended meal slots. Never a void.
- Q4/MacroFactor (impact-on-targets pre-commit): fully adopted in the capture sheet.
- Q5/Bevel honesty: every aggregate publishes window + sample size ("based on 2 of 3 meals · 7-day window · 4 days logged").
- Q3/Alma (Track|Ask): adopted as the capture omnibox.

**Rejects from receipt:**
- MacroFactor's recency-driven suggestion rail ("8am Go-Tos") as the *primary* suggestion logic. Swan's suggestions are **training-context-driven** (session type, OPT phase, window timing) first, recency second. Recency-only suggestion is the generic version of a feature Swan can ship the differentiated version of.
- Conversational-only insight with no persisted record (receipt anti-pattern #4): every Coach verdict on Today is a persisted, auditable artifact card (§D3), not a chat bubble.

**Signature moment:** the Orbit timeline. Nothing in the 30-reference set renders nutrition *relative to the training session*. This is the "$100k" moment and the §3 loop-plug simultaneously — it makes nutrition visibly subordinate to the workout-progress-first product.

**Weakness (self-hostile):** the timeline risks becoming a decorative Gantt that duplicates the meal list below it. **Fix applied:** the timeline is the *only* place windows and the session render, it collapses to a single compact strip on mobile, and on rest days it degrades gracefully to a meal-rhythm band (no session, windows become "even distribution" guidance). If it ever merely repeats the meal list, cut it — the meal list is the truth, the Orbit is the context.

---

### Direction C — "BRIEFING" (Coach-first surface)

**Organizing metaphor:** Today opens as a written briefing from Swan Coach — a narrative card stack ("Here's your day: Push session at 18:00, protein is the risk, here's the plan") with the data furniture beneath.

**Applies from receipt:**
- Q3/Alma Track|Ask taken furthest — the omnibox is the page's top element, not the capture sheet's.
- Q6: disclaimer + feedback on every card, natively.

**Rejects from receipt:**
- Q1's hero-number-first spine as the *dominant* element — demoted under the briefing. (This is the direction's risk: it fights the 4/4 consumer convergence, which is why it is not recommended.)
- Alma's ephemeral chat model — same rejection as B.

**Weakness:** highest copy-quality dependency; a badly-written briefing day makes the whole surface feel broken. Also the hardest to keep low-motion and the most likely to read as "AI-branded surface" (banned). Rejected as the primary direction; its omnibox is absorbed into B.

---

### Gate outcome

**Commit: Direction B (Orbit), absorbing A's fuel band as the hero component inside Today and C's Track|Ask omnibox as the capture entry.** Rationale against §13: B is the only direction that makes a client *more likely to eat well in a way that is visibly connected to training* — the other two are better versions of what competitors already ship.

**IA (receipt-locked, restated as buildable):**

```
NutritionWorkspace (one component, three lenses)
├── CLIENT LENS
│   ├── Today    — Orbit timeline · fuel band · verdicts · next-best-action · meals · hydration row
│   ├── Capture  — one sheet: [Track|Ask] omnibox + modes Scan|Search|Quick|Library + impact pre-commit
│   └── Plan     — meal plan · grocery · supplements · learn · (Garden/Farms/Restaurant demoted here)
├── TRAINER LENS — ranked triage list + list/detail split in front of the same three surfaces
└── ADMIN LENS   — same triage, cross-trainer aggregation, read-heavy
```

**Killed/merged (the edit, per §4's "name what to kill"):**
| Kill / merge | Fate |
|---|---|
| `My Macros` tab | Killed — macros are permanent furniture on Today (receipt Q1) |
| `Hydration` tab | Killed — a row on Today with +250ml chip |
| `Log Meal` + `Speak a Meal` + `Food Search` + `Restaurant` tabs | Merged into Capture sheet (4 tabs → 0) |
| `Swan Coach Meal Plan` tab | Split: plan lives in Plan; asking lives in Track\|Ask |
| `Intelligence` tab | Folded into Today as verdict cards + Plan as weekly view |
| `Garden` / `Farm Finder` / `Supplements` / `Learn` | Progressive disclosure inside Plan |
| **13 tabs → 3 surfaces + 1 persistent [+ Log] button** | |

---

## 1.1 Wireframes — committed direction

### Screen 1: Today (client) — desktop 1440

```
┌────────────────────────────────────────────────────────────────────────────┐
│ NUTRITION        Today · Plan          ◔ Swan Coach        [ + Log ]  ‹ 28 ›│
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ DAY ORBIT ── C12 glass panel, low-motion ────────────────────────────┐  │
│ │  06:00            12:00             18:00            23:00             │  │
│ │   │░░░░░░░░░░░░░░░│░░░pre-window░░░┌──────────┐▓▓post-window▓▓│        │  │
│ │   │               │                │ PUSH · 60m│               │        │  │
│ │   ●───────────────┴────────────────┤ OPT Hypr. ├──────○────────○        │  │
│ │  ✓ breakfast                       └──────────┘  ○ dinner  ○ snack     │  │
│ │  7:40 · 620                        ▲ NOW 16:20   (planned slots show   │  │
│ │                                    session      recommended ranges)   │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│ ┌─ FUEL ───────────────────────────┐ ┌─ COACH VERDICT ── persisted ────┐ │
│ │ 1,450 kcal remaining             │ │ "Protein is pacing 22g behind   │ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░ of 2,650     │ │ target for a hypertrophy day.   │ │
│ │ ▔▔▔▔▔▔▔▔▔▲▔▔▔▔▔▔▔▔▔ expected burn │ │ Add ~30g at dinner — salmon +   │ │
│ │           now                    │ │ rice fits your post window."    │ │
│ │ P ▓▓▓▓▓▓▓▓░░ 128/165g  ⚠ behind  │ │                                 │ │
│ │ C ▓▓▓▓▓▓░░░░ 180/290g  on pace   │ │ Based on 2 of 3 meals logged    │ │
│ │ F ▓▓▓▓▓▓▓▓░░  52/75g   on pace   │ │ today · evidence tier B ·       │ │
│ │ 💧 1.9 / 3.1 L  [+250ml]         │ │ General wellness info, not      │ │
│ │ (gentle mode: numerals hidden,   │ │ medical advice. 👍 👎            │ │
│ │  band shows "on pace" only)      │ │                        [more ▾] │ │
│ └──────────────────────────────────┘ └─────────────────────────────────┘ │
│ ┌─ NEXT BEST ACTION ── C9 KPI block ────────────────────────────────────┐ │
│ │ Post-session window closes ≈19:30 · Suggested: salmon, rice, greens   │ │
│ │ ≈640 kcal · P48                                          [Log this]   │ │
│ │                                                          [Swap] [Ask] │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌─ MEALS ───────────────────────────────────────────────────────────────┐ │
│ │ ✓ Breakfast  7:40   620 kcal · P42   source: USDA      [impact][↻]   │ │
│ │ ~ Lunch     12:30   ≈580 ±20% · P38  source: photo     [impact][↻]   │ │
│ │ ○ Dinner    planned 640–780 rec.     post-window       [Log]  [Ask]  │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
Tokens: surface var(--swan-surface-carbon,#141419) · fill var(--swan-ice-wing,#60C0F0)
series var(--swan-arctic-cyan,#50A0F0) · warn #E5484D+⚠ icon (never color-only)
achievement var(--swan-gilded-fern,#C6A84B) · data type Fira Code · UI Sora
```

### Screen 1: Today — mobile 375 (the primary logging device)

```
┌───────────────────────────┐
│ ‹ Today        [ + Log ]  │
│ ┌───────────────────────┐ │
│ │ 1,450 kcal remaining  │ │  ← gentle mode: "On pace"
│ │ ▓▓▓▓▓▓▓░░░░░░ 2,650   │ │    replaces all numerals
│ │ P ▓▓▓▓▓░ 128/165 ⚠    │ │
│ │ C ▓▓▓▓░░ 180/290 ✓    │ │
│ │ F ▓▓▓▓▓░  52/75  ✓    │ │
│ │ 💧 1.9/3.1L  [+250ml] │ │
│ └───────────────────────┘ │
│ ◆ Push 18:00              │  ← Orbit collapsed to
│ ░░pre░░│▓▓post▓▓ strip    │    one 48px strip; windows
│ ┌───────────────────────┐ │    still visible
│ │ "Protein 22g behind — │ │
│ │ add ~30g at dinner."  │ │
│ │ 2/3 meals · tier B    │ │
│ │ Wellness info, not    │ │
│ │ medical advice. 👍 👎 │ │
│ └───────────────────────┘ │
│ NEXT: post-window meal    │
│ [ Log this ]  [ Ask ]     │  ← 44px+ targets
│ ── Meals ──────────────── │
│ ✓ Breakfast 620 · P42     │
│ ~ Lunch ≈580 ±20%         │
│ ○ Dinner 640–780 rec.     │
│ ┌───────────┬───────────┐ │
│ │ Today     │ Plan      │ │
│ └───────────┴───────────┘ │
│        [ + LOG ]          │  ← persistent FAB, 56px,
└───────────────────────────┘    thumb-zone, always visible
```

### Screen 2: Capture sheet — mobile 375 (the 4-tabs→1-sheet kill shot)

```
┌───────────────────────────┐
│ Log a meal             ✕  │
│ ┌───────────────────────┐ │
│ │ [ Track | Ask Coach ] │ │  ← Alma pattern: same box
│ │ 🔍 chicken rice   🎤📷│ │    logs or asks
│ └───────────────────────┘ │
│ [Scan][Search][Quick][⌂] │  ← MacroFactor modes, 44px
│ Meal [Dinner ▾] · 18:45   │  ← inline slot/time edit
│ ── results ────────────── │
│ ▶ Chicken breast, 6 oz    │
│   280 kcal · P53 · ✓USDA  │
│ ▶ Chicken rice bowl, rest.│
│   ≈640 ±25% · ~estimate   │  ← provenance + error bar
│ ┌─ IMPACT (pre-commit) ─┐ │  ← C6 flippable reveal,
│ │ This meal uses:       │ │    shown BEFORE commit
│ │ kcal −22% of remaining│ │
│ │ P +32% → puts you     │ │
│ │   ahead of target ✓   │ │
│ │ C −4% · F −8%         │ │
│ └───────────────────────┘ │
│ [      Log it       ]     │
└───────────────────────────┘
```

### Screen 2: Capture — desktop 1440 (modal sheet, 640px centered, context preserved behind)

```
        ┌────────────────────────────────────────────┐
        │ Log a meal                               ✕ │
        │ ┌────────────────────────────────────────┐ │
        │ │ [ Track | Ask Coach ]                  │ │
        │ │ 🔍 ________________________   🎤  📷  ▦│ │
        │ └────────────────────────────────────────┘ │
        │ [Scan] [Search] [Quick Add] [Library]      │
        │ Meal: [Dinner ▾]  Thu 28 · 18:45           │
        │ ┌─ results ────────────┬─ IMPACT ────────┐ │
        │ │ ▶ Chicken breast 6oz │ kcal −22% left  │ │
        │ │   280 · P53 · ✓USDA  │ P +32% → ahead ✓│ │
        │ │ ▶ Rice, white, 1 cup │ C −4% · F −8%   │ │
        │ │   205 · P4  · ✓USDA  │                 │ │
        │ │ ▶ Recent: your bowl  │ [ Log it ]      │ │
        │ └──────────────────────┴─────────────────┘ │
        └────────────────────────────────────────────┘
```

### Screen 3: Plan — desktop 1440 / mobile 375 (compact)

```
DESKTOP                                        MOBILE
┌──────────────────────────────────────────┐   ┌───────────────────────┐
│ Plan · week of Jul 28          [+ Log]   │   │ Plan            [+Log]│
│ ┌─ THIS WEEK ── verdict-bearing ───────┐ │   │ ┌───────────────────┐ │
│ │ 7-day: 4/7 logged · P avg −18%       │ │   │ │ 4/7 days logged   │ │
│ │ "Consistency, not intake, is the     │ │   │ │ "Consistency is   │ │
│ │  limiter. Anchor: weekend dinners."  │ │   │ │  the limiter."    │ │
│ │ window: 7d · sample: 4 days · 👍👎   │ │   │ │ 7d · n=4 · 👍👎   │ │
│ └──────────────────────────────────────┘ │   │ └───────────────────┘ │
│ ┌─ MEAL PLAN ────────┐ ┌─ GROCERY ────┐ │   │ [Meal plan] [Grocery] │
│ │ Mon–Sun grid,      │ │ auto from    │ │   │ [Supplements][Learn]  │
│ │ swap any meal,     │ │ plan · check │ │   │ [Restaurant][Garden▾] │
│ │ allergen-guarded   │ │ off · export │ │   │  ← progressive        │
│ └────────────────────┘ └──────────────┘ │   │    disclosure         │
│ [Supplements] [Learn] [Restaurant]       │   └───────────────────────┘
│ [Garden ▾] [Farm Finder ▾]               │
└──────────────────────────────────────────┘
```

### Screen 4: Trainer triage lens — desktop 1440 / mobile 375

```
DESKTOP (Deel list+detail · Charma scannability · Dialpad "coachable moments")
┌────────────────────────────────────────────────────────────────────────┐
│ NUTRITION · ROSTER      [off-track ▾] [7d ▾] [all clients ▾]  [+ Log]  │
├──────────────────────────┬─────────────────────────────────────────────┤
│ RANKED BY INTERVENTION   │  J.M. — detail (never leaves roster)        │
│ VALUE, not alphabet      │  ┌───────────────────────────────────────┐  │
│ ⚠ J.M.   last log 2.1d   │  │ 7-day: 4/7 logged · protein −35%      │  │
│   protein −35% on 7d     │  │ "Adherence dropped after the schedule │  │
│ ⚠ R.T.   4d silent       │  │ change. Weekend dinners are the gap." │  │
│   was 6/7 compliant      │  │ window 7d · n=4 · tier C · 👍👎        │  │
│ ○ A.K.   on track 7/7    │  │ [Message] [Adjust plan] [Add note]    │  │
│ ○ S.L.   on track 6/7    │  │ ── their Today surface (read-only) ── │  │
│ ...virtualized at 200+   │  │ (client's fuel band + Orbit, as-seen) │  │
└──────────────────────────┴─────────────────────────────────────────────┘
MOBILE: ranked list full-width → tap row → detail slides over, ← returns to
same scroll position. Status dot + text label (never color-only).
```

---

## 1.2 Tap counts — top 5 tasks (hard deliverable)

Baselines are reconstructed from the §2.1 tab inventory, not measured — `[HYPOTHESIS]`. Claude should instrument the real before-counts; if any before-count is *lower* than stated here, say so and I'll re-derive.

| # | Task | Before (13-tab IA) | Taps | After (Orbit shell) | Taps | Δ |
|---|---|---|---|---|---|---|
| 1 | Log a meal via search (mobile) | Open workspace → locate `Food Search` among 9 primary tabs → type → pick result → portion → save | **6** | `[+ Log]` (persistent, every screen) → type → pick → confirm on impact preview | **4** | −33% |
| 2 | Log a meal by voice | Open workspace → `Speak a Meal` tab → record → review transcript → save | **5** | `[+ Log]` → 🎤 → speak → confirm | **4** | −20% |
| 3 | Check "am I on track" (remaining macros) | Open workspace → `My Macros` tab → read | **3** | Open workspace — fuel band + verdicts *are* the landing surface | **1** | −67% |
| 4 | Ask Swan Coach a nutrition question | Open workspace → `Swan Coach Meal Plan` tab → find input → type → send | **5** | `[+ Log]` → flip to `Ask` → type → send | **4** — or from Today verdict card `[Ask]`: **2** | −60% |
| 5 | Trainer: find who needs intervention today | Clients section → open client → `NutritionTabContent` → assess → back → repeat per client | **4+ × N clients** | Open workspace — trainer lens *lands on* ranked triage → top row is the answer | **1** | −75%+ |

Bonus: hydration log goes from 3 taps (Hydration tab) to 1 (`+250ml` chip on Today).

---

## 1.3 Hostile design pass on my own work (C3, mandatory)

**What I found attacking Direction B:**

1. **The Orbit timeline is the most likely failure.** Risk: decorative Gantt duplicating the meal list; at 320px the windows become illegible smears. *Fix:* timeline carries only what nothing else shows (session, windows, planned slots); below 768px it collapses to a 48px strip; on rest days it degrades to meal-rhythm guidance; if usability testing shows users ignore it, the kill criterion is pre-authorized — the meal list is truth, the Orbit is context.
2. **Verdict-line length will blow card heights.** "Protein is pacing 22g behind…" is fine; a 40-word Coach sentence at 320px in a low-motion card is not. *Fix:* hard 2-line clamp with `[more ▾]`, and the verdict *schema* (not the model) enforces a headline ≤90 chars + detail field. This must be in the output validator, not the prompt.
3. **Track|Ask toggle discoverability.** A segmented control inside one input box is exactly the kind of cleverness users miss. *Fix:* persistent visible labels (never icon-only), default state = Track, and the toggle state is announced to screen readers.
4. **Gentle mode is under-specified in my own wireframes** — I say "numerals hidden" but a worker-bot would leave a hole where the fuel band was. *Fix:* gentle mode is a *separate rendered state with its own layout* (qualitative band + "check in with your coach" copy), spec'd as its own wireframe in the build package, not a CSS `display:none` on numbers.
5. **Triage ranking is a claim, not a design.** "Ranked by intervention value" needs the ranking *formula* (off-track magnitude × days-silent × plan-staleness) or the worker-bot sorts alphabetically and ships it. Flagged to Fable for WP-B.

**Viewports actually reasoned about:** 320, 375, 768, 1280, 1440 in detail; 2560+ and 3440 ultrawide get a 1440 max-width content column with sapphire depth gutters (no re-layout). I did **not** reason about 3840×2160 as a distinct layout because no distinct layout is warranted — see hostile pass §3.2 below.

---

# PART 2 — WORK PACKAGE A (absence-first half): USER DASHBOARD GAP REGISTER

Evidence base: the §2.4 file inventory in the prompt. "No such file" means *no such file appears in the inventory the prompt gave me* — `[UNKNOWN]` until Claude confirms against the filesystem. Ranked by value ÷ effort, weighted by §13.

| # | Gap | Role | Why it matters | Evidence it's missing | Effort | Value | Risk if skipped |
|---|---|---|---|---|---|---|---|
| 1 | **Dietary identity profile** (allergies, intolerances, halal/kosher, veg/vegan, budget, food access) as first-class, structured data | All | **Blocking dependency of §7-D1.** The allergen guard cannot fail-closed on data that doesn't exist. Without this, the flagship safety rail is theater (see §3.4). | No model/route/component for dietary identity in §2.1–2.2; `IngredientSafetyPanel` exists but its data source is unstated `[UNKNOWN]` | M | 5 | The entire safety package is unbuildable; allergen exposure = injury + liability |
| 2 | **Nutrition↔training coupling** — fuel targets keyed to today's session type / OPT phase | Client, Trainer | The wedge. §4: "almost no competitor does this." Also the entire basis of Direction B's Orbit surface. | No file linking `ClientNutritionPlan` to session/OPT data; `coachNutritionContext.mjs` is 63 lines and "thin" per §2.2 | L | 5 | Swan ships a worse MacroFactor instead of a category of one |
| 3 | **Weekly review ritual** — Sunday/Monday recap closing the loop | Client, Trainer | The retention engine; the moment progress-proof becomes visible; natural home for shareable milestone | No `WeeklyReview*`/`Recap*` file in §2.4 inventory `[UNKNOWN]` | M | 5 | Loop never closes; churn; "proof of value" stays implicit |
| 4 | **Next-best-action signal truth** — is `HomeTabNextBestAction` driven by real signals? | Client | If decorative, the home tab's core promise is a lie and every retention claim downstream is void | File exists; data source unknown `[UNKNOWN]` — Claude must read its hook chain | S (audit) | 5 | The dashboard's headline feature is set dressing |
| 5 | **Reminders/notifications engine** — push/email/in-app, quiet hours, opt-out | Client | The only mechanism that brings users back; every streak/review feature depends on it | No notification files in §2.4 `[UNKNOWN]` | M | 4 | Logging decays silently; weekly review (#3) has no delivery channel |
| 6 | **Adherence & streaks, ED-safe** — logging-consistency streaks, weekly compliance %, never restriction-gamified | Client | Receipt anti-pattern: gamify consistency, never restriction. Retention + coach triage signal | No streak/compliance files in §2.4 `[UNKNOWN]` | S–M | 4 | No positive reinforcement loop; triage (#9) loses its cheapest signal |
| 7 | **"Share with my doctor / dietitian" export** — PDF with disclaimer baked in | Client | Simultaneously safety feature, trust feature, differentiator (§4). Also the D3 paper trail's user-visible half | No export/PDF file in §2.1/§2.4 `[UNKNOWN]` | M | 4 | Safety story has no user-facing proof; RD partnerships (referral channel) never materialize |
| 8 | **Coach responsiveness visibility** — "your coach reviewed your week" + time-to-response | Client | The B2B2C premium is the *human*; if the client can't see the human looking, they're paying for an app | No review-receipt/seen-by file in §2.4 `[UNKNOWN]` | S | 4 | Trainer tier is indistinguishable from a $9.99 calorie app |
| 9 | **Offline / poor-signal logging queue** — queue locally, sync on reconnect | Client | Meals get logged in restaurants and gyms with bad reception; a failed log is a lost data point forever | No service-worker/queue evidence in §2.4 `[UNKNOWN]` | M–L | 4 | Data gaps poison every aggregate, verdict, and triage rank |
| 10 | **Grocery list + prep plan from meal plan** | Client | Converts the plan from a PDF graveyard into a weekly behavior; natural Crystalline-tier gate | `MealPlanTab` exists; no grocery/prep file in §2.1 `[UNKNOWN]` | M | 4 | Meal plans generated and ignored — the most expensive feature with the least follow-through |
| 11 | **Onboarding→first-value path** — measured taps from signup to first logged meal + first chart | Client | If this is >5 minutes, everything above is academic | Unmeasured `[UNKNOWN]` — no funnel instrumentation evidenced | M | 4 | Paying users churn before ever seeing the product |
| 12 | **Empty/loading/error/stale states audit** on every dashboard surface | All | §13's $100k test is failed by one skeleton-less spinner or one zero-filled chart | Unaudited `[UNKNOWN]` | S | 3 | "Ugly" verdict persists regardless of redesign |
| 13 | **Accessibility pass** — keyboard path, SR labels, focus order, reduced-motion | All | WCAG 4.5:1 is already §1 doctrine; this is enforcement, not new scope | Unaudited `[UNKNOWN]` | M | 3 | Legal exposure + excluded users |
| 14 | **Monetization surface map** — Starter/Guardian/Crystalline gates + natural upgrade moments | Admin | Revenue. The upgrade moment should land at grocery export, share-export, and coach-response SLA | No tier-gating files evidenced in §2.4 `[UNKNOWN]` | S | 3 | Money left on the table — the literal title of this work package |
| 15 | **Supplement UL/interaction checking** | Client | §7-D1 requires it; `SupplementsTab` exists but no dose model is evidenced — see theater finding §3.4 | `supplementRoutes.mjs` exists; no supplement *model* in §2.2 `[UNKNOWN]` | M | 3 | UL gate ships as a badge, not a gate |
| — | **CUT LINE** | | | | | | |
| 16 | Wearables + calendar enrichment | Client | Nice enrichment, never source of truth; high integration cost, low loop impact | — | L | 2 | Low — defer without harm |
| 17 | Household/shared meals, batch prep, leftovers | Client | Real but niche; doesn't move §13's needle for the trainer-led base | — | L | 2 | Low |

**Rule-outs with reasons:** RAG/embeddings for food recall (§1 standing decision) · macro-cycling AI-coach chat persona (banned "AI" branding + ephemeral-insight anti-pattern) · social meal-photo feed (scope drift into community; no loop payoff).

**What to REMOVE or merge (the edit):**
- **Merge `DashboardFeedTab` + `CommunityTab` + `HomeCommunityFeed`** — three feed surfaces is two too many; one community surface with filters. `[LIKELY]` overlap — Claude to confirm distinct data sources before merge.
- **Kill or demote `HomeTabVisionScenes` + left/right vision rails** — cinematic awe surfaces on a *working* dashboard; the receipt's own "no C13 on working surfaces" logic applies to the dashboard home. If they don't answer a §3 north-star question, they're load-bearing decoration.
- **Consolidate `SocialProgressAnalyticsPreview` into `ProfileChartsGrid`** — one analytics home, not a preview of an analytics home.
- **Interrogate `UserDashboardStudioLenses` + banner composition system** against §13; if they serve the marketing surface more than the client loop, they belong to the marketing command center (which §1 explicitly fences off).

---

# PART 3 — HOSTILE PASS ON THE PROMPT ITSELF

## 3.1 Where it over-scopes

1. **Five work packages is five projects.** WP-B alone (deterministic nutrition computation layer: ~15 formula families, evidence-tier system, curated citation table, RED-S screening, hydration sweat-rate modeling) is a multi-month engineering program with a literature-review dependency. Bundling it with a full UX redesign, a dashboard audit, a safety/legal architecture, and a zero-defect bug hunt — in one dispatch, for three brains, in one merge — guarantees the output contract (§10) is met nowhere. **The prompt demands a cut line in the gap register but authorizes no cut line for itself.**
2. **The responsive matrix is verification theater at scale.** Eleven widths including 3840×2160 and 3440 ultrawide, "every layout verified" at each, across every changed screen, desktop+mobile wireframes for each — the QA surface grows faster than the design surface. No prioritization (which 3 widths carry 95% of traffic?) and no budget. A worker-bot will either burn the entire slice on screenshots or silently skip it.
3. **"Zero errors" as a bar (§0.5, §8) is unbounded.** "Every surface you touch" + a 112-file dashboard + a 25-file FoodTracker + ~149-file AI service = the bug hunt has no perimeter. Without a named surface list, "100%, no errors" is unachievable and therefore unenforceable — it will be claimed, not demonstrated.
4. **§10's "zero further questions" bar is self-defeating.** The contract demands per-field API contracts, ERDs, exact copy, executable acceptance criteria, and rollback per slice — for a scope this size, that package is itself a weeks-long deliverable. The prompt mistakes *completeness of intent* for *completeness of specification*.

## 3.2 Where it under-specifies

1. **The canon is referenced, never included.** `swan-design-router` ideation gate, C6/C9/C10/C11/C12/C13, "B2 arc," Rule 4, Rule 58, CLAUDE.md, `SWAN-CINEMATIC-DESIGN-SYSTEM.md` — the prompt's own constraint system lives in documents the receiving brains may not have. "CLAUDE.md rules win over any brain's suggestion" is unenforceable when the rules aren't in the envelope. **This is the single largest defect in the dispatch.**
2. **No token source of truth.** §1 mandates `var(--token, #fallback)` but names no token file, no token naming convention, no theme location. Three brains will invent three token schemes and Fable will arbitrate aesthetics instead of architecture.
3. **Gentle mode's contract is one sentence.** Which elements suppress (numerals? rings? verdicts? Coach copy? the Orbit windows?), what replaces them, how it's toggled, who can see the toggle state (can a trainer see a client's gentle mode? — a privacy question the prompt never asks).
4. **No before-measurements for the mandated before→after tap counts.** §C1 makes tap counts "a hard deliverable" but provides no instrumented baseline. I reconstructed mine from the tab list and tagged them `[HYPOTHESIS]` — the prompt should have shipped the baseline or admitted none exists.
5. **The citation table (§B2) has no schema, owner, location, or review process.** "Curated in-repo reference table" — curated by whom, in what format, updated when a position stand is revised? The entire evidence-tier system hangs on this unspecified artifact.
6. **No performance budgets.** §8.8 demands bundle-impact analysis but sets no numbers (max KB per slice? LCP target? chart lazy-load threshold?). "Analyze impact" without a budget is a report nobody acts on.
7. **Migration filenames contain `<REDACTED_PHONE>` placeholders** (§2.2) — literally unresolvable paths in a prompt that demands `file:line` precision. Claude can resolve them in-repo; the other two brains cannot.
8. **The 3840×2160 / ultrawide requirement has no design intent attached.** What *should* a nutrition workspace do at 3440px? Without an answer (mine: max-width containment), each brain invents one.

## 3.3 Where a worker-bot gets stuck

1. **The 300-line cap vs. "extend, don't restart" with no extraction doctrine.** `NutritionTodayPanel.tsx` is at 298 lines — *any* addition forces an extraction, and the worker-bot must invent the split (what goes in `.logic` vs `.viewModel`?) with no naming rule beyond two examples. Multiply by every touched file.
2. **"Works" is undefined in "no rebuild of things that already work."** Is the 13-tab IA "working"? Is `coachNutritionContext.mjs` "working"? The prompt simultaneously says extend-don't-restart and calls the context engine "the core upgrade target." A worker-bot facing that contradiction will pick one silently.
3. **Token conflicts with no tie-break.** Dual-Button Glow (blue bg → purple glow) vs. Arctic Cyan "never buttons" vs. Ice Wing as "glow/accent" — the capture sheet's mode switcher hits all three rules at once. "Swan doctrine wins" is circular when doctrine isn't enclosed.
4. **Mermaid diagrams demanded, destination unspecified.** What file, what naming, does the repo's Mermaid version support the syntax? A worker-bot will paste diagrams wherever and break docs builds or not.
5. **The styled-components `css`-helper rule (§8.5) is described by symptom, not by lintable rule.** If it's taken down a dashboard before, it deserves an ESLint rule or a codemod, not a prose warning in a prompt — prose warnings are exactly what worker-bots drop under token pressure.
6. **Role-adaptive shell: "one component, three lenses, do NOT fork"** — but no state-shape contract for how the lens is selected (route param? role context? prop?). Three brains will produce three lens mechanisms.

## 3.4 Where a safety rail is theater rather than a real gate

1. **The allergen guard has no data.** "Never surface a food containing a declared allergen, fail-closed on unknown ingredients" — but no dietary-identity model is evidenced anywhere in §2 (gap #1 above), and barcode/Open Food Facts data has *unknown* ingredients as the normal case. Fail-closed on unknowns means the capture sheet refuses constantly; the pressure to add a silent bypass will be enormous and the prompt doesn't forbid it. **A gate whose failure mode is "annoy the user until someone disables it" is theater.** Fix: gap #1 ships first, "unknown" is a visible confidence state (not a block), and the bypass requires explicit user acknowledgment logged to the D3 trail.
2. **The minor gate has no age field.** "Age-gated behavior for under-18" — no date-of-birth field is evidenced in any model in §2. A minor-gate with no age data is a copy string, not a gate.
3. **The UL gate has no dose data.** Supplement UL exceedance requires structured dose per supplement; §2.2 lists `supplementRoutes.mjs` but no supplement model. Flagging UL breaches across "stack + food + fortification" without dose data is a badge that says "checked!" without checking.
4. **The 👍/👎 is called an "evidence trail" — it isn't one.** A feedback widget becomes evidence only if it's wired into the D3 audit log with the same rigor as the recommendation record (timestamp, output ID, prompt version). The receipt conflates "channel to flag" with "proof of notice," and §7 doesn't correct it. As drafted, it's liability cosplay.
5. **Selective verification of the existing safety stack.** §B1 correctly demands proof that `deIdentifier.mjs` and `phiScanner.mjs` actually run on the nutrition path — but never asks the same of `EthicalAIPipeline.mjs`, `outputValidator.mjs`, or `circuitBreaker.mjs`. Verifying two gates and assuming the rest is how a pipeline diagram becomes the safety story while the actual call path routes around it.
6. **No test is specified for disclaimer *presence*.** §10.7 says every gate gets a test, but the highest-value test — "the inline disclaimer renders, visibly, at 320px, in gentle mode, on every generated artifact" — is nowhere named. Under layout pressure, the "persistent-but-quiet inline note" is the first element a worker-bot drops. **A rail without a regression test is a rail that exists until the next slice.**
7. **§11's "hostile review pass ran and found nothing new" is self-attested.** The attester is the author. Without an independent check (which is supposedly my job — but I'm also a participant with my own design in the mix), the completion-claim ban is honor-system enforcement of the one rule that most needs teeth.

## 3.5 Process defects

- **Fable is judge and party.** Fable owns WP-B and WP-D *and* arbitrates all disputes involving them. My WP-C depends on B's ranking formula and D's gate contracts; when my design needs something B doesn't deliver, Fable rules on Fable's own workload. No escalation path exists past Fable except Sean, who is not in the merge protocol.
- **The receipt's trainer/admin evidence is thinner than it looks.** 24 of 30 references are iOS consumer apps; the triage pattern is borrowed from HR/payroll/VoIP tools (Deel, Charma, Dialpad) — good analogies, but *zero* references are actual coach-facing nutrition products. The highest-stakes surface (trainer intervention) has the weakest reference base. Not a reason to re-research now — a reason to flag the triage ranking formula as the least-validated design decision in the package.
- **The ideation gate is half-pre-empted by the receipt** (stated as blocker #3 above). Either the shell is decided and the gate is ceremony, or the gate is real and the receipt overreached. I proceeded with the honest reading, but the prompt should have said which.

---

**Residual risk I could not retire this session:** every `[UNKNOWN]` above (≈15 items) requires Claude's filesystem pass; the C-pattern canon interpretation; the triage ranking formula (handed to Fable with a flag); and the gentle-mode rendered-state spec, which I've described but not wireframed — that wireframe is a blocking item for the build package, and I am not claiming it done.
