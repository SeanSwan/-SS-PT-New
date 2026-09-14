# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-phase2-packet.md
**Tokens:** 15686 in / 15338 out (reasoning: 11692) | total 31024
**Wall:** 274.9s

---

# Swan Forge Phase 2 — Hostile Review (GLM 5.3)

## 1. Cores vs. WAI-ARIA

### tabs.mjs
The roving tabindex, wrap, Home/End, and dual activation modes match APG. Real failure modes that remain:

- **T1 — Sanitized-ID collisions.** `safe()` maps `a b` → `a_b` and `a/b` → `a_b`. Two tabs whose keys collide after sanitization produce duplicate DOM ids, so `aria-controls`/`aria-labelledby` become ambiguous — AT announces the wrong tab for the panel, and any id-resolution tool flags it. `getTabsState` dedupes raw keys only. The test file proves sanitization works on one hostile string; it does not prove it's injective.
- **T2 — Enter/Space contract is a binding trap.** The reducer returns `preventDefault: true` + `select` for Enter/Space in *both* modes. On a native `<button>`, preventing default on keydown suppresses the native `click` that a normal React binding wires via `onClick`. A binding that does the natural thing (`onClick` → select) plus applies the reducer gets double-select; a binding that applies `preventDefault` but forgets to apply `select` loses keyboard selection entirely. Nothing in the core or spec states the composition rule ("apply `select` OR wire click, never both"). This is exactly the class of fork the core-invariant claims to prevent.
- **T3 — Pill variant is inexpressible through the sanctioned API.** `getTabListAttrs` emits `sw-tabs--{orientation}` only. `--pill` requires the binding to hand-concat a class — "variants are CSS classes only" is already drifting at the attr-map boundary, in Phase 2.
- Minor: focus `box-shadow` on `.sw-tab` will be clipped by `overflow-x: auto` on `.sw-tabs` when the list is scrolled — keyboard focus ring disappears on offscreen-edge tabs. (See systemic forced-colors finding, F1.)

### toast.mjs
- **T4 — Sticky-danger law is violated by the queue cap.** The spec says danger toasts "must be dismissed." `enqueue` drops the *oldest* item when `max` is exceeded, with no protection for `ttl === 0`. Four polite toasts queued + one new danger → a sticky danger is silently evicted. The core contradicts its own stated invariant in ~6 lines.
- **T5 — Escape-dismiss strands focus.** `handleToastKey` returns `dismiss`; nothing in the core, spec, or tests defines where focus goes when the *focused* toast is removed. Focus falls to `<body>`; keyboard users are dumped. Nav got an explicit `restoreFocus` contract — toast didn't. Asymmetric rigor.
- **T6 — Live-region insertion pattern is Safari/VO-fragile.** Each toast is its own freshly-inserted `role=alert`/`status`. Chrome/Firefox announce inserted populated alerts; VoiceOver+Safari has a long history of silence unless the live region pre-exists. The robust pattern (persistent polite + assertive sibling regions, mutate children) isn't even documented as a binding requirement.
- **T7 — Pause is pointer-privileged.** Pause-on-hover/focus, but auto-dismiss toasts without a dismiss button are unreachable by keyboard, so keyboard/AT users cannot pause anything. Not addressed anywhere.

### nav.mjs
- **N1 — `aria-current` is exact-match.** `item.href === state.current` fails on subroutes (`/progress/week-2` vs `/progress`): current-page marking evaporates on every child route. Either support prefix matching or document a router contract that passes the exact matched href — currently neither exists.
- **N2 — Duplicate default landmark labels.** "Multiple navs MUST carry distinct labels" is a comment; `getNavAttrs` defaults to `'Primary'` for everything. The shell exists specifically to host a top nav AND a side rail — the flagship composition is the likeliest place to get two "Primary" landmarks.
- **N3 — Tab-out of an open menu leaves it open.** Escape closes; wandering focus doesn't. Acceptable per APG disclosure (optional), but unstated — decide and document.
- `restoreFocus` on Escape is specified but there's no test or contract for focus-into-menu on open; fine per disclosure pattern, just note it's intentional.

## 2. CSS

