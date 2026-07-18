# KIMI Blueprint Set — master index (2026-07-17)
**The complete set of Kimi-K3-authored, build-exact, full-stack, reversible blueprints for the SwanStudios design surface. Authored this session at Sean's direction. Status: COMPLETE — pending free-triangle → paid-Village review → build.**

> **Standard every blueprint follows:** build-exact (a builder builds Kimi's design verbatim, zero decisions), FULL-STACK REAL (real API/model binding, new-backend surfaces flagged, NO mocks), REVERSIBLE (next-version component + feature flag + additive-only backend). Grounded on production main `96ac6bd3d`. Kimi = architect; Opus = orchestrator/verifier only (injects zero design decisions).

## The blueprints

| # | Surface | Doc | Lines | Verdict |
|---|---|---|---|---|
| 1 | **Swan Lens** (foundation — everything ties to it) | `KIMI-SWAN-LENS-BLUEPRINT-2026-07-17.md` | 305 | Lens 2.0 "Crystalline Core" — full re-architecture |
| 2 | **Cover / Gallery** (user dashboard) | `KIMI-COVER-GALLERY-REFACTOR-2026-07-17.md` | 99 | SEND-BACK — Behance-clone on a progress product |
| 3 | **Store** | `KIMI-STORE-BLUEPRINT-2026-07-17.md` | 504 | Sells flat; 1027-line monolith w/ Galaxy DNA — full refactor (design only, payment path fixed) |
| 4 | **Video Library** | `KIMI-VIDEO-BLUEPRINT-2026-07-17.md` | 98 | refactor |
| 5 | **Photography Gallery** | `KIMI-PHOTOGRAPHY-BLUEPRINT-2026-07-17.md` | 104 | refactor + decompose the 2219-line monolith |
| 6 | **Dashboard System** (admin/trainer/client/user) | `KIMI-DASHBOARDS-BLUEPRINT-2026-07-17.md` | 539 | shell spine + 4 role densities, lens-tied |
| 7 | **Homepage** | `KIMI-HOME-BLUEPRINT-2026-07-17.md` | 91 | refactor + royalty-free backup hero (video not RF) |
| 8 | **About** | `KIMI-ABOUT-BLUEPRINT-2026-07-17.md` | 81 | refactor — codify the Crystalline identity + mission |
| 9 | **Contact** | `KIMI-CONTACT-BLUEPRINT-2026-07-17.md` | 85 | SHIP-WITH-CHANGES + decompose 1193 lines |
| 10 | **Design Skill redo** (swan-design-router) | `KIMI-DESIGN-SKILL-REDO-2026-07-17.md` | 300 | new SKILL.md in Kimi's vision (CANDIDATE — review before swap) |
| 11 | **Design Brain enhance** (design.md) | `KIMI-DESIGN-BRAIN-ENHANCED-2026-07-17.md` | 258 | enhanced brain (CANDIDATE — review before swap) |
| 12 | **Original site-transformation prompt review** | `KIMI-ORIG-SITE-PROMPT-REVIEW-2026-07-17.md` | 171 | "ops brief wearing a design brief's clothes" — needs the design layer |
| — | **Living World Generator** (shipped earlier) | `SWAN-LIVING-WORLD-GENERATOR-MASTER-PROMPT-2026-07-17.md` | 175 | committed `b3824d692` |
| — | **World Atmosphere enhancement** | `KIMI-WORLD-ATMOSPHERE-ENHANCED-2026-07-17.md` | 75 | → World-Engine build lane |

## Cross-cutting threads to verify (the free-triangle + Village focus)
- **Shared-token consistency:** every surface ties to the Swan lens via `--world-*`/`--lens-*`; no surface hardcodes color; retired Galaxy-Swan (#0a0a1a/#00FFFF/#7851A9) purged everywhere (Store, Photography "Cosmic Gate", Cover "Observatory" flagged as carriers).
- **The Crystallize** appears as the one signature moment across achievement surfaces (dashboards, cover/gallery).
- **Two-speed law:** cinematic on marketing (home/about/contact/store/video/photography); calm in-app (dashboards).
- **Reversibility discipline:** every surface = next-version + feature flag + additive-only backend.
- **Backend-binding completeness:** every "new feature" names its API/model or flags a new backend surface (no mocks).
- **Optics-not-creatures + rainbows-as-light** consistent across all.

## Next steps (Sean's decided sequence)
1. ✅ Finish the set — DONE.
2. **Free triangle** (Claude+Codex+Gemini) across this set — cross-surface coherence + top risks. (Launcher down → API path.)
3. **Wire roster** (Fable + Sol-5.6-high + Kimi design-slot) into `validation-orchestrator.mjs` — careful slice + Codex review.
4. **Cost estimate → Sean confirm → paid ~19-brain Village.**
5. Build (fresh branch off origin/main; per-surface, reversible).

## Spend
Kimi K3: ~$5.2 across ~18 calls this session (incl. the choke tax now eliminated by medium-effort + 100k-cap + configurable-timeout fixes to `consult-kimi.mjs`). All design-scoped, PII-free. Nothing paid beyond Kimi; the Village is not fired.
