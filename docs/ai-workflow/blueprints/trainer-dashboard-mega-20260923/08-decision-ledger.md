| ID | Decision | Alternative rejected | Reason / constrained files |
|---|---|---|---|
| D-001 | Treat packet evidence as historical, not live verification | Claim current repo truth | All integration receipts |
| D-002 | Separate existing upgrades, new surfaces, and containment | Pretend every requested surface exists | README, route descriptors |
| D-003 | Keep production GlowButton semantic themes | Restore invented seasonal system | Button/card/theme files |
| D-004 | Prototype is historical visual reference | Import/copy prototype theme authority | Prototype and new surface modules |
| D-005 | One shared client card with capability matrix | Separate admin/trainer card implementations | Client card/workspaces |
| D-006 | Static-first adaptive quality; measured promotion and sticky downgrade | Blanket motion ban or hardware-only “high” | Quality/effect modules |
| D-007 | Route descriptors declare navigation disposition | Maintain unrelated route/nav lists | Route/nav modules |
| D-008 | Home prioritizes next coaching action and verified activity | Equal-size decorative KPI wall | Home files |
| D-009 | Equipment depth is profile/inventory/detail information | Rebuild exercise-variation engine | Equipment files |
| D-010 | Remove synthetic wearable submission first | Restyle a false-data pipeline | Wearable panel/backend seam |
| D-011 | Decompose over-cap files before enhancement | Add then refactor | Equipment/video/Home |
| D-012 | Preserve current sprint algorithm; improve reach and observable behavior | Revive superseded no-repeat design | Sprint files |
| D-013 | Build live Video Assessment using a certified LiveKit adapter | Ship a room placeholder | Video files |
| D-014 | No recording, snapshots, transcription, or model video analysis in v1 | Implicit recording consent | Video/storage boundaries |
| D-015 | Intake & Devices contains separate audio/device/history domains | Expand PLAUD audio enum into universal ingestion | Intake files |
| D-016 | Immutable observations with source/time/revision provenance | Overwrite a latest-vitals row | Health domain |
| D-017 | Per-source dedupe; explicit source selection | Sum cross-device overlaps | Health identity/selection |
| D-018 | Explicit reviewed Coach handoff | Model invocation on import | Coach snapshot boundary |
| D-019 | Investigate and quarantine proven synthetic history | Guess and delete suspicious rows | Containment/migration work |
| D-020 | Earnings is a new immutable subledger | Derive balances from UI/session prices | Earnings backend/UI |
| D-021 | No commercial split until approved | Infer unexplained 3% | Earnings policy/marketing |
| D-022 | Read-only payout reporting | Add transfer execution | Earnings APIs |
| D-023 | One shared page shell and exact role matrix | Page-specific layout systems | All in-scope UI |
| D-024 | Require actual receipts and pending final review | Declare ready from documents or mocks | Checkpoints/as-built |
| D-025 | Preserve records/privacy controls after entitlement loss | Lock all client intake access | Entitlement middleware/UI |
| D-026 | Physical migrations wait for authoritative model types | Guess `"Users"` UUIDs | Backend models/migrations |
| D-027 | Central token aliases bind to real palette outputs before use | Local variables hiding missing emission | Theme emitter/styles |
| D-028 | No uninspected whole-file deletion | Treat old filename as proof of orphanhood | Orphan disposition |
| D-029 | Refund allocation is cumulative with delta posting | Round each refund independently | `B/money.mjs`, ledger |
| D-030 | Sensitive operations bind idempotency to payload and actor | Retry creates duplicate work | New backend APIs |

IDs remain stable. Superseded decisions retain their rows and identify a successor.

**Execution binding (candidate r3)**

All thirty decisions bind to explicit S0–S9 rows in `05-slices.md`; `packet-integrity.mjs` rejects missing/unknown IDs. D-025 binds S7 entitlement and privacy, D-026 S4/S6/S7/S8 physical persistence, D-027 S2 token emission, D-028 S0/S1/S9 preservation, D-029 S8 cumulative refunds, and D-030 S4–S8 mutation idempotency. IDs and original decision meanings are retained.
