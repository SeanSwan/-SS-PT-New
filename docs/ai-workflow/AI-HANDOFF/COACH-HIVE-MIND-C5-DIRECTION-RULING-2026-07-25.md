# C5 — Direction Ruling

**Decided by:** Opus 5, acting as design authority (CLAUDE.md Co-Orchestrator Hierarchy as amended 2026-07-25: *design authority = Kimi K3 + Opus 5; either may decide alone when the other is unavailable*).
**Kimi consult attempted and could not run** — `OPENROUTER_API_KEY` absent from env and `.env` (the script checked both; not grepped, Rule 59). Gemini is likewise keyless, and under the amended doctrine would have been context-only regardless. Decision brief preserved at `KIMI-C5-DIRECTION-DECISION-BRIEF.md` so Kimi can review the reasoning later without re-deriving it.
**Date:** 2026-07-25 · **Supersedes the open question in:** `COACH-HIVE-MIND-C5-DESIGN-CONTRACT-2026-07-25.md` §3

---

## RULING 1 — Direction: **The Lane, with The Lock's client chip fused in**

### The decision
Build a **persistent 56px bar docked at the bottom** of every Coach surface. `Cmd+K` **focuses** it; it does not open a modal. It carries the locked-client chip inline at its left edge. Typing or speaking expands it upward into five rows; it collapses on execute.

### Why — the argument that settles it
DoD #1 is *a voice-originated set log landing in ≤2 seconds, screen-off*. **An overlay is a mode.** Summon → wait for focus → type → dismiss. Every one of those steps is a tax paid on the most frequent action in the product, and the benchmark is not other voice assistants — it is **two taps in a manual logger**. A bar that is already open has no summon step, and keyboard and voice reach the same object without a mode change.

The second argument is convergence economics. Five command surfaces must eventually converge, and one of them — `ClientTrainingCommandBar.tsx` — is already a docked intent+voice bar. Direction 2 generalizes something real; Directions 1 and 3 replace it. In a codebase where **eight** planned builds turned out to already exist, "generalize what works" has an unbroken track record here and "build the impressive thing" does not.

### Why the chip is not optional
The chip is the *entire* safety argument. A wrong-client write was live in production two days ago on the command that cancels a session. The backend now prevents it — but the trainer never sees that guarantee, and an invisible guarantee does not build trust. The chip makes the client the one permanently visible fact on the surface.

### Answering the strongest objection against my own pick
The real risk in Direction 1 — which I am inheriting — is **habituation**: an always-visible chip becomes wallpaper by the 200th session, and a warning nobody reads is not a warning.

Mitigation, and it is a design requirement not a nicety: **the chip must be quiet in the common case and loud only on change.** Steady state is low-contrast — Midnight Sapphire fill, Ice Wing edge, small. The Gilded Fern flip is reserved *strictly* for cross-client, never for ordinary state. It must also be **change-triggered, not state-triggered**: it animates on the transition, so the eye catches motion rather than being asked to notice a colour it has stopped seeing.

**Corollary rule:** never let the chip fire on anything routine. A confirmation that always fires equals no confirmation — the same over-escalation trap already guarded in `voiceConfirmationTier` (where `42` and `'42'` are deliberately the same client, so a transport quirk cannot manufacture a false cross-client alarm).

### What is deferred, and honestly why
**The Console's consequence preview is the best single idea in the set** — showing what a command will do to the record before it commits is the `read_back` tier made visual, and it directly attacks the highest-error class (misheard digits). It is deferred for two concrete reasons, not taste: it has no mobile answer that is not "also build Direction 1," and it needs `voiceConfirmationTier` (SWA-67) wired first to know which tier to display.

**It is a later slice, and it should happen.** Tracked so it is not lost.

---

## RULING 2 — Audience routing: **(a) land SWA-64 first**

### The decision
Push the 3 unpushed commits on `feat/admin-trainer-normalization`, then C5 consumes `resolveAudienceFromPath` as originally designed.

### Why
- **(c) is disqualified outright.** Duplicating the resolver is precisely the drift this program spent seven slices removing. It would create a second source of truth for audience routing, which is how the four-registry problem started.
- **(b) works but pays twice.** Ship with role props now, rewrite when SWA-64 lands. It defers a known blocker rather than removing it, and the rewrite touches the newest, least-tested surface in the program.
- **(a) removes the blocker permanently.** The work is *finished* — S1+S2+S3, with a passing invariant test (3116 passed / 1 pre-existing failure proven unrelated by `git status`). It is sitting unmerged for no reason anyone has stated.

**Precondition before pushing:** rebase that branch onto current `origin/main` and re-run its suite on the rebased tree. Clean-apply is not verification — that lesson is already recorded in this program from the C0.5 cherry-pick.

**If Sean declines (a)**, fall back to **(b)**, never (c).

---

## RULING 3 — C3 confirmation tier: **observe-only first**

Wire `resolveVoiceConfirmationTier` so C5 **derives and logs** the tier for every intent **without enforcing it**. Enforcement lands in a follow-up once the distribution is visible against real traffic.

**Why:** enforcing a spoken-yes gate on day one, on a surface whose voice affordance is brand new, risks blocking a trainer mid-session with a confirmation they cannot complete. Observe-only makes the tier distribution *measurable* before it is *binding* — and it mirrors the shadow-price pattern already used in this repo for trainer-economics. It also finally gives SWA-67's dormant module a consumer, which is the point.

---

## What is now unblocked

With Rulings 1–3, C5 has no open design or architecture questions. The build order:

1. **Land SWA-64** (Ruling 2) — rebase, re-verify, push.
2. Generalize `ClientTrainingCommandBar.tsx` into the shared docked bar.
3. Fuse the client chip; change-triggered Gilded Fern on cross-client only.
4. `Cmd+K` focuses (never opens a modal).
5. Record every intent via `recordCoachIntent` with correct `inputOrigin`.
6. Derive-and-log the confirmation tier (observe-only).
7. Converge the remaining four command surfaces, or write down why one cannot.
8. Responsive matrix — **320px and 414px are the hard cases** for a permanent dock.

Full build instructions, house rules, proof discipline, and the failure classes not to reintroduce: `SWAN-COACH-HIVE-MIND-C5-BUILD-HANDOFF-2026-07-25.md`.

---

## Standing note for whoever builds this

These rulings are decisions, not suggestions. If you believe one is wrong, **say so to Sean before deviating** — do not silently substitute. The reasoning is written down precisely so it can be argued with rather than guessed at.
