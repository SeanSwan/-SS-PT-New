# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-phase2-packet.md
**Seed:** (none)
**Tokens:** 15774 in / 7771 out · **Cost:** ~$0.0000 · **Wall:** 250.0s · **finish:** stop

---

# Swan Forge Phase 2 — Hostile Review (ox-alpha)

**Verdict up front: REVISE.** The cores are genuinely good pure functions and the tests are real, but the packet's *claims* systematically outrun its *evidence*, and there are two outright a11y defects and one governance contradiction that cannot ship as-written. Claim-by-claim:

---

## (1) Nav "one core, structural variants" — PARTLY TRUE, WITH ONE FORK ALREADY LOADED

The disclosure contract (toggle aria, Escape, focus-restore, aria-current) is honestly shared. But:

- **The side rail's primary desktop behavior doesn't exist in the core.** `css/nav.css` line 3 promises the side variant "collapses to **icons-only** / off-canvas under 768px." Icons-only collapse is a *state* (collapsed/expanded rail with labeled↔icon-only links, `aria-expanded` on a rail toggle, persisted preference). `core/nav.mjs` has exactly one boolean (`open`) modeling a mobile disclosure. The moment someone builds the icons-only rail — which the CSS file itself advertises — they will either fork the core or bolt state on outside it. Right now this is a fork wearing a TODO.
- **`aria-current` multi-match bug:** `getNavLinkAttrs` marks current on `href === current || key === current`. Two items sharing `href: '/'` (home + logo-link pattern) both get `aria-current="page"`. Two "current pages" is an AT lie. No dedupe, no first-match rule, no test for it.
- **Duplicate landmark labels:** the doc comment says multiple navs "MUST carry distinct labels," and the default is `'Primary'` for everyone. The core could enforce this in one line and doesn't. A MUST that lives only in a comment is a convention, not a contract.
- **The equivalence test is circular.** `test/nav.test.mjs` first test loops both variants asserting *identical attributes except the class string*. That proves the attr maps don't branch — which is true by construction — and proves nothing about behavioral equivalence at the breakpoints where the variants actually diverge. It's a tautology wearing a test hat.

## (2) Rule-of-two admissions — MOSTLY ASSERTED AGAINST LINEAGE, NOT LIVE CONSUMERS

The spec's headline claim ("every class below has ≥2 in-repo consumers on origin/main **today**") is contradicted by its own body:

- **Nav:** the two counted consumers are "SS-PT dashboard sidebar + public top nav" — but the acceptance row reads `[ ] Phase 2 strangler: SS-PT dashboard nav binding`. Neither consumes `@swan/forge` nav yet. You counted *ancestors slated for replacement* as consumers. Same move for **Auth**: "SS-PT signup modal is the second real consumer" — of a class whose own strangler checkbox is unchecked. Zero live import sites.
- **Tabs/Toast/Table/Skeleton/Pill:** consumers cited as "dashboard tabs, notification toasts, roster tables, CrystallineSkeleton/FrostedBone **lineage**" — no file paths, no import lines. "Lineage" is not a consumer; it's a family tree.
- The packet *knows* the standard ("planned — not counted") and then fails it one sentence later for the classes it wants to admit. Either produce `file:line` import sites of `sw-*`/`@swan/forge` on origin/main for each admitted class, or stamp Nav, Auth, Table, and Skeleton admissions **provisional**. As written, rule-of-two is being satisfied by harvest nostalgia.

## (3) Rule 84 — NOT ENFORCEABLE AS WRITTEN; THE LEDGER IS THE SHADOW CATALOG BY DESIGN

- **No CI gate exists anywhere in the enforcement list.** The surfaces are: an agent-router step (LLM compliance only — humans committing to `frontend/src` bypass it entirely), a drift-lint that is **report-only until "ledger amnesty completes"** (a self-imposed precondition with no date and no owner — report-only linters rot into wallpaper), and pre-commit guards that cover hex/var only, not Forge-first. A rule whose deterministic layer is conditional on an unmetered amnesty is a rule enforced by memory — the exact failure mode rule 84 itself names.
- **The exception ledger *is* the shadow catalog, structurally.** "Expired rows stop suppressing automatically" — automatically *how*? Only if the linter parses expiry dates, and the linter is report-only. Meanwhile "prefer contributing a variant" requires passing rule-of-two admission — which §2 above shows is already being gamed — making the ledger row the *cheaper* path. You've built an incentive gradient toward exceptions.
- **Collision with the 20% catalog-tax cap:** rule 84 mandates immediate Forge consumption for all new UI; the tax cap caps adoption cost per sprint. When a mandated strangler blows through the cap mid-sprint, the rules give no precedence. An agent under both constraints has exactly one compliant exit: file an exception. That's the spam loop GLM 5.3's C3 was supposed to close, reopened through the budget rule.
- **"No dual existence beyond one sprint" contradicts the strangler mechanics.** Swaps are backlog-ordered, one component per PR, separate push class — and the packet's own backlog items are unchecked. If the backlog is deeper than one sprint of capacity, dual existence past one sprint is *mandated by the process* and *forbidden by the rule*. One of them yields; nobody has said which.

