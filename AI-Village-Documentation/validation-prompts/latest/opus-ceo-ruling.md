# Opus CEO Ruling — Phase 4 Final Authority Review

> **Reviewer:** Claude Opus 4.6 (CEO — FINAL authority per CLAUDE.md)
> **Date:** 2026-03-22
> **Input:** Phase 2 debate log (3 rounds), Phase 3 debate log (5 rounds), Phase 1 validator reports (8/9 passed)
> **Ruling Status:** RATIFIED WITH CORRECTIONS

---

## Executive Summary

The AI Village produced solid work. Phase 2 (CTO ↔ Sonnet VP) identified 7 real architectural issues and reached consensus in 3 rounds. Phase 3 (Gemini Creative Director ↔ Sonnet) produced excellent design specs for loading states, error boundaries, and accessibility. However, I am issuing **4 corrections** to errors in the consensus that, if shipped, would break our build or contradict CLAUDE.md.

---

## RATIFIED DECISIONS (No Changes Needed)

### 1. Location Privacy — RATIFIED
Opt-in only, coordinate fuzzing, never expose raw GPS. Correct and non-negotiable.

### 2. Badge Virtualization — RATIFIED
Top 6 on profile header, virtualized grid for full collection. Correct approach.

### 3. AI Category Override — RATIFIED
Human-in-the-loop for AI post categorization. Users MUST be able to correct categories.

### 4. Cursor-Based Pagination — RATIFIED
Mandatory for social feed. Already documented in CLAUDE.md as a common gotcha.

### 5. Shadow-Ban Database Scoping — RATIFIED
Sequelize `defaultScope` to exclude shadow-banned records from standard queries.

### 6. Error Boundary Architecture — RATIFIED
3-tier error boundary (Root, Data, Component) with Crystalline Error Card pattern. Well-designed.

### 7. Premium Loading States — RATIFIED
Crystalline Shimmer CSS specs are on-brand and technically sound.

### 8. Motion Performance Budget — RATIFIED
Max 3 concurrent animations, `transform`/`opacity` only, `prefers-reduced-motion` support.

---

## CEO CORRECTIONS (Mandatory — Override Sonnet/Gemini)

### CORRECTION 1: `#0A0A0F` (Obsidian Black) is NOT a Retired Token

**Phase 3 Error:** The design debate consensus states "Eradicate... `#0A0A0F`" and proposes a CI/CD check: `grep -r "#0A0A0F" src/ && exit 1`.

**This is WRONG.** Per CLAUDE.md, `#0A0A0F` (Obsidian Black) is an **ACTIVE** palette color:
> - Obsidian Black `#0A0A0F` (Deep Dark — primary dark background, replaces heavy blue gradients)
> - Carbon `#141419` (Card Dark — card/panel backgrounds on dark surfaces)

The **RETIRED** Galaxy-Swan background is `#0a0a1a` (note the trailing `1a`, not `0F`). Gemini conflated these two values.

**CEO Ruling:**
- REMOVE `#0A0A0F` from the CI/CD eradication check
- The correct eradication targets are: `#00FFFF`, `#0a0a1a`, `#FF2D78`, `#7851A9` (the actual retired Galaxy-Swan tokens)
- Corrected CI check: `grep -r "#00FFFF\|#0a0a1a\|#FF2D78\|#7851A9" src/ && exit 1`

### CORRECTION 2: Virtualization Library — Use `react-window`, Not `@tanstack/react-virtual`

**Phase 3 Error:** Mandated `@tanstack/react-virtual` (v3+) for badge grid virtualization.

**This conflicts with our existing architecture.** We already use `react-window` v2 for the 840-exercise NASM Exercise Rolodex (`NASMExerciseRolodex.tsx`). Adding a second virtualization library:
- Increases bundle size unnecessarily
- Creates maintenance burden (two APIs to learn)
- Contradicts the "minimum complexity" principle

**CEO Ruling:**
- Use `react-window` (already installed, proven in production) for badge grid virtualization
- Do NOT add `@tanstack/react-virtual` as a new dependency
- The scrollbar CSS specs from Phase 3 are fine — apply them to the `react-window` container

