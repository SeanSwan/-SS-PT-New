# Repair traceability — candidate r3

Owner: Codex/Astra; 2026-09-24. Original requirements/decisions retain their IDs. The executable integrity gate checks all thirty decision bindings and all eleven requirement links. It does not certify planned features.

| Repair | Requirement / decision | Component or contract | Verification | State |
|---|---|---|---|---|
| Stop invented video-session biometrics | R10 / D-010,D-019 | WearableDataPanel; legacy video-session handler/presenter | Frontend behavioral RED/GREEN; isolated real Express routing; baseline/candidate no-write probe | Committed on local repair branch; not checked out |
| Restrict private DTO fields and session management | R7,R10 / D-019 | serializeVideoSession and assigned-trainer guard | 15 privacy + 36 management cases within final 70 backend checks | Committed on local repair branch; not checked out |
| Close stale response, hidden-control and retry gaps | R1,R10 | WearableDataPanel | Component regressions; seven browser viewport checks; focus/escape/no-overflow | Committed; complete dashboard unproven |
| Run S0 suites under the repo's runners; restore the broken auth-pipeline contract; harden the packet guard (Claude review) | R10,R11 / D-019 | backend Vitest harness and 3 suites; VideoCallAuthPipeline.truth.test.ts; packet-integrity.mjs | Full backend `npm test` failing-file set equals pre-repair base (18); 74 video-session tests; VideoChat 9/9; packet 14/14 | Committed on Claude review branch |
| Close unbound decisions | R11 / D-025–D-030 | 05 slice table, 08 ledger | packet-integrity and mutated negative controls | Structural evidence only |
| Restore bounded reading | R11 / D-011,D-024 | 01/02/03 entry documents + seven linked companions | Every required linked document <=300 lines; link/fence validation | Documentation repaired |
| Issue import hashes; bind discard/retry | R8 / D-016,D-030 | 03-health-contracts; 01 flows; 02 states | T-H01,T-H02 planned | Product NOT RUN |
| Enforce measurement units and eligible revisions | R8 / D-016,D-017 | Observation union/runtime rules | T-H03,T-H04 planned | Product NOT RUN |
| Bind exact Coach approval | R8 / D-018,D-030 | Coach preview/snapshot contracts | T-C01,T-C02,T-A01 planned | Product NOT RUN |
| Fence late work after deletion/restore | R8 / D-025,D-026,D-030 | Subject generation and deletion lifecycle | T-H05 planned | Product NOT RUN; B-05 pending |
| Preserve financial unknowns and original refund policy | R9 / D-020,D-021,D-029 | Earnings reconciliation/refund/pagination contract | T-E01,T-E02,T-E03 planned | Product NOT RUN; B-04 pending |
| Correct current Home target and ingestion claims | R11 / D-001,D-002 | 15 current bindings and 01 hierarchy | Direct source read and baseline hash manifest | Static binding only |
| Distinguish failed archive observation from staleness | R11 / D-024 | Candidate archive query/check transport | Unit/real-child fixtures, including failed spawn/timeout | 61 tests; applied and hash-verified on Z archive |

## Prior-review dispositions

- Round-1 D1: frontend fabrication and backend update behavior reproduced in isolated fixtures; candidate containment tested. Production history uninspected.
- D2/D3/D11: sheen policy/test and prototype/production differences remain S2 work. Do not call an unexecuted test passing or silently remove its assertion before adaptive-effects replacement tests exist.
- D4: preserve GlowButton naming; public Swan Forge content tooling is a separate product. Seasonal palettes remain a new product choice.
- D5: prior withdrawal retained. Contextual navigation exists; complete mounted-role census remains pending. No fabricated nine-route defect.
- D6: working media/client consent remains S6 and B-03; no fake room claimed as repaired.
- D7: Earnings remains S8, with no assumed split or invented balances.
- D8: existing PLAUD and separate wearable-data routes require B-09/B-01 adaptation; no automatic intake-to-model send.
- D9: document overages repaired. Equipment/video and other source decomposition remain S1. S0 route containment has one explicit inherited line-limit exception.
- D10: current canonical source has only the static auth/mount contract test in the inspected sprint paths. UI tests named in a stale peer lane are not present here; the UI coverage gap remains open.
- D12: archive query/helper/reindex repair applied to Z:/HostileReviews and hash-verified. Existing index exclusions/supersession-link issues remain; this is not a clean-corpus claim.
- Addendum A1 deploy probe: candidate local observer and terminal error propagation repaired; 18 injected/caller and 11 native fake-child controls pass. Canonical application and real migration/deployment proof remain pending; the deployment utility was never run/imported.

## Remaining implementation and evidence

S1–S9 are not implemented by this packet repair. UI glow/adaptive themes, shared Home/client cards, equipment upgrades and sprint usability still need their tests and mounted baselines. Live media, certified providers, approved earnings policy, deletion/retention authority, independent Claude adjudication and deployment evidence remain explicit blockers, not silent completions.
