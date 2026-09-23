# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-slice2-hostile-review-2026-08-20.md
**Seed:** (none)
**Tokens:** 85284 in / 48315 out · **Cost:** ~$0.9379 · **Wall:** 332.7s

---

# Opening scope

**Overall finding:** this is not presently a fail-closed privacy boundary. It is a collection of useful checks with several direct CLEAN-producing bypasses. The most serious are:

1. **The agent can modify the gate, hook wiring, disable state, transcript and telemetry under the stated same-privilege threat model.**
2. **`git commit` is allowed without scanning staged PII at all.**
3. **The first privacy block can be bypassed on the next Stop through `stop_hook_active`.**
4. **Malformed stdin and an unreadable transcript return silently without passing through `runGate`.**
5. **Files over 2 MiB and many filesystem errors are silently skipped.**

The attack surfaces the remaining reviewers should concentrate on are:

- **Control-plane integrity:** hook configuration, module source, imports, disable markers, environment variables.
- **Evidence provenance:** transcript mutability, telemetry forgery, mutable `.gitignore`, mutable git index/config.
- **Time-of-check:** writes after scanning, staged blobs differing from the worktree, persistent subprocesses and symlink swaps.
- **Filesystem semantics:** symlinks/junctions, path canonicalization, case-insensitive filesystems, unusual filenames, encoding and size limits.
- **Git execution:** aliases, wrappers, compound commands, alternate commit-producing commands, index-only content.
- **Resource/error behavior:** unbounded stdin/transcripts/artifact counts, subprocess argument limits, swallowed `stat` errors, OOM before a block payload is emitted.
- **Contract enforcement:** malformed/async check returns and code paths that never enter `runGate`.

**Load-bearing questions:** 1, 3, 4, 5, 6, 7, 9 and 10. Question 2 is also load-bearing for the actual privacy claim, though it cannot solve the integrity problem. Question 8 is secondary but still valid because filenames and exception messages are unredacted. No whole question is decoration; the specific catastrophic-regex hypothesis in Q3 is a red herring because these regexes are bounded.

---

## 1. Transcript-derived scan set

**CRITICAL — the known Bash gap is a complete bypass, not a marginal coverage hole.**

A concrete path is already supplied:

```sh
cat > docs/ai-workflow/brainstorms/leak.md <<'EOF'
Client: Jane Smith
Email: jane.smith@gmail.com
EOF
git add docs/ai-workflow/brainstorms/leak.md
git commit -m leak
```

The Bash write produces no `artifacts`. Worse, the commit pretool check does not scan PII, so the commit can complete before Stop runs.

Additional misses include:

- `MultiEdit`, `ApplyPatch`, differently cased names, MCP write tools and future tools not exactly in `WRITE_TOOLS`.
- `NotebookEdit` implementations using `notebook_path`, or tools using `filename`, `target`, `files[]`, URI fields or nested operations.
- A recognized Write to a temporary path followed by Bash `mv` into `brainstorms/`.
- `cp`, `install`, archive extraction, build generators, formatters, git checkout and tools whose advertised purpose is not writing.
- A subprocess started by any tool that continues writing after the tool invocation completes.
- Writes through a symlink alias whose lexical path is not LLM-bound.
- Tool entries in malformed transcript lines, because `parseTranscript()` silently discards them.
- Writes before an injected or forged user-shaped transcript entry, because `analyzeTurn()` resets at the last “real user” line.
- On case-insensitive Windows filesystems, `Brainstorms/leak.md` refers to the same directory but fails the case-sensitive regex.

**HIGH — a git working-tree diff is better evidence than tool narration, but it is not a sufficient redesign.**

`git diff --name-only` misses untracked files. `git status --porcelain=v2 -z --untracked-files=all` adds untracked nonignored files, but still misses:

- untracked ignored emissions;
- files outside the repository;
- files hidden by submodules or symlink aliases;
- skip-worktree/assume-unchanged cases;
- content restored after the status/scan;
- files concealed by direct manipulation of the mutable index;
- ignored LLM roots, which are specifically among the high-value targets.

The correct design is layered:

1. **At Stop, enumerate the fixed LLM-readable roots from trusted configuration and scan their current regular-file contents, including ignored and untracked files.** Do not derive security coverage from tool names.
2. **At commit, scan the staged blobs from the git index**, not working-tree files and not transcript paths.
3. If attribution to “this turn” is required, capture a pre-turn hash/snapshot manifest in storage the agent cannot modify. Without privilege separation, trustworthy turn attribution is impossible.
4. Treat git status as an optimization hint only. A status miss must not exclude a configured LLM-readable path.
5. Explicitly configure any LLM-readable paths outside the repository.

