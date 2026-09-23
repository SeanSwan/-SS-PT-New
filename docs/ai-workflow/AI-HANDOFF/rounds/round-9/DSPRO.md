# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-9\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7551 in / 6552 out · **Cost:** ~$0.0144 · **Wall:** 103.5s · **finish:** stop

---

Adopting the candidate except **F14 as MAJOR is rejected**. Highest-evidence bar: the packet shows only the `AiConversation` schema fields at `AiConversation.mjs:24-83`; it contains no write/update SQL or append path. A missing `version` field is a schema-hardening item, not proof of a lost-update race. Reclassify F14 to **MINOR** with an acceptance criterion attached to the future write path.

Also adding **F15 MINOR**: the mount-order line cites are internally inconsistent — excerpt header says `backend/core/routes.mjs:625-634`, canonical table says `:630-634`, and F2 uses per-line cites that are not line-verifiable from the packet.

Other candidate items are evidence-backed and I carry them.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F14=MINOR: AiConversation.mjs L24-83: schema lacks version; packet has no write-SQL excerpt to prove a MAJOR lost-update race | F15=MINOR: backend/core/routes.mjs L625-634 vs L630-634: mount-order line-cite drift unverifiable from packet
rebuttals: F14-MAJOR=REJECT: no write path excerpted; missing version alone is not a proven concurrency MAJOR | F14-MINOR=AGREE: add version field as schema hardening when write path is implemented | F2/F3/F4/F5/F6/F13/C6/N1/N2/N3/F7/F8/F9/F12=AGREE
open: Q1=resolve exact backend/core/routes.mjs mount line numbers from full file | Q2=probe AiConversation write/update path before asserting any concurrency MAJOR
consensus_block: ADOPT candidate except F14 reclassified MINOR. FIXES: F2 probe entitlement middleware per mounted router; F3 delete caller-supplied clientId at AITerminalPanel.tsx:119,133 and use server-resolved context token; F4 add UNIQUE(idempotency_key) plus CAS status machine and render success only on receipt; F5 probe spike-lane auth parity with flag/kill switch; F6 re-coerce activeTab in CoachCommandCenterPage.tsx:38-42 via effect on [userRole, searchParams]; F13 wrap sendMessageWithConversation calls at AITerminalPanel.tsx:116-139 in try/catch with surfaced failure state; F14 MINOR only: add version field to AiConversation.mjs:24-83 and conditional update when write path is first implemented, with concurrent-append test; F15 MINOR: re-cite exact routes.mjs mount lines in final package item 2. ACCEPTED AS INTENTIONAL: F7/F8/F9 evidence-boundary probes; F10/F11 struck; C8 redaction trusted not verified; C7 consistency deferred. RESIDUAL RISKS: C6 offline queue remains net-new with no queue/idempotency code in packet; F2/F3 severity ceilings unproven until probes return; F1 artifact identity risk; F15 line-cite drift must be closed before handoff.
=== END-VERDICT ===
