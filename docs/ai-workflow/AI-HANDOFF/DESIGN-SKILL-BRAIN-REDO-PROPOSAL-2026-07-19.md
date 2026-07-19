# Design Skill (#10) + Design Brain (#11) redo — REVIEW + PROPOSAL (swap on Sean's confirm)

**Author:** Claude (Opus 4.8), after shipping 7 design-overhaul surfaces on this exact discipline.
**Status:** PROPOSAL ONLY — nothing swapped. Sean confirms before any file is replaced.
**Inputs:** `KIMI-DESIGN-SKILL-REDO-2026-07-17.md` (a complete new `SKILL.md`), `KIMI-DESIGN-BRAIN-ENHANCED-2026-07-17.md`
(a complete new `design.md`), the current `.claude/skills/swan-design-router/SKILL.md` (300L, router-style) +
`docs/ai-workflow/design-brain/design.md` (238L).

---

## 1. What each proposed rewrite IS (and how it differs from what's live)

**#10 — Design Skill.** Current `swan-design-router/SKILL.md` is a **router**: load-order, an ideation gate, a
pre-task receipt, a pattern library, and pointers to source docs. The Kimi redo is a self-contained **law**:
11 numbered LAWs (Enchantment Ratio · gold allowlist · kill-list · optics-not-creatures · Crystallize ·
two-speed motion with *mechanized* caps · Dual-Button Glow revalidated per surface · world/lens token contract ·
hard build rules · content law · anti-generic) + a 5-step decision procedure + a BUILD-EXACT blueprint format +
Gates 0-3 + the responsive matrix. It shifts the skill from "points at the taste" to "IS the taste, testably."

**#11 — Design Brain.** Current `design.md` (238L) is the Crystalline canon but, per Kimi's own top-weaknesses
list, hedges ("cap grid at ~1920 OR add columns", "pick one per form"), reverses dispersion physics in two
"legendary" gradients, and lacks z/duration/density scales. The Kimi enhance is a decisive rewrite: §1 canon
lifecycle (SOLID vs **LIQUID** proposals that expire in 14 days), §4 dispersion-is-physics, §6 a per-surface
contrast matrix with a `canon:contrast` CI trigger, §7 "one Cormorant italic beat per viewport", §8 SNAP-or-DRIFT
motion, §9 crystallized elevation/z recipes, §10 a decisive wide law (caps at 2240px) + a density lens
(comfort 44 / compact 36 / cockpit 32, `pointer:fine` only; coarse always ≥44), §13 build-exact/reversible law.

---

## 2. Validation — the 7 shipped surfaces are live proof these laws WORK

I built lens → Dashboards → Store → Home → About → Video → Contact following exactly this discipline; each
passed a Codex+Gemini triangle + the cross-cutting review. Direct evidence the proposed laws are correct:
- **Optics-not-creatures (SKILL L4 / Brain §3):** Home = code-prism facets, About = a swan-shaped *occluder*
  (the swan is bent light, never drawn), Video = channel-split + semantic glass, Contact = crystallize-submit.
  No creature was ever drawn — the law held under real pressure.
- **World/lens token contract (SKILL L8 / Brain §5):** every surface's `*.tokens.ts` reads only `--world-*`/
  `--lens-*`; the money-path audit confirmed the whole program is a pure CONSUMER of the contract (0 violations).
- **Crystallize as the one signature (SKILL L5):** all 7 consumed the shipped `useCrystallizeTransition`; no
  second celebration pattern was invented — exactly as the law demands.
- **Reversible + fail-closed (SKILL L9 / Brain §13):** the 6-gate + flag foundation is the proven scaffold;
  the review hardened it (rAF-retry contract check, absolute kill switch).
- **Dual-Button Glow + gold allowlist + kill-list + zero-hex:** de-Galaxy stayed CLEAN across all 7; gold
  appeared only as the sanctioned literal (Store pedestal, Contact seam).

