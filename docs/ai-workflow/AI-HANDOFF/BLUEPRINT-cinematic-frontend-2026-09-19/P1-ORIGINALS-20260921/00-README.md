**Status:** Specification issued from supplied evidence. Implementation acceptance is pending. Proposed paths and interfaces below are explicitly new contracts, not claims about existing files.

**Delivery**

- **A:** Retain `HomePage.V4`, its twelve sections, its route-level V3 fallback, and existing conversion flow. Add one progressively enhanced crystalline SwanMark signature.
- **B Stage 1:** Independently remove compatible dependency blockers while remaining on React 18.
- **B Stage 2:** Perform a bounded React 19 migration after Stage 1, on an isolated branch with a complete dependency cohort and rollback.

A does not depend on either B stage.

**Binding decisions**

| Concern | Decision |
|---|---|
| Capability authority | Existing `PerformanceTierProvider.tsx`, with detector extracted only as needed for testing/file length. |
| Target vocabulary | `full / lean / reduced`. |
| Existing home hook | Preserve `useAnimationTier` and `useTierFlags` names; make them provider consumers. |
| Lenis | Excluded. Native scrolling remains. |
| New home GSAP | Excluded; the selected signature does not need a pinned timeline. |
| Existing GSAP defect | Repair `PremiumParallax` lifecycle separately. Do not mount it on Home merely to justify the repair. |
| Signature | Existing SwanMark geometry, crystalline treatment, one 720ms rotational reveal. |
| R3F | One lazy scene, R3F 8 on React 18. |
| Drei | No new dependency; this scene does not require its helpers. |
| Motion tokens | TypeScript source of truth with generated CSS projection. |
| Media | Static hero composition remains complete; no new video, remote model, HDRI, or texture request. |
| Conversion | Preserve the existing verified orientation-opening flow. |
| Backend | No endpoint, model, migration, or data-contract changes. |

**Scope limits**

No dashboard redesign, Framer-wide rewrite, global animation scheduler, section-list replacement, new metrics, new form, scroll hijacking, production-data tests, or repository cleanup.

**Path convention**

Existing paths are those supplied in the packet. Files marked **NEW** are proposed additions. Missing export names, mount locations, asset identities, and package versions are resolved only through the bounded intake in `04-build-order.md`; builders must not guess them.

**Release authority**

Implementation evidence goes through Gemini review, Codex hostile review, and Fable’s final decision under the supplied project rules. This package is advisory, not a commit or deployment approval. No push to `main` is authorized here.

**Documentation coverage**

Architecture, flows, wireframes, contracts, slices, bans, checkpoints, and tests are supplied below. Database ER diagrams are genuinely inapplicable: this work changes no persisted entities or columns.
