| Module/path | Disposition | Reason |
|---|---|---|
| First-mounted workout controller | RETAIN | Actual caller; repair here. |
| Shadowed workout CRUD handlers | QUARANTINE | Remove only after mounted contract tests and consumer inventory prove replacement parity. |
| `/start`, `/:id/end`, statistics handlers | RETAIN | Not proven redundant; preserve separately tested behavior. |
| Legacy cart webhook | RETAIN | Compatibility alias delegates to one dispatcher until provider configuration is verified. |
| `SessionAllocationService` | RETAIN as adapter | Active ACH/admin callers; implementation must converge. |
| Unified allocator method | RETAIN as adapter | Active scheduling callers. |
| Cart grant service | RETAIN as adapter | Active verify/webhook/manual callers. |
| Existing source-contract tests | RETAIN | Useful tripwires; excluded from runtime-proof claims. |
| Automatic production sync | QUARANTINE from production startup | Explicit repair tooling may remain separately gated. |
| `getUsers` alleged dead export | QUARANTINE | No deletion without importer and runtime reachability evidence. |
| Existing logs or token-like artifacts | QUARANTINE operationally | Do not open, delete, or rotate blindly during review; handle through authorized retention/credential procedure. |
| Unrelated dirty and incident-survival files | RETAIN | Outside campaign ownership. |

No DELETE disposition is authorized in this pass.
