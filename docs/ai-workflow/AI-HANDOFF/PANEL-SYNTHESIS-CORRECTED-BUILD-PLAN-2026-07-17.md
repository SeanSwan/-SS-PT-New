# Panel Synthesis + Corrected Build Plan (2026-07-17)
**The big-three panel (Fable 5 · Sol 5.6-high · Kimi K3-design) reviewed the Master Blueprint Review Report. This synthesizes their three verdicts into ONE corrected go-forward. Panel cost ~$0.31.**

## The three votes
- **Fable 5 (Final Decider): GO-WITH-CHANGES — "Build."** Keystone endorsed; 3 cheap pre-flight fixes; build-order tweaks.
- **Sol 5.6-high: UNSOUND — "Do not green-light the §5 order as written."** Caught real plan-rigor holes.
- **Kimi K3-design: ACCURATE-WITH-CORRECTIONS** (internal merit) — but flagged **UNVERIFIABLE source-fidelity** because the 15 blueprints weren't attached to the panel (no `--seed`). Confirmed the same contradictions Sol found.

**Honest meta-limitation (Kimi's catch):** the panel reviewed the *synthesis report*, not the 15 blueprints. So it validated the **strategy** and caught the **report's own flaws** — but did NOT source-verify that the report faithfully represents each blueprint. A future strict pass should attach the blueprints. This does not block the strategy verdict.

## Verdict (synthesized): GO on the vision — but run a short FOUNDATIONS + PLAN-FIX slice before the first surface build.
All three endorse the **direction** (build the design system; Lens → Dashboards → Store; token + Crystallize centralization). The two dissents are about the **plan's rigor**, and Sol and Kimi largely agree with each other. Fold their corrections and it's a clean GO.

## The corrected plan — Slice 0 (foundations + plan-fix) BEFORE any surface build
1. **Fix the readiness taxonomy (one status per surface).** SEND-BACK = **Home, About, Video** only. **Contact = SHIP-WITH-CHANGES** (mechanical). **Cover/Gallery = SEND-BACK** (Core-Loop rewire is structural → moves to the re-pass wave, NOT wave 4). Relabel "build-exact NOW" as **"decision-complete; gated on lens tokens"** for Dashboards/Store (Kimi's decision-completeness axis) — they're only buildable *after* the lens tokens land.
2. **Author the token schema + Crystallize contract as STANDALONE, dependency-free, versioned artifacts — DURING the lens build.** This reconciles Fable (don't float a pre-artifact with no consumer) and Sol (a lens-owned sheet is dependency inversion for 14 surfaces): **do both** — the artifacts are authored/validated by the lens as first consumer, but published as their own package so marketing surfaces import the tokens, not the lens. Generate `--world-*` aliases from the typed canonical schema and test equality (no two editable representations). Publish the **Crystallize interface contract** (props, duration budget, and the reduced-motion end-state) — reconcile the §2 "instant facet+opacity" vs §3F "designed static frame": **the static frame IS the end-state of the instant swap.**
3. **Real de-Galaxy enforcement — NOT grep.** grep is insufficient (all 3 agree). Build a token/AST lint that catches: hue-window (cyan ~170–190°, purple ~255–280°, sat >60%) not exact literals; **named colors `aqua`/`cyan` (= exact #00FFFF, currently sail past)**; shorthand/8-digit hex, space-separated `rgb(0 255 255 / .5)`, percentage channels, `hsla()`; SVG `fill=`, canvas `addColorStop`, and `.theme.ts` objects; a **binary-asset perceptual review** (a starfield PNG passes every grep — the "Observatory" risk); **gate-zero self-application** to the lens's own 12 new `--world-*`; and an **explicit ruling that the lens's pale focus-ring `#8FE8FF` (≈14:1 on `#060B16`) is NOT the banned neon-cyan** so the window gate doesn't flag the keystone.
4. **Text-legal vs decorative-only is an ENFORCED LINT RULE**, not prose: text styles may only reference text-legal token slots. (WCAG math verified by Kimi: `#7851A9` on `#060B16` = 3.33:1, fails 4.5:1.)
5. **Ratify TWO reversibility modes** (Fable B3 + Sol + Kimi): (a) build-time release selection = smaller artifact, redeploy rollback; (b) runtime remote-config = both chunks deployed, instant rollback. **Money/PII surfaces (Store, Contact backend) require mode (b).** ErrorBoundary alone is NOT fail-closed (misses async/API/handler/persisted-state); the fallback must be lazy-loadable + API/schema-compatible. "Additive-only backend" ≠ reversible when there are dual writes/uploads/jobs — spec forward/backward compat + rollback windows.
6. **Resolve Skill/Brain authority + Sean's role** (Sol + Kimi): the redone Skill + enhanced Brain encode the rules everything is built to — either approve them **first**, or explicitly mark them **non-authoritative** during the build. State whether Sean is a **4th decider** above the panel or out-of-band. (Sean IS the human owner above all models — recommend: Sean ratifies the Skill/Brain candidates before Slice 1, making them authoritative.)
7. **Backend/API contracts precede their UI slices** (Sol): name every new backend surface's contract first — Contact (anti-spam + 429 + `200{id}/422/429+Retry-After`), Video (watch-progress), Cover (name the upload protocol: **tus vs S3 multipart** — don't delegate it), Photography (server-side watermark rendition).

## Build order (corrected, all 3 reconciled)
- **Slice 0:** the 7 foundations/plan-fixes above.
- **Slice 1: Swan Lens** (authoring the token + Crystallize artifacts as its first consumer) + the de-Galaxy lint in CI (Fable B2: day zero, repo-wide).
- **Slice 2: Dashboards** (consume lens tokens/Crystallize).
- **Slice 3: Store** (StoreV4 gate, mode-b reversibility, money path untouched).
- **In parallel from the moment the token sheet freezes** (Fable's key tweak; design ≠ build pipeline): the **re-pass of Home / About / Video** — each with FULL deliverables (signature moment + CTA hierarchy + layouts + state matrices + reduced-motion frame + API contracts), because tokens + Crystallize alone do NOT unblock them (Sol + Kimi). About = light-caustic swan logomark; Video = refraction system — separate design problems.
- **Then:** Contact (mechanical, exercises the backend-flag + gate pattern end-to-end) → Cover/Gallery (Core-Loop rewire, re-pass-class).
- Photography whenever its decomposition + backend land.

## Bottom line for Sean
The vision is GREEN. The panel (for ~$0.31) hardened the *plan* — it caught that the report contradicted itself on statuses, that "tokens unblock the marketing pages" was oversold, and that a grep gate would let the retired palette through the side door. Run Slice 0, then build. This corrected plan supersedes §5 of the Master Report and the build order in the fresh-agent handoff.
