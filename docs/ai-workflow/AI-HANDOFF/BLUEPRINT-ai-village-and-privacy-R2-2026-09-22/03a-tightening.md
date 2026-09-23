> Extracted from `03-contracts.md` on 2026-09-22 (Astra R2-A1-05 / D5) so that both
> files satisfy Rule 4's 300-line cap. Content is unmodified; only the extraction
> fences were removed. Verified lossless: `03-contracts.md` = this file + the parent,
> byte-for-byte.

#### 03a-tightening.md

**B-R2-A — Smallest closing changes**

Helper names introduced in this document are proposed implementation seams, not verified existing APIs.

| ID | Current statement | Minimal closing change | Mechanism: function, bytes, assertion | Test that proves it | Risk |
|---|---|---|---|---|---|
| A1-01 | Product/dev sharing unproved. | Map imports and outbound callers before changing either layer. | S0 caller graph distinguishes product `aiPrivacyService` from Village admission. | `T-S0-01` plus caller integration cases. | Low; avoids changing product behavior accidentally. |
| A1-03 | Channel coverage unknown; shared CLI control now demonstrably missing. | Guard `runCodexSubscription()` itself and migrate callers. | Require envelope; scan and compare final stdin bytes; reject before `processRunner`. | `T-SUB-01`–`04`. | High compatibility impact; bare callers intentionally stop working. |
| A1-04 | Subscription does not prove automation entitlement. | Add route-specific evidence to admission. | Route resolver refuses absent, changed or incompatible evidence. | `T-ROUTE-01`, `02`. | Low; routes may remain blocked. |
| A1-06 | Remit correction scope unclear. | Change only frozen-role-derived authority in relevant remit construction. | No model name automatically grants final project authority. | `T-ROLE-01`, `02`. | Low if scoped; verify all consumers. |
| A1-07 | Council assurances unproved. | Route Council through the same enforced boundary. | Exercise actual Council request construction through final writer. | `T-SUB-02`, `T-ROLE-02`. | Medium; MCP error behavior must remain intelligible. |
| A1-09 | Narrow-lens instruction remains live. | Replace the exclusionary sentence. | Common remit covers the entire admitted packet for every seat. | `T-ROUND-01`. | Low; existing prompt snapshots may change. |
| A1-10 | Budget principles lack route terms. | Freeze verified route terms and reserve before send. | Atomic reservation checks profile, exact limits and maximum cost. | `T-BUDGET-01`–`04`. | Medium; quota and uncertain execution require reconciliation. |
| A1-12 | Plan references an absent constant. | Remove the invented implementation claim; test actual resolver. | Canonical allowlist rejection, including prohibited aliases. | `T-ROUTE-03`. | Low; unknown aliases become denied. |
| A1-13 | Retired route references remain. | Complete the 14-reference inventory; migrate only to selected proven routes. | Every reference has disposition and caller evidence. | `T-S0-02`, `T-ROUTE-01`. | Medium; no replacement is currently evidenced. |
| R1 finding bodies not supplied | Five further findings are unidentifiable from this corpus. | Recover their exact IDs, text and evidence. | One-to-one closure ledger against original review. | `T-S0-03`. | Unknown until supplied. |
| Prior D1 | Scanned/sent mismatch remains open. | Move assertion to the final writer and recover the original canary. | Capture actual outbound bytes; reject appended or substituted content. | `T-BYTE-01`–`04`. | Medium; previously tolerated transformations become failures. |
| Prior D4 | PRIVATE dispute unresolved. | Add explicit pending policy state. | `UNDECIDED` cannot produce a dispatchable envelope. | `T-POLICY-01`–`03`. | Low for the new lane; no existing workflow rewrite. |

**Original 29-ban ledger**

[UNKNOWN] Its text and numbering are not supplied. A truthful one-row-per-original-ban closure table cannot be produced from this packet. S0 must recover it; no row below pretends to be one of those original 29 bans.

**Supplied dispatch bans**

| ID | Current statement | Minimal closing change | Mechanism: function, bytes, assertion | Test that proves it | Risk |
|---|---|---|---|---|---|
| Dispatch-1 | No repository-inspection claim. | Already minimal. | Evidence labels distinguish packet support from reproduction. | `T-DOC-01`, manual evidence audit. | Low. |
| Dispatch-2 | VERIFIED means packet-supported. | Already minimal. | Preserve provenance on each empirical claim. | `T-DOC-01`. | Low. |
| Dispatch-3 | No verified served identity. | Store requested and served identity separately. | Unobservable served identity remains null. | `T-ROUTE-04`. | Low. |
| Dispatch-4 | Console upgrades cannot require engine changes. | Require console-absent equivalence. | Consume existing published artifacts only. | `T-CONSOLE-01`. | Low. |
| Dispatch-5 | Do not decide PRIVATE policy. | Encode `UNDECIDED`. | Block restricted dispatch pending Sean’s decision. | `T-POLICY-01`. | Low. |
| Dispatch-6 | No Kimi or Astra Pro substitution. | Canonicalize through an explicit allowlist. | Reject prohibited targets and unknown aliases before reservation. | `T-ROUTE-03`. | Low. |
| Dispatch-7 | No history deletion or other-copy changes. | Already minimal; preserve before migration. | Snapshot and reference inventory; scoped writes only. | `T-S0-03`, manual diff audit. | Low. |
| Dispatch-8 | Do not inflate findings. | Already minimal. | Separate reported defects, candidates and unknowns. | Manual evidence audit. | Low. |
| Dispatch-9 | Do not fill unknowns with assumptions. | Make missing evidence a blocking state. | Route, policy and capability admission deny unknown inputs. | `T-ROUTE-01`, `T-POLICY-01`, `T-SUB-04`. | Low. |
