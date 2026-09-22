**N/A — headless HTTP service.** This scope contains no browser pages, desktop screens, 375px mobile screens, palette tokens, navigation, focus behavior, or touch controls. No UI is invented to satisfy the document list.

Caller-visible states are JSON contracts:

| State | Exact safe message |
|---|---|
| Disabled provider | `This provider is disabled.` |
| Missing executable observation | `This execution profile has not been verified as runnable.` |
| Unbound seconds | `This profile does not accept duration in seconds.` |
| Unknown price bound | `A maximum charge has not been established for this request.` |
| Pending reconciliation | `Execution outcome is unknown. The request will not be resubmitted automatically.` |
| Unsupported cancellation | `This job cannot currently be canceled safely.` |
| Quote drift | `The quoted execution contract changed. Request a new quote.` |
| Accounting unavailable | `Accounting state is unavailable. New jobs are blocked.` |
| Arithmetic-only estimate | `Published-rate arithmetic only. This is not a charge bound or permission to execute.` |

Error messages never include prompts, credentials, signed URLs, internal paths, raw backend exceptions, or private operator details.
