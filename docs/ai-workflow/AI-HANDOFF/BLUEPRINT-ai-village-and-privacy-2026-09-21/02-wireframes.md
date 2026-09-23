**W1 — Applicability**

Desktop wireframes: **N/A — proposed headless CLI/MCP engine, no desktop screen.**

375px mobile wireframes: **N/A — proposed headless CLI/MCP engine, no mobile screen.**

Palette tokens, touch targets, focus order, and responsive layouts: **N/A — no rendered user interface is proposed.**

Existing application screens: **N/A — scope-bounded consult, no repository surface in scope.**

**W2 — Exact terminal copy**

Terminal status must remain understandable without color. Use the following strings; substitute only the bracketed values.

| State | Exact copy |
|---|---|
| Preflight | `Checking packet, routes, and budget.` |
| Invalid provenance | `Dispatch blocked: artifact provenance is not admissible.` |
| Unknown field | `Dispatch blocked: the packet contains an undeclared field.` |
| Missing route proof | `Dispatch blocked: route evidence is missing, expired, or incomplete.` |
| Kimi selected | `Dispatch blocked: Kimi is prohibited for this workflow.` |
| Billing mismatch | `Dispatch blocked: this profile does not permit the selected billing route.` |
| Unsupported context | `Dispatch blocked: the adapter cannot prove its outbound content boundary.` |
| Approval | `Stage prepared. No provider call has been made for this stage.` |
| Changed content | `Dispatch blocked: approved content has changed.` |
| Review progress | `Review round [round] of at most [maxRounds].` |
| Budget stop after complete round | `No further review round fits the budget. Adjudication remains reserved.` |
| Incomplete review | `Run blocked: a selected review is missing, invalid, or incomplete.` |
| Ambiguous execution | `Run blocked: provider execution is uncertain. No retry was made.` |
| Adjudication | `Fresh adjudication prepared. Separate stage approval is required.` |
| Cancel | `Cancelled. No additional provider calls will be made.` |
| Report | `Report ready: [APPROVE|REVISE|INCONCLUSIVE]. Scope: supplied corpus only.` |
| Archive pending | `Archive filing is pending. This run is not marked complete.` |

**W3 — Approval display**

```text
Stage prepared. No provider call has been made for this stage.

Run: [runId]
Stage: [stageId]
Mode: [independent|debate]
Profile: [subscription|special]
Reviewers: [exact selected route identities]
Adjudicator: [exact selected route identity]
Stage digest: [sha256]
Maximum additional calls: [integer]
Maximum additional input/output tokens: [integer]
Maximum additional API spend: [currency and amount]
Reserved adjudication capacity: [calls, tokens, spend]
Evidence expires: [timestamp]
```

No secret, raw personal-data match, local username, credential-bearing URL, or unfiltered provider error may appear in this display.