- **F1 — Systemic forced-colors hole (worst CSS finding).** Every interactive skin (`tabs.css` `.sw-tab:focus-visible`, `.sw-tabpanel`, `nav.css` links/toggle, `toast.css` dismiss, `auth.css` links) does `outline: none; box-shadow: …`. Under Windows High Contrast / `forced-colors: active`, box-shadows are suppressed and you removed the outline: **no focus indicator at all**. Zero `forced-colors` mentions across the entire packet. `prefers-reduced-motion` got a law; the one that blinds keyboard users didn't.
- **F2 — R3 breach in toast.css.** `.sw-toast-region { flex-direction: column-reverse }` decouples DOM order from visual order: newest toast (last in DOM) renders at top; Tab order runs bottom-to-top visually while every other surface tabs top-down. nav.css boasts "No `order`/reverse (R3)" in its header — toast.css ships a reverse in its first rule, uncommented. Either prepend-newest + normal column, or write the R3 exemption down.
- **F3 — RTL breaks in two places.** (a) `.sw-select` (primitives.css): `padding-inline-end` reserves space on the correct (inline-end) side, but `background-position: calc(100% - 18px)` pins the arrow to the *physical* right — in RTL the arrow sits opposite the reserved space. (b) `.sw-nav--side … .sw-nav__link.is-current { box-shadow: inset 3px 0 0 }` — physical left; in RTL the rail's active stripe is on the far edge. The "logical properties day one" claim in primitive.css's own header is falsified two files away.
- **F4 — Border-box law reaches host content.** `.sw-card *`, `.sw-auth *`, `.sw-shell *` etc. apply `border-box` to **consumer-projected slot children**. Any host element inside a Forge card/shell that was sized assuming content-box (`width: 200px` + border expecting 202px outer) silently changes size. It can break a host page — yes. Also the class list is already incomplete: `.sw-select`/`.sw-textarea` (if used without `.sw-input`) and descendants of `.sw-tabpanel` (panels are siblings of, not children of, `.sw-tabs`) are uncovered — the 414px overflow class of bug can recur inside tab panels, the exact scenario the law was written for.
- **F5 — 44px floors: honest where claimed** (tab, nav link, dismiss via min-block-size with honest negative margins, auth links, icon-btn). `.sw-avatar` at 40px and pills at 28px are declared non-interactive — fine until a consumer wraps an avatar in a link; no guidance exists.
- **F6 — Reduced-motion is mostly disciplined** (`--sw-motion` multiplication everywhere, explicit media blocks in toast/nav), but tabs.css's media block zeroes only the `::after` transition, not `.sw-tab`'s own color transitions — harmless but inconsistent; and `sw-shimmer`'s `1.4s / max(motion, 0.001)` trick keeps a nominally-running animation (effectively frozen — acceptable, but a plain media-query kill would be cleaner).
- **F7 — Shell/cluster/table responsiveness: sound.** Cluster's `minmax(min(280px,100%),1fr)` is correct; table stacking with visually-hidden thead + `data-label` is correct and the "still announced" claim is honest (no `display:none`). Nit: `clip: rect(0 0 0 0)` space-separated is non-conformant legacy syntax; use `clip-path: inset(50%)`. Nit: `100dvh` with no `100vh` fallback line.
- **F8 — Auth "no new behavior" is half-true.** Field-level aria comes from field.mjs — fine. But `.sw-auth__error` is a **form-level** error banner with no live-region contract anywhere (no core, no spec line requiring `role="alert"`), and `.sw-auth__link` is color+weight-only until hover — WCAG 1.4.1 in a prose context ("Forgot password?"). The composition ships CSS whose most failure-prone semantics are left to memory — the exact failure mode rule 84's own preamble names.
- Contrast: `.sw-auth__link` uses `--sw-glow-b` — a *glow* token as body text color. If that pair is in the audit, the packet doesn't show it (see §5).

## 3. Chart theme as first projection consumer

The single-source claim is **now substantively true for color**: every fill/stroke traces to `forgeTheme.*`; `alpha()` introduces no literals; verified by eye across the file. Remaining drift:

