# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-WAVE23-PANEL-PACKET-2026-08-21.md
**Tokens:** 4357 in / 12202 out (reasoning: 10097) | total 16559
**Wall:** 211.2s

---

## VERDICT
REVISE — the direction is right, but two of the headline fixes (the role-routed "Open Workout Logger" links and the overlaid comparison) ship asserted-not-proven behavior that can re-create the exact "control that lies" disease Waves 2–3 exist to cure.

## BLOCKERS

1. **P1 — §2c: the renamed button may still not open a logger.** `getLogWorkoutDashboardPath` points admin/trainer at `?intent=log_workout` and client at `?loadPlan=today`, but the packet shows **zero consumers** of `intent` or `loadPlan` in `client-management`, `trainer/clients`, or the logger. Failure scenario: trainer clicks "Open Workout Logger" → lands on a clients list, no modal, no logger. That is Wave-1's disease with a new coat of paint, and it only manifests for non-default roles — exactly the axis you flagged. Evidence: §2c resolver code; no destination-page code supplied.

2. **P1 — §2a: the overlay layout is asserted, never shown.** The only container CSS in the packet is the *Before* (`display: flex; gap: 8px` — side by side). `TransformationAfterImage { clip-path: inset(0 0 0 var(--swan-slider-pos)) }` only works if the two images are **stacked**. If the flex-row container survived, every comparison renders as two side-byside images with the right one clipped from its own left edge. tsc/tests/chunk-string-checks cannot catch this, and you admit no browser drag test. Evidence: §2a before-CSS vs after-CSS, no new container block.

3. **P1 — §2b: `url` is taken from the body with only `storageKey` shown validated.** If `validatePhotoRecord` doesn't bind `url` to the R2 origin implied by `storageKey`, any authenticated client can mint photo records pointing at arbitrary external URLs, with `visibility` from the body deciding who sees them → member-IP tracking pixels and content spoofing inside shared feeds. Depends on validator internals I can't see, hence P1 not P0. Evidence: `POST /api/photos/:userId` snippet.

4. **P2 — §2a: no `onPointerCancel`.** `pointercancel` (scroll takeover, OS interruption) leaves `isDragging.current = true`; afterwards `onPointerMove` fires on hover, so the divider follows the cursor with no button held. Evidence: `containerProps` list.

5. **P2 — §2a: images are not `draggable={false}`** and no `user-select: none` is shown. Desktop pointerdown on the `<img>` can initiate native HTML5 drag; `setPointerCapture` does **not** suppress `dragstart`. Ghost-drag interrupts the slider exactly where users grab it — on the photo. Evidence: consumer JSX.

6. **P2 — §2b: the copy asserts a count it doesn't know.** "Only one is on record so far" is gated on `hasPhotos` (≥1 photo of *any* type). Three `after`-type photos render the false sentence "only one." Evidence: §2b copy + variable name.

7. **P2 — §3: `Set.has(String(activeTab))` is case-sensitive and the null/unknown split is inconsistent.** `'Home'` (any caller passing a capitalized tab id — the signature explicitly accepts `string`) silently reinstates the 300px rail and re-crushes Home to ~412px. `null → false` vs unknown → `true` also guarantees a load-time layout shift. Evidence: `shouldShowProfileSidebar` source.

8. **P2 — cross-cutting + house rules.** The **877-line styles file violates the ≤300-line-per-file rule** — the compliance pass converted 31 hexes inside a file that itself breaks a house rule. The 27 remaps (`#A0A0B0 → --text-muted` etc.) have **no per-theme 4.5:1 evidence**, and mapping what may be non-text surfaces (borders, icons — 3:1 territory) onto *text* tokens is both a contrast and hue-shift risk in the default theme. The literal `#fff` with `swan-guard-allow-hex` is an acceptable sanctioned deviation — track it. Also: `StyledBox` in the before-code smells like MUI lineage (stack claims none) — unresolvable from the packet.

## ATTACKS

