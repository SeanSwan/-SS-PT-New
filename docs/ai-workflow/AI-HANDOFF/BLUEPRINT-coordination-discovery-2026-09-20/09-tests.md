**Status: NOT RUN.** These are implementation acceptance tests, not historical pass claims. The supplied existing script has 13 assertions across six hook invocations; this package replaces that live-resource test design.

**Test environment**

- Node’s built-in `node:test` and `node:assert/strict`.
- No new test framework.
- Each subprocess case uses its own temporary directory created by `mkdtempSync`.
- Fixture root includes spaces and contains `scripts/hooks`, `scripts/lib`, and `backend`.
- Copy only the three task-owned runtime files into the fixture.
- Write a synthetic `scripts/lane.mjs` that reports its actual cwd/argv and supports controlled success/failure modes.
- Write a synthetic prune script that creates a sentinel if invoked.
- Run outside-root cases from another directory inside the same temporary fixture.
- Before recursive cleanup, verify the resolved target is the exact directory created by the fixture helper and lies inside the intended temporary parent.
- No symlink to the real ledger, Git checkout, database, or network endpoint.

**S1 commands**

```text
node --test scripts/hooks/lane-session-start.test.mjs scripts/lane-at-root.test.mjs
```

**File: `scripts/hooks/lane-session-start.test.mjs` — 13 named cases**

| Case name | Fixture/action | Required observable result |
|---|---|---|
| `orients from root with pinned delegate cwd` | Launch copied hook at fixture root | Summary; delegate reports fixture root. |
| `orients from backend with pinned delegate cwd` | Launch from fixture `backend/` | Same result. |
| `orients from outside with pinned delegate cwd` | Launch from sibling scratch directory | Same result; removing `cwd` makes this fail. |
| `missing helper is degraded and exits zero` | Remove fixture helper before launch | `MISSING_HELPER`, exit 0, recovery and queue still shown. |
| `empty stdout is degraded` | Helper exits 0 without stdout | `EMPTY_OUTPUT`; no summary state. |
| `partial markers are degraded` | Helper emits only `[lane] ledger` | `INVALID_SUMMARY`. |
| `failure text overrides summary markers` | Emit both markers plus known failure text | `INVALID_SUMMARY`. |
| `nonzero child is degraded` | Helper exits 7 | `CHILD_FAILURE`, hook exits 0. |
| `timeout is classified with configured options` | Inject `run` that asserts cwd/25,000 ms and throws `ETIMEDOUT` | `TIMEOUT`; no retry. This is a unit boundary, not timing proof. |
| `output overflow is degraded` | Inject the Node overflow error shape | `OUTPUT_LIMIT`; no partial summary presented as success. |
| `orientation never invokes pruning` | Successful hook with sentinel prune script present | Sentinel absent; ledger fixture bytes unchanged. |
| `recovery uses absolute root-pinned entry and actual interpreter` | Paths contain spaces and apostrophes | Correct separately labelled shell commands; absolute queue path. |
| `summary never grants edit clearance` | Marker-valid digest with zero apparent locks | `status=summary; edit-clearance=unverified`. |

**File: `scripts/lane-at-root.test.mjs` — seven named cases**

| Case name | Action | Required result |
|---|---|---|
| `pins root from root cwd` | Run `digest` | Fixture-root cwd. |
| `pins root from nested cwd` | Run `digest` from backend | Fixture-root cwd. |
| `pins root from unrelated cwd` | Run `digest` from sibling scratch | Fixture-root cwd. |
| `preserves argv without shell interpretation` | Forward synthetic claim arguments containing spaces, quotes, `$()`, and backticks | Delegate receives identical strings; no shell effects. |
| `propagates child exit status` | Fixture child exits 7 | Wrapper exits 7. |
| `rejects unsupported operations` | Run an unsupported operation | Exit 64; child never invoked. |
| `uses entry checkout instead of caller checkout` | Invoke fixture A entry from fixture B | Delegate belongs to A and runs in A. |

The claim case uses a synthetic child only; it must not call the real claim implementation.

