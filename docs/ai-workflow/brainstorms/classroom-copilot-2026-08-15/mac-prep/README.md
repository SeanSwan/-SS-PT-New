# Classroom Hermes Mac Preparation Package

**Status:** Windows-side preparation in progress. No Mac change, model download,
credential use, external AI call, commit, or push is implied by this package.

## Outcome

This package converts the 2026-08-21 five-model review into a supervised,
reversible Mac setup. It resolves D-20 as **WRAP**: Hermes is the single visible
assistant, while the hardened H0 assistant remains the offline engine/fallback if
it is present. It does not create two competing assistants or copy Sean's brain.

Real child-specific content is never eligible for the 5090, Radar, SwanGuard, or
an external model. The privacy broker remains P0 BLOCKED/UNPROVEN. All build and
test fixtures here are public or synthetic.

## Finite slice manifest

| Slice | Deliverable | Windows-side gate | Mac execution gate |
|---|---|---|---|
| S0 | Panel evidence lock | packet hash, receipts, spend, decisions, line cap | none |
| S1 | H0/Hermes WRAP decision | state machine tests | observe H0 and adoption facts |
| S2 | Exact privacy/product contracts | unit tests | none |
| S3 | Mac preflight collector | synthetic parser tests; no raw account output | run on target Mac |
| S4 | OS/account hardening runbook | command and rollback review | dedicated standard account + FileVault |
| S5 | Isolated Hermes profile bundle | static package gate | supervised local profile install |
| S6 | One-front-door launcher | static safety gate | local and generic-mode smoke tests |
| S7 | Allergy/safety checker contract | deterministic synthetic tests | local roster integration only |
| S8 | Radar + SwanGuard contracts | controlled query and exact-schema tests | authorized source adapters later |
| S9 | Daily card contract | 90-second/deal/voice/observation bans | five printed synthetic cards |
| S10 | 5090 generic-only contract | exact envelope + 50 hostile payloads | authenticated private endpoint probe |
| S11 | Operations/retention/rollback | written lifecycle and offline rule | operator signs acceptance sheet |
| S12 | Final hostile-review packet | two clean local rounds | paid models only after a fresh spend gate |

The S-series is the preparation project in this workspace. M0–M8 in the master
blueprint are the later Mac execution phase; they cannot honestly be marked run
from Windows. Unavailable facts are gates with collectors, not unfinished design.

## Use order on the Mac

1. Read `FACT-GATES-AND-POLICY.md` and obtain the written director response.
2. Copy this package into a clean build-only folder; do not expose a classroom
   notes folder to Codex, Claude, or another cloud-connected desktop agent.
3. Run the read-only preflight described in `SUPERVISED-MAC-SETUP-RUNBOOK.md`.
4. Apply the H0 state decision in `H0-WRAP-DECISION.md`.
5. Follow the supervised runbook; stop at any failed gate.
6. Run the synthetic/offline acceptance matrix before any real use.

## Deterministic verification

From the SS-PT repo root:

```powershell
node --test scripts/classroom-hermes/*.test.mjs
node scripts/classroom-hermes/review-evidence.mjs
node scripts/classroom-hermes/package-gate.mjs
```

The whole-package gate makes zero external calls and uses zero real child
fixtures. A green result proves only the checked preparation artifacts; it does
not prove the Mac, 5090 endpoint, school authorization, or privacy broker.

## Source-of-truth order

1. `CLASSROOM-HERMES-RADAR-MASTER-BLUEPRINT-2026-08-21.md`
2. panel `DECISION-LEDGER.md` and `FABLE-FINAL-SYNTHESIS.md`
3. this slice manifest and the WRAP decision
4. supervised setup evidence captured on the target Mac

