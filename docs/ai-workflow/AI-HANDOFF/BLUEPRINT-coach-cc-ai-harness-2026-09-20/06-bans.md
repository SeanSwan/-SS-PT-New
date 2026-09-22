**Authority and evidence**

- Do not describe this package as implementation-verified, installed, or deployed.
- Do not convert supplied file inventories into runtime coverage claims.
- Do not infer omitted code, model fields, dispatcher effects, or review outcomes.
- Do not treat passing mocked tests as database, browser, or provider proof.
- Do not replace historical documents or alter their verdicts into correctness.
- Do not call archive filing Rule 74; it is Rule 86.
- Do not label this advisory review a Final Decider approval.

**Command and model safety**

- Do not create a second destructive/write command registry.
- Do not let client role, route context, previous context, displayed parameters, or model output authorize an action.
- Do not route command errors, unsupported writes, denied operations, or unknown outcomes into chat.
- Do not execute from a null operation ID or reconstruct an operation from card contents.
- Do not approve or confirm on behalf of a user merely because the model says to.
- Do not claim browser event delivery is a database commit.
- Do not claim universal exactly-once execution.
- Do not automatically repeat an interrupted mutation with a new request key.
- Do not permit unsupported external/browser effects through the transactional guarantee.
- Do not bypass chat subscription guards via command fallback.
- Do not silently change default-enabled kill-switch semantics.
- Do not let proposals bypass current access checks or the write pause.
- Do not introduce automatic provider retries, failover, or paid calls without the applicable authorization.

**Privacy**

- Do not send raw messages, client names, medical histories, private notes, or unrestricted context to providers.
- Do not treat a regular-expression scanner as proof that arbitrary prose contains no identifying information.
- **Do not treat a successful scanner invocation as the release predicate.** A clean scan is one clause of a conjunction — the predicate is defined in `privacy-boundary@1.2.0` §6 (`BLUEPRINT-swan-coach-live-2026-09-20/03c-release-predicate.md`), and the detector provably does not see names. Round-3 **R3-03**.
- **Do not let a generic `catch` absorb a privacy rejection.** It must stay a typed, non-retriable error; `classifyIntent`'s `catch` (`intentClassifier.mjs:170`) otherwise turns it into a chat fallback and `503 PRIVACY_UNAVAILABLE` becomes unreachable. Round-3 **D-B**.
- **Do not treat `routeContext` as bounded-and-therefore-handled.** It is a live, unscanned channel emitting **seven** fields (`intentClassifier.mjs:28-51` → `:116` → `:133`); normalization constrains shape, never content. Round-3 **D-A**.
- Do not interpolate retrieved note text into executable instructions.
- Do not log raw messages, provider bodies, decrypted operation parameters, credentials, or private infrastructure values.
- Do not persist new raw drafts in browser storage.
- Do not invent encryption or secret-rotation mechanisms.

**Implementation**

- Use existing React/TypeScript, Express/Sequelize, and styled-components patterns.
- No Material UI.
- No new chart is required; if a separately approved chart is added, use Victory.
- No new file or touched module over 300 lines.
- Use `css` for shared styled-components fragments.
- Use token-backed colors, dark-first surfaces, 44px controls, accessible focus, and reduced motion.
- Use “stretching” or “flexibility,” not yoga/meditation language.
- Any future foreign key to users references the actual `"Users"` table and verified column type; do not invent one for the proposed ledger.
- Do not create a competing Coach page or a second command dispatcher system.
- Do not activate dormant provider ranking merely because it has tests.
- Do not mix unrelated dead-code deletion or repository cleanup into this build.

**Workspace and release**

- Read supplied coordination ownership before edits; never overwrite another agent’s work.
- Never `git add -A`.
- Never reset/clean the shared dirty tree.
- Remediation occurs in an isolated, snapshot-bound worktree under the approved workspace.
- No commit, push, or deployment without Sean’s explicit authorization.
- Commit format, when authorized: `type(scope): description`.
- Never run integration tests against a database merely because it is configured as “local.”
