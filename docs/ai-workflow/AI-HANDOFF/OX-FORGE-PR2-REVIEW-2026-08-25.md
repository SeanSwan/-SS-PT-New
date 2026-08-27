# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-pr2-packet.md
**Seed:** (none)
**Tokens:** 17723 in / 11547 out · **Cost:** ~$0.0000 · **Wall:** 349.1s · **finish:** stop

---

# REVIEW — Swan Forge Strangler PR #2 (forge/phase-1 @ 69551054b)

Reviewer: ox-alpha. Verdict at the bottom. No hedging.

---

## 1. The codemod — three concrete wrong-but-COMPILING inputs

The brace-aware scanner is genuinely better than the regex it replaced, and dry-run-by-default is correct. It still has silent-damage vectors the self-test does not cover:

**(a) Spread props bypass the audit entirely.**
```jsx
const cta = { text: 'Join', pulse: true, glowIntensity: 'high', ripple: true };
<GlowButton {...cta} />
```
`propNames()` blanks everything inside `{…}`, so the audit sees zero props: no DROPPED report, no UNKNOWN flag. Output: `<ForgeButton {...cta} />`. Compiles clean. `pulse`/`glowIntensity` vanish silently (destructured away), and `ripple` — not in `ForgeButtonProps` — flows through `...rest` onto the DOM `<button ripple="true">`. Dev-mode React warns; prod builds strip warnings. Silent junk DOM on the public homepage.

**(b) Matches inside strings/templates/comments get rewritten.**
```jsx
export const INTEGRATION_DOCS = `Embed: <GlowButton text="Hi" onClick={() => go()} />`;
// or: if (markup.includes('<GlowButton')) warnLegacy();
```
`openRe` matches inside the template literal; `findTagEnd` happily scans the quoted regions and returns a well-formed tag. The string content is mutated to `<ForgeButton …>` — valid JS, zero diagnostics, and any runtime logic keyed on the literal `'<GlowButton'` string silently stops matching. Same class of bug for JSX-adjacent comments.

**(c) Import hijack.** The import regex matches *any* default export named `GlowButton` from *any* path and repoints it at the computed relative ForgeButton specifier. A local test double, a second design system's button, or a mock module gets silently rebound. If the prop subsets overlap enough, it compiles and renders differently. Nothing in the transform verifies the resolved source path actually was the legacy GlowButton.

**(d) Text/children precedence was never parity-tested.** ForgeButton renders `{children ?? text}`. If GlowButton rendered `text` alongside/over children (or concatenated), `<GlowButton text="Book Now">{busy ? '…' : null}</GlowButton>` changes label behavior depending on GlowButton's actual contract — which no test in this packet pins down. The "parity test" parses the original *size table*, not the original *rendering contract*. Those are different claims.

Also worth noting (build-break class, less severe): nested `<StyledBox>` inside a converted `as={GlowButton}` mis-pairs the positional close; `import GlowButton, { GlowButtonProps }` isn't matched by the import regex, orphaning the tag rename; and the `minHeight: 44` strip regex will eat `minHeight: 440` down to a stray `0` (syntax error). All caught by the compiler — but each is another reason the "0 unknown props" claim is narrower than it sounds.

## 2. Reachability as Rule 26 evidence — not sufficient

`reachability.mjs` has concrete false-UNREACHABLE vectors, and every one of them ends with a live public surface quarantined:

- **Alias blindness:** `resolveImport` handles `@/` and relative paths only. Any file imported exclusively via another Vite/tsconfig alias (`~/`, `@components/`, `src/`) reads UNREACHABLE. `PublicWaiverPage.V2` — a *public legal surface* — sitting in the quarantine list should trigger paranoia, not confidence.
- **`import.meta.glob` blindness:** this is a Vite app. If any route/registry uses `import.meta.glob('./pages/**/*.tsx')`, the scanner sees no edges and every globbed file reads UNREACHABLE.
- **Comment-hostile lazy loading:** `import(/* chunk */ './X')` fails the `import\(\s*['"]` pattern.
- **Fail-open generator:** `gen-backlog.mjs` does `reach.get(r.path) ?? null` then tiers on `reachable !== false` — a *missing* reachability row is treated as reachable and routed into a migration tier. For a quarantine decision the default must be fail-closed.

