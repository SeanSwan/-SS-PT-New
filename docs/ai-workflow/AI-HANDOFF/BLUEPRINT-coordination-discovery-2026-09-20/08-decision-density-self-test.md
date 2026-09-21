# PART C — Decision-Density Self-Test

> Every remaining builder choice: decided-in-package, or delegated-with-bounds.

---

| Remaining builder choice | Decision or bounded delegation |
|---|---|
| Which checkout owns an invocation? | The checkout containing the executable entry point. |
| Which interpreter runs the child? | `process.execPath`. |
| What is the child cwd? | That entry point’s resolved root. |
| Is `digest` complete discovery? | No; startup summary only. |
| How is self identity established? | Existing authoritative resolver must return the exact lane filepath; no label-derived filenames. |
| How are static and session files handled? | Both retained independently. |
| Are empty and stale claims shown? | Yes, without omission. |
| Which age threshold applies? | Greater than 30 minutes; age never releases a lock. |
| What happens to invalid timestamps or unreadable records? | Explicit errors and incomplete discovery. |
| How are directory/basename claims interpreted? | Conservatively; uncertain overlaps defer editing. |
| Does the workflow guarantee mutual exclusion? | No; cooperative checking with a post-claim recheck. |
| Does the hook block session startup on discovery failure? | Handled failures exit zero with degraded status; editing remains deferred. |
| Does startup prune logs? | No. |
| What are timeout budgets? | Read child: 25 seconds; verified outer allowance: at least 35 seconds; measured acceptance still required. |
| Are mutation operations retried or newly time-limited? | No automatic retries and no new wrapper mutation timeout. |
| How are recovery commands made executable? | Root-pinned entry, actual interpreter, explicit PowerShell/POSIX quoting. |
| May a new lane parser be invented from the template? | No. S2 requires the supplied authoritative implementation and fixtures. |
| What is the new machine command? | `orientation --json`, explicitly NEW/UNVERIFIED until S2 passes. |
| What may a context-free builder implement immediately? | S1 from the supplied hook pattern and exact contracts, inside isolated fixtures. |
| What additional source is required? | The bounded S2 source supplement and S3 canonical/generator inputs. |
| Which harness hooks are considered working? | Only those with actual invocation evidence; currently none independently verified here. |
| How are unsupported harness events handled? | Record unsupported; do not claim coverage. |
| How are shared documentation changes landed? | Coordination-only canonical edits and mirror regeneration in an isolated candidate checkout. |
| Can unrelated Rule-86 changes be included? | No. |
| What implementation details may the builder choose? | Internal local names and test-helper factoring only, within the signatures, behavior, isolation, and 300-line limits. |
| Who supplies runtime receipts and archive filing? | Caller/integrator; no completion is claimed here. |
| What stops advancement? | Failed checkpoint, missing dependent source, incomplete discovery, unresolved ownership, or unsupported evidence claims. |

**Decision-density result:** no silent material choices identified. The remaining source and runtime boundaries are explicitly assigned and constrained. **The package is a specification; integrated implementation and cross-harness verification remain pending.**