- **C1 — The motion gate is a cast away from breaking.** `(forgeTheme.motion as string) === '0'` — the cast exists because the author wasn't sure of the generated type. If the generator emits numeric `0`, this comparison is false and reduced-motion packs get 800ms Victory animations. Either the type is a string (delete the cast, add a compile-time check) or this is a live WCAG 2.3.3 bug. Unverifiable from the packet either way — which is itself the finding.
- **C2 — Typography tokens not projected.** `fontSize: 10/11/12` are hardcoded px while the pack ships `--sw-p-text-*` + `--sw-text-scale`. Chart labels will not respond to user font scaling or pack text scale — color is single-sourced, type is not. Same for `cornerRadius: 6` vs `--sw-p-radius-*`.
- **C3 — `alpha()` duplicates the legacy chartTheme helper** — two implementations to keep in sync across the entire strangler window.
- `ForgeChart.tsx` is honest: no theme injection (can't), re-export enables the one-line swap, SafeChart reuse is real. Nit: `aria-label={title ?? chartName}` on the article duplicates the visible `<h3>` announcement.

## 4. Rule 84

Well-constructed overall (README-as-live-inventory self-heals the class list; expiry-with-teeth beats comment exceptions). Hostile findings:

- **R84-1 — Self-service exceptions.** A ledger row requires path/rule/owner/expiry/reason — no second-party approval. Any lone agent can ledger out of a MANDATORY rule. The ledger is called "the shadow catalog" without a cap, review gate, or expiry-length bound.
- **R84-2 — "Modified legacy" loophole.** The rule binds *new* UI; existing components migrate "in backlog order." An agent can indefinitely edit a legacy Button (new variants, new props, new pixels) and claim it's neither new UI nor their turn in the backlog. Nothing forbids growing legacy components.
- **R84-3 — Enforcement surface ≠ rule scope.** "EVERY agent building UI in a Forge consumer repo" vs. `drift-lint --consumer frontend/src` and a router step evidenced nowhere in this packet (the review scope claims "router step" was verified; no router artifact is included). Lint is also report-only until an amnesty whose completion date is unstated. Today the rule's deterministic layer is aspirational.
- **R84-4 — Stale parenthetical.** "today: Button, Card, Input/Field, Modal/Drawer" is already false within the same packet (Tabs/Toast/Nav/shell/auth/chart shipped). README pointer saves it, but the parenthetical will be copy-pasted around.
- No contradiction with R1–R4 observed; the trailing "Dual-Pass Fix/Review Discipline" section is cut off mid-document — cannot assess, and the packet should not have truncated the constitution it asks me to rule on.

## 5. Tests & claims vs. evidence

Gaps: no test for ID collisions (T1); no test that the cap protects sticky toasts (T4 — it would fail); no focus-after-dismiss test (T5 — no contract to test); no nav subroute/current test (N1); no duplicate-label guard (N2); zero automated CSS assertions (44px, reduced-motion, RTL, forced-colors) — "414px: no overflow" is a manual claim with no regression test; binding composition (T2) untested below gallery-smoke level.

**Claims the packet's evidence does not support:** `audit PASS (2 governed waivers…)` — the audit-contrast.mjs diff (+5 lines) and waiver registry are not included; `theme:check OK` — script not shown; the entire gallery Playwright smoke — gallery/index.html content is listed in commit stats but not in the packet; `vitest forge/ 20/20` — no vitest files present; `forge 53/53` — only 12 node tests shown (Phase 1 presumably supplies the rest); README "+14/+6" — the live-inventory claim rule 84 depends on is unverified; package.json export-map additions for the new css/core files — unverified.

---

# VERDICT: **REVISE**

Strong core discipline and honest spec checkboxes, but: a systemic forced-colors focus failure, an R3 reverse shipped while nav.css brags compliance, a core that violates its own sticky-danger law, two RTL breaks under a "logical properties day one" banner, a fragile motion gate on the flagship single-source claim, and a packet whose central verification artifacts (audit, gallery, router, README) are asserted, not shown.

## Ranked fixes

1. **F1** — `packages/swan-forge/css/*.css` (every `:focus-visible` rule): add `@media (forced-colors: active)` outline fallbacks (e.g., `.sw-tab:focus-visible { outline: 2px solid Highlight; outline-offset: 2px }`). Cross-file, keyboard-blind users today.
2. **T4** — `core/toast.mjs` `enqueue()`: never evict `ttl === 0`; drop oldest expiring item instead, + test.
3. **F2** — `css/toast.css` `.sw-toast-region`: drop `column-reverse`; specify prepend-newest in the binding contract, or document an R3 exemption with focus-order mitigation.
4. **T5** — `core/toast.mjs`: define focus-return/next-toast contract for Escape dismissal (mirror nav's `restoreFocus`).
5. **C1** — `frontend/src/components/ui/forge/forgeChartTheme.ts`, last line: pin `motion`'s generated type (string) at compile time or compare `Number(forgeTheme.motion) === 0`; add a unit test.
6. **F3** — `css/primitives.css` `.sw-select` (logical background-position / arrow via inline-start math or a mask) and `css/nav.css` `.sw-nav--side` current-link (inline-start stripe via border or pseudo).
7. **F4** — `tokens/primitive.css`: add `.sw-select`, `.sw-textarea`, `.sw-tabpanel *` (or move panels inside the law); document that slot content inherits border-box, or scope `*` to `:where()` children of Forge-internal wrappers.
8. **T1** — `core/tabs.mjs`: reject/dedupe colliding sanitized ids in `getTabsState`, + test with `'a b'` vs `'a_b'`.
9. **N1/N2** — `core/nav.mjs`: prefix-match or documented router contract for `current`; distinct-label requirement made structural (shell spec) or defaulted per variant.
10. **F8** — `specs/phase2-primitives.spec.md` auth section + `css/auth.css`: require `role="alert"` on `.sw-auth__error` as a binding receipt; always-underline `.sw-auth__link` in prose; add the glow-b-as-text pair to the audit.
11. **Evidence** — include in the next packet: audit-contrast diff + waiver rows, gallery source, router step, README inventory, package.json exports, and an automated 414px/regression test. Claims without artifacts don't count.
12. **R84-2/R84-3** — rule 84 text: close the "modify legacy" loophole (edits to legacy components of shipped classes require a ledger row too); date the `--enforce` arming; require reviewer sign-off on ledger rows.
