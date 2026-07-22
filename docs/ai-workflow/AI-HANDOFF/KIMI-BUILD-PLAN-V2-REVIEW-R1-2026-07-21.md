# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/MOBBIN-BRAIN-BUILD-PLAN-v2-FABLE-KIMI-2026-07-21.md
**Seed:** docs/ai-workflow/AI-HANDOFF/MOBBIN-BRAIN-BUILD-PLAN-2026-07-21.md
**Tokens:** 6492 in / 4848 out · **Cost:** ~$0.0922 · **Wall:** 176.0s

---

# Kimi K3 — Hostile Review: Mobbin Build Plan v2
**Round 1 · Verdict: SHIP-WITH-CHANGES**

v2 is materially better than v1 and the Wave −1 insight is genuinely correct — but as written it has five build-blocking vaguenesses, two contradictions with its own standing constraints, and one orphan dependency. None require rethinking the shape of the plan; all require resolution *in this doc* before it supersedes v1.

---

## 1. Blockers

**B1 — −1.4 contradicts the standing ⚠ constraint.** The doc restates as law that Stripe/billing items trigger Tier-C Village + Sean, then gates "billing-flag flips" with just "Sean." Either flag flips are billing (Village gate applies) or they aren't (say which flags and why they're exempt). Pick one; the doc currently argues with itself.

