# Packet manifest — isolated repair candidate r3

Generated 2026-09-24. Original raw consult/package are preservation evidence; the current split packet and linked companions are the proposed continuation. The active canonical worktree is untouched; the cherry-picked repair branch is committed locally but not checked out. Hashes: delivery preservation.json and changes.json. Actual review and verification are in 13–16 and delivery REPORT.md.

| Document | Lines | Fences | Disposition |
|---|---|---|---|
| 00-PACKET.md | 2891 | 64 | Historical preserved evidence (delivery bundle only; not in this branch) |
| 00-README.md | 62 | 0 | Current normative packet/companion |
| 01-OPERATOR-BRIEF.md | 118 | 0 | Normative, delivery bundle only: NOT committed on this branch |
| 01-architecture.md | 131 | 8 | Current normative packet/companion |
| 01-domain-model.md | 140 | 2 | Current normative packet/companion |
| 01-service-flows.md | 154 | 8 | Current normative packet/companion |
| 02-specialist-wireframes.md | 144 | 14 | Current normative packet/companion |
| 02-state-wireframes.md | 82 | 2 | Current normative packet/companion |
| 02-wireframes.md | 220 | 18 | Current normative packet/companion |
| 03-contracts.md | 160 | 8 | Current normative packet/companion |
| 03-health-contracts.md | 114 | 4 | Current normative packet/companion |
| 03-provider-coach-contracts.md | 51 | 4 | Current normative packet/companion |
| 03-video-earnings-contracts.md | 107 | 6 | Current normative packet/companion |
| 04-build-order.md | 94 | 0 | Current normative packet/companion |
| 05-slices.md | 37 | 0 | Current normative packet/companion |
| 06-bans.md | 44 | 0 | Current normative packet/companion |
| 07-checkpoints.md | 47 | 0 | Current normative packet/companion |
| 08-decision-ledger.md | 38 | 0 | Current normative packet/companion |
| 09-tests.md | 214 | 12 | Current normative packet/companion |
| 10-delegated-bounds.md | 19 | 0 | Current normative packet/companion |
| 11-registries.md | 117 | 4 | Current normative packet/companion |
| 12-orphan-disposition.md | 25 | 0 | Current normative packet/companion |
| 13-as-built.md | 52 | 0 | Current normative packet/companion |
| 14-verification.md | 63 | 0 | Current normative packet/companion |
| 15-current-bindings.md | 45 | 0 | Current normative packet/companion |
| 16-repair-traceability.md | 37 | 0 | Current normative packet/companion |
| ASTRA-REPLY-r1.md | 2063 | 84 | Historical preserved evidence (delivery bundle only; not in this branch) |
| DECISION-DENSITY-SELF-TEST.md | 51 | 0 | Historical preserved evidence (delivery bundle only; not in this branch) |
| HOSTILE-REVIEW.md | 121 | 0 | Historical preserved evidence (delivery bundle only; not in this branch) |
| VERIFICATION-NOTES.md | 154 | 0 | Normative, delivery bundle only: NOT committed on this branch |

Historical raw documents are exempt from the entry-document reading budget and must not be mistaken for current runtime evidence. packet-integrity.mjs recursively validates the fifteen required split documents and their linked companions, the thirty decisions and their ten slice bindings, and this manifest. Every row's line and fence counts must match its document. Every "Current normative" row must exist and be reachable by links from an entry document. Its test file has 14 tests: 1 positive and 13 negative controls. Claude review 2026-09-24: `01-OPERATOR-BRIEF.md` and `VERIFICATION-NOTES.md` are marked normative, but they exist only in the delivery candidate and were never committed. Commit them or retire them before a builder relies on this branch. Mermaid source is present; rendered preview NOT RUN.

Build order remains 04/05. The local repair branch supplies scoped S0 evidence, not S1-S9 implementation. Active checkout integration and independent final review remain pending. Check APPLICATION.md before switching branches.