**Conclusion:** the redo/enhance are not speculative — they codify what already shipped and passed review.

---

## 3. RECOMMENDATION: ADOPT BOTH, with 6 builder-validated refinements folded in first

Adopt the Kimi SKILL redo as `swan-design-router/SKILL.md` and the Kimi enhance as `design-brain/design.md`,
after adding these 6 things the 7-surface build + review proved and the drafts don't yet capture:

1. **Reduced-motion is a JS concern, not just CSS (add to SKILL L5/L6 + Brain §8).** framer-motion entrances are
   NOT stopped by the `@media (prefers-reduced-motion)` guard — disable them in JS (`initial={false}` / start
   at the settled state). This was a load-bearing bug on every animated hero (caught by the review).
2. **Name the proven reversibility scaffold (SKILL L9 / Brain §13).** `<X>Gate` = `React.lazy` + ErrorBoundary +
   an rAF-retry world-contract probe (`--world-accent` present + `[data-style-lens-shell]` ancestor; exhaustion →
   fail closed) → V-prev; a flags hook where **runtime present WINS (kill switch absolute)**, override/env only
   when runtime is absent, non-200/failed fetch → env (override can't bypass the kill). This is battle-tested x6.
3. **Content law (SKILL L10) scans COMMENTS too.** The credential contract test reddens on the literal
   `NASM-certified` even inside a code comment — never write the forbidden phrase anywhere, not even to ban it.
4. **Gemini is a design AUTHOR, not the gate (add to the references/authority note).** Gemini repeatedly directs
   deleting the token bridge / removing the gate / hardcoding `p.theme.colors.*` hex — REJECT per CLAUDE.md
   Rule 46; the token/lens architecture + fail-closed gate win.
5. **Ops note: `consult-kimi --effort medium` for design generation.** `--effort high` burns the whole token
   budget on reasoning and returns EMPTY. (And a `*/` inside a JS block comment prematurely closes it.)
6. **Consumer vs emitter boundary (Brain §5).** Design surfaces are pure CONSUMERS of `--world-*`; the Living
   Worlds lanes EMIT them. A surface must never emit/modify `--world-*`, `SurfaceLensGate`, or `AppearanceProfile`.

**Why adopt (not just keep the router):** the law-form is more testable (mechanized motion caps, gold allowlist,
`canon:contrast` CI), decisive (kills the hedged "OR"s that defer decisions to "the least qualified moment"),
and it's validated by 7 live surfaces. The current router's *good* parts (the ideation gate, the C1-C12 pattern
library, the pre-task receipt) should be PRESERVED — fold them in as a "Decision procedure" appendix, don't lose them.

---

## 4. The swap steps (for Sean to confirm — reversible)

1. Add the 6 refinements above into the two Kimi drafts.
2. `git mv`-safe replace: back up current `SKILL.md` → `SKILL.md.pre-redo`, write the new one. Same for `design.md`.
3. Keep `design.html` in sync (design.md wins on conflict — it's canonical).
4. Preserve the current router's ideation-gate + C1-C12 + pre-task-receipt as an appendix section.
5. No code changes — these are docs/skill files. Fully reversible via git.

## 5. Risks / considerations
- The redo is more OPINIONATED (kill-list rejects, "reject on sight"). That's the point, but it will reject more
  borderline work — good for quality, may feel strict. Sean's call.
- The Brain's LIQUID-canon lifecycle (14-day-expiry proposals) is new process overhead — adopt only if Sean wants
  a formal canon-change ritual; otherwise keep the SOLID canon + drop the LIQUID ceremony.
- These steer ALL future design work — worth a read-through before confirming. This proposal + the two Kimi
  drafts are the full reading (each ~260-300 lines).

**Ask:** ADOPT both with the 6 refinements (recommended) · ADOPT as-is · MODIFY (tell me what) · REJECT / keep current.
