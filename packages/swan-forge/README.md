# @swan/forge — Swan Component Forge

**One ultimate version of each component. Re-themed per site. Never rebuilt.**

Canonical component catalog for all Swan sites (SS-PT, SwanGuard, future). Ratified plan +
full decision log: `docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md`
(v0.3 — Ox Alpha + GLM 5.3 panel-reviewed). Linear: SWA-205.

## Architecture — three layers (never two)

| Layer | Owns | Lives in |
|---|---|---|
| **Headless core** | Behavior: state machines, keyboard, focus, aria. Written once; core-invariant — variants may NEVER fork focus order or keyboard semantics | `core/*.mjs` (zero-dep JS + JSDoc) |
| **Structural variants** | DOM-shape differences (dialog vs drawer, top-nav vs side-nav). First-class catalog entries under rule-of-two, sharing one core | variant classes in `css/` |
| **Token skin** | All presentation, via CSS custom properties. Per-site look = a theme pack | `tokens/packs/*.css` |

**Token tiers:** primitive (`--sw-p-*`) → semantic (locked 32-name contract, `tokens/semantic.contract.md`) → component overrides (`--sw-<cmp>-*`). Resolution: override → semantic → primitive.

## Interop rules (D2 spec — proven at Phase 1.5)

- Zero runtime: plain CSS files; no styling library ships with this package.
- Every class is `sw-`-namespaced. Consumers must NOT override `sw-*` selectors or use
  `!important` against them — the sanctioned override surface is each component's
  published custom properties (e.g. `--sw-btn-radius`). `scripts/drift-lint.mjs` enforces.
- CSS import order: Forge CSS before app CSS.
- All layout uses logical properties (RTL-ready); cores take strings as parameters.

## Usage

```html
<link rel="stylesheet" href="@swan/forge/tokens/primitive.css" />
<link rel="stylesheet" href="@swan/forge/tokens/packs/crystalline-swan.css" />
<link rel="stylesheet" href="@swan/forge/css/button.css" />
<html data-sw-pack="crystalline-swan"> …
<button type="button" class="sw-btn sw-btn--primary">Book session</button>
```

```js
// Framework bindings spread the core's attribute maps (React binding lands in Phase 1.5, inside the consumer):
import { getButtonState, getButtonAttrs } from '@swan/forge/core/button';
```

## Gates (all must pass — `npm run gate`)

| Gate | Command | What it proves |
|---|---|---|
| Tests (21) | `npm test` | Core behavior + BOTH instruments validated |
| Contrast | `npm run audit:contrast` | Every pack complete vs the 32-name contract; WCAG on resolved (pack × override) pairs; waivers print loudly |
| Drift lint | `npm run lint:drift` | No raw hex outside tokens; no pack reorder properties; consumer override/legacy-import scan. Report-only until the adoption rule lands; exceptions ledgered in `EXCEPTIONS.md` with owner + expiry |

Gallery (`gallery/index.html`, serve package root) is a **manually-run** component × pack
matrix today — `?capture=1` is the determinism hook (motion forced off) for screenshot
diffs. **The automated screenshot gate is a Phase 1.5 deliverable** (it needs Playwright,
which lives in the consumer repo — adding it here would violate the Push-1 no-new-deps
rule). Until then, treat gallery checks as manual verification, not a CI gate.

Note on `npm run gate`: the consumer-facing lint rules (R2 override scan, R4 legacy-import
adoption tracker) run only when pointed at a consumer (`node scripts/drift-lint.mjs
--consumer <dir>`), which happens from the consumer repo at Phase 1.5+. The package-local
gate exercises R1/R3/R5 over Forge's own files.

## Release & adoption

Namespaced tags `forge-vX.Y.Z`; `CHANGELOG.md` names consumers per release (kill-criteria
telemetry) and carries deprecation notices. SwanGuard pins release tags, never raw SHAs.
Adoption: strangler PRs, one component per PR; no dual existence beyond one sprint;
legacy delete-PR scheduled in the changelog.

## Known findings

- `button accent label` (white on Wing Purple) audits at **4.23:1** — below the 4.5 gate,
  WAIVED because it matches the shipped original GlowButton brand pairing. Awaiting Sean's
  design call (darken accent fill vs accept ratio). See `scripts/audit-contrast.mjs` PAIRS.
