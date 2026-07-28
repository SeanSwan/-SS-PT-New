# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-CORE-PRODUCT-SURFACES-REVIEW-PACKET-2026-07-17.md
**Seed:** (none)
**Tokens:** 11902 in / 16000 out · **Cost:** ~$0.2757 · **Wall:** 589.4s

---

# KIMI K3 — SURFACE 4.2 · WORKOUT LOGGER — UPGRADE BUILD PACKAGE

**Output file:** `docs/ai-workflow/AI-HANDOFF/KIMI-4.2-WORKOUT-LOGGER-UPGRADE-BLUEPRINT-2026-07-17.md`
**Scope lock:** Surface 4.2 only. All other surfaces appear solely as *seams this build leaves* (§5.11/§5.12). Fable rulings §1.5 are obeyed as frame; nothing here re-opens them.

---

## (a) VERDICT

**SHIP-WITH-CHANGES.** The logger is the strongest surface in the product — voice import, offline queue, ghost prefill, rest timer, NASM rolodex, real data, real tests — and it *still* fails the Core Loop at its most valuable inch: the moment after save terminates in a toast and a dead end, with no proof, no next action, and no share. The 855-line monolith plus three drifting role variants guarantee that any fix built inside the current file rots within a quarter. The changes are therefore structural and pre-decided: split the monolith into one capability-owning core with four gate-and-skin shells, and install the Fable-assigned signature — the **Post-Save Handoff** — as the save's terminal state. Everything below is decided; the builder executes.

---

## (b) CURRENT-STATE TRUTH CHECK

| §4.2 claim | Ruling |
|---|---|
| `WorkoutLogger.tsx` ≈855 lines on `main`, known 300-cap violator | **Confirmed** — matches the §2 violator list. |
| ~140 support files: NASM rolodex, rest timer, ghost prefill, voice memo, offline queue, corrective panel | **Confirmed** per packet grounding on `origin/main`. |
| Four role variants are real, not dupes (client / trainer `EnhancedWorkoutLogger.view.tsx` / admin `AdminPersonalWorkoutLogger.tsx` / admin-client `WorkoutLoggerModal.tsx`) | **Confirmed** — and this is precisely the drift surface: four files that each *re-implement* capability wiring. |
| Mounts: client `/log-workout`, trainer `/log-workout`, admin `/log-my-workout`, admin `/log-workout` → Client Hub logger | **Confirmed**; the redirect means the modal shell must be a first-class shell, not an afterthought. |
| Endpoint map (`workout-forms/{my\|client/:id}/info`, `POST /api/workout-summaries`, ghost, voice upload, correctives) | **Confirmed** as the live contract surface. Any field I add is additive-only and defers to R2's canonical contract if a conflict is found. |
| "Most complete surface… heavy test coverage; real data" | **Confirmed**, and credited below. |