Scanning all configured roots may surface pre-existing PII and cost more on a large tree. The safe ways to handle that are a protected baseline of reviewed hashes or a one-time migration, not an agent-writable transcript-derived allowlist.

---

## 2. False negatives in `scanText`

**HIGH — the scanner misses the most likely privacy record in this business: a named person associated with health or schedule information.**

Ranked by likely occurrence:

1. **Names tied to injuries, appointments or training notes.**

   Failing input:

   ```text
   Sarah Johnson — torn ACL; rescheduled to Tuesday at 6pm.
   ```

   None of the six patterns matches. The source admits names are out of scope, which is honest, but the resulting boundary is not a general client-privacy boundary.

2. **Compact and international phone numbers.**

   ```text
   Text Sarah on 4155550198.
   WhatsApp: +44 7700 900123
   ```

   Both pass.

3. **Natural-language and ISO dates of birth.**

   ```text
   Sarah was born April 11, 1983.
   DOB: 1983-04-11
   Birthday is 11 April 1983.
   ```

4. **Common address forms.**

   ```text
   12 W 34th St, Apt 5B
   PO Box 812
   1600 pennsylvania avenue
   ```

   Directionals, unit numbers, PO boxes and lowercase street names pass.

5. **Payment identifiers outside the selected card table.**

   Routing/account numbers and IBANs are not checked. Valid 19-digit Visa numbers are also omitted from `CARD_SHAPES`; for example, `4000000000000000006` is Luhn-valid and begins with Visa’s prefix, but the 19-digit table accepts only Discover prefixes.

6. **Email representations that a model or human readily reconstructs.**

   ```text
   jane.smith [at] gmail [dot] com
   jane.smith@GMAIL．COM
   ```

   Unicode punctuation and ordinary obfuscation pass.

**Best single additional pattern by net value:** a **context-bound compact US phone pattern**, rather than a general name regex:

```regex
\b(?:phone|mobile|call|text)\s*[:=]?\s*(?:\+?1)?\s*\d{10}\b
```

This catches the very common `Phone: 4155550198` form with relatively modest false-positive cost. It can still block ten-digit member/order IDs after words such as “call”, so corpus testing is required.

A labeled-name pattern such as `Client: Sarah Johnson` would buy more raw recall, but it would also block templates, fictional examples, staff names and ordinary prose. It should not become a hard-block pattern without a reviewed baseline or a separate contextual classifier.

**MEDIUM — the email allowlist creates direct false negatives.**

Any address beginning with `user@`, `admin@`, `support@`, `test@`, `you@` or `someone@` is exempt on every domain:

```text
Client email: user@gmail.com
```

That can be a real mailbox. Exempt complete fixture addresses or reserved domains, not generic local parts across all public domains.

---

## 3. Denial of service against a fail-closed gate

The two highlighted regexes are genuinely safe from catastrophic backtracking:

- The address expression has bounded word counts and bounded word lengths.
- The card expression has a bounded 12–18 repetition.

A 2 MiB file still costs several linear scans, but there is no evident exponential path. That part is correctly designed.

Other resource behavior is not safe.

**HIGH — the 2 MiB cap is a privacy bypass, not a DoS defense.**

```sh
{
  head -c 2097152 /dev/zero | tr '\0' A
  printf '\njane.smith@gmail.com\n'
} > docs/ai-workflow/brainstorms/leak.md
```

`st.size > MAX_SCAN_BYTES` causes the entire artifact to be skipped and the gate returns CLEAN. Sparse files make this cheap. Oversize content must block, be streamed, or be scanned in chunks; it cannot silently allow.

**HIGH — artifact count and transcript size are unbounded.**

An agent can generate 20,000 recognized Write entries and 20,000 files just under the cap. `artifacts.includes(target)` also makes deduplication O(n²). Each subsequent Stop rereads the transcript and files.

Use a `Set`, bound transcript parsing and total bytes/files, and return a deterministic block such as “scan budget exceeded.” Run the gate in a supervised process with memory and wall-clock limits so OOM or timeout itself becomes a block rather than process silence.

**CRITICAL — stdin and the transcript are read wholesale, and fatal exhaustion can occur without a block payload.**