## (4) Generated-theme consumer — SUBSTANTIVE FOR COLOR/FONT, CEREMONIAL FOR EVERYTHING ELSE

Credit where due: `forgeChartTheme.ts` really does project tokens; a pack regen re-themes chart color and typeface. But:

- **Hardcoded design decisions everywhere else:** `fontSize: 10/11/12`, `strokeWidth: 2`, `padding: 6/28`, `strokeDasharray: '4 4'`, `cornerRadius: 6`, `duration: 800` — none tokenized. "Single-source" is roughly the color-and-font subset. A denser pack changes nothing about chart rhythm or weight.
- **The motion gate is broken-shaped:** `(forgeTheme.motion as string) === '0'`. If the generator emits numeric `0`, `'0.0'`, or `'0.2'`, reduced-motion users get 800ms Victory animations. The `as string` cast exists precisely to hide this. One-line fix, currently a silent a11y failure.
- **Chart series palette is unaudited.** `FORGE_SERIES` (glowB, glowA, gold, success, warning) adjacent-distinguishability and 1.4.11 non-text contrast on arbitrary backgrounds is not covered by `audit-contrast.mjs`, which audits *text pairs*. Five-series pies on `bgBase` are asserted, not verified.
- **`ForgeChart.tsx` hardcodes the pack:** imports `tokens/packs/crystalline-swan.css` directly in a reusable frame. Combined with R2 (consumers forbidden from restyling `sw-*`), a second site literally cannot re-theme through this component. The "re-themed per site" law is violated by the packet's own flagship consumer.

## (5) Three cores' a11y contracts — ONE REAL DEFECT, SEVERAL UNENFORCED ASSUMPTIONS

- **Toast (defect):** `enqueue()` cap eviction (`next.slice(next.length - max)`) drops the *oldest* regardless of tone. A burst of four info toasts **evicts an unread sticky danger toast** — the precise "error that vanishes before it is read" failure your own `createToast` docstring calls an a11y failure. Sticky/danger must be eviction-immune (evict oldest non-sticky, or refuse to evict ttl===0).
- **Toast:** `role="alert"` fires only if the node is *inserted* with content. Any binding that mounts an empty toast element and populates it a tick later silences the announcement. Nothing in the core contract or tests pins insertion-with-content; Playwright smoke ≠ AT verification.
- **Toast:** `handleToastKey(event)` takes no id — the binding must guess which toast Escape targets. Under-specified API = per-binding forks.
- **Tabs:** no click-selection reducer exists. `handleTabKey` covers keys; mouse/touch selection protocol is undefined, so every binding invents it — the fork vector you claim is closed. Also `hidden: undefined` vs `true` requires bindings to omit falsy attrs; a naive `hidden="${attrs.hidden}"` template emits `hidden=""` and hides the *selected* panel. Undocumented footgun. And `aria-controls` ids are emitted whether or not the consumer renders panels lazily — dangling references, unguarded.
- **Nav:** see §1 — multi-`aria-current`, unenforced label uniqueness, missing rail-collapse state.

## (6) What a strangler PR breaks on SS-PT that the packet doesn't anticipate

