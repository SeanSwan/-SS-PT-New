---
status: PARKED
parked_at: 2026-07-21
decision: design-surfaces-never-gate
local_release_branch: codex/degate-design-overhaul-20260721
local_degate_commit: 5bb59ace1
---

# Swan Design-Overhaul Program — PARKED Historical Tracker

> **STOP:** Do not resume the former “build all 14 surfaces” program. Do not build surfaces #8–14 from this
> document. Sean rejected the gated redesign workflow on 2026-07-21. This file is now a historical index and
> raw-material map, not an execution queue.

## Current decision

- Public design truth comes from the component committed to the canonical route.
- Design surfaces never use Launch Control, Render variables, build variables, local storage, or runtime flags.
- Unfinished/rejected design work lives in Admin → Design Studio at `/dashboard/admin/design-playground`.
- The seven parked vNext implementations remain available for visual harvesting; none is a live-route candidate
  without a new, explicit product decision and a normal code review.
- Launch Control remains feature-only.

The local release candidate is `codex/degate-design-overhaul-20260721`. Production is not changed until Sean
approves the batch push and the deploy completes. S0 proved the pre-release production flags were actually ON,
so this release is a deliberate return to the original pages, not a no-op cleanup.

## Target canonical surfaces after the approved batch

| Public surface | Canonical component | Parked raw material |
|---|---|---|
| Home | `HomePage.V4` | `HomeVNext` |
| Store | `StoreV3` | `StoreV4` |
| About | `About.V4` | `AboutVNext` |
| Contact | `ContactV3` | `ContactVNext` |
| Video | `VideoLibraryV3` | `VideoLibraryVNext` |
| Gallery | `GalleryPage` | `GalleryVNext` |
| Admin/trainer/client dashboards | `UniversalDashboardLayout` | `DashboardShell` v2 |

Detailed component, binding, harvest, discard, Mobbin, and local-preview notes:
`docs/ai-workflow/AI-HANDOFF/PARKED-VNEXT-INVENTORY-2026-07-21.md`.

## Additive photography lane

The active photoshoot workflow is not parked. `GalleryPage` and Admin -> Photo Gallery Studio remain canonical
functional surfaces. Sean's 2026-07-21 bulk-upload, curation, sharing, storage-deletion, and download-delivery
queue item is reconciled in:

`docs/ai-workflow/AI-HANDOFF/SWAN-PHOTOGRAPHY-CANONICAL-ADDITIVE-PLAN-2026-07-21.md`

That plan is queued after the de-gate Final Decider/release gate and must branch from the resulting approved
commit. It may harvest functional/accessibility lessons from parked Gallery vNext, but it must not restore the
vNext public design, introduce a design flag, absorb print fulfillment, or merge progress/social photo domains.

## Historical program disposition

| Historical item | Disposition |
|---|---|
| #1 Swan Lens | Retained infrastructure/reference; not a license to gate routes |
| #2 Dashboard v2 | PARKED in Design Studio; original dashboard is canonical |
| #3 Store v4 | PARKED; money-path code is reference material only |
| #4 Home vNext | PARKED; original Home retains PRISM feature parity |
| #5 About vNext | PARKED |
| #6 Video vNext | PARKED |
| #7 Contact vNext | PARKED |
| #8+#9 Gallery/Photography vNext | PARKED; billing-critical work is not resumed from this tracker |
| #10 Design Skill redo | Adopted governance/reference work; not a public surface |
| #11 Design Brain enhancement | Adopted governance/reference work; subordinate to the cinematic design system |
| #12–#14 | No canonical active build record; do not infer or create work from the old numbering |

Historical implementation commits remain in Git for provenance:
Dashboard `8a8545605`, Store `bf00e721f`, Home `0606edc23`, About `816cce70e`,
Video `7b2b84184`, Contact `4e116d3c6`, and the Gallery dark-build history.

## Finance feature status

`dashboardV2Finance` remains one of the three approved feature switches because it protects money-adjacent
behavior. It has no canonical V1 dashboard consumer after v2 is parked, so it is **retained but dormant**.
Do not delete, activate, or repurpose it inside a design task. A later feature decision must prove a canonical
consumer, server enforcement, and money-path tests first.

## De-gate receipts

- `docs/receipts/de-gate-2026-07-21/S0-production-probe.md`
- `docs/receipts/de-gate-2026-07-21/S1-degate-verification.md`
- `docs/receipts/de-gate-2026-07-21/S2-design-studio-verification.md`
- `docs/receipts/de-gate-2026-07-21/S3-admin-parity-and-whitelist.md`
- `docs/receipts/de-gate-2026-07-21/S4-render-environment-owner-checklist.md`

## Safe future design workflow

1. Research and mock inside Design Studio or an isolated branch.
2. Preserve real data, auth, money, and feature behavior.
3. Review the proposed replacement at all required viewports.
4. Promote by changing the canonical route import in a normal commit.
5. Roll back by reverting the commit—not by restoring a design flag.

Any document that says to flip `*VNext`, `*V4`, `DASHBOARD_V2_ENABLED`, or a design `VITE_*` variable is
historical and superseded by this tracker plus `FLAG-LIFECYCLE-DOCTRINE.md`.