**B2 — The B1b SSE spike is a dependency with no home.** It's named as gating 3.2's UX ceiling but appears in no wave, has no effort estimate, no owner, no gate. Orphan dependencies are how "M" items silently become blocked mid-build. Schedule it as an explicit spike (I'd put it in Wave 0 as 0.4 — it's small and it also de-risks 0.2's voice-in-palette streaming).

**B3 — 1.4's "share loop" is too fuzzy to build from.** "One-tap share to community feed (existing social)" assumes (a) the existing feed accepts a card artifact, (b) a client-consent/privacy model for publishing workout data (rule 8 was cited for *analytics*, not for *publishing*), (c) moderation, (d) the admin "celebrations this week" surface — which appears nowhere else in the plan and has no spec. That's three surfaces at "S–M," which also quietly breaks the doc's own claim that remaining work is "half the effort v1 budgeted." Split into 1.4a (light-up, S) and 1.4b (share+celebration, M, requires a one-page share-consent spec).

**B4 — Wave 0.2 is Coach-adjacent and internally mis-sequenced.** The doc says −1.2 "must land before any Coach-chat-adjacent work," then routes ⌘K voice through the Coach command dispatcher in Wave 0. Wave −1 precedes Wave 0, so the order *works* — but only if −1.2 actually ships. State the dependency explicitly in 0.2's row, or the first lane to slip breaks the chain silently. Also: ⌘K + global search backend + voice routing at "M" is optimistic; the search index alone is unspecified (what entities? what ranking?).

**B5 — −1.1 is `[LIKELY — memory]`, not verified.** Scheduling "one push" of a branch whose state is unverified is exactly the stale-assumption failure v2 was created to fix. Add a 30-minute verification step (branch exists, diff vs. main, passes checks) as part of −1.1 before it enters the Rule 70 batch.

**B6 — No cold-start answer for 1.2/1.3.** Readiness maps and PR analytics on clients with <2 weeks of post-1.1 data will render empty or misleading — a direct violation of the data-truth rule that 0.1 exists to protect. 0.1's empty-state contract must explicitly cover 1.2/1.3's cold states ("Readiness unlocks after 3 logged sessions") — currently unstated.

**B7 — No least-click budget or mobile contract anywhere.** The logger (1.1) is the highest-frequency surface in the product and it's gaining four new fields. Without a stated budget ("log a set in ≤2 taps," "complete rest-timer interaction in 1") and a stated mobile-column strategy, four dense columns + timer + dictation on a phone in a gym will ship as a cramped desktop table squeezed onto 390px. This is how we get generic UX on the surface that matters most.

**B8 — 3.4's reveal depends on a plan existing.** "Your coach built THIS for you" requires either 3.1's template library or a generation path; the dependency is unstated. If 3.4 ships on a stub, the signature moment is a lie. Make 3.1 (or a thin template slice of it) a named prereq.

**Minor flags:** 2.1's anonymized progress-proof pipeline doesn't exist (rule 8 covers IDs, not chart anonymization — that's new infra inside an "L" that's already three products); parallel Waves 1+2 plus the 14-surface design overhaul all pull the same design-router lane with no capacity note; no item has an acceptance metric, so "closeout-evidence-lock" has nothing to lock against.

**Out-of-remit gates (flagging, not reviewing):** −1.4 billing flips, 2.2 paywall/Stripe, 4.2 auth-core — Village + Sean, per the doc's own law.

---

## 2. What v2 got RIGHT over v1 (specifically)

1. **Killing the stale 1.4.** v1 budgeted a full card build; v2 correctly identifies the card shipped dark (`72e3f37da..f5cf065e1`) and re-scopes to audit + light-up. This is the single best correction.
2. **Wave −1.** "Ship what's built" as an explicit zero-build wave is a real planning upgrade — v1 left built money work (inquiry button, P1 fix) unranked.
3. **Dictation-by-contract in 1.1.** Given the 2026-07-15 sequencing brain and Sean's dictation-first operating model, v1's touch-only logger was half a logger. Making dual-input a *contract*, not a stretch goal, is right.
4. **The share loop as loop-closer.** v1 ended the core loop one step early; threading card → feed → admin celebration actually closes the stated Product Core Loop.
5. **Real money truth in Wave 2.** v1's "trial-timeline paywall" was generic research-copy; v2 maps the actual tiers (Free/Guardian/Crystalline) and actual packages ($175/hr, $110/30min) and grounds 2.1 in the locked Marketing Brain epic. Big specificity win.
6. **2.3's margin lens** (revenue − shipped comp mode-b payroll = margin per client) turns a vanity dashboard into the number Sean decides with.
7. **1.3 repositioned trainer-first** with client read-only — correct enforcement of the indispensability doctrine that v1 stated but didn't apply.
8. **1.2's PR events feeding the existing XP engine** — quietly warms data for deferred 4.1 at zero extra engine cost. Elegant.
9. **Rule 71 baked into wave operations** (grep-before-slice, regen-at-closeout) — the plan compounds instead of decaying. v1 had no memory protocol.
10. **Role-aware empty states in 0.1** — converting dead space into per-role next-action surfaces is the right instinct (but see U1/B6 for the execution bar).

---

## 3. UPGRADES — making the top surfaces signature, not template

All within: dark-first Crystalline Swan lens, styled-components via the token bridge + `data-console-root`, 44px targets, reduced-motion fallbacks, dual-input.

**Logger spine (1.1) — the gym-floor surface:**
- **Ghost-fill PREVIOUS:** last-time values render as crystalline ghost text *inside* the inputs, not a separate column. One tap (or "same as last time") accepts → **1-tap logging**. This kills the density problem B7 raises and makes "beat last time" the ambient default, not a lookup.
- **Rest timer as atmosphere, not widget:** full-bleed `<ConsoleAtmosphere />` pulse — the whole surface breathes at timer tempo, haptic tick at 15s, voice "skip"/"plus fifteen." Reduced-motion fallback: static progress ring + aria-live countdown. The timer should feel like the *room* counting down, not a stopwatch pasted on a form.
- **Swipe grammar:** swipe-right on a set row = repeat last values; swipe-left = inline note. Numeric bottom-sheet keypad with 48px keys, weight/reps dual-wheel. RPE = haptic snap-slider 6–10.
- **Voice trust pattern:** every dictation lands as an undoable confirmation chip ("✓Added Goblet Squat — 3×12" · undo, 5s) — extends the shipped Coach proof pattern into the logger. Spec the degradation path: mic denied / gym noise → instant keypad fallback, never an error wall.
- **PR flare:** PR detection fires a crystalline edge-glow on the set row, e1RM counts up, badge stamps on. Reduced-motion: badge appears, number swaps, aria-announced. This is the micro-moment clients will screenshot.

**Proof-card share loop (1.4):**
- The card is an **artifact, not a modal**: three aspect presets (9:16 story / 1:1 / feed), PR number refracted through the lens prism, data-truth watermark. Auto-caption pre-drafted from the milestone ("42-day streak 🔥" — no, **crystalline streak sigil**, we don't do emoji-fire).
- **≤2 taps completion → published.** Smart default target (community feed), long-press for external share sheet.
- **Trainer-in-the-loop:** share triggers a trainer "celebrate" affordance — one tap injects a coach comment on the client's post. Indispensability *inside* the viral loop, not beside it. This is the differentiator no template app has.

**Coach acquisition (2.1):**
- Profile hero = **proof reel**: anonymized client progress charts as scroll-driven reveals (chart lines draw on viewport entry; reduced-motion: pre-drawn crossfade). The acquisition surface literally demos the Wave-1 loop — the doc says this; the *motion* is what makes it land.
- Credential lockup as a designed signature element: "26+ years experience · NASM protocol" — never "NASM-certified," per law.
- Booking: slot grid → confirm → instant calendar add + speed-to-lead email fires → post-booking **referral card** ("bring a training partner — share this") reusing the 1.4 card component. One component, two loop-closers.

**Onboarding reveal (3.4):**
- Signature cinematic beat: assessment answers visibly **assemble** — each answer becomes a facet that flies into a crystalline plan-preview card deck, resolving into "Coach Sean built this for you" with the trainer's real attribution. This is what the lens world system exists *for*.
- Data honesty built into the theater: "PREVIEW — pending coach approval" sigil until the trainer gates it (assess-before-prescribe). Honesty as a design element, not fine print.
- Ends on the first-session booking CTA → feeds 2.1's speed-to-lead. The reveal is an acquisition asset, not just activation.
- Reduced-motion: facet fly-ins become opacity/stagger crossfades; nothing lost narratively.

**⌘K (0.2):** voice button *inside* the palette (mic at 44px), results ranked role-first with MRU clients pinned, and every result shows its dictation phrasing as hint text — the palette teaches the voice grammar passively.

---

## 4. Ranked top-10 changes required before agreement

| # | Change | One-line reason |
|---|--------|-----------------|
| 1 | Resolve −1.4's gate: billing-flag flips get Village+Sean or an explicit exemption list | The plan contradicts its own standing ⚠ law on day one. |
| 2 | Split 1.4 into 1.4a (light-up, S) and 1.4b (share loop + celebration surface, M) with a one-page share-consent/privacy spec | "One-tap share to community feed" is currently unbuildable — three surfaces, no privacy model. |
| 3 | Schedule the B1b SSE spike as explicit Wave 0 item 0.4 with owner/effort | Orphan dependencies silently block 3.2 and 0.2 mid-build. |
| 4 | Add least-click budgets + mobile column contract to 1.1 ("set logged in ≤2 taps"; ghost-fill pattern mandatory) | The highest-frequency surface has no UX success bar and four new fields. |
| 5 | State the −1.2 → 0.2 dependency explicitly in 0.2's row; re-estimate 0.2 as M+ with search-index scope defined | The voice-palette silently assumes a P1 fix shipped and a backend that isn't spec'd. |
| 6 | Add branch-verification step to −1.1 before the Rule 70 batch | "One push" is scheduled on `[LIKELY — memory]`, not evidence — the exact failure mode v2 exists to fix. |
| 7 | Extend 0.1's empty-state contract to cover 1.2/1.3 cold-start ("unlocks after N sessions") with named per-surface list | Otherwise PR/readiness surfaces ship empty or misleading — violating data-truth on the proof surfaces. |
| 8 | Declare 3.1 (or a thin template slice) a named prereq of 3.4's reveal | A "your coach built THIS" moment on a stub plan is a lie in the signature scene. |
| 9 | Add a dictation degradation spec (mic-denied/noise → keypad fallback; ambiguous-parse confirmation UX) to 1.1's contract | Dictation-first without a failure story ships as an error wall in a loud gym. |
| 10 | Add per-item acceptance metrics as the closeout-evidence-lock payload (e.g., 1.1: median taps/set; 2.1: inquiry→response time) | The lock currently has nothing to lock — "done" is unverifiable and scope will drift. |

**Bottom line:** v2's *strategy* is right and its corrections over v1 are real and verified. Its *buildability* is not yet there — the four highest-ranked surfaces (logger, share loop, acquisition, reveal) each carry one unspecified assumption that will either stall the build or, worse, ship as generic template UX. Resolve the ten deltas above in-doc and I co-sign; Fable arbitrates any disagreement per rule 46.

— Kimi K3 · R1 · awaiting Fable's disposition
