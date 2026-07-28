# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/brainstorms/trainer-home-dedup-vs-observatory-2026-07-23.md
**Seed:** (none)
**Tokens:** 1557 in / 3075 out · **Cost:** ~$0.0508 · **Wall:** 111.5s

---

# (a) VERDICT: SEND-BACK

The observatory hero is wrong for this surface, the tests ratified a layout instead of a behavior, and the 4K shell violates your own wide law. Slim the hero, promote the operator loop, fix the shell. Details below, most severe first.

---

# (b) Design weaknesses, most-severe first

**1. The hero has six jobs. That's not a hero — it's a dashboard nested inside a dashboard.**
Avatar + name + subline + 3 stats + level + progress bar + 5 actions + artwork + 6-tile lens rail. A hero earns its space by doing ONE job with total clarity. The client home hero works because *the user is the protagonist* — identity and progress ARE the content. The trainer is not the protagonist of the trainer dashboard; **their clients are**. Porting the champion-hero pattern to an operator console is a category error, and Sean's eye caught it instantly. The contract tests didn't ratify a good design — they fossilized a copy-paste.

**2. Four competing CTA systems = zero primary action.**
Count the ways to "do something": 5 hero buttons + 3 NextActionCard buttons + 3 mini-tiles + a Quick Actions rail. That is ~14 interactive affordances for ~6 underlying destinations. This is the single worst hierarchy violation in the document. An operator console must have exactly ONE glowing primary: **"Log next session"** (context-aware: the session starting soonest). Dual-Button Glow exists to make ONE pair luminous — spray it across five buttons and the glow means nothing. Everything else drops to ghost/secondary.

**3. Duplicated data breeds distrust.**
Clients today / Sessions / Completion render twice, ~600px apart. The moment those numbers ever disagree by a render cycle (and they will), the trainer stops trusting both. Pick one owner: the KPI strip owns metrics, full stop. The hero shows none.

**4. The "huge empty purple gap" is a flat-surface diagnosis, and the background-picker is the prime suspect.**
A **background-theme-picker panel is sitting in the middle of the home page flow.** That is settings-page feature leakage parked in the operator's critical path, eating vertical rhythm and almost certainly constituting the dead band. This is indefensible on a B2B2C power-user surface. Evict it to Settings/Profile. While you're there: a dead void on Crystalline Swan means the surface system has no depth layering to carry empty space — fine, but the fix is to not have the void, not to decorate it.

**5. No signature moment for the trainer.**
The client home has one (identity/progress). The trainer home's natural signature moment — the **Client Interventions critical-compliance list**, the "who's about to churn / who's non-compliant today" radar — is buried in the *right rail under "My Book."* That's the one thing a trainer can't get from a spreadsheet, and you've subordinated it to a lens rail that duplicates navigation. Backwards.

**6. Lens rail ≠ Quick Actions — you've conflated navigation with action.**
This is the core of Question 2, so decide it cleanly: the lens rail is **navigation** (Today/Clients/Progress/Schedule/Build Plan/Coach = destinations). Quick Actions and NextActionCard are **actions** (Log/Plan/Ask = verbs). The bug isn't that one is redundant with the other — it's that navigation is living inside a hero at all. Navigation belongs in the shell (sidebar/topbar). Actions belong in the NextActionCard. Both renderings of "stuff you can click" in the hero die.

---

# (c) Implementation-fidelity attacks