`readFileSync(0, 'utf8')` runs before `runGate`. A huge hook packet can terminate the process through OOM before telemetry or `{decision:"block"}` exists. A huge transcript is read inside the check, but a fatal V8 OOM is not a catchable scanner exception.

**HIGH — symlink and race behavior permits both bypass and forced blocking.**

`statSync()` follows symlinks. Examples:

- A symlink to a file over 2 MiB is silently skipped.
- A symlink to a directory is skipped.
- A persistent subprocess can point the artifact at clean content during `stat/read`, then restore the PII target immediately after allow.
- A symlink alias outside the lexical LLM-bound path can write into an actual LLM-bound directory without ever entering `artifacts`.

Use `lstat`, reject links/reparse points where possible, canonicalize with `realpath`, verify the canonical path remains beneath an allowed root, and avoid separate stat/read decisions. This still does not solve post-scan rewriting by a same-privilege live process.

**HIGH — telemetry is an attacker-controlled permanent-block lever.**

For a clean fail-closed result, making the telemetry destination unwritable causes every allow to be converted to block. Under the stated privileges the agent can remove, replace or permission the telemetry path, then wait for the owner to use the disable marker. Telemetry required for enforcement must live behind a process or ACL the agent cannot modify.

---

## 4. Disable mechanism

**CRITICAL — the self-writable marker is a complete kill switch.**

The agent can create the marker and receive:

```javascript
{ exitCode: 0, payload: null, result: 'fail-open' }
```

No scan runs. More seriously, `isDisabled()` executes **before** `sanitizeGateEnv()`, specifically allowing `SWAN_DISABLE_ROOT` to relocate the marker lookup. An adversarial process can choose a directory it controls, place the marker there and disable the boundary.

The telemetry claim does not rescue this. The same agent can modify telemetry, and the disabled branch ignores `appendTelemetry()`’s return value and unconditionally reports `telemetrySound: true`.

A defensible recovery mechanism requires an authority the agent does not possess:

- a supervisor or daemon running under a different OS identity;
- a marker/capability directory writable only by that supervisor or owner;
- a short-lived, audited, owner-issued capability with expiry;
- a protected hook executable and hook configuration;
- optional refusal to push while a waiver was active.

A signature is useful only if the signing key is inaccessible to the agent. With the owner and agent both operating as the same unrestricted account, no filesystem marker can distinguish them. Privilege separation is not optional under this threat model.

---

## 5. `runGate` as a choke point

**HIGH — `runGate` is a convention, not an unbypassable choke point.**

A gate author or repository attacker can write another `main()`, call `process.exit(0)`, or modify hook wiring to invoke another file. The durable design is a protected launcher that owns stdin, telemetry and output mapping and imports only a pure check function. A lint/test asserting all registered hooks use that launcher helps with accidents, but not with an attacker who can alter both code and tests.

**HIGH — malformed and asynchronous outcomes fail open.**

All of these allow a fail-closed gate:

```javascript
runGate(spec, () => undefined);
runGate(spec, () => ({}));
runGate(spec, () => Promise.resolve({ block: true, reason: 'PII' }));
runGate(spec, async () => { throw new Error('scanner failed'); });
```

A Promise has no immediate `.block`, so `Boolean(outcome?.block)` is false. A later rejection may become an unhandled rejection after the gate has already allowed.

Require one of two exact synchronous shapes:

```javascript
{ block: false }
{ block: true, reason: nonEmptyString }
```

Reject thenables and all malformed values. In fail-closed mode, schema failure must block. Alternatively, make `runGate` explicitly async and `await` the check under a timeout.

**HIGH — important operations sit outside the protected `try`.**

`isDisabled`, its telemetry write, `sanitizeGateEnv`, the initial `now()`, later `now()` calls and most telemetry calls can throw outside the check catch. A telemetry implementation that throws can therefore terminate the hook without producing a block payload.

The disabled branch also does this:

```javascript
appendTelemetry(...);
return { ..., telemetrySound: true };
```

It does not inspect the returned boolean, contradicting “always announced.”

**MEDIUM — a check can mutate or terminate process state.**

A check can invoke `process.exit(0)`, consume memory forever, change cwd, replace writable globals or schedule asynchronous work. This cannot be contained by an in-process callback. A hard boundary needs a supervised child process and a parent that treats timeout, signal, malformed output and silence as block.

---

## 6. Scanner-error taxonomy

### Absent

**HIGH — “gone cannot leak” is unsound under this threat model.**