- **UniversalDashboardLayout role-tabs are URL-stateful.** Forge tabs have no controlled/uncontrolled story, no `onChange` contract, no route-sync. Strangler lands → deep links and refresh reset to tab 1. Regression shipped as "migration."
- **UDL sidebar is almost certainly grouped/nested with icons.** `NavState.items` is flat `{key,label,href}` — no groups, no headings, no icon slot. The strangler either flattens a hierarchy (information-architecture regression) or forks the schema. Extend the schema *before* the PR, not during.
- **EnhancedLoginModal is a modal, and auth.css is a card.** The strangler is really Modal-core × Field-core × auth-composition integration — focus trap + validation aria + submit interplay, none tested together. Packet treats it as one skin swap.
- **`.sw-auth__error` has no announcement contract.** Spec claims "all a11y from the Field/Button cores" — false for form-level errors. The banner needs `role="alert"` (or live-region) and `aria-describedby` wiring into the form; auth.css ships pixels only.
- **Border-box law misses its own victims.** `tokens/primitive.css` box-sizing list omits `.sw-avatar`, `.sw-pill`, `.sw-badge` (and `.sw-input *`). Avatar has `border: 2px` + `inline-size/block-size: 100%` on the img → content-box overflow, the *exact* 414px bug class the fix commit message describes. Badge's `min-inline-size: 22px` + padding under content-box breaks count alignment. The law has exemptions its own author didn't notice.
- **z-index anarchy:** raw `z-index: 110` (toast), `20` (shell header) vs whatever EnhancedLoginModal's scrim uses — untokened, uncoordinated; toast stack can render over or under the login modal depending on legacy values.
- **Dual-theme drift window:** charts migrate one-by-one between `chartTheme.ts` and `forgeVictoryTheme`; adjacent dashboard cards will visibly disagree for the migration's duration. No parity checklist, no "swap all charts on a surface in one PR" rule.

---

## VERDICT: **REVISE**

Not REJECT — the pure-core architecture, hostile-input tests, logical properties, and border-box finding are real work. But claims (1)(2)(3) as written would ratify governance fiction, and the toast eviction bug ships an a11y failure inside a component whose raison d'être is a11y.

### Ranked fixes (file + location)

1. **`packages/swan-forge/core/toast.mjs`, `enqueue()`** — make `ttl === 0` toasts eviction-immune; evict oldest non-sticky first; add a test: 4-info burst cannot displace a sticky danger. *Blocks merge.*
2. **`packages/swan-forge/specs/phase2-primitives.spec.md`, header + Nav/Auth/Table/Skeleton sections** — replace lineage citations with `file:line` import sites on origin/main, or downgrade those admissions to "provisional pending second live consumer."
3. **CONSTITUTION rule 84, "Enforcement surfaces" bullet** — add a CI required-check running `drift-lint --enforce` now (amnesty governs report *contents*, not enforcement); add an explicit precedence clause resolving rule 84 vs the 20% catalog-tax cap; reconcile "no dual existence beyond one sprint" with backlog depth (cap the backlog at one sprint of swaps or amend the sprint clause).
4. **`packages/swan-forge/core/nav.mjs`, `getNavLinkAttrs()` + `getNavState()`** — first-match-only `aria-current`; dev-time warning on duplicate landmark labels; add an `iconsOnly`/rail-collapse state to the core or strike the icons-only promise from `css/nav.css` header.
5. **`frontend/src/components/ui/forge/forgeChartTheme.ts`** — tokenize sizes/strokes/duration or scope the single-source claim to color+font; replace the motion check with `Number(forgeTheme.motion) === 0`; add a chart-series distinguishability audit to `scripts/audit-contrast.mjs`.
6. **`frontend/src/components/ui/forge/ForgeChart.tsx`, imports** — remove the hardcoded `crystalline-swan.css` pack import; pack selection belongs to the host page cascade, not a shared frame.
7. **`packages/swan-forge/tokens/primitive.css`, box-sizing selector block** — add `.sw-avatar`, `.sw-pill`, `.sw-badge`, `.sw-input *` to the border-box list.
8. **`packages/swan-forge/core/tabs.mjs`** — add a click-selection reducer and a controlled-`selected`/`onSelect` contract (URL-sync prerequisite for UDL); document the `hidden: undefined` omission requirement; guard or document lazy-panel `aria-controls`.
9. **`packages/swan-forge/core/nav.mjs`, `NavState.items`** — extend schema with optional `group`/`icon` before the UDL strangler PR, or the strangler forks the schema under deadline pressure.
10. **`packages/swan-forge/css/auth.css` + spec Auth section** — give `.sw-auth__error` a core-level announcement contract (`role="alert"` + form `aria-describedby` wiring) and correct the "all a11y from Field/Button cores" claim.

Fix 1–4 before merge; 5–7 before the first strangler PR; 8–10 before the UDL/login swaps open.