### CORRECTION 3: Focus Ring Color — CLAUDE.md Is Source of Truth

**Phase 3 Error:** Specifies `outline: 2px solid #8B5CF6` (Wing Purple) for focus-visible.

**CLAUDE.md specifies differently:**
```css
*:focus-visible {
  outline: 2px solid #60C0F0; /* Ice Wing */
  outline-offset: 4px;
  box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2);
}
```

CLAUDE.md is the design system source of truth. The focus ring is Ice Wing `#60C0F0` primary with a subtle Wing Purple `#8B5CF6` inset accent.

**CEO Ruling:**
- Use CLAUDE.md's focus ring spec exactly as written (Ice Wing primary, Wing Purple inset)
- Phase 3's Wing Purple-only focus ring is OVERRIDDEN

### CORRECTION 4: Cyberpunk Theme — Accept CTO's `#05F2F2` with One Addition

**Context:** Sonnet (VP) proposed keeping `#00FFFF`. Gemini (CTO) counter-proposed `#05F2F2` to prevent OLED halation. Phase 2 ended with CTO asking CEO for approval but Sonnet never explicitly confirmed in the log.

**CEO Ruling:** I am approving Gemini CTO's `#05F2F2` counter-proposal. The OLED halation argument is technically sound and protects our mobile-heavy user base. Additionally:
- Swan logo shifts to Pure White (`#FFFFFF`) when Cyberpunk theme is active
- Font weights 600+ for primary interactive elements
- This theme is Phase 2 priority (NOT Phase 1) — ship Obsidian Black theme first
- The `cyberpunk-edgerunners` theme background uses `#0A0A0F` (Obsidian Black — our ACTIVE token, not retired)

---

## ADDITIONAL CEO DIRECTIVES

### Directive 1: Monolith Files Must Be Decomposed BEFORE Feature Work
Phase 1 validators correctly flagged `UserDashboard.V3.tsx` (1,861 lines) and `PostCard.tsx` (1,434 lines) as CRITICAL. These violate our 300-line rule. **Decomposition is a prerequisite for the social media upgrade, not a parallel task.**

### Directive 2: TanStack Query for Social Feed Data
Performance validator's recommendation for React Query (TanStack Query) with stale-time caching is approved. This aligns with our existing pattern for messaging (`ChatWindow.tsx` already uses infinite scroll with REST fallback).

### Directive 3: Implementation Priority Order
1. **P0 (Deploy blockers):** Backend model import fixes (DONE — shipped this session)
2. **P1 (Foundation):** Decompose monolith files, add error boundaries, cursor pagination
3. **P2 (Core features):** Profile banner/photo upgrade, badge grid, Victory charts on profile
4. **P3 (Social):** Feed enhancements, create-post modal, friend suggestions, theme toggle
5. **P4 (Premium):** World map, promotions area, workout logger on user dashboard
6. **P5 (Polish):** Cyberpunk theme, level-up animations, content moderation UI

### Directive 4: No New Dependencies Without Justification
- Leaflet/OpenStreetMap for world map — APPROVED (no alternative for this feature)
- `react-focus-lock` for modals — APPROVED (small, focused library)
- `@tanstack/react-virtual` — REJECTED (use existing `react-window`)
- BullMQ/Redis for AI background jobs — DEFERRED (use async/await with timeout for now, migrate when we hit 10K+ users)

---

## Final Verdict

**The upgrade prompt is APPROVED for implementation** with the 4 corrections above applied. The prompt should be updated to incorporate:
1. Corrected CI/CD eradication tokens (remove `#0A0A0F` from banned list)
2. `react-window` instead of `@tanstack/react-virtual`
3. CLAUDE.md focus ring spec (Ice Wing primary)
4. CTO's `#05F2F2` cyberpunk color approved

Once corrections are applied, proceed to Phase 5 (Blueprint components) and Phase 6 (Implementation).

---

*Claude Opus 4.6 — CEO, SwanStudios AI Village*
*Phase 4 Review Complete — 2026-03-22*