Concrete index/worktree divergence:

1. Write PII to `docs/ai-workflow/brainstorms/leak.md`.
2. `git add` it.
3. Delete the worktree file.
4. Stop scans the path, `statSync` gets `ENOENT`, and skips it.
5. The staged blob still contains the PII.

The pretool check scans only ignore status, not staged content, so a nonignored staged leak can still be committed.

A persistent subprocess can also restore the file immediately after the scan. Absence is safe only if the protected consumer and staged index are also proven not to retain the content.

**HIGH — the catch collapses every `statSync` failure into “absent.”**

```javascript
try { st = statSync(abs); } catch { continue; }
```

`EACCES`, `ELOOP`, `ENAMETOOLONG`, transient I/O failures and malformed reparse-point errors are all silently allowed. Only `ENOENT` and, with care, `ENOTDIR` should be classified as absence; all other errors should block.

### Directory

Skipping a genuine directory leaf is reasonable only if the model consumer never recursively reads it and the path cannot have changed type.

**HIGH — that premise does not hold here.**

An agent can record a recognized write to `brainstorms/leak`, replace that leaf with a directory, and place `brainstorms/leak/client.md` inside it through Bash. The scanner skips the directory while a recursive model loader may ingest the child.

### Unreadable regular file

Blocking a regular file whose metadata is obtained but whose content read fails is genuinely correct for fail-closed behavior.

However, the correctness is incomplete because unreadability during `statSync` is currently swallowed as absence, and because a same-privilege process can manufacture transient unreadability to pressure the owner into disabling the gate.

---

## 7. Pretool path

**CRITICAL — the pretool gate does not scan PII at the commit boundary at all.**

A fully recognized, ordinary sequence bypasses the claimed irreversible boundary:

```sh
# Written earlier in the same turn
git add docs/ai-workflow/brainstorms/leak.md
git commit -m "add memo"
```

If the path is not ignored, `stagedGitignored()` returns empty. The commit completes. Stop runs later, after the irreversible event.

The pretool gate must scan staged blob contents for all staged LLM-bound paths before allowing commit.

**CRITICAL — even the force-staged ignore check is bypassed by a compound command.**

```sh
git add -f .private/client-data && git commit -m leak
```

The pretool hook runs before the shell command. At that moment nothing is staged, so the check allows. The shell then performs both staging and commit.

The same applies to `git commit -a`: the relevant staging happens inside the allowed command after the pretool snapshot.

**HIGH — numerous commit invocations evade `invokesGitCommit()`.**

Examples:

```sh
/usr/bin/git commit -m leak
env git commit -m leak
command git commit -m leak
GIT_DIR=.git git commit -m leak
sh -c 'git commit -m leak'
xargs git commit
exec git commit -m leak
(git commit -m leak)
g commit -m leak                 # shell alias/wrapper
git ci -m leak                   # git alias ci=commit
true & git commit -m leak
```

Other commit-producing operations include `git merge`, `cherry-pick`, `rebase`, `am`, `commit-tree` plus `update-ref`, and direct object/index manipulation.

These misses matter. Stop neither checks staged ignored content nor runs before the commit, and its PII scan has the known transcript gaps.

Shell parsing is the wrong enforcement point. The robust local boundary is an actual protected pre-commit/reference-update mechanism that scans the index, with server-side pre-receive enforcement for anything that must survive a same-privilege local attacker. A repository-local hook editable by the agent is not sufficient by itself.

---

## 8. Reporting

The narrow claim that `scanText()` does not echo the matched substring is correct. `scanText()` returns only kind/count, and `scanArtifacts()` retains only kinds.

**MEDIUM — paths are unredacted and can themselves contain PII.**

For example:

```text
docs/ai-workflow/brainstorms/jane.smith@gmail.com.md
```

If the file contains a phone hit, `offenceReason()` writes that email-bearing path to stdout and telemetry. Artifact paths come directly from transcript input and may also contain newlines or control characters before JSON serialization.

**MEDIUM — exception messages are copied verbatim into telemetry and block reasons.**

`runGate` logs `err.message`, and `scannerErrorReason()` puts it in the reason string. Current `readFileSync` errors normally contain only paths, not file content, so there is no demonstrated direct match leak in this module. But the generic choke point permits any check or dependency to throw an error containing sensitive input:

```javascript
throw new Error(`failed while scanning ${matchedText}`);
```