And the positive control is weak: GolfSection=REACHABLE proves the tool finds one known-live file. It proves nothing about false negatives, which are the dangerous direction here. "Positive control passes" is necessary, not sufficient. Required: (i) reconcile the UNREACHABLE list against the built bundle — if the file's compiled content appears in `dist/assets`, it is reachable, full stop; (ii) alias resolution parsed from the actual vite config; (iii) re-run at merge time, not scan-time; (iv) any archive PR gated on a canary (delete → watch route smoke tests), never on static scan alone.

Separately: the paper trail contradicts itself. Backlog v2 prose says *"all three `animateOnRender` users proven UNREACHABLE — so no Forge entrance-animation feature is needed"*; the commit ships `.sw-btn--enter` citing *"3 reachable users => rule-of-two."* Both cannot be current. HomePage.V3/About.V3 are reachable error-fallbacks and use `animateOnRender`, so the prose is stale — but a Rule 26 evidence chain with a stale load-bearing sentence is how quarantines get justified wrongly later. Regenerate and reconcile.

## 3. Receipts — a real pixel diff catches all of this

Height/radius/weight/tracking/bg at rest is a spot-check wearing a parity costume. A before/after screenshot diff would additionally catch:

- **The glow.** GlowButton's signature box-shadow bloom, `pulse` animation, `glowIntensity` scaling — all dropped by design, invisible to a four-property receipt. The brand-defining feature of the component being strangled is unverifiable under the current receipts.
- **Sheen/shine overlays** (::after layers from the crystalline pack) and their hover sweeps.
- **Hover state** — HeroSection's capsule table encodes per-variant `hoverBorder`/`hoverBg`/`glow`. Rest-state measurement says nothing.
- **Focus ring** — per-variant focus colors (`#8B5CF6`, `#C6A84B`…) vs whatever Forge emits. A focus-visibility regression is an accessibility incident, and it is entirely unmeasured.
- **Light theme** — `crystalline-light` is referenced in the touched files; receipts appear dark-only. Pack-scoped tokens may or may not adapt.
- **Font family + the new 0.5px tracking** — Inter vs Sora metrics differ; letter-spacing widens every label; `SocialSection`'s `minWidth: 220` capsule is exactly where widened text wraps or overflows. Width/wrap/overflow unmeasured.
- **Mid-animation frames** — `.sw-btn--enter` translates 20px; a naive "after" screenshot taken post-animation hides first-paint CLS differences.

Add Playwright before/after diffs (dark + light, rest + hover + `:focus-visible`, one mid-entrance frame) for all 14 migrated CTAs, plus one E2E click-through. That last one matters most: `canActivate(state)` guards every click, the preview had no backend, and nothing in the receipts proves a single migrated button actually *navigates*. A pixel-perfect button that preventDefaults everything is the ultimate silent failure.

## 4. Geometry change — wrong authority, wrong layer

Changing `.sw-btn` defaults (48/12/56/14, weight 600→500, hardcoded 0.5px tracking) inside `packages/swan-forge/css/button.css` inverts the catalog's authority structure. The catalog owns `--sw-p-radius-md`, `--sw-p-target-min`, weight 600 — deliberate primitives. "The original Sean likes" is survivorship bias from one legacy app, and the diff *already contains the correct mechanism*: the `--sw-btn-*` var hooks. Put the Swan geometry in `packs/crystalline-swan.css`; leave core defaults catalog-owned.

Concrete damage: **Phase 1 (GolfSection) already ships on this CSS.** This PR retroactively retypes a migrated live surface (weight, tracking, heights) without re-receipting it, and — critically for §6 — it makes rollback non-inert. The "source-parsed parity test" also enshrines GlowButton's table as a permanent test constraint: nobody can ever restore catalog tokens without breaking the test. The catalog is now structurally welded to the legacy component it exists to replace. Scope creep inside a strangler PR, violating the packet's own Rule 84 framing.

## 5. Deferred/dormant — half right, half dodge

