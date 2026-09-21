**Contract provenance**

Existing behavior comes from the supplied hook, templates, and measured commands. All new exports, the root-pinned entry, and `orientation --json` below are **NEW/UNVERIFIED** until implemented and tested.

**Root resolution**

Each executable resolves its root from its own module location:

```js
// scripts/hooks/lane-session-start.mjs
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// scripts/lane-at-root.mjs
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

Use Node built-ins. Do not resolve the project from caller cwd, a harness environment variable, a Git branch label, or a short agent name.

The invoked checkout owns the command. Launching checkout A’s entry point from checkout B must continue to target A.

**Root-pinned entry**

File: `scripts/lane-at-root.mjs`.

Allowed first arguments:

```text
digest
whoami
claim
release
orientation
```

`orientation` is a planned helper command; the other four are listed in the packet.

Rules:

1. Reject missing or unsupported operations with exit `64`.
2. Pass argv as an array to `spawnSync(process.execPath, ...)`; never through a shell.
3. Delegate to `<ROOT>/scripts/lane.mjs` with `cwd: ROOT`.
4. Preserve arguments exactly, including spaces and quotation characters.
5. For `digest`, `whoami`, and `orientation`, use a 25,000 ms timeout.
6. For `claim` and `release`, impose no new wrapper timeout. These are explicit manual mutations, not startup operations.
7. Inherit stdout/stderr. Preserve the child exit code; map launch errors or signal termination to exit `1`.
8. Never retry automatically. After an interrupted mutation, inspect state before any further mutation.
9. Do not add `doctor`, `snapshot`, or pruning to this wrapper without their behavioral contracts.

**Orientation library**

File: `scripts/lib/lane-orientation.mjs`.

```ts
type OrientationResult =
  | { kind: 'summary'; reason: null }
  | {
      kind: 'degraded';
      reason:
        | 'MISSING_HELPER'
        | 'EMPTY_OUTPUT'
        | 'INVALID_SUMMARY'
        | 'TIMEOUT'
        | 'OUTPUT_LIMIT'
        | 'CHILD_FAILURE';
    };

export function orient(options: {
  root: string;
  execPath?: string; // default process.execPath
  run?: typeof import('node:child_process').execFileSync;
  exists?: (path: string) => boolean;
  emit?: (line: string) => void;
}): OrientationResult;

export function shellCommand(
  shell: 'powershell' | 'posix',
  executable: string,
  args: readonly string[]
): string;
```

`orient` must:

1. Resolve helper, wrapper, and review queue under the supplied root.
2. Check helper existence.
3. Execute the helper with `['digest']`, `cwd: root`, `timeout: 25_000`, `encoding:'utf8'`, `maxBuffer:1_048_576`, and piped stdout/stderr.
4. Classify nonempty stdout as `summary` only when it contains both `[lane] ledger` and `[lane] me:` and contains none of:

```regex
orientation check failed|not a git repository|orientation unavailable|digest produced no output
```

5. Treat this validation as presentation validation only.
6. Emit the fixed status copy, absolute queue path, and recovery commands.
7. Return the result without exiting the process.

Do not emit raw exception messages or captured stderr into startup output. They can contain unrelated paths or sensitive diagnostics. The enumerated reason code is sufficient for this hook.

The executable hook calls `orient({root: ROOT})` and exits zero for handled orientation failures. Interpreter startup errors or external process termination cannot be guaranteed to exit zero.

**Command rendering**

For PowerShell, use `&` and single-quoted arguments; escape an apostrophe by doubling it.

For POSIX shells, single-quote each argument and represent an embedded apostrophe with the standard close/escaped-quote/reopen sequence.

Reject NUL, CR, or LF in command-rendering inputs. This restriction affects printed commands, not lane-file contents.

Examples with synthetic paths:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\fixture repo\scripts\lane-at-root.mjs' 'digest'
& 'C:\Program Files\nodejs\node.exe' 'C:\fixture repo\scripts\lane-at-root.mjs' 'whoami'
& 'C:\Program Files\nodejs\node.exe' 'C:\fixture repo\scripts\lane-at-root.mjs' 'claim'
```

```bash
'/usr/bin/node' '/fixture repo/scripts/lane-at-root.mjs' 'digest'
'/usr/bin/node' '/fixture repo/scripts/lane-at-root.mjs' 'whoami'
'/usr/bin/node' '/fixture repo/scripts/lane-at-root.mjs' 'claim'
```

