**Path conventions**

`F` and `B` expand exactly as defined in `01`. New-file current counts are “not created.” `UNKNOWN` on existing files is a required inventory result, not zero.

No working in-repository implementation excerpt is supplied for the new patterns. Pattern references below are therefore integration seams, not claimed examples. B-01 must supply the excerpt before modifying its seam.

**File-by-file production plan**

| Path | Purpose / imports → exports | Current → budget | Slice |
|---|---|---:|---|
| Existing `WearableDataPanel.tsx` | Remove synthetic sync; existing API → honest device state | 312 before S0 → 94 after S0 (≤240) | S0 |
| Existing `EquipmentManagerPage.tsx` | Existing hooks → orchestration only | 1763 reported → ≤180 | S1 |
| Existing `VideoRoom.tsx` | Existing room → honest unavailable state, then transport view | 483 reported → ≤220 | S1/S6 |
| Existing `VideoCallPage.tsx` | Existing session API → page orchestration | 327 reported → ≤180 | S1/S6 |
| Existing `TrainerOverviewPage.tsx` | Existing home data → `HomeContent` | 299 reported → ≤180 | S1/S3 |
| `F/names.ts` | No imports → `WORKSPACE_NAMES`, shared copy constants | not created → 100 | S2 |
| `F/contracts.ts` | Type-only imports → common UI contracts | not created → 220 | S2 |
| `F/routeDescriptors.ts` | names/capabilities → route descriptor exports | not created → 180 | S2 |
| `F/quality.ts` | No browser globals → `reduceQuality` | not created → 180 | S2 |
| `F/useEffectsQuality.ts` | quality + browser adapter → `useEffectsQuality` | not created → 200 | S2 |
| `F/WorkspaceShell.tsx` | styled-components → `WorkspaceShell` | not created → 140 | S2 |
| `F/WorkspaceHeader.tsx` | names/buttons → `WorkspaceHeader` | not created → 120 | S2 |
| `F/WorkspaceState.tsx` | names/buttons → `WorkspaceState` | not created → 180 | S2 |
| `F/SwanSurface.tsx` | quality/styles → `SwanSurface` | not created → 180 | S2 |
| `F/surfaceStyles.ts` | styled-components `css` → shared fragments | not created → 180 | S2 |
| Existing `clientCardSystem.ts` | Revised policy; surface fragments → existing compatible exports | UNKNOWN → ≤250 | S2 |
| Existing `ClientHubGridCard` module | shared card + capabilities → existing export | UNKNOWN → ≤260 | S3 |
| Existing `GlowButton.tsx` | Keep public API; delegate adaptive effects | UNKNOWN → ≤300 or split first | S2 |
| `F/glowEffects.ts` | quality → event/effect adapter | not created → 160 | S2 |
| Existing route registry | descriptors → existing mounted route tree | UNKNOWN → ≤300 or split first | S2 |
| Existing role nav modules | descriptors → role navigation | UNKNOWN → ≤300 each | S2 |
| Existing canonical theme emitter | central alias binding only | UNKNOWN → ≤300 or split first | S2 |
| `F/HomeContent.tsx` | view-model/surfaces → `HomeContent` | not created → 220 | S3 |
| `F/HomeActivity.tsx` | Victory + view-model → `HomeActivity` | not created → 180 | S3 |
| `F/ClientWorkspaceContent.tsx` | shared card + query state → `ClientWorkspaceContent` | not created → 240 | S3 |
| `F/EquipmentContent.tsx` | profile/inventory/detail → `EquipmentContent` | not created → 220 | S1/S4 |
| `F/EquipmentProfileList.tsx` | profile VM → `EquipmentProfileList` | not created → 160 | S1/S4 |
| `F/EquipmentInventory.tsx` | item VM → `EquipmentInventory` | not created → 220 | S1/S4 |
| `F/EquipmentDetail.tsx` | edit contract → `EquipmentDetail` | not created → 240 | S1/S4 |
| `F/equipmentStyles.ts` | shared fragments → equipment layout | not created → 180 | S1 |
| `F/useEquipmentWorkspace.ts` | existing verified hook → normalized state | not created → 220 | S1/S4 |
| `F/SprintContent.tsx` | existing sprint adapter → `SprintContent` | not created → 230 | S5 |
| `F/useSprintProgress.ts` | existing job/SSE adapter → reconnect state | not created → 200 | S5 |
| `F/VideoAssessmentPage.tsx` | video API/transport → page | not created → 220 | S6 |
| `F/VideoConsent.tsx` | consent contract → consent panel | not created → 150 | S6 |
| `F/VideoStage.tsx` | video adapter → media stage | not created → 220 | S6 |
| `F/AssessmentNotes.tsx` | versioned notes → editor/summary | not created → 180 | S6 |
| `F/videoApi.ts` | existing auth transport → typed video client | not created → 220 | S6 |
| `F/livekitAdapter.ts` | certified SDK → `VideoTransport` | not created → 220 | S6 |
| `F/IntakeDevicesPage.tsx` | audio/device/history views → page | not created → 220 | S7 |
| `F/DeviceConnections.tsx` | manifests/connections → connection list | not created → 200 | S7 |
| `F/ImportReview.tsx` | import preview → review dialog | not created → 180 | S7 |
| `F/ObservationHistory.tsx` | readings → source-linked history | not created → 220 | S7 |
| `F/CoachSnapshotReview.tsx` | minimized snapshot → approval dialog | not created → 180 | S7 |
| `F/healthApi.ts` | existing auth transport → typed health client | not created → 240 | S7 |
| `F/EarningsPage.tsx` | statement/payouts → page | not created → 220 | S8 |
| `F/EarningsStatement.tsx` | currency-safe VM → statement | not created → 200 | S8 |
| `F/earningsApi.ts` | existing auth transport → typed earnings client | not created → 120 | S8 |
| `F/HomeOrnament.tsx` | lazy certified graphics adapter → decoration | not created → 160 | S9 |
| `B/healthContracts.mjs` | validators → health validation functions | not created → 240 | S7 |
| `B/healthNormalization.mjs` | certified adapters → normalized observations | not created → 220 | S7 |
| `B/healthIdentity.mjs` | protected identity store → identity/dedupe functions | not created → 180 | S7 |
| `B/healthImports.mjs` | storage/jobs/transactions → import service | not created → 250 | S7 |
| `B/healthConnections.mjs` | provider adapter → connection service | not created → 230 | S7 |
| `B/coachSnapshots.mjs` | authorization/privacy port → snapshot service | not created → 200 | S7 |
| `B/videoAssessments.mjs` | authorization/transport → assessment service | not created → 240 | S6 |
| `B/videoTransport.mjs` | certified SDK → server transport adapter | not created → 180 | S6 |
| `B/money.mjs` | integer arithmetic → share/refund functions | not created → 120 | S8 |
| `B/earningsLedger.mjs` | transactions/policy → ledger service | not created → 250 | S8 |
| `B/earningsStatements.mjs` | ledger → statement/payout readers | not created → 180 | S8 |

