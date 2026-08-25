# Spec receipts — Phase 2b primitives (Tabs, Toast, Pill/Badge, Skeleton, Avatar, Table, Icon-button, Select/Textarea)

**Rule-of-two status (corrected in panel round 6 — Ox §2 / GLM):** NO class below has a live `@swan/forge` consumer on origin/main yet. What exists are LEGACY ANCESTORS slated for replacement (dashboard tabs, notification toasts, client-card pills, loading skeletons, avatars, roster tables — Phase 0 inventory). Ancestors are migration TARGETS, not consumers. Every admission in this spec is therefore **PROVISIONAL pending the second live consumer**; the first strangler PR per class converts it. A provisional class may ship in the package but may not be cited as rule-of-two evidence for any variant.

## Tabs (`core/tabs.mjs` + `.sw-tabs`) — WAI-ARIA tabs
- Core-invariant: roving tabindex (only selected tab tabbable), Arrow/Home/End, automatic vs manual activation, hidden panels removed from the a11y tree. Variants (CSS only): underline (default) · `--pill` · `--vertical` (Up/Down keys).
- Acceptance: [x] reducer tests (wrap, Home/End, manual vs automatic, vertical) · [x] gallery consumes the real core · [ ] Phase 2 strangler: SS-PT dashboard tabs binding.
- Theme surface: semantics + `--sw-glow-a/b` indicator. NOT themeable: keyboard semantics, tab order, 44px targets.

## Toast (`core/toast.mjs` + `.sw-toast`)
- Core-invariant: danger sticky by default AND **eviction-immune** (cap evicts the oldest expiring toast only); warning/danger `role=alert` assertive, info/success `role=status` polite; every toast focusable (keyboard pause/dismiss, not pointer-only); Escape dismisses the FOCUSED toast by id and `dismissWithFocus` names the next focus target (never <body>); DOM order == visual order (no `column-reverse`). Binding duties: persistent region, insert-with-content, own the clock (`tick`).
- Acceptance: [x] queue/tick/pause/cap tests · [x] tone stripe + text pairs audited (gold/success/danger on elevated; badge/accent inverse under the same governed waiver as the accent button) · [x] 44px dismiss target.
- Theme surface: tone colors via semantics. NOT themeable: politeness mapping, sticky-danger default, dismiss keyboard path.

## Pill / Badge / Avatar / Skeleton / Table / Icon-button / Select / Textarea (`css/primitives.css`, no cores — no behavior)
- Pill tones: default · accent (inverse text, waived pair) · gold · success · danger (audited on elevated).
- Skeleton: shimmer driven by `--sw-motion` (freezes under reduced-motion/capture).
- Avatar: initials on primary→accent gradient (inverse text audited on primary), image variant, sm/md/lg.
- Table: `data-label` cells stack under 640px (thead visually hidden, still announced); numeric cells in data font.
- Icon-button: `.sw-btn--icon` = 44×44 square; consumers MUST supply `aria-label`.
- Select/Textarea extend `.sw-input`; textarea floor = 2× target; select arrow drawn with tokens (no images).
- Acceptance: [x] R1 no raw hex · [x] all new text pairs in the audit · [ ] Phase 2 strangler adoptions per backlog.

## Nav (`core/nav.mjs` + `.sw-nav`) — structural variants top · side, ONE core (Phase 2c)
- Core-invariant: disclosure state for the compact (<768px) menu, `aria-expanded`/`aria-controls` on the toggle, Escape closes + restores focus to the toggle, link selection closes, `aria-current="page"` marks the current item (never class-only). Variants change geometry only (bar vs rail; both collapse to the same disclosure menu).
- Rule-of-two: SS-PT dashboard sidebar + public top nav; SwanGuard newsroom top nav (planned — not counted).
- Acceptance: [x] reducer + attr tests for both variants · [x] ONE `aria-current` (first match; longest-prefix subroutes; root exact) · [x] per-variant landmark labels · [x] item schema carries optional `icon`/`group` for grouped rails · [x] gallery mounts both from the one core · [x] no `order`/reverse properties (R3) · **Not shipped, on purpose:** an icons-only collapsed rail (needs core state + a second consumer) · [ ] Phase 2 strangler: SS-PT dashboard nav binding — UDL role-tabs are URL-stateful: use the Tabs controlled contract (`selectTab` + router-held `selected`).
- Theme surface: `--sw-nav-bg` + semantics. NOT themeable: disclosure semantics, focus return, aria-current, 44px link targets.

## Auth forms (`css/auth.css`, composition — Phase 2e)
- Composes Card chrome + Field core (aria wiring) + Button (`type="submit"`) + optional provider row; sign-in / sign-up / reset share one frame. Harvest anchor: `EnhancedLoginModal` (SS-PT); rule-of-two: SS-PT login + SwanGuard admin login (planned — not counted; SS-PT signup modal is the second real consumer).
- Acceptance: [x] field-level a11y from the Field/Button cores · [x] **form-level error banner has its own core contract** (`getFormErrorAttrs` → `role="alert"` + `aria-live` + form `aria-describedby`; CSS alone is NOT the contract) · [x] links always underlined (1.4.1) and glow-b-as-text audited · [x] error banner uses audited danger-on-surface pair · [x] 44px links/targets · [ ] Modal×Field×Auth integration (EnhancedLoginModal is a MODAL) — tested together before that strangler opens · [ ] Phase 2 strangler: SS-PT login binding (T2 backlog; auth path = careful receipt, never money-path-class casual).
- Theme surface: semantics only. NOT themeable: form aria, submit semantics, target floors.
