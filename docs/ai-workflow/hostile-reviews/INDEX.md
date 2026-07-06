# Hostile-Review Registry

> Durable index of work parked here to **come back to, hostile-review, fix, and finish.** Each entry
> points to a self-contained handoff/audit an AI (or Sean) can pick up cold. Add new rows on top.

| Date | Item | Handoff / audit doc | Review status | Next action |
|------|------|---------------------|---------------|-------------|
| 2026-07-05 | **Equipment Michelin Upgrade** — Slice 1 (discoverability + stability) shipped & deployed; P0.2–P3.6 remain | [`EQUIPMENT-REMAINING-SLICES-HANDOFF-2026-07-05.md`](./EQUIPMENT-REMAINING-SLICES-HANDOFF-2026-07-05.md) · audit: [`../AI-HANDOFF/EQUIPMENT-SUBSYSTEM-DEEP-AUDIT-2026-07-05.md`](../AI-HANDOFF/EQUIPMENT-SUBSYSTEM-DEEP-AUDIT-2026-07-05.md) | Slice 1 deployed; **Codex R7 review OPEN** (review queue) | Codex hostile-review Slice 1 → fold findings into the handoff; then build **Slice 2 = P0 backend safety bundle** |
| 2026-07-06 | **Gallery Photo Studio** — Slices 1+2 shipped; **3a (un-watermarked master pipeline) + 3b (Stripe money-loop + the missing `print_orders` table) BUILT, uncommitted** | [`GALLERY-PHOTO-FEATURE-HANDOFF-2026-07-05.md`](./GALLERY-PHOTO-FEATURE-HANDOFF-2026-07-05.md) **§7** | **Codex EOD batch → review §7**: 3a paywall leak audit · 3b money-loop (replay/race/idempotency) · ⚠ Rule-58 `print_orders`-never-existed finding | after review: Sean commits+pushes (deploys the new table + migration), then Slice 3c Prodigi |

## How to use this folder
- Read the linked handoff for full context (each is self-contained — files, slices, gates, hooks).
- Do the hostile review; record findings in the linked doc (append a "Review Log" section).
- When a slice ships, update the row's status and next action.
- Build in an isolated worktree off `origin/main`, never the shared desktop tree.
