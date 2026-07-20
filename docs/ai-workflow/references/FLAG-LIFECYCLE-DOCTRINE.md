# Flag Lifecycle Doctrine + Flag Registry (Swan surface migrations)

> **Why this exists.** We shipped 9 flag-gated surfaces and created **zero deletion tickets**. Kimi's hostile
> review, 2026-07-19: *"A flag that never gets removed is not a feature flag, it's a fork of your own product
> that you're paying rent on."* Two versions of a surface means every future change must be made twice or the
> two silently diverge (that already happened once — see the Gate Rule below). This doctrine ends that.

---

## LAW 1 — A flag is temporary scaffolding, never a permanent fork
Every surface flag exists to make ONE migration safely reversible. Its success condition is its own deletion.
**No flag ships without an owner and an expiry date.**

## LAW 2 — The lifecycle (all six steps are mandatory)
1. **Pre-flip.** Funnel baseline captured (`MEASUREMENT-CHARTER.md`); analytics events tagged with the active
   flag state; Playwright smoke green; performance budget met (`PERFORMANCE-BUDGET-CHARTER.md`); **money-path
   parity verified** for any surface touching checkout/credits/VIP/referral/donations.
2. **Flip.** Runtime flag → true. **1–2 surfaces per week, maximum.** No deploy needed — that is what the
   runtime kill switch is for. Blast-radius ascending (see `FLAG-FLIP-RUNBOOK.md`); money surfaces last.
3. **Verify.** **7 days** of clean data vs the baseline: conversion, bounce, error rate, page speed. Any
   regression past threshold → runtime `false` (instant revert, no redeploy).
4. **DELETE — within 14 days of clean verification.** Delete the old surface file(s), delete `<X>Gate.tsx`,
   delete the flag from `publicConfigRoutes.mjs`, delete the env var on Render, re-point imports directly at the
   v-next component, delete dead token mappings and now-unreachable branches.
5. **Close.** Mark the row below `RETIRED` with the deletion commit SHA.
6. **Enforce.** A flag unflipped for **60 days** triggers a delete-or-justify review. Code we will not turn on
   within 30 days of activation being possible should be deleted — the blueprints can rebuild it.

## LAW 3 — THE GATE RULE (already cost us once)
*No feature may be mounted inside a gated component unless it is mounted in **all branches** of that gate, in the
same PR.* Prefer a mount point ABOVE the gate; if none exists, create one.
**Precedent:** `PrismCapture` — the site's ONLY lead capture — was mounted solely in `HomePage.V4`. Flipping
`HOME_VNEXT_ENABLED` would have silently deleted lead capture from the site. Build, types, lint, and a
3-pass/5-reviewer hostile loop all missed it; branch divergence is invisible to every one of them.
**Enforced by:** `frontend/src/components/marketing/PrismCapture/prismGateParity.test.ts` (extend `GATE_BRANCHES`
for every new gated surface). Mutation-verified.

## LAW 4 — Token-contract scope (do not oversell it)
`--world-*` consumption survives **re-skins** (new palette/theme flows through free; enforced by
`npm run lint:swan-lens`). It does **NOT** survive a **structural** redesign (new IA/composition = rebuild the
components, with color already solved). Claim the first, never the second.

## LAW 5 — Dark work is worth $0 and it rots
Shipped-but-never-activated code has a market value of exactly zero, accrues double-maintenance on every change,
and drifts from the live site (PRISM was the first documented drift). **Deadline: every surface is either
activated or deleted within 30 days of activation becoming possible.**

---

