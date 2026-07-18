# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BLUEPRINT-SET-MASTER-REVIEW-REPORT-2026-07-17.md
**Seed:** (none)
**Tokens:** 2707 in / 2238 out · **Cost:** ~$0.0807 · **Wall:** 88.8s

---

UNSOUND

### Cross-surface contradictions
- **Contact has three statuses:** SEND-BACK in §1, SHIP-WITH-CHANGES in §4, and “near-ready” in §5. The claimed “4 SEND-BACK surfaces” is therefore not a stable set.
- **Cover/Gallery is likewise called SEND-BACK and SHIP-WITH-CHANGES.** Those imply different gates.
- **“Lens unblocks everything” is overstated.** Tokens and one transition do not supply the missing CTA hierarchy, responsive composition, content states, asset direction, performance budgets, or backend behavior.
- **“Build-exact Store” conflicts with “design-only.”** A reversible production surface is not build-exact without routing, data/error/loading states, analytics, accessibility, and flag behavior being specified.
- **Shared Crystallize is placed under `SL/…`, yet consumed by unrelated surfaces.** That creates ownership/dependency inversion. It belongs in a versioned shared design-system package.
- The report claims synthesis of **15 blueprints**, but provides no 15-item traceability/readiness matrix. Omissions cannot be detected from this consolidation.
- “Crystallize everywhere” risks violating the stated Enchantment Ratio and calm-dashboard law. A shared primitive does not justify using the effect for every milestone, submit, gate, and reveal.

### Build-order holes
1. **Do not build the full Swan Lens first merely to obtain foundations.** First extract and approve:
   - token schema/package,
   - Crystallize contract/package,
   - compatibility aliases,
   - accessibility and motion tests.
2. Lens feature work (`worldId`, World tab) is not a prerequisite for Dashboard, Store, or marketing surfaces and should not block them.
3. Dashboard-before-Store may be reasonable product prioritization, but it is not established by architectural dependency.
4. Cover, Contact, and Photography are not “near-ready” while resumable upload, anti-spam/rate limiting, watermark generation, decomposition, and response contracts remain unresolved.
5. Backend/API contracts, migrations, observability, and rollback compatibility must precede the UI slices that depend on them.
6. Skill/Brain approval is deferred until last even though they allegedly encode rules governing all preceding implementation. Either approve them first or explicitly make them non-authoritative.

### Reversibility is not coherent yet
- **Build-time Vite flags and instant rollback are mutually incompatible.** A build-time flag requires another artifact/deploy.
- **Lazy side-by-side loading requires a runtime selector.** Otherwise compile-time replacement/tree-shaking may remove the unused branch; lazy loading only prevents initial download, not deployment of both versions.
- Define two distinct modes:
  - build-time release selection: smaller artifact, redeploy rollback;
  - runtime remote-config selection: both chunks deployed, immediate rollback.
- Store’s ErrorBoundary is not a complete fail-closed standard. Error boundaries do not catch event-handler, async, API, SSR, or corrupted persisted-state failures.
- The fallback must itself be lazy-loadable and verified compatible with current APIs, schemas, URLs, storage, and analytics.
- “Additive-only backend” does not guarantee reversibility. Dual writes, irreversible side effects, jobs, uploads, progress records, and changed semantics require forward/backward compatibility and explicit rollback windows.
- Runtime-config behavior is unspecified: bootstrap failure, caching/TTL, stale clients, targeting, audit trail, kill switch, and version skew.

### Token-sheet-as-single-source flaws
- A Lens-owned stylesheet is the wrong authority. Use a standalone, versioned token artifact consumed by Lens and all surfaces.
- `--lens-*` plus manually projected `--world-*` creates **two editable representations**, not one source. Generate aliases from a typed canonical schema and test equality.
- Raw palette tokens are insufficient. The system needs semantic roles and allowed pairings: text, icon, control, border, focus, status, decorative-only, interaction states, themes, and contrast constraints.
- Define ownership and migration for existing surface-local tokens, JS/theme objects, SVG/canvas colors, emails, charts, and non-CSS consumers.
- Add schema/versioning, deprecation policy, generated CSS/TS outputs, contrast tests, and visual-regression coverage.
- The de-Galaxy regex is not a real enforcement boundary. It misses shorthand/alpha hex, modern `rgb()` syntax, percentages, aliases, gradients, SVG/assets, canvas values, and perceptually equivalent colors. Use AST/token linting plus asset and visual review; “banned in spirit” cannot be enforced by grep.

### SEND-BACK re-pass does not resolve the four surfaces
- It resolves only two inputs: token values and a transition primitive.
- The original critique also names **signature moment and CTA hierarchy**; neither follows automatically from importing Crystallize.
- About’s caustic logomark and Video’s Refraction System are separate design/mechanics problems, not implementations of the generic overlay.
- Home still needs hero asset licensing/fallbacks, responsive composition, CTA hierarchy, loading behavior, and performance budgets.
- Contact still needs form-state design, API ownership, abuse model, idempotency, Retry-After UX, and the contradictory verdict resolved.
- Video still needs progress semantics, completion authority, offline/multi-device behavior, gate accessibility, and endpoint contracts.
- A “focused re-pass” needs explicit deliverables and acceptance gates: final layouts, responsive/state matrices, CTA hierarchy, token mapping, Crystallize usage contract, reduced-motion frame, accessibility/performance budgets, API contracts, and rollback plan.

**Required gate correction:** approve the standalone foundations first, normalize every surface to one readiness taxonomy, then re-pass all SEND-BACK/near-ready surfaces against concrete acceptance criteria. Do not green-light the §5 build order as written.
