# OPUS CEO x CODEX DEBATE — Tier 2 Mobile UX Blockers (ARCHIVED)
## Date: 2026-04-07
## Status: CONSENSUS REACHED — Round 4 (2 rounds Opus, 2 rounds Codex)
## Full transcript: `debate-archive/OPUS-CODEX-DEBATE-TIER2-2026-04-07-FULL.md`

### Issues Fixed (9 total)
1. **2.1** Workout Planner + button on mobile — ExerciseAddBtn, visible mobile-only
2. **2.2** Exercise names disappear — `-webkit-line-clamp: 2` + `flex-wrap` on mobile
3. **2.3** Rolodex not contained — `max-height: 320px` on mobile PanelBody
4. **2.9** Store checkout stuck — `max-height: 90vh; overflow-y: auto` + top back button
5. **2.12** Equipment camera — `accept="image/*"` for iOS Safari
6. **3.1** TTS Read button — catch `audio.play()` rejection, fall back to Web Speech
7. **3.4** Microphone — skip auto-start on iOS, tap-to-start orb, `audio/mp4` MIME first
8. **3.5** Raw HTML in AI responses — MarkdownRenderer for assistant messages
9. **3.7** AI terminal z-index — reduced from 100 to 40

### Codex Correction (Round 2 → Fixed in Round 3)
- Nested `<button>` inside `<button>` — changed ExerciseItem from `styled.button` to `styled.div` with `role="button"` + keyboard handler