**Correctness**
- The "full source" of the hook returns `setPosition`, which is **never defined** (only `setPositionState` exists). Either the packet is not the full source, or `tsc --noEmit` would have failed. Either way, I reviewed something that isn't byte-identical to what shipped — that's an evidence-integrity problem in a trust-repair wave.
- `role="slider"` is a **children-presentational role**: the two `<img>` alts ("Before transformation"/"After transformation") are flattened out of the accessibility tree; the before/after distinction survives only in the container's aria-label. Slider-on-thumb per APG vs slider-on-track is defensible since the track is the focus/pointer surface, but you've silently deleted information. `aria-valuetext` would help.
- Your specific questions, answered: **`touch-action: pan-y` is correct** (browser keeps vertical scroll, page receives horizontal moves) — but it's asserted, not present in any styled block shown. **`setPointerCapture` on `e.target`**: with `pointer-events: none` children the target is the container (safe); without it, capture lands on the img and moves still bubble to the container — functionally OK but fragile (a child handler or mid-drag unmount kills the drag). **5–95 clamping is defensible and honest** (aria-valuemin/max match; the divider never vanishes); STEP=2 against odd bounds just makes the last step lopsided — cosmetic. **Two sliders on one page: scoping holds** — inline `style` on each container, `var()` resolves per-subtree; only a nested-container scenario breaks it.
- §2c: pre-auth-resolution flash renders the client href for a trainer; and bypassing `useAuth()` is a smell for precisely the reason you name — future readers will assume auth-awareness. I'd hide the action for unknown roles: a missing button tells the truth, a button that bounces off an authz guard does not.
- §2d: 20 rows × framer-motion is a non-issue. But "Start a workout or create a post!" still implies logging a workout populates this feed — it doesn't, unless posted. The chips filtering *post types* is honest; the chips filtering *life events* is the lie. Relabel to "Workout posts" and the whole objection dissolves without an event ledger.

**Security**
- §2b IDOR-adjacent: route takes `:userId`, create writes `userId: clientId`, and nothing shown compares the two. If `clientId` comes from auth, the param is decorative (fine); if anywhere it's the param, it's an IDOR. Settle it.
- No rate-limit evidence on `POST /api/photos/:userId` — it's a cheap record-spam endpoint precisely because no upload bandwidth gates it.
- `tags`/`visibility` from body with no shown enum validation — verify `visibility` can't escalate beyond intended tiers.

**Data-truth / schema drift**
- `ClientPhoto.create({ userId: clientId })`: column `userId` fed a variable named `clientId` — a naming drift that will mis-scope silently the day the schema distinguishes trainer-owned vs client-owned photos.
- `photos/{category}/{clientId}/…` is enforced by stringly prefix-match, not an FK; a typo'd `category` produces a validated orphan. The comparison builder depends on `photoType` the *only* working uploader (admin typing by hand) may never set correctly — the "empty forever" state your new copy now describes as normal.

## HIGHEST RISK
Blocker 1 (§2c intent handlers). Cheapest de-risk: a 5-minute static grep for `intent` / `log_workout` / `loadPlan` in the three destination pages, then one authenticated click per role. If no consumer exists, ship the one-line change that hides the action for admin/trainer today — a missing button is honest; a wrong-page button is the exact bug class this wave was funded to kill.

## CONFIDENCE
Could not verify from the packet: `validatePhotoRecord` internals (settles blocker 3); the *actual shipped* hook file (the `setPosition` discrepancy proves the shown source isn't it); the new container CSS for the slider overlay (settles blocker 2); `getDashboardRolePath`'s unknown-role/default mapping; consumption of `intent`/`loadPlan`; token values across all 16 themes for the 27 remaps; whether ActionLink hit-areas meet 44px; whether any member-facing upload exists elsewhere (Photos tab) that contradicts the new §2b copy; whether `StyledBox` is MUI lineage; measured viewport widths (yours are computed, not measured); any screen-reader behavior. Settling evidence: the real files at `main@79f3bb804` (hook, container styled block, destination pages' `searchParams` reads), `validatePhotoRecord` source, a theme-token table run through an automated contrast matrix, one Playwright journey per role, and one NVDA/VoiceOver pass on the slider. House rules not evidenced either way (Dual-Button Glow, Victory usage, credential phrasing, yoga language) — nothing in the packet contradicts them, and nothing proves them.