**Credit — the hard, unglamorous right calls already made (keep, don't touch):**
1. **The offline queue.** Gyms are Faraday cages with mirrors. Queue-first save is the single most trust-preserving decision in the app.
2. **Ghost prefill from real prior sessions.** This is the minimal-click doctrine already half-achieved — the upgrade finishes it (see tap math).
3. **Voice memo → parsed draft** (`POST /api/workout-logs/upload`). Floor-first, dictation-first — exactly Sean's mandate.
4. **NASM-protocol rolodex** living inside the logger instead of a separate library trip.
5. **Real data only.** No mock charts anywhere in this surface — the bar every other surface must meet.

**Template / missing / rotten:**
1. **The save terminal is a toast.** `POST /api/workout-summaries` succeeds → transient confirmation → nothing. The Core Loop's *log → save → **proof → next action → share*** chain breaks at link 3, on the app's most-used screen. This is the single highest-value absence in the product (Fable R7 agrees: Build #1).
2. **855-line monolith.** Capability logic (queue, ghost, voice, timer) is entangled with client-role presentation — which is *why* the trainer/admin/modal variants re-built instead of re-used.
3. **Trainer variant is poorer than the client variant** — backwards for a trainer-led OS.
4. **No next-best-action anywhere post-save** — the north-star question goes unanswered at the exact moment motivation peaks.
5. **No share affordance.** The loop's cheapest acquisition channel is absent.

---

## (c) GAP ANALYSIS vs THE VISION — absence-first, ranked by value

| # | Absence | Rule-62 pillar | Value rationale |
|---|---|---|---|
| 1 | **Post-save proof** (chart from the just-saved data) | Progress proof, adherence | The motivational payoff of logging is currently deferred to a dashboard the client may never open. Proof at the moment of effort is what makes logging habitual. |
| 2 | **Next-best-action card at save** | Adherence, coaching depth | §5.11 makes the logger the interim canonical home of the client NBA until 4.11 ships. Absent = the loop ends with a period instead of an arrow. |
| 3 | **Share-affordance stub** | Community, revenue | §5.5: proof→shareable is the loop's weakest link and a pro upsell seam. A stub now defines the contract 4.11/4.12 plug into. |
| 4 | **One capability core, four shells** | Trust (drift kills data-truth), coaching depth | Four loggers diverging = four sources of truth for the canonical record (Rule 58 schema-drift risk). Consolidate capabilities in the core; shells gate/skin only. |
| 5 | **Ghost prefill promotion to 1-tap set logging** | Adherence | Prefill exists but isn't wired to a single-tap "as-prescribed" confirmation (see tap math below). |
| 6 | **Save idempotency key** | Trust | Offline retries without a unique `clientRequestId` can double-write sessions — data-truth poison. |
| 7 | **Trainer-context proof** (client's trend shown to trainer) | Coaching depth | Trainer logs for #id and sees *nothing* about #id's trend or intervention need. |

**Minimal-click accounting — "log this set" (primary action):**

| | Path | Taps |
|---|---|---|
| **Before** | Tap exercise → tap weight field → type → tap reps field → type → tap ✓ | **5** |
| **After** | Ghost row renders pre-filled from last session (+suggestion chip); values match → tap ✓ on the row | **1** |
| **After (adjust)** | Stepper ± ×2 → tap ✓ | **3** |

**"Save session → see proof":**

| | Path | Taps |
|---|---|---|
| **Before** | Tap Save (1) → toast → proof *does not exist*; nearest contextual chart is ≥3 more taps away on another route | **1 to save, ∞ to proof** |
| **After** | Tap Save → proof screen renders in place | **1, zero further taps** |

---

## (d) THE POST-SAVE HANDOFF — the pre-assigned signature, specced in numbers

Fable assigned it; I design it fully. Internal name: **`PostSaveHandoff`**. The chart's today-point is the **Flight Point**; on a PR it becomes the **Gilded Point**. One screen, zero extra taps, three zones, in this exact vertical order:

**Zone 1 — The declaration (drama).**
- H1 (Plus Jakarta Sans 700, `clamp(1.75rem, 2.5vw + 1rem, 2.5rem)`, Frost White): **"Flight logged."**
- Cormorant Garamond Italic subline (`clamp(1.125rem, 1vw + 0.875rem, 1.375rem)`, Frost White 80%):
  - PR: *"A new personal best — +{deltaLbs} lbs over your previous mark."*
  - Streak (`sessionsThisWeek ≥ 3`): *"{sessionsThisWeek} sessions this week — your strongest run in {streakWeeks} weeks."*
  - Default: *"Session {sessionsThisWeek} this week — logged and proven."*
  - First-ever session: *"First flight on record — every chart starts with one point."*

**Zone 2 — The proof (Victory chart, real data only).**
- Source exercise: today's highest-volume exercise with ≥3 prior logged sessions; if none qualifies, highest-volume exercise (single-point state).
- Metric: **estimated 1-rep-max (Epley: `weight × (1 + reps/30)`) of the top set per session**, last 12 sessions including today. Eyebrow (Sora 600, 0.75rem, uppercase, +0.08em, Arctic Cyan): `EST. 1-REP MAX · {EXERCISE NAME} · LAST {k} SESSIONS`.
- Big numeral (Fira Code, `font-variant-numeric: tabular-nums`, `clamp(2.75rem, 8vw + 1rem, 5rem)`): today's e1RM, Frost White; **Gilded Fern `#C6A84B` when `pr === true`**, with a 3-iteration gold radial pulse behind it, then settle to static glow.
- Fact chips row (Fira Code 0.875rem, tabular): `VOL {totalVolumeLbs} LB` · `{exerciseCount} EXERCISES` · `{durationMin} MIN` (omit null).
- Chart geometry: 220px height @375px, 180px @320px, 320px @1440px. Arctic Cyan `#50A0F0` 2.5px line (charts-only color — never on any button), Ice Wing `#60C0F0`→transparent area fill at 18%→0% opacity, Frost-White-at-40% axis ticks in Fira Code 0.6875rem. Flight Point: r=7, Ice Wing with glow; **Gilded Point: r=8, `#C6A84B` with `0 0 16px rgba(198,168,75,0.55)`**.

**Zone 3 — The arrow (next-best-action card) + the echo (share stub).**
- NBA card: eyebrow `NEXT BEST ACTION` (Sora 600, 0.75rem, +0.08em, Ice Wing); Graphite `#1A1A24` surface, 3px Ice Wing left rail (gold is reserved for PRs — the NBA is not a milestone); 48px full-width CTA (primary dual-glow: Royal Depth `#003080` bg → Wing Purple `#8B5CF6` glow `0 0 24px rgba(139,92,246,0.45)`).
- **The server decides the NBA; shells render it.** Resolver rules, evaluated in order, first match wins:
  1. `role ∈ {trainer, admin}` AND target client AND (client missed ≥1 prescribed top set this session OR 14-day adherence < 60%) → `ADJUST_PLAN` — title *"Client #{id} needs a plan adjustment"*, CTA `Open planner`, href `/workout-planner?client={id}`, `trainerOnly: true`.
  2. Viewer has a scheduled session within 48h → `DO_NEXT_WORKOUT` — title *"Next up: {dayName}"*, CTA `View next workout`, href `/schedule`, `trainerOnly: false`.
  3. `sessionsThisWeek ≥` plan frequency → `RECOVERY_FLEXIBILITY` — title *"Recovery day tomorrow"*, body *"10-minute flexibility flow — your joints earned it."*, CTA `Open flexibility flow`, `trainerOnly: false`.
  4. Fallback → `VIEW_PROGRESS` — title *"See your progress"*, href `/user-dashboard?tab=progress` (4.11 seam; shell falls back to `/user-dashboard` if the tab param 404s), `trainerOnly: false`.
- **Trainer-indispensability is double-gated:** the resolver never emits `trainerOnly` kinds for `role === 'client'`, and `NextBestActionCard` renders nothing if it ever receives one. Clients get read + do. Never a plan decision.
- Share stub: `ShareProofButton` — secondary dual-glow (Wing Purple bg → Ice Wing glow `0 0 24px rgba(96,192,240,0.45)`), 48px, label **"Share this win"**. v1 = `navigator.share` with text fallback to clipboard + analytics event `proof_share_tapped`. Microcopy beneath (Sora 0.75rem, Gilded Fern — 8.0:1 on Carbon, measured): *"Branded proof cards — coming soon for Pro."* **Renders only when the summary owner === viewer** (client-self, admin-self). Trainer logging for a client sees instead: *"Sharing is available to the client."* — no client data leaves through a trainer's device.
- Offline/queued state: proof still renders from locally cached history + today's input (real user data — data-truth preserved), today's point carries a `PENDING SYNC` chip,
