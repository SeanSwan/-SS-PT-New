# Cross-AI Review Prompt: Design Playground Homepages

You are performing a strict senior frontend code review for SwanStudios.

## Objective
Review the 5 Design Playground homepage concepts and shared wrapper for production readiness, accessibility, UX quality, and regression risk. Focus on finding real issues, not praise.

## Scope
Review these files only:
- `frontend/src/pages/DesignPlayground/concepts/shared/ConceptWrapper.tsx`
- `frontend/src/pages/DesignPlayground/concepts/NatureWellness/NatureWellnessHomepage.tsx`
- `frontend/src/pages/DesignPlayground/concepts/CyberpunkPremium/CyberpunkPremiumHomepage.tsx`
- `frontend/src/pages/DesignPlayground/concepts/MarbleLuxury/MarbleLuxuryHomepage.tsx`
- `frontend/src/pages/DesignPlayground/concepts/HybridNatureTech/HybridNatureTechHomepage.tsx`
- `frontend/src/pages/DesignPlayground/concepts/FunAndBold/FunAndBoldHomepage.tsx`

Context: commit `97f03b0d` introduced reduced-motion global CSS, focus-visible styles, `<Link>` footer navigation, and dead-code cleanup.

## Required Review Method
1. Validate every claimed fix from `97f03b0d`.
2. Check for regressions introduced by those changes.
3. Audit unresolved gaps using this priority order:
   - Accessibility (WCAG 2.2 AA): keyboard, focus, reduced motion, semantics, decorative element handling.
   - Mobile UX: readability (16px min body/critical labels), tap target size, overflow, zoom behavior.
   - Performance: animation strategy, unnecessary effects, avoid layout thrash.
   - SPA behavior: no full page reload navigation in app routes.
4. If a claim is incomplete, mark it as a finding with evidence.

## Non-Negotiable Standards
- No blocking accessibility gaps for keyboard users.
- Reduced motion must disable both CSS and JS-driven motion.
- No hard navigation reloads for internal routes.
- No visual text sizes that are unreadable on mobile where content is actionable.

## Output Format
Return:
1. `Findings` section first, sorted by severity:
   - `P0` critical
   - `P1` high
   - `P2` medium
   - `P3` low
2. Each finding must include:
   - file path + line number
   - concrete issue
   - user impact
   - recommended fix
3. `Claim Verification` table:
   - Claim
   - Verified / Partially Verified / Not Verified
   - Evidence
4. `Patch Plan`:
   - exact minimal edits to fix remaining issues
   - safe order of implementation
5. `QA Checklist`:
   - exact tests and viewports to run (320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840)

## Constraints
- Do not change backend code.
- Do not redesign aesthetics; this is a correctness/quality review.
- Keep fixes minimal and targeted.
- Avoid speculative findings; every issue must be evidenced.

## Success Criteria
A successful review clearly identifies what is truly fixed, what is still missing, and provides a clean, actionable patch plan another AI can implement without ambiguity.