- **Contract tests are testing the mock.** Tests asserting "3-up hero stats" and "5-up hero actions" assert *layout*, not *behavior*. That's an anti-pattern that makes every future design iteration a test-rewrite negotiation — exactly the paralysis this brief is experiencing. Rewrite them to assert behavior: "trainer home renders next-session CTA," "KPI strip shows completion %," "interventions list surfaces critical clients." Never assert N-up anatomy again.
- **Responsive unknowns the brief never addresses:** How does a 6-tile lens rail behave at 375px — wrap to 2×3, horizontal scroll, or clip? Do the 5 hero action buttons hold 44px touch targets when they wrap to 2+ lines at 320px? Does the Swan artwork panel render on mobile (it should not — it's dead weight below 768px)? The brief is 4K-obsessed and silent on 320–768, which is where a trainer actually logs sessions mid-gym-floor. Demand the mobile story before the 4K story.
- **Keyboard/focus after slimming:** if the hero is removed, where does `Tab` land first? The new primary CTA must be first in DOM order with a visible Crystalline focus ring — state this explicitly or someone will ship focus landing on the avatar.
- **Artwork panel + stats + actions in one hero component** smells like a >300-line file or a prop-drilled monster. The slim hero should be a ~80-line component. Verify the split.
- **Reduced-motion:** hero artwork and lens rails are exactly where someone sneaks in a parallax or entrance stagger. Any motion on the new command card must be GPU-safe transforms/opacity only, gated on `prefers-reduced-motion`.
- **Nested-interactive risk:** if the lens rail tiles are cards containing buttons, or NextActionCard mini-tiles sit inside a clickable card, that's invalid interactive nesting. Flag it in the rewrite.

---

# (d) The ONE highest-impact change

**Delete the hero. Promote `TrainerHomeNextActionCard` to be the hero — a full-width "Mission Control" command card — and hang a slim identity bar above it.**

The trainer's signature moment isn't gazing at their own avatar; it's *knowing exactly what to do in the next 30 minutes*. Make that the top of the page and the whole surface re-orients from "client dashboard clone" to "operator console."

**Concrete anatomy, top to bottom:**

1. **Slim identity bar (~72–96px, full width):** avatar (48px) · "Welcome back, Coach {Name}" · Trainer-Level chip · compact inline day-progress bar · streak/hours as a single muted text run. No stats cards, no buttons, no artwork. Optionally a small Swan watermark at low opacity as the only artwork — the signature mark, not a panel.
2. **Mission Control command card (the hero, full width):** left — next session block (client name, time, "26+ years / NASM-protocol" framed context cue) with THE Dual-Button Glow pair: **Log Workout (primary)** / **Plan Day (secondary)**; right — integrated day-timeline strip showing today's sessions as a horizontal spine. This card is the page's signature moment.
3. **Main grid:** KPI strip (sole owner of metrics) → Today's Sessions + **Client Interventions promoted to the primary column** → My Book / earnings in the right rail. Observatory Widgets stay rail-tier.
4. **Deleted:** hero stats, hero 5-actions, hero lens rail (nav moves to shell), Quick Actions rail (absorbed into command card), background-picker (→ Settings).

---

# 4K / shell fix (Question 4 — non-negotiable regardless)

`max-width: 1720px` contradicts your own wide law (~2240px cap). Fix:

- Shell: `max-width: 2240px`, fluid padding (`clamp(24px, 3vw, 64px)`).
- Column law: 1-col ≤768 · 2-col 1024–1919 · **3-col ≥1920** — at 3-col, Client Interventions becomes its own column instead of a rail afterthought. Cards never exceed ~560px; grid gaps scale, cards don't stretch.
- **The vertical void:** the grid must fill viewport height — `min-height: calc(100dvh - header)` on the shell with `align-items: stretch` on grid tracks, so columns extend and the void becomes distributed breathing room inside surfaces, not a purple band between them. Killing the background-picker removes most of the gap outright.

---

# (e) What a design-savvy competitor out-builds here

Trainerize/Mindbody-class consoles ship three things this page lacks:

1. **A persistent command bar (⌘K) with fuzzy client search** — the true low-click logging loop. Trainer types "Mar" → logging Marcie's session in 2 keystrokes. Your 14-button sprawl loses to this instantly.
2. **A live day-timeline as the page spine** — sessions as a continuous horizontal strip with "now" marker, not a list below the fold. (I folded a static version into the command card; a competitor animates it.)
3. **Badge-driven urgency** — intervention counts as ambient chrome (a "3 critical" pill in the header), so the operator sees risk without scrolling to a right rail.

You don't need all three now. But the command card + promoted Interventions close most of the gap; the ⌘K palette is the obvious next ratchet, and it would make the deleted lens rail permanently irrelevant.

---

**Bottom line:** slim hero = identity bar + Mission Control command card; metrics own the KPI strip alone; nav leaves the hero for the shell; Interventions promoted; background-picker evicted; shell to 2240px with 3-col ≥1920 and height-filling grid; tests rewritten to assert behavior, not anatomy. Answer to Q1: **redundant — cut it.** Q2 anatomy and Q4 shell as specified above. Q3 is moot.
