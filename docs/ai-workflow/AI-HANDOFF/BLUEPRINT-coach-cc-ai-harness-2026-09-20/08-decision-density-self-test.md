# PART C — Decision-Density Self-Test

> Every remaining builder choice: decided-in-package, or delegated-with-bounds.

---

| Builder choice | Disposition |
|---|---|
| Which document governs the harness? | **Decided:** this package after S0 approval; explicitly mapped harness supersession only. |
| Whether omitted documents were reviewed | **Decided:** no. Review scope remains packet-only. |
| Whether the “210 files” count is current | **Decided:** unknown; remove it from normative architecture. |
| Whether to explore the repository | **Decided:** no for this zero-access builder; caller supplies source bytes and hashes. |
| What to do when source/models are missing | **Decided:** named S0 blocker; no guessed implementation. |
| Which mounted path to edit | **Bounded evidence gate:** prove route JSX → actions/arbiter → transport → backend handler before integration. |
| Whether the operation store needs replacement | **Bounded architect decision:** reuse only with contract evidence; otherwise approve the specified ledger. |
| Which commands to enable first | **Bounded architect decision:** only actual registry entries whose supplied dispatcher proves same-transaction database effects, access, audit, and replay. No invented command IDs. |
| How a command is classified as a write | **Decided:** registry `destructive || requiresConfirmation`; no second risk list. |
| Whether every V2 write needs review | **Decided:** yes, server-owned preview and explicit confirmation. |
| What a confirmation submits | **Decided:** operation ID only. |
| How long previews last | **Decided:** five minutes using database time. |
| What changes invalidate a preview | **Decided:** actor/target access, registry version, relevant domain versions, expiry, or incompatible scope. |
| How request replay works | **Decided:** actor-bound key and canonical keyed hash; mismatch is 409; no automatic new-key retry. |
| What happens after a timeout | **Decided:** unknown outcome; reconcile existing identity. |
| Whether a 404 proves no effect | **Decided:** no. |
| Whether frontend dispatch proves saving | **Decided:** no; authoritative save receipt required. |
| How nontransactional effects work | **Decided:** unavailable until a separate reviewed effect adapter exists. |
| What happens to legacy previews | **Decided:** cannot execute through V2; create a new preview. |
| Which client identity is authoritative | **Decided:** authenticated server access resolution, never route text or model output. |
| Whether chat gets command failures | **Decided:** only explicit validated fallback permits chat. |
| Which model inputs are allowed | **Decided:** approved versioned templates and positively validated structured fields. |
| Which production templates and bounds apply | **Bounded evidence gate:** caller supplies approved policy artifacts; no raw-text escape when absent. |
| Whether privacy scanners establish zero PII | **Decided:** no; they are additional rejection controls. |
| Whether the model can approve proposals | **Decided:** no. |
| Which proposal schema and atomic-save contract applies | **Bounded evidence gate:** actual supplied definitions; S4 cannot invent them. |
| Which crypto/auth/database helpers to use | **Bounded evidence gate:** existing reviewed adapters only; no custom substitutes. |
| How schema migration is named/registered | **Bounded evidence gate:** actual supplied migration convention. |
| Whether ledger payloads persist indefinitely | **Decided:** terminal ciphertext 24 hours, minimal tombstones 30 days; domain audit retained separately. |
| Which UI to redesign | **Decided:** preserve existing three tabs/routes; update harness states only. |
| Which copy/tokens/layout apply | **Decided:** `02-wireframes.md`; upstream token names reconciled at S0 without changing approved fallbacks. |
| How client/thread races appear | **Decided:** originating scope remains attached; stale confirmations disable; no optimistic server cancellation. |
| Which tests count as production-path evidence | **Decided:** route/database/browser boundary tests; pure helpers do not suffice. |
| Which test framework APIs to copy | **Bounded evidence gate:** supplied installed versions and representative test files. |
| Whether to refactor every oversized module | **Decided:** no; extract touched responsibilities and preserve exports. |
| Whether to enable provider ranking | **Decided:** no; remain documented as unwired. |
| Who approves each slice | **Decided:** commissioned review chain; Fable/approved Claude is Final Decider. |
| Who files this review | **Decided:** caller, under Rule 86; filing is not claimed here. |
| Whether this response authorizes paid calls or deployment | **Decided:** no. |
| How to recover from rollout failure | **Decided:** pause writes, preserve ledger, reconcile outcomes, restore only compatible code. |

**Result:** The package makes the architectural choices explicit, but **does not pass implementation readiness**. Source-dependent decisions are bounded and assigned to S0; they are not silently delegated to a fresh builder. The next authorized step is assembling and adjudicating that source supplement, then implementing one checkpointed slice at a time.