- **9 UNREACHABLE files left un-migrated:** correct call, incomplete execution. "Propose archive" with no dated archive PR, no owner, and no tombstone guard means GlowButton can never be deleted and the strangler never terminates. Worse, two entries are category errors: `GlowButton.lensTone.test.tsx` is a *test* — unreachable from app entry by definition; it needs explicit migrate-or-retire, not quarantine. And `swan-theme-utils.tsx` is called a "shared wrapper → T2" in the prose while the generated table lists it T0-dormant — the prose and the artifact disagree.
- **OptimizedSignupModal deferred:** it is REACHABLE and mounted via routes — it is the highest-conversion surface on the site, and the packet's own law says "T1 public FIRST." The Modal×Field×Auth dependency rationale is coherent, but then the law is false advertising unless the deferral is logged as an explicit Rule 84 exception with a pinned drift-lint baseline. As written it's a governance dodge: the modal keeps GlowButton alive indefinitely with no dated exit.
- **15 allow-tagged hex lines:** tagging is right; amnesty-without-expiry is wrong. Each tag needs a ticket ID and expiry, and the G4 guard needs a separate ratchet on allow-tag count (the 63→54 drift number mixes these populations).

## 6. Deploy safety + rollback

Reverting the single commit is atomic for the migration — but because the same commit mutates shared `button.css` defaults, rollback **visually regresses Phase 1's GolfSection** (weight 500→600, tracking removed). Rollback is not inert, and there is no evidence anyone has drilled it. Additional gaps: no canary/flag on the public homepage; no post-deploy screenshot-diff or console-error monitor tied to alerting; no E2E proof of activation (§3). Pure-frontend blast radius is genuinely low — but "revert the commit and hope" is not a rollback plan for the money page.

---

# VERDICT: REVISE

Direction and tooling discipline are real — brace-aware scanning, dry-run default, dropped-prop reporting, and reachability-joined backlog are all above the bar. But the codemod has silent-damage vectors, the reachability classifier is unvalidated in its failure direction, the receipts can't see the features that define the component, the geometry change breaks Phase 1 rollback integrity, and the dormant/deferred handling lacks enforcement teeth. Fixable before merge; not approvable as-is.

**Ranked fixes (file + location):**

1. **`packages/swan-forge/css/button.css`** (~lines 17–19, 36–41, and the size blocks ~99–101): move the 48/12/56/14 geometry, weight 500, and 0.5px tracking out of core defaults into `tokens/packs/crystalline-swan.css` via the existing `--sw-btn-*` hooks; restore core to catalog tokens (`--sw-p-radius-md`, weight 600, tokenize tracking). Restores Phase 1 rollback inertness and unbakes GlowButton from the catalog.
2. **`packages/swan-forge/scripts/codemod-glowbutton.mjs`** (`transform`/`rewriteTags`): refuse-and-report any `<GlowButton`/`as={GlowButton}` occurrence preceded by a spread (`{…` in attrs), any match originating inside a string/template/comment, and any `GlowButton` import whose resolved path isn't the legacy component. Add fixtures: spread, string-literal, nested StyledBox, `import GlowButton, { X }`.
3. **`packages/swan-forge/scripts/reachability.mjs`** (`resolveImport`): parse aliases from vite/tsconfig config, expand `import.meta.glob` patterns as edges, tolerate comments in `import()`. Add a mandatory reconciliation step: UNREACHABLE verdicts invalidated if file content appears in `dist` assets.
4. **`packages/swan-forge/scripts/gen-backlog.mjs`** (`tier` call site): fail closed — missing reachability row ⇒ blocked-for-review, not implicitly reachable.
5. **Backlog doc + commit message:** regenerate and reconcile the `animateOnRender` contradiction (v2 prose "no feature needed" vs shipped `.sw-btn--enter`); state explicitly that the V3 fallbacks justify the feature or remove it.
6. **Receipts:** add Playwright before/after screenshot diffs (both themes, rest/hover/focus-visible, mid-entrance frame) for all 14 CTAs + one E2E click-through proving `canActivate` lets navigation fire.
7. **Governance:** expiry + ticket on all 15 `swan-guard-allow-hex` tags with a dedicated ratchet; convert the 9 dormant files into a dated archive PR with a reachability canary test; log the OptimizedSignupModal deferral as an explicit Rule 84 exception with a pinned drift-lint baseline.
