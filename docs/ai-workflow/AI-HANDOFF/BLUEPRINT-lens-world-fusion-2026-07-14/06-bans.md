# 06 — BANS (violating any = REVISE at checkpoint, no exceptions)

## The firewall (from experience-mode.md §3 — restated verbatim in effect)
1. **LIVE M4 NEVER on product surfaces.** No canvas, WebGL/WebGPU, video autoplay, scroll-film,
   particle systems, shader surfaces, or audio in any dashboard/logger/progress/store/Coach/
   onboarding/auth surface. Worlds enter product ONLY as the F0 atmosphere contract: CSS
   gradients/SVG patterns/grain, ≤3 layers, ≤2 animated (transform/opacity only), poster-first,
   Still under reduced-motion. A "small" live world module still promotes the host — so it is
   banned at the boundary, not budgeted.
2. **Law A only in product.** All UI chrome stays on Crystalline Swan tokens; Law-B native
   palettes never ship under Swan chrome. Retired Galaxy-Swan hexes (`#0a0a1a`, `#00FFFF`,
   `#7851A9`) never appear as positive values.
3. **Hermes surfaces:** never lens-aware, never world-styled. Public HOMEPAGE + marketing pages:
   OUT OF SCOPE for the lens (factory's canvas). Storefront/checkout/billing/auth/onboarding: no
   atmosphere layer in this program.

## Fusion-specific
4. NO factory code imports in `core/style-lens-os/` or `adapters/style-lens-swan/` — the bridge
   is data (seed JSON + authored literals). F6 enforces by test.
5. NO remote URLs anywhere in recipes, atmosphere assets, or overlays (existing allowlist law).
6. NO free-form user CSS/colors/fonts — user input is ENUM/ID selection against the §4 contract
   only. The server rejects unknown keys; never "sanitize and accept."
7. NO new runtime dependencies (no carousel/animation/color libraries). Native scroll-snap,
   styled-components, existing stack only.
8. NO new REST surface beyond `/api/appearance/profile` (GET/PUT). No DELETE (reset = PUT
   `overlay:null`); no admin endpoints in this program.
9. Builder does NOT author the six world-style recipes' tokens — Fable does at the F5 checkpoint
   (taste is architect-side). Builder wires; architect decides aesthetics.
10. DO NOT edit: `recipeResolution.ts` beyond the F3 flag-gated addition · the six surface
    manifests beyond additive optional variants · `whatChanged.ts` · retired/quarantined skills ·
    anything under `experiments/world-factory/` history · the World Engine docs (worlds.md,
    techniques.md, psychology.md, experience-mode.md) except the ONE `--distill` section added to
    the factory SKILL.
11. DO NOT mount the Crown Header on trainer/admin/client-management dashboards in this program —
    user dashboard Home only (others are a follow-up Sean decision).
12. Overlay may not touch: button/action backgrounds, text color tokens, chart series beyond the
    accent seam, spacing/layout tokens, z-index, or anything in a host-fixed zone (logger grid
    law etc.).

## House rules (context-free restatement)
13. No MUI. styled-components only; `css`` ` helper for any shared fragment containing `${}`
    interpolation (plain-string composition crashes at mount — error #12).
14. Victory only for charts. No Recharts.
15. No hardcoded colors — `var(--token, #fallback)` with Crystalline fallbacks everywhere.
16. 44px minimum touch targets; WCAG 4.5:1 text contrast; dark-first.
17. ≤300 lines per file (budgets in 04 are tighter — those win). Blueprint header on components
    >100 lines.
18. No yoga/meditation wording anywhere (use stretching/flexibility).
19. Zero PII to LLMs or logs; payloads are ids/enums; never log profile values.
20. FKs reference `"Users"` (PascalCase). Migrations `.cjs`. Idempotency where writes repeat.
21. Commit style `type(scope): description`; NEVER `git add -A` (Rule 67 shared tree); stage
    explicit paths; Rule 42 backend audit before every push.
22. Tests extended, never forked; RED proven before implementation claims.
23. No speculative success language — every "works" claim carries its evidence paste.
