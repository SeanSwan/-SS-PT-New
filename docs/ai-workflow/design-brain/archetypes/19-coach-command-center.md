<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 19. Coach Command Center (trainer product surface)

- **Use when:** the trainer's daily working surface — client roster, live-session logging, PLAUD review, proposal approvals. Product surface: multi-tenant, role-scoped via app auth (T2 within the signed-in trainer's scope — this is product authorization, not Hermes authority).
- **Feel:** the trainer's clipboard elevated to a cockpit — fast, glove-friendly, gym-floor real.
- **Arc:** Dash 4-phase. **Hero:** roster + next-best-action band — today's sessions, who needs attention, one-tap start-session. **Motion:** M1.
- **Sections in order:** Phase 1 today band (sessions, alerts: stale clients, pending PLAUD drafts) → Phase 2 live tools (find client ≤2 taps → start session → dictate/manual log → save) → Phase 3 client progress review (`ChartEnvironment` from real logs, plan-adjustment affordances) → Phase 4 queue (approve workout-log drafts, respond, plan next).
- **Conversion goal:** client workout logged/reviewed in fewest taps; the coaching loop (log → history → charts → plan adjustment) friction-free. Live-session flow is the sacred path.
- **Trust:** drafts vs committed logs visually distinct (T1 proposal vs saved truth); PLAUD-parsed artifacts arrive ONLY through approval-gated review (redaction-first per Bridge §6); credentials copy anywhere on-surface obeys the credentials rule.
- **Mobile:** gym-floor mobile is primary for live tools — one-thumb logging, big targets, interruptible flows that survive lock-screen; desktop for review/planning phases.
- **A11y:** dictation flows have full manual equivalents; timer/set counters readable at arm's length; no hover-dependent controls.
- **Components:** low-motion `SheenCard` client cards (geometry + chrome, no pointer-tracking), `GlowButton`, `ChartEnvironment` + `SafeChart`, approval-gate/draft-badge patterns from `components.md`, `GlassPanel`.
- **Anti-patterns:** burying start-session below analytics; duplicate client facts across roster card and detail; requiring desktop for anything live-session; auto-committing drafts without trainer approval.
- **Fable brief:** "Coach Command Center [slice]. The live-session moment: [X]. Directions: today-band composition, log-flow tap choreography (count the taps), draft-vs-truth visual language."
- **Builder brief:** "Direction [n]. Role scoping via app auth verified (rule 26 + trainer-role path); log write path end-to-end tested; PLAUD drafts render only post-redaction; tap counts measured before/after."
- **Harness QA:**
  - [ ] find-client→start-session→log→save ≤N taps (state N)
  - [ ] draft badge distinct from committed at a glance
  - [ ] 375px + 414px live-tool sweep
  - [ ] chart loading/empty/error
  - [ ] role isolation (trainer A cannot render trainer B's client)
- **Village questions:**
  - Can a trainer log a set mid-conversation without looking twice?
  - Is the draft/committed boundary abuse-proof?
  - What breaks when connectivity drops mid-session?
