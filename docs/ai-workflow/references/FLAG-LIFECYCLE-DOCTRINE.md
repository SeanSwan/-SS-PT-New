---
status: active
effective_at: 2026-07-21
scope: feature-switches-only
---

# Feature Flag Lifecycle Doctrine

## Law 1 — Design surfaces never gate

A public or dashboard design version is selected by the canonical route committed to Git. Design choice may not
depend on Launch Control, an environment variable, a build variable, local storage, a query parameter, or a
database override.

Unfinished design belongs in Admin → Design Studio. Promotion and rollback happen through reviewed commits.

## Law 2 — Feature flags protect behavior, not appearance

A feature control is allowed only for a bounded capability whose operational risk warrants a separately
observable control. Every feature key needs:

- a named consumer and owner;
- a fail-closed baseline;
- its actual frontend and backend enforcement paths;
- a positive verification and rollback verification;
- an audit trail;
- an expiry or scheduled keep/delete review;
- Sean approval when money, auth, PII, billing, or external messaging is involved.

A flag may hide behavior; it may not choose between two versions of a page. Never call a control an end-to-end
kill switch unless every authoritative consumer reads the same resolved value.

## Law 3 — The registry is an exact whitelist

Launch Control contains exactly:

| Flag key | Backend baseline | Consumer/status | Database override scope |
|---|---|---|---|
| `dashboardV2Finance` | `DASHBOARD_V2_FINANCE` | Retained but dormant while dashboard v2 is parked | Public flag only; server finance controller reads env directly |
| `prismCapture` | `PRISM_CAPTURE_ENABLED` | Canonical Home UI + public lead route | UI/public flag; POST route reads env directly |
| `postSaveHandoff` | `ENABLE_POST_SAVE_HANDOFF` | Workout completion client + assembler | Verified end-to-end |

`backend/services/launchControlResolve.mjs` is the code registry. The admin board query and mutation lookup
consume that whitelist. CI locks the exact list and emits:

`Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.`

Adding a fourth key requires an explicit doctrine change and proof that it is a feature rather than a design
surface.

## Law 4 — Feature lifecycle

1. **Propose:** document risk, consumer, owner, baseline, every enforcement path, verification, abort signal,
   and review date.
2. **Register:** add the key to the exact code whitelist, environment baseline, DB migration, and contract tests.
3. **Ship dark:** verify fail-closed behavior and each real caller path.
4. **Operate:** use only the control proven authoritative for that feature; preserve the append-only audit and
   do not overstate database-override scope.
5. **Review:** keep, retire, or extend on the scheduled date using observed evidence.
6. **Retire:** remove consumer branches, overrides, registry row, environment key, and tests in one reviewed
   release; preserve audit history.

## Law 5 — Retired design registry

The 2026-07-21 de-gate migration retires these seven keys:

| Retired key | Retired backend environment key |
|---|---|
| `homeVNext` | `HOME_VNEXT_ENABLED` |
| `storeV4` | `STORE_V4_ENABLED` |
| `aboutVNext` | `ABOUT_VNEXT_ENABLED` |
| `contactVNext` | `CONTACT_VNEXT_ENABLED` |
| `videoVNext` | `VIDEO_VNEXT_ENABLED` |
| `galleryVNext` | `GALLERY_VNEXT_ENABLED` |
| `dashboardV2` | `DASHBOARD_V2_ENABLED` |

The migration deletes registry rows once; the existing foreign-key cascade removes their overrides.
`flag_audit` is deliberately untouched. The down path restores registry metadata only and does not resurrect
historical overrides.

Frontend design fallbacks and the build-gated playground are also retired. Sean's owner checklist names the
Render keys to remove without exposing their values.

## Law 6 — Feature parity survives design promotion

A future design replacement must preserve every independent feature consumer mounted on the canonical surface.
PRISM lead capture is the precedent: it stays on canonical Home, and the parked Home preview retains it so a
future promotion cannot silently drop the feature.

This is a promotion-review concern, not a reason to restore a page gate.

## References

- `FLAG-FLIP-RUNBOOK.md` — truthful feature operation and code-based design promotion
- `docs/receipts/de-gate-2026-07-21/S4-render-environment-owner-checklist.md`
- `docs/ai-workflow/AI-HANDOFF/PARKED-VNEXT-INVENTORY-2026-07-21.md`
- `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md`
