**Cross-harness coordination discovery — specification v1, 2026-09-20**

Target package location:

`docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coordination-discovery-2026-09-20/`

**Outcome:** a fresh seat can identify its own lane, discover every peer claim, read its review queue, and reach an explicit cooperative edit decision without guessing filenames or relying on abbreviated output.

**Readiness:** the wrapper, hook, documentation policy, and isolated tests are specified here. Integration with the existing lane parser and identity resolver is **UNVERIFIED** until S2’s source supplement is supplied. No runtime checks or secret scan were run during this review.

**Evidence baseline**

| Item | Status |
|---|---|
| Existing hook and regression test source | [VERIFIED] supplied verbatim |
| Existing README, protocol, WorkBuddy config, Cursor rule, Copilot block | [VERIFIED] supplied verbatim |
| Current digest presentation | [VERIFIED] one supplied measurement |
| `e8072247d` provenance | [VERIFIED] packet-reported abbreviated commit and checks |
| Full commit ID, exact committed four-file contents, dirty-tree diff identity | [UNKNOWN] |
| `lane.mjs`, identity resolver, parser, prune implementation, mirror generator | [UNKNOWN] source absent |
| Native harness invocation and timeout semantics | [UNKNOWN] |

**Requirements and acceptance**

| ID | Requirement | Observable acceptance |
|---|---|---|
| R01 | Root-independent invocation | Actual delegate cwd equals the entry point’s owning checkout root from root, subdirectory, and outside launches. |
| R02 | Complete discovery | Every enumerated lane has a returned record or an explicit error; no omitted locks or summary ellipses. |
| R03 | Unambiguous self identity | Response supplies the resolved own-lane filepath independently of display labels. |
| R04 | Conservative claim handling | Stale, malformed, and uncertain records cannot silently clear targets. |
| R05 | Honest failure behavior | Startup remains available; degraded orientation is explicit and does not authorize editing. |
| R06 | Read-only startup | Hook performs discovery only; it never claims, releases, prunes, or writes ledger files. |
| R07 | Consistent instructions | Authoritative specifications and all seven harness surfaces teach the same command and limitations. |
| R08 | Verified harness coverage | Configuration and actual execution have separate evidence states. |
| R09 | Isolated verification | Tests cannot reach the real ledger, real retention operation, production database, or network. |
| R10 | Safe delivery | Shared changes remain intact; canonical documentation and generated mirrors agree in the candidate commit. |

**Scope**

In: orientation hook, root-pinned command entry, complete read-only discovery contract, discovery documentation, harness wiring evidence, regression tests.

Out: ledger ownership redesign, distributed locking, atomic edit authorization, automatic stale-claim reclamation, retention implementation, product UI, database changes, production deployment.

**Builder contract**

> Implement one slice at a time. Follow the specified interfaces and invariants. Return the diff and actual acceptance evidence at each checkpoint. Do not replace a missing integration fact with an assumption. A missing source supplement stops only its dependent slice. Do not claim a test passed without its result. Do not introduce provider calls, subscriptions, or paid review runs.

**Build order:** S0 preservation → S1 root-pinned orientation → S2 complete discovery → S3 documentation and harness adapters → S4 integration and delivery.
