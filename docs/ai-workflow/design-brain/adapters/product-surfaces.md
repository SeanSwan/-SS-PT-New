# Product Surfaces Adapter — Coach Command Center & Swan Coach

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for the two coaching product surfaces
- **Merged file** (see `index.md` §3): two faces of the same coaching loop, kept side-by-side so the operator/client boundary stays impossible to miss. Actor definitions + tiers: `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §3–§4.

---

## Section A — Coach Command Center (trainer/operator product surface)

The approved trainer-facing operator surface: dictation, client ops, PLAUD review, proposal approval. Effect ceiling T2 within the signed-in user's role scope, enforced by app auth — this is product auth, never Hermes authority. It is a **product** surface: Crystalline Swan system via `swan-design-router`, not Cyberforest chrome (that mode is Sean-only; `hermes.md` §1).

### A1. Surface rules

- **Workflow density is allowed.** Trainers work here for hours: tighter spacing than marketing surfaces, table-first data, compact grouped facts per the Swan Card/Button Standard — but the B2.2 dashboard arc still applies (orientation → current state → insight → next best action) and the C12 panel recipes still frame every card.
- **Low-motion cards.** Client/data cards keep SheenCard geometry, chrome edge, and pill/metric language but stay low-motion: no pointer tracking, no animation loops, no hover-only actions, no hidden controls (Swan Card/Button Standard). Motion marks state change only.
- **Dictation-first affordances.** The live-session loop — find client, start session, dictate or manually log, save, review, show progress — is the design north star (rule 62). The dictation entry point is a primary, always-visible ≥44px control on session surfaces, with a visible recording state, a text-input fallback of equal rank, and an explicit review-before-save step. Dictation output is a **draft**, never an auto-committed log.
- **Approval-gated proposal patterns.** Anything drafted by AI (Swan Coach drafts, PLAUD-parsed workout logs, suggested plan adjustments) renders as a proposal card: clear DRAFT badge, source ("parsed from session audio 06-30"), diff-style view of what will be written, and explicit Approve / Edit / Discard actions (each ≥44px). Approving is the T2 write; nothing lands in the client record without it.
- **Client-data privacy in UI.** Show PII only where the workflow needs it. Rosters and detail views the trainer owns: names are fine (product auth scopes them). Anything that fans out — export panes, screenshots-for-review affordances, AI-assist panels, debug/receipt views — uses client IDs with names mapped client-side (rule 8). Never render another trainer's clients; empty-state, not error-state, on out-of-scope queries.

## Section B — Swan Coach (client-facing assistant surface)

The public in-app coaching assistant: chat, proposals, logging drafts, governed by subscription tiers + approval gates. Effect ceiling T1 — drafts and proposals; writes land only through approval-gated product endpoints.

### B1. Surface rules

- **Warmer tone, same system.** Full Crystalline Swan warmth: glass panels, Ice Wing/Wing Purple glow discipline, Cormorant italic moments, celebration beats on milestones. Warm ≠ soft on quality: contrast, touch targets, reduced-motion all hold.
- **Proposal cards with DRAFT/approve.** Coach never silently does things. Every actionable suggestion ("log yesterday's session?", "adjust Thursday to recovery work?") is a card: DRAFT state, plain-language summary of exactly what will be saved, Confirm / Edit / Not now. Confirmation copy names the effect ("This adds a workout entry for June 30"), not the mechanism.
- **Subscription-gated presentation.** Locked capability renders as an invitation, not a wall: the feature is visible, described by its benefit, gated by the established lock-overlay pattern with a clear upgrade path. Never a dead button, never a silent absence, never shame copy ("you're only on the free plan").
- **Care-first copy rules.** Encouraging, specific, body-positive; progress framed against the user's own history, never against other users. No medical claims or diagnosis language; "stretching/flexibility," never yoga/meditation (rule 9). Setback states (missed week, broken streak) get re-entry framing ("pick up where you left off"), never guilt. Coach identifies as "Swan Coach" — not "the AI" — in user-facing copy.
- **No operator chrome, ever.** No tier badges, receipts, kill switches, approval queues, run logs, model names, token counts, or system-prompt leakage. The client sees a coach, not a control panel. Operator chrome on this surface is a REJECT-class review finding.
- **Data truth.** Progress proof shown by Coach comes from real logged workouts/sessions; mock progress is a flagged gap, never a rendered chart.

---

## Boundary table (pin this)

| | Coach Command Center | Swan Coach |
|---|---|---|
| User | Trainer/admin (product auth, role-scoped) | Client |
| Ceiling | T2 (own scope) | T1 (drafts only) |
| Density | Workflow-dense, table-first | Conversational, generous spacing |
| Motion | Low-motion, state-change only | Warm but restrained; celebration beats allowed |
| PII | Names where workflow needs; IDs where it fans out | Own data only |
| Chrome | Product proposal/approval UI | Zero operator chrome |
| Tone | Operational, efficient | Care-first, encouraging |

## Verification before done (self-apply)

- [ ] Correct section applied for the surface; boundary table row respected end-to-end
- [ ] Command Center: dictation affordance primary + fallback equal-rank; every AI-drafted write behind a proposal card with Approve/Edit/Discard
- [ ] Command Center: fan-out surfaces (export/AI/debug) use IDs not names; phone-width check per Swan Card/Button Standard
- [ ] Swan Coach: every action is a DRAFT proposal with plain-language effect copy; locked features invite, not shame
- [ ] Swan Coach: zero operator chrome; copy passes care-first + rule 9 scan
- [ ] Both: B2.2 arc, 44px, contrast, reduced-motion, loading/empty/error states, real data only
- [ ] Builder receipt (`builders.md` §4) posted with this adapter cited under Patterns
