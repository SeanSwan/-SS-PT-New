<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 9. Client portal

- **Use when:** the logged-in client/trainee surface — home, progress, workouts. The Product Core Loop lives here: log → diary → charts → next action → share.
- **Feel:** personal momentum machine; gaming-warm (Ice Wing XP accents) without being a casino.
- **Arc:** Dash 4-phase. **Hero:** C9 momentum card (streak, XP, level, next session) as Phase 1. **Motion:** M1 (earned micro-celebrations on milestones allowed).
- **Sections in order:** Phase 1 momentum/identity → Phase 2 today's truth (next workout, quick-log entry ≤2 taps away, recent diary) → Phase 3 progress proof (`ChartEnvironment` from REAL logs; streak/PR annotations) → Phase 4 next best action (start workout / book session / share milestone).
- **Conversion goal:** workout logged; progress reviewed; milestone shared. Logging is the sacred path — fewest taps wins.
- **Trust:** their own real data, always fresh; mock progress data is a flagged gap, never silently shipped.
- **Mobile:** THIS IS A MOBILE-FIRST SURFACE. Log flow one-thumb; Progress never buried below social/profile; sticky quick-log affordance.
- **A11y:** 44px targets; XP/rarity colors (Common=Swan Lavender … Legendary=gradient) never the sole signal; reduced-motion swaps celebration animation for static badge state.
- **Components:** `ChartEnvironment` + `SafeChart`, `GlowButton`, low-motion `SheenCard` data cards, `CrystallineLockOverlay` on tier-locked features, gamification header patterns from `components.md`.
- **Anti-patterns:** burying Progress; feed-noise above workout truth; celebration confetti on trivial events (devalues milestones); duplicate facts across momentum card and stats row.
- **Fable brief:** "Client portal home. Primary loop moment: [log/review/share]. Directions: Phase-1 momentum treatment, quick-log placement, how Phase 3 makes progress feel addictive without dark patterns."
- **Builder brief:** "Direction [n]. Log path tap-count measured before/after; charts from real workout logs (data-truth); tier gates via existing lock components; rule 26 receipt on the mounted home route."
- **Harness QA:**
  - [ ] log-workout ≤2 taps from load
  - [ ] 320/375/414px sweep
  - [ ] charts loading/empty/error
  - [ ] streak/XP render from real API
  - [ ] share action produces the expected artifact
- **Village questions:**
  - Does the home screen make today's workout unavoidable?
  - Is any progress visual mock data?
  - What brings this user back tomorrow?
