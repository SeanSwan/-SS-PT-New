# Design Studio

The admin Design Studio at `/dashboard/admin/design-playground` is the only preview home for unfinished design surfaces. It is always present for admins and is never controlled by Render variables, local storage, database flags, or Launch Control.

## Promotion rule

To promote a parked surface:

1. Review it in the Design Studio and complete the normal design, accessibility, responsive, data-truth, and hostile-review gates.
2. In a normal commit, move the selected implementation import from `playgroundRegistry.ts` to the canonical route/component seam.
3. Remove that entry from the parked registry or update its status as part of the same reviewed commit.
4. Push only through the standard release gate. The committed route is production truth.

Do not add a design flag. Feature switches may live in Launch Control; design surfaces never gate.

Parked-surface harvest notes: [PARKED-VNEXT-INVENTORY-2026-07-21.md](../../../../docs/ai-workflow/AI-HANDOFF/PARKED-VNEXT-INVENTORY-2026-07-21.md).