A privacy boundary should sanitize exception reporting to an error class/code plus a safe path identifier. Full details can go only to protected local diagnostics.

---

## 9. Test adequacy

The real-git regression and mutation work are useful. The reported 15/15 score proves only that the selected mutants exercise the tested design assumptions.

Mutants or behavior changes that the disclosed suite is unlikely to kill include:

1. **Oversize boundary mutant**

   ```diff
   - st.size > MAX_SCAN_BYTES
   + st.size >= MAX_SCAN_BYTES
   ```

   This needs exact `MAX_SCAN_BYTES - 1`, equal and `+1` tests.

2. **Large-set bypass mutant**

   ```javascript
   if (paths.length > 100) return [];
   ```

   A suite using only one or two artifacts will remain green.

3. **Path-category deletion**

   Remove `AI-Village-Documentation`, `continuity` or `coordination` from `LLM_BOUND_RE`. Each configured root needs an independent positive test, including Windows case/canonicalization behavior.

4. **Tool deletion**

   Remove `NotebookEdit`, `write_file` or the `input.path` fallback. Each tool and each accepted path-key shape needs its own test.

5. **Multi-offender truncation**

   ```javascript
   staged = staged.slice(0, 1);
   ```

   A one-file real-repository test does not detect it.

6. **Stat error collapse**

   Treat `EACCES` or `ELOOP` as absent. The current injected read failure does not test failure during `statSync`.

7. **Thenable allow**

   Explicitly preserve `Promise.resolve({block:true})` as an allow. All synchronous check tests stay green.

8. **Disabled telemetry lie**

   Force `appendTelemetry()` to return false in the disabled branch. The function still reports `telemetrySound: true`.

9. **NUL/quoted filename failure**

   Continue parsing git path output by newlines rather than `-z`. Ordinary filenames remain green.

10. **Second-Stop bypass**

    Return early whenever `stop_hook_active` is true, which is already the implementation. A test that only asserts the immediate first block will not catch the effective one-retry waiver.

**Most worrying untested end-to-end branch:** a recognized Write containing PII, followed by `git add` and `git commit` before Stop. The test must execute the actual pretool decision against a real repository and prove the staged blob is blocked. Currently it will commit successfully.

Also required are child-process tests for malformed stdin, missing transcript, telemetry failure, a second Stop with `stop_hook_active`, oversize files, stat-time `EACCES`, compound `git add -f && git commit`, aliases/absolute git paths, and unusual git filenames.

---

## 10. What everyone missed

### A. The commit boundary does not inspect PII

**CRITICAL.** The gate description says it blocks “on `git commit`,” but pretool only checks ignored status. A nonignored LLM memo containing a client email can be staged and committed before Stop. This defeats the stated irreversible-event rationale even if transcript analysis were perfect.

### B. `stop_hook_active` turns a hard block into a one-retry advisory

**CRITICAL.** Interleaving:

1. Recognized Write creates an LLM-bound PII file.
2. First Stop blocks.
3. The harness continues the agent and marks the next Stop as hook-active.
4. The agent does not repair the file and requests Stop again.
5. `main()` returns before `runGate`; `decide()` would also return null.

The privacy condition remains, but the second Stop is allowed. Infinite-loop prevention must not mean unconditional allow. The system needs protected pending-block state, or it must recheck and allow only after remediation.

### C. Invalid hook input and unavailable transcripts fail silently

**CRITICAL.**

```javascript
try { hookInput = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
```

and:

```javascript
try { raw = readFileSync(...); } catch { return { block: false }; }
```

Both contradict “a gate that cannot scan cannot allow.” They also bypass telemetry in the malformed-stdin case. An empty or missing `transcript_path`, deletion, truncation or read denial returns CLEAN.

Malformed JSONL lines are likewise silently discarded. If the missing line contained the Write event, the result is CLEAN.

### D. Same-privilege enforcement is architecturally impossible here

**CRITICAL.** The source and hook wiring live in the repository that the agent can write. The agent can replace `privacy-boundary-gate.mjs` with:

```javascript
process.exit(0);
```

or remove it from hook configuration before the next invocation. It can also modify telemetry and disable state. No code-level refinement inside these modules can repair this.

The enforceable boundary must run from protected code and protected configuration under a distinct authority. Local checks can still defend against mistakes, but they cannot honestly claim adversarial enforcement under the current privilege model.

### E. Telemetry is forgeable evidence

**HIGH.** A successful append proves only that this process wrote to
