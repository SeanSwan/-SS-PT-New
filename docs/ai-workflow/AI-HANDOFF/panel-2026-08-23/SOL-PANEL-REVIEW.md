# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-ARBITRATION-SANITIZED-2026-08-23.md
**Seed:** (none)
**Tokens:** 33796 in / 29356 out · **Cost:** ~$0.3545 · **Wall:** 286.1s · **finish:** stop

---

## VERDICT
REVISE — Adopt a third design: Machine B owns the mandatory mailbox, ledger, scheduler, and outbound delivery, while Machine A pulls leased inference jobs; the current requirements otherwise promise availability the hardware cannot provide.

## BLOCKERS
1. **P1 — The scheduled-generation requirement is impossible as written.** State: Machine A is off when the daily briefing is due, Machine B cannot infer, and cloud fallback is forbidden → B can durably enqueue the briefing but cannot generate it, potentially for days. “Fire” must explicitly mean “record as due,” or the design needs additional always-on inference hardware. **Evidence:** no file:line supplied; §1 says A is intermittent and B cannot infer, §2.4–5 requires B not infer while scheduled work fires regardless, and §3 already acknowledges the missing legal home.

2. **P1 — No executable ledger protocol is specified.** State: A completes an external browser action and crashes before marking the job complete → an expired lease causes replay and duplicates the action. The design needs transactional claims, lease expiry, attempt state, immutable payloads, unique idempotency keys, and an explicit rule that non-idempotent side effects are never automatically retried. **Evidence:** no file:line supplied; §3 requires a ledger and idempotency, while §4 merely says systemd ticks “anything due?”

3. **P1 — Moving the poller without atomic ingestion and a single delivery owner can lose, duplicate, or reorder chat activity.** Input: B receives an update, advances its durable offset, then crashes before enqueueing → the request is lost. Conversely, enqueue followed by a crash before offset persistence → it is replayed. If both A and B send directly, late results can overtake acknowledgements. Persist the platform update ID and job in one transaction; make B the sole poller and sole sender, with A writing results to B’s outbox. **Evidence:** no file:line supplied; §1 gives the one-poller constraint, §3 distinguishes sending from polling, and §4 makes the mailbox optional without defining ownership.

4. **P1 — The proposed CLI/browser placement lacks a capability boundary.** Input: an authorized chat contains a prompt-injected URL or command → an always-on browser or coding CLI accesses mesh services, metadata endpoints, repositories, OAuth credentials, or performs an irreversible external action. “Allowlisted job types” is insufficient unless payload fields, URLs, filesystem access, egress, credentials, and approval points are constrained. **Evidence:** no file:line supplied; §2.6 requires human shipment, §4 rejects a live-exec plane, but §5 proposes moving powerful CLIs and browser automation to B.

5. **P1 — The runtime design does not establish compliance with the zero-PII-to-LLMs rule.** Input: the personal retrieval corpus or an operator message contains a real person’s data → raw retrieval passages are passed to the local model, violating the binding IDs-only rule. Local inference is not an exception. Require an inventory plus deterministic tokenization/redaction before prompt construction, with the identity mapping kept outside model context. **Evidence:** no file:line supplied; §1 explicitly says a large personal knowledge base is used for retrieval. The document’s statement that this arbitration contains no personal data does not address production inputs.

6. **P1 — Scheduler startup ownership remains unresolved.** State: B reboots after maintenance → a user unit without lingering never starts, or a service account expected to modify system units cannot install them, so due work is not recorded. Ship either a root-installed immutable system unit running as the service account or a one-time root-enabled lingering user unit, and test reboot recovery. **Evidence:** no file:line supplied; §3 identifies this issue but neither position resolves it.

7. **P2 — Deploying the browser and Node toolchain on the current 16GB worker can make the ledger unavailable.** State: several browser tabs or CLI processes spike memory while the database is active → the OOM killer terminates the database or scheduler. A planned 32GB upgrade is not present capacity. Any B-side runner needs cgroup memory/PID/CPU limits, concurrency one by default, database protection, disk quotas, and measured load tests. **Evidence:** no file:line supplied; §1 states 16GB current RAM and 217GB disk, and §5 identifies database/browser/Node contention.