Backend route mount files, model files, and migrations require exact existing examples under B-01. Their paths are intentionally not invented.

**Test files**

All files listed in `09` are new or replacements with a ≤240-line budget, except `playwright.config.ts` at ≤120 and fixture modules at ≤180. Split fixtures from test bodies; do not compress tests to evade the cap.

**Ordering rationale**

First remove false output, then extract behavior-preserving modules, then install primitives and adapters, then mount feature slices. New unfinished routes remain disabled with a named reason. Every prefix must leave current working routes bootable.

**Deletes**

Delete synthetic-value construction and fake freeze-frame behavior. Whole-file deletion is governed by `12`; none is authorized solely by filename.

**Exemptions**

No general exemption is granted; the bounded S0 containment exception below is explicit. If `GlowButton`, route, nav, or theme files already exceed the cap, add an explicit decomposition sub-slice before editing them.

**r3 containment exception and test inventory**

S0 is an urgent removal of fabricated health data, not a UI enhancement. The isolated candidate changes the existing wearable panel and the legacy video-session route, with a small pure quarantine presenter. The existing 490+ line route remains over the limit; route-wide decomposition belongs to S1 and is not mixed into containment. Existing generic session responses must use the same presenter so alternate reads cannot bypass quarantine.

`coachSnapshots.integration.test.mjs` and `earningsStatements.integration.test.mjs` are added to the planned S7/S8 test inventory in `09`; they are NOT RUN. The implemented S0 tests are `WearableDataPanel.test.tsx` and the updated `VideoCallAuthPipeline.truth.test.ts`, both run by frontend Vitest. On the backend they are `videoSessionManagement.test.mjs`, `videoSessionPrivacy.test.mjs`, `videoSessionWearableContainment.test.mjs` and `videoSessionRoutesOwnership.test.mjs`, all collected by `cd backend && npm test`. The v3b3 probe and packet tests run under `node --test`, and the archive tests are listed in the evidence manifest.
