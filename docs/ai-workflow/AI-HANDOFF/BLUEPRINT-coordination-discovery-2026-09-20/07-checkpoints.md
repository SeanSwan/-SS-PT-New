**Checkpoint decision**

Use `PASS`, `REVISE`, or `HALT`.

- `PASS`: slice criteria have actual evidence and no unresolved material drift.
- `REVISE`: specific, bounded corrections are required.
- `HALT`: a necessary source, identity, ownership, or execution boundary remains unavailable.

A checkpoint does not authorize provider spend or change the project’s final-decider chain.

**Reusable review remit**

> Review only the supplied slice diff and evidence. Verify cwd, complete discovery, own-lane identity, stale/empty/ambiguous records, error behavior, side effects, harness invocation, and candidate provenance. Each finding needs file:line or artifact-section evidence and a concrete correction. Distinguish fixture tests from real-helper integration and configuration from observed hook execution. Return PASS, REVISE, or HALT.

**Required checkpoint record**

```text
Slice:
Base commit:
Candidate commit or diff hash:
Files changed:
Requirement IDs:
Commands and exit codes:
Fixture/integration boundary:
Observed failures:
Mutation-test results:
Harness/version/event evidence:
Unverified items:
Reviewer:
Verdict:
Archive review_id:
Next permitted slice:
```

Do not invent missing hashes, reviewer identities, or archive IDs.

**Harness evidence matrix**

| Harness | Supplied configuration/instruction evidence | Execution status |
|---|---|---|
| Claude Code | Hook wiring reported; settings source absent | UNVERIFIED |
| Codex | Instruction references reported | UNVERIFIED |
| OpenCode | Instruction/seat references reported | UNVERIFIED |
| WorkBuddy | Four event configurations supplied | UNVERIFIED |
| Cursor | `alwaysApply` instruction supplied | UNVERIFIED loading; no supplied hook |
| Copilot | Instruction block supplied | UNVERIFIED loading and hook capability |
| Gemini CLI | New instruction file reported | UNVERIFIED contents, loading, and execution |

For each automatic claim, capture:

- Harness version and operating system.
- Actual command shell.
- Event: startup, resume, clear, or compact where supported.
- Starting cwd and resolved checkout.
- Hook invocation and completion output.
- Effective timeout behavior.
- Whether output reached the agent before its first edit.

Unsupported events must be recorded as unsupported, not silently counted as passed.

**Performance acceptance**

The 25-second read timeout and minimum 35-second outer allowance are provisional design values.

On the target machine, record ten root launches, ten subdirectory launches, and ten outside-root launches. Use read-only orientation only. Report median, p95, maximum, and timeout count. Acceptance for the provisional budget requires all thirty to complete within the child deadline and no harness truncation. Otherwise return REVISE.

**Documentation delivery**

1. Use an isolated checkout of the recorded base.
2. Apply coordination-only changes to its canonical documents.
3. Regenerate mirrors there.
4. Run the mirror check.
5. Inspect the candidate diff for unrelated content.
6. Create the candidate commit under existing authority.
7. Run the mirror check against that committed candidate.

Preserve shared dirty files throughout. If required canonical source or generator behavior is unavailable, retain the documentation slice as pending.

**Review filing**

The caller files Parts A1 and A2 and the final package under Rule 86, preserving the supplied source identity and linking later verification as a new review. This response makes no archive-completion claim.
