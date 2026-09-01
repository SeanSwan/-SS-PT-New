# A still becomes a MediaAsset — and a green suite that never looked at the new path

**From:** vs-claude (Fable 5) · terminal · 2026-08-25 · commit `a35a96b01` on `feat/atelier-v2-compose` (PR #73)
**Surface:** atelier / persistStills / MediaAsset / R2
**Type:** feature slice (S1.5) + hostile rounds. Sean did NOT merge #73 and the SWA-207 probe is still his; this slice is on the branch.

## What shipped

`backend/services/atelier/persistStills.mjs` (198 ln): a Compose still → R2 object → `MediaAsset` row with `buildProvenance` (same builder the video lane uses). Object key = `atelier/stills/<owner>/<yyyy-mm>/<sha256>.<ext>` so persistence is idempotent by construction. Storage unconfigured **refuses** (no placeholder row). A declared sha256 that does not match the bytes read refuses (`E_ARTIFACT_HASH_MISMATCH`). Persistence never hides a still: per-still `persist:{ok,code}` + batch verdict; `partial` stays a render fact. `GET /api/atelier/compose/asset/:id` returns an owner-scoped asset with provenance + read URL. Still card shows `asset <id8>` or `not saved · <CODE>`.

## The lesson

**A default collaborator that fails quietly makes an unexercised path invisible to a green suite.** After wiring persistence into `composeStills`, all 117 sibling tests passed. None injected a persister, so the *real* one ran, found no R2, recorded `E_STORAGE_UNCONFIGURED` on every still — and the tests asserted nothing about it. Green meant "did not crash", not "was checked". Three tests now inject the persister and pin propagation, refusal, and explicit skip. **A new side-effect path needs a test that would fail if the path were deleted.**

Second: the object key is the hash. Idempotency that lives in a key derivation cannot be forgotten by a caller; idempotency that lives in a check can.

## Live-state facts

- No R2 credentials in the build environment: real upload + real `findOrCreate` are **not proven**; the injected suite and a real-module refusal probe stand in.
- `MediaAsset.projectId` is a `content_projects` FK, not a workspace — left null on purpose; workspace id rides in `tags` until S5.
- `readAsset` with no DB surfaces the raw Sequelize error (500 via the route), not a coded refusal — acceptable, noted.
- The hosted lane's measured `width/height/format/costUsd` were being dropped in `runBatch`; now carried.
- `atelierComposeLanes.test.mjs` hit 315 lines; persistence cases split to their own file.

## Mistakes I made

- **Declared the slice green on 117 passing tests that never exercised persistence.** Caught by asking what the sibling suites had actually run. **MECHANISM:** after wiring a new side-effect path, add a test that injects a failing collaborator and asserts the failure surfaces — a suite that cannot fail on the path does not cover it.
- **Let the lanes suite cross the 300-line cap** by appending to it. Caught by the caps check before commit. **MECHANISM:** a test file at 250+ lines gets a sibling file for the next describe block, not another append.
- **Wrote an assertion that counted a substring inside a longer token** (`aspect={aspect}` within `$aspect={aspect}`) and failed my own edit. **MECHANISM:** assert distinct shapes, not substrings.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Green suite that never exercised the new path | 1 | No | Asking what the default collaborator did during the run |
| File crosses the cap by accretion | 1 | No | Caps check |
| Absence claim without a control | 0 — the chunk walk carried the control again | Yes | The procedural shape held for the second turn running |

## External-model calibration

None — no external seat ran.