## ATTACKS
- **Correctness:**
  - **Commitment:** use a narrow third architecture based on Position 2, but make its mailbox mandatory:
    1. B is the sole chat poller, authenticator, scheduler, durable ledger, and outbound sender.
    2. Brain-independent, typed jobs may run on B only through constrained runners.
    3. A initiates an outbound connection to B, claims leased inference jobs, invokes its local model and tools, and returns results to B.
    4. A never polls chat and never needs an inbound endpoint. This removes the NAT/subsystem connectivity project entirely.
  - The deciding factor is that relocating the orchestration shell does not improve model availability. Position 1 incurs a large port and remote inference surface while remaining unable to complete model-dependent work when A is off.
  - The mailbox is **not a second identity** if B alone owns the bot token’s polling offset, conversation sequence, and delivery outbox. It is not a free win either: it creates a security-sensitive ingress service and must authenticate the permitted operator IDs, rate-limit requests, and avoid interpreting arbitrary commands.
  - Disable A’s native schedules after migrating schedule truth to B. Leaving both active produces duplicate jobs when A returns.
  - Define scheduling in UTC plus an explicit display timezone and DST policy. A daily job needs a uniqueness constraint such as `(schedule_id, intended_local_date)`, not merely a timestamp comparison.
  - Record the persona/configuration version and knowledge snapshot hash on each job. Otherwise delayed jobs silently execute against newer state than the state under which they were scheduled.
  - Internal idempotency does not provide exactly-once external effects. Chat sends and browser actions may duplicate across the “side effect succeeded, completion write failed” crash window.
  - OAuth through SSH forwarding and headless browser operation are technically viable; lack of a graphical desktop is not the deciding objection.
  - **Coding CLIs belong on A.** They gain no always-on intelligence on B while A’s model is unavailable, and they add broad credentials and code-execution authority.
  - **The agent-driven browser belongs on A.** Put a separate minimal browser runner on B only for proven, deterministic, non-generative, allowlisted jobs that genuinely require uptime. If no such job exists today, do not deploy it.
  - Treat the 32GB upgrade as speculative until installed and load-tested. Even after upgrade, enforce resource isolation rather than relying on spare RAM.

- **Security:**
  - A mesh VPN provides reachability, not application authorization. The queue API still needs machine identity, service authentication, replay protection, and authorization per job type.
  - Authorize incoming chat by stable operator ID, not username or display name. Unknown users should receive no operational details and must never enqueue jobs.
  - The mailbox must accept typed schemas, not shell text, arbitrary repository paths, arbitrary URLs, or serialized tool calls.
  - Isolate B-side browsers from the host, database, container socket, loopback services, private mesh ranges, link-local metadata addresses, and DNS-rebinding targets. Use destination and protocol allowlists.
  - Browser actions that post, purchase, publish, message, alter permissions, or mutate third-party state require a durable human-approval transition. “Draft only” must be enforced by capabilities, not prompt wording.
  - Store bot, OAuth, VPN, and database credentials outside repositories and job payloads. Use narrowly scoped credentials and systemd/container secret injection; logs must redact tokens and sensitive URL parameters.
  - Rate-limit by operator and job type, cap payload and artifact sizes, limit queue depth, and expire stale interactive jobs. Otherwise one replay loop or oversized page can exhaust B’s RAM or disk.
  - Coding assistants may independently call cloud services. They must be disabled on B unless proven to use the approved local endpoint and to satisfy the no-PII rule.
  - Retain an audit trail of authorization, approval, job version, attempt, and side-effect result, but do not log raw chat or retrieval passages by default.

- **Data-truth / schema drift:**
  - Use **one logical canonical knowledge corpus**, not bidirectional dual-homing. B can hold versioned, encrypted immutable snapshots; A downloads a read-only snapshot and builds its local retrieval index. A publishes new snapshots atomically, and jobs reference a content hash/version.
  - A derived vector/search index is not canonical data and should be rebuildable. Never synchronize mutable indexes between machines.
  - If B does not need to inspect the corpus, keep it encrypted there and retain decryption capability on A. The scheduler needs only the snapshot identifier, not corpus plaintext.
  - Bidirectional sync risks conflicting edits, partial snapshots, deleted-file resurrection, and a briefing retrieving different content on retry. One-way replication from the canonical version store is acceptable.
  - The ledger schema needs explicit fields for operator scope, platform update ID, job type and schema version, schedule occurrence, state, lease owner/expiry, attempt count, approval state, persona/config version, knowledge snapshot, artifact references, and idempotency key.
  - Enforce legal state transitions in storage. A stale worker must not change a job after its lease has been reassigned.
  - Validate job payloads by version at enqueue and execution. Do not let callers and workers independently assume field names or response shapes.
  - Delete speculative complexity that will not earn its keep: the full runtime port to B, inbound connectivity into A’s NAT subsystem, generic remote shell/live execution, bidirectional knowledge sync, general coding CLIs on B, and any distributed orchestration platform beyond a small authenticated queue API and relational ledger.
  - The UI-specific house rules are not implicated by this infrastructure document. No prohibited wellness wording or credential claim appears. The file-length rule cannot be assessed because no implementation files are supplied.

## HIGHEST RISK
The design can be marketed as “always-on scheduled generation” even though it deterministically cannot generate while A is off. Before shipping, power A off across a scheduled deadline and write the required outcome into the acceptance test: either “job is durably queued and later replayed,” or, if delivery by a deadline is required, procure an always-on inference-capable machine because no residency rearrangement solves that requirement.

## CONFIDENCE
I could not verify whether “must fire” means enqueue or complete, whether the bot API redelivers updates and supports send idempotency, what database backs the ledger, whether A can reach B’s mesh endpoint from the subsystem, or whether the CLIs support the intended local model and OAuth flow. I also could not verify corpus contents, prompt construction, operator authorization, secret storage, browser privileges, actual memory use, systemd units, or schema/state-transition enforcement.

Evidence that would settle these gaps: a sequence diagram covering receipt through delivery and crash points; the ledger DDL and state machine; systemd unit files; queue authentication and authorization policy; bot restart/replay tests; an A-off scheduling test; browser network/capability policy; cgroup and load-test measurements on the current hardware; CLI endpoint traces; and a data-flow inventory proving that only tokenized IDs—not PII—reach model prompts.
