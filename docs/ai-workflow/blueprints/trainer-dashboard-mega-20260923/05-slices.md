**Candidate r3 — 2026-09-24. Decision, requirement, and binding ownership are explicit.**

All criteria below are **MEASUREMENT** unless explicitly marked otherwise. Every slice supplies the `14` receipt, its diff, and the updated file census.

| Slice | Scope | Decisions | Required measurements | Requirements | Bindings |
|---|---|---|---|---|---|
| S0 | Existing wearable panel; bound backend handler; evidence packet | D-001,D-002,D-010,D-019,D-024,D-028 | `WearableDataPanel.test.tsx`: disconnected click causes zero wearable POSTs; GET availability retry is the positive network control; authenticated POST is refused server-side. Inventory actual persistence and downstream readers. Complete missing surface/route/token/model evidence. | R10,R11 | B-01 |
| S1 | Equipment, video, Home extraction files in `04` | D-002,D-011,D-028 | Equipment existing-workflow tests unchanged; visual baseline comparison; per-file counts ≤300; routes still mount. | R1,R5,R7,R11 | B-01 |
| S2 | Shared shell, names, tokens, quality, route descriptors, button/card policy | D-003–D-007,D-023,D-027 | Quality tests; rendered token changes across palettes; nav destination tests; policy replacement regression; accessibility smoke. | R1,R2,R3,R4 | B-01,B-02,B-06 |
| S3 | Home, activity, shared client workspace/card | D-003,D-005,D-008,D-023 | Real-data adapter fixtures; empty/stale/partial/error states; role leakage tests; 375px and desktop screenshots; log-workout navigation. | R1,R2 | B-01,B-07 |
| S4 | Equipment profile, inventory, detail, adapter | D-009,D-011,D-026,D-030 | Search/filter; truthful missing fields; save/version conflict/reload; unauthorized profile denial; responsive detail editing. | R5 | B-01,B-07 |
| S5 | Sprint content/progress adapter | D-012,D-030 | List/detail rendering; meaning of page visible; generated/deload structure from actual data; SSE interruption reconciliation; no duplicate generation. | R6 | B-01,B-08 |
| S6 | Video page/consent/transport/notes + bound backend files | D-013,D-014,D-026,D-030 | Two real devices exchange media; denied outsider; no recording; consent revoke disconnects; notes version conflict; client cannot retrieve private notes. | R4,R7 | B-01,B-03,B-05 |
| S7 | Intake, provider/import/history/Coach files + bound backend files | D-015–D-019,D-025,D-026,D-030 | Duplicate import; revision preservation; cross-source selection; parser rejection; identity isolation; consent withdrawal; explicit Coach handoff; paid-client mode. | R8,R10 | B-01,B-03,B-05,B-09 |
| S8 | Earnings UI, arithmetic, ledger, statements + bound source adapters | D-020–D-022,D-026,D-029,D-030 | Approved-policy gate; exact minor-unit math; refund rounding; event replay; atomic posting; payout reconciliation; trainer isolation. | R9 | B-01,B-04 |
| S9 | Optional Home ornament; complete changed-surface audit | D-006,D-023,D-024,D-028 | Browser viewport matrix; measured automatic degradation; full route/role sweep; rollback rehearsal; final review and as-built reconciliation. | R1–R11 | B-01–B-09 |

**Explicit absence criteria**

- S0: no synthetic submission after clicking legacy sync. Positive controls: GET retry is observed, and baseline provider-button clicks produce POSTs. Do not invent a trusted manual measurement path before provider certification.
- S6: no recording request or object creation. Positive control: the observer detects a deliberately injected recording attempt and fails the test.
- S7: no raw export, identity field, or provider credential crosses the Coach boundary. Positive control: a fixture containing a prohibited field is rejected.
- S8: no journal duplication on replay. Positive control: a deliberately non-idempotent fixture produces the second event and fails.

**Readiness dependencies**

S0 containment and S1 decomposition precede visible enhancement. S2 precedes mounted S3–S8 UI. S6 requires B-03 video certification. S7 requires B-03 provider and B-05 retention decisions. S8 requires B-04 commercial terms and source adapters.

Each slice ends with:

**STOP: do not proceed to the next dependent slice until its checkpoint passes.**

An unrelated, separately claimed preparatory slice may proceed only if it does not bypass that dependency.

**Execution scope of this repair**

Only S0 legacy video-session containment is implemented in the isolated candidate. S1–S9 remain planned, with original checkpoint dependencies intact. The packet-integrity gate checks binding and document structure, never completion of a feature.
