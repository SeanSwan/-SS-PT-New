# Package Manifest — Migrations Reconciliation Blueprint

**Generated:** 2026-09-21T00:12:54.103Z
**Source reply:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-migrations-reconciliation-2026-09-20/ASTRA-REPLY.md`
**Packet:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-migrations-reconciliation-2026-09-20/CONSULT-PACKET.md`

## Documents

| File | Lines | Fenced blocks |
|---|---|---|
| `HOSTILE-REVIEW.md` | 43 | 0 |
| `00-README.md` | 57 | 0 |
| `01-architecture.md` | 177 | 12 |
| `02-wireframes.md` | 18 | 0 |
| `03-contracts.md` | 312 | 10 |
| `04-build-order.md` | 83 | 4 |
| `05-slices.md` | 146 | 10 |
| `06-bans.md` | 32 | 0 |
| `07-checkpoints.md` | 70 | 0 |
| `09-tests.md` | 145 | 12 |
| `08-decision-density-self-test.md` | 51 | 0 |

## Build order

Per `04-build-order.md` and `05-slices.md`. Build ONE slice at a time; after each slice, produce the diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing.