**S2 command**

```text
node --test scripts/lane-discovery.contract.test.mjs
```

**File: `scripts/lane-discovery.contract.test.mjs` — 16 named cases**

These cases must execute the actual integrated helper against synthetic filesystem records, not merely validate hand-authored JSON.

| Case name | What it proves |
|---|---|
| `includes static and session lanes` | Both naming schemes survive enumeration without a fixed list. |
| `includes the sixth and later lock` | No digest-style lock truncation reaches complete discovery. |
| `includes every stale lane and lock` | Old claims remain individually discoverable. |
| `includes in-progress lanes with empty locks` | Orientation is not limited to lock holders. |
| `preserves duplicate display labels as distinct records` | Labels are not identity keys. |
| `returns exact resolved self lane path` | No filename reconstruction from `me:` text. |
| `allows resolved self before first claim file exists` | A fresh session can discover its intended own file. |
| `unresolved identity makes response incomplete` | Unknown ownership cannot produce clearance. |
| `thirty-minute boundary is consistent` | At 30 minutes: fresh; just beyond: stale. |
| `invalid or future timestamp remains unknown` | Invalid age does not silently become fresh. |
| `malformed lane remains visible with error` | Parser failure is represented, not dropped. |
| `unreadable lane remains visible with error` | Read failure cannot shrink the apparent inventory. |
| `enumeration failure makes response incomplete` | Partial directory visibility is not treated as complete. |
| `filesystem inventory equals returned accounting` | Every fixture entry maps to a response record; omission fails. |
| `discovery performs no writes` | Before/after ledger bytes and directory entries match. |
| `exact directory subtree and basename claims remain conservative` | Demonstrated claim forms are preserved; uncertain forms cannot clear a target. |

For permission-denial cases, use a deterministic filesystem seam where OS permissions cannot reliably induce denial. Label that boundary as mocked and retain a separate real-filesystem test where supported.

**S3 commands**

```text
node --test scripts/coordination-docs.test.mjs
node scripts/sync-agents-mirror.mjs --check
```

**File: `scripts/coordination-docs.test.mjs` — six named cases**

1. `all seven harness surfaces contain the coordination procedure`
2. `authoritative specs require complete discovery before editing`
3. `operational sections contain no fixed seat-file discovery list`
4. `operational sections use thirty-minute warnings without automatic release`
5. `operational sections do not claim digest returns an own filepath or every lock`
6. `capability and execution claims match the harness evidence matrix`

Historical incident quotations may retain obsolete commands when explicitly labelled historical. Tests must inspect the operational sections rather than reject every occurrence of `claude.lane.md`.

**Negative evidence requirements**

- A module import/setup error is not valid RED proof.
- Restore each deliberately mutated implementation before the normal suite.
- A fixture pass does not prove the real parser, Git behavior, or harness event worked.
- A mirror check against the shared dirty tree does not prove the committed candidate is consistent.
- A successful secret scan does not prove runtime correctness.

**Coverage traceability**

| Requirement | Tests/evidence | Slice |
|---|---|---|
| R01 | Hook cwd cases; wrapper cwd and checkout cases | S1 |
| R02 | Complete inventory, later locks, stale/empty records | S2 |
| R03 | Self path, duplicate labels, first-claim identity | S2 |
| R04 | Staleness, invalid timestamps, malformed/ambiguous records | S2 |
| R05 | Missing/empty/invalid/error/timeout/overflow and summary state | S1 |
| R06 | Prune sentinel and no-write comparison | S1–S2 |
| R07 | Six documentation checks plus mirror check | S3 |
| R08 | Native harness matrix and event captures | S3 |
| R09 | Fixture isolation, cleanup containment, no real dependencies | S1–S3 |
| R10 | Candidate-commit checks and scoped diff review | S4 |

GUI accessibility, responsive layouts, database migration/restore, HTTP authentication, and network retries are **N/A — those surfaces are absent**. Plain-text readability, argument integrity, interruption, recovery, and cooperative race limitations remain applicable and are covered above.
