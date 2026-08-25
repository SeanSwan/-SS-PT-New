# Spec receipts — Phase 2b primitives (Tabs, Toast, Pill/Badge, Skeleton, Avatar, Table, Icon-button, Select/Textarea)

Rule-of-two admission evidence (plan §2/§11.A3): every class below has ≥2 in-repo consumers on origin/main today (dashboard tabs, notification toasts, client-card pills, loading skeletons, trainer/client avatars, roster tables — see FORGE-PHASE0-INVENTORY + the data-card cluster harvest).

## Tabs (`core/tabs.mjs` + `.sw-tabs`) — WAI-ARIA tabs
- Core-invariant: roving tabindex (only selected tab tabbable), Arrow/Home/End, automatic vs manual activation, hidden panels removed from the a11y tree. Variants (CSS only): underline (default) · `--pill` · `--vertical` (Up/Down keys).
- Acceptance: [x] reducer tests (wrap, Home/End, manual vs automatic, vertical) · [x] gallery consumes the real core · [ ] Phase 2 strangler: SS-PT dashboard tabs binding.
- Theme surface: semantics + `--sw-glow-a/b` indicator. NOT themeable: keyboard semantics, tab order, 44px targets.

## Toast (`core/toast.mjs` + `.sw-toast`)
- Core-invariant: danger sticky by default; warning/danger `role=alert` assertive, info/success `role=status` polite; pause on hover/focus; Escape dismisses; queue cap (oldest drop) + id dedupe. Binding owns the clock (`tick`).
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
- Acceptance: [x] reducer + attr tests for both variants · [x] gallery mounts both from the one core · [x] no `order`/reverse properties (R3) · [ ] Phase 2 strangler: SS-PT dashboard nav binding.
- Theme surface: `--sw-nav-bg` + semantics. NOT themeable: disclosure semantics, focus return, aria-current, 44px link targets.