## ⚠️ BLOCKER — why no flag can currently do anything (verified 2026-07-19)
Every surface gate's `ContractCheck` requires a `[data-style-lens-shell]` ancestor:
```js
const scoped = shell.closest('[data-style-lens-shell]');
if (!accent || !scoped) onFail();   // → fail closed to the CURRENT surface
```
**`data-style-lens-shell` exists ONLY as CSS selectors** (`adapters/style-lens-swan/styles/lensCoreStyles.ts`,
`lensSurfaceStyles.ts`). **Nothing in the frontend ever renders it as a DOM attribute.** `LensPlanFrame` emits
`--world-*` and `data-lens2-*` only when a recipe resolves (from the committed appearance/styleLensId), and never
that attribute at all.
**Consequence: setting any of the 7 surface flags to `true` today changes NOTHING — the gate fails closed to the
old surface.** This is the exact, mechanical definition of what **Lane-A activation** must deliver:
1. render `data-style-lens-shell` on the surface frame, 2. ensure `--world-*` actually resolves there,
3. wire the Appearance-Studio Apply handler + viewport/surface CSS mounts + motion licences,
4. one cross-surface smoke test proving a flag flip produces a visible change.
**Do not flip surface flags until Lane-A lands — you will see no change and may wrongly conclude the build failed.**

## Flag value parser — exact accepted values
`publicConfigRoutes.mjs`: `const isTrue = (v) => v === 'true' || v === '1';`
**Only the exact strings `true` or `1` work.** `yes`, `YES`, `True`, `on`, `enabled` all evaluate to **false**.

---

## FLAG REGISTRY
Owner = who is accountable for retiring it. Status: `DARK` (never flipped) · `LIVE` (flipped, in verify window) ·
`RETIRED` (old surface + gate + flag deleted).

| Flag key | Env var | Surface | Owner | Status | Blocked by | Deletion ticket |
|---|---|---|---|---|---|---|
| `homeVNext` | `HOME_VNEXT_ENABLED` | Home | Claude lane | DARK | Lane-A | — (open on flip) |
| `aboutVNext` | `ABOUT_VNEXT_ENABLED` | About | Claude lane | DARK | Lane-A | — |
| `videoVNext` | `VIDEO_VNEXT_ENABLED` | Video | Claude lane | DARK | Lane-A | — |
| `contactVNext` | `CONTACT_VNEXT_ENABLED` | Contact | Claude lane | DARK | Lane-A | — |
| `storeV4` | `STORE_V4_ENABLED` | Store (MONEY) | Claude lane | DARK | Lane-A + money-path parity | — |
| `dashboardV2` | `DASHBOARD_V2_ENABLED` | Dashboards | Claude lane | DARK | Lane-A | — |
| `dashboardV2Finance` | `DASHBOARD_V2_FINANCE` | Dashboards finance sub-gate | Claude lane | DARK | dashboardV2 | — |
| `galleryVNext` | `GALLERY_VNEXT_ENABLED` | Gallery (MONEY, unfinished) | Gallery agent | DARK | build incomplete + Lane-A | — |
| `prismCapture` | `PRISM_CAPTURE_ENABLED` | PRISM lead capture (net-new) | Claude lane | DARK | **none — works today** | n/a (additive; no old surface to delete) |

**`prismCapture` is the ONLY flag that functions today.** PrismCapture's gate checks its flag only — it has no
world-contract probe and carries Crystalline hex fallbacks — so it renders without Lane-A. It is also **additive**
(no predecessor), so it never needs a deletion step; it exits this registry when the last gated home is retired.

### To enable PRISM (the one thing that works now)
On Render: `PRISM_CAPTURE_ENABLED=true` (exactly `true`) **and** `REF_CODE_PEPPER=<long random string>` — without
the pepper the referral code fails closed to null and the Share ray simply hides. Then redeploy/restart. Verify a
test submission creates a CRM lead and fires the owner alert. Run the backend vitest suite in CI first.

---

## Cross-references
`FLAG-FLIP-RUNBOOK.md` (flip order, dwell, abort criteria, rollback drill — **never yet executed in prod**) ·
`MEASUREMENT-CHARTER.md` (baseline before any flip) · `PERFORMANCE-BUDGET-CHARTER.md` (budgets) ·
`SWAN-WHATS-NEXT-MASTER-ROADMAP-2026-07-19.md` (program sequence).