`claim` with no arguments is packet-reported as working. Its exact resulting fields remain unverified; inspect the resulting own record before editing. Do not promise that it claims a file set automatically.

**Complete discovery**

Proposed command:

```text
lane-at-root.mjs orientation --json
```

It must reuse the existing identity resolver and lane parser. Do not create a second Markdown parser inside the hook.

Required JSON contract:

```ts
type DiscoveryError = {
  code:
    | 'IDENTITY_UNRESOLVED'
    | 'ENUMERATION_FAILED'
    | 'LANE_READ_FAILED'
    | 'LANE_PARSE_FAILED'
    | 'INVALID_TIMESTAMP'
    | 'AMBIGUOUS_PATH'
    | 'OUTPUT_LIMIT';
  laneFile: string | null;
  message: string; // fixed diagnostic; no raw file content
};

type LaneRecord = {
  laneFile: string;       // absolute source filepath; identity key
  agentLabel: string;     // display only, never an identity key
  updatedAt: string | null;
  status: 'in-progress' | 'idle' | 'awaiting-review' | 'blocked' | null;
  task: string | null;
  locks: string[];        // every parsed claim, unchanged
  freshness: 'fresh' | 'stale' | 'unknown';
  errors: DiscoveryError[];
};

type Discovery = {
  schemaVersion: 1;
  root: string;
  ledgerDir: string;
  generatedAt: string;    // ISO-8601 UTC
  staleAfterMinutes: 30;
  self: {
    laneFile: string | null;
    identity: string | null;
  };
  enumeration: {
    entries: number;
    records: number;
    failedReads: number;
  };
  complete: boolean;
  lanes: LaneRecord[];
  errors: DiscoveryError[];
};
```

Rules:

- Include every discovered lane regardless of status, freshness, or empty lock list.
- Preserve static and per-session files as separate records.
- Never merge records by `agentLabel`.
- A resolvable own-lane path may precede creation of its file; that is not automatically an error.
- Every enumerated entry produces a record, including entries with read or parse errors.
- `entries === records === lanes.length`.
- `failedReads` equals records with `LANE_READ_FAILED`.
- `complete` is false for unresolved identity, incomplete enumeration, unreadable/malformed records, ambiguous paths, invalid timestamps, or output failure.
- Missing/invalid/future timestamps produce `freshness:'unknown'`. Future means later than the captured `generatedAt`; do not silently clamp it.
- Exactly 30 minutes old is fresh; greater than 30 minutes is stale.
- Age never removes locks. Nonempty locks on an ostensibly idle record remain visible and require coordination.
- Capture time once per response.
- Stable output ordering is by absolute lane filepath using code-unit ordering.
- No ellipses, “+N more,” or omitted stale paths.
- Exit `0` for complete discovery, `2` for a valid incomplete response, and `1` if a response cannot be produced.
- No file writes, claim changes, pruning, or subprocess retries.

The parser’s actual support for the existing lane formats remains an S2 integration gate. Template conformity alone does not certify real records.

**Claim interpretation**

The packet demonstrates exact paths, directories, `/**` subtrees, and bare filenames. Preserve these strings.

For cooperative decisions:

- Exact paths reserve that path.
- Trailing `/` and `/**` reserve descendants.
- Bare filenames conservatively reserve matching filenames anywhere in the checkout.
- Other wildcard forms, traversal, or uncertain alias resolution are ambiguous; do not infer clearance.
- A short display label never identifies which lane may be written.
- A stale claim is still a claim.

Path matching must use the existing helper’s verified normalization when supplied. If it cannot conservatively resolve an overlap, report uncertainty rather than clear the target.

**Permissions and side effects**

| Operation | Reads | Writes |
|---|---|---|
| Hook/digest/complete discovery | Identity inputs and ledger | None |
| Claim/release | Existing helper’s required inputs | Existing own-lane operation only |
| Review-queue reading | Queue | None |
| Retention | Outside this change | Outside this change |

**Migration, environment, and rollback**

- No database schema, Sequelize models, HTTP endpoints, authentication changes, or new environment variables.
- No lane-file rename, deletion, or normalization migration.
- Preserve `digest` output compatibility; add complete discovery separately.
- Remove startup pruning; do not change the retention policy in this task.
- Roll back integration by reverting the task-owned commit. If reverting the hook restores a known defect, record that regression and use the documented manual root-pinned procedure.
- Never restore an old ledger snapshot over live peer claims.
