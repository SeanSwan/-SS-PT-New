
## 7. Consulting Productization Implications

The control plane *is* the consulting product's spine. Implications:

1. **The method is the demo.** "We run your workflow through the same gated pipeline I run my own businesses through" is a credible, non-fabricated differentiator. The ledger (client-scoped, metadata-only) becomes the audit artifact clients receive on retainer.
2. **Per-client namespace kit.** Productize the wall: a checklist + folder/ACL/profile template that spins up an isolated client namespace in under a day. This is deliverable #1 of every engagement and the answer to "how do I know my data won't mix with another client's?"
3. **Client owns production.** Per the packet's instinct: client holds accounts, billing, and T4 execution. The founder's system prepares; the client approves and executes. This caps liability and makes the retainer about *operating and reporting*, not holding keys.
4. **No cross-client reuse of context — only of method.** SOPs, routing tables, eval *methodology*, and redaction rules are reusable IP. Client data, client workflows-as-data, and client-specific prompts are not. Encode this in the per-client namespace kit and in engagement contracts.
5. **Capacity honesty.** The consult-first model with human gates means real capacity is ~2–3 concurrent pilots. State this in the offer; scarcity plus gates is the positioning, not a weakness.
6. **No fabricated outcomes.** The first pilot's measured baseline-to-result delta (whatever it honestly is) becomes the only case study, published only with written client permission and de-identification.

---

## 8. Hardware / RAM Assessment

### 8.1 What runs where

| Workload | Placement | Rationale |
|---|---|---|
| Classification, redaction/NER, PII detection | RTX 5090 (local) | Fast, small models, privacy-mandatory |
| Embeddings + retrieval index | RTX 5090 + system RAM | Index in RAM, inference on GPU |
| OCR / transcription | RTX 5090 where practical | Local-only for Z1/Z2 |
| Eval scoring, routing checks | Local (CPU fine) | Deterministic, cheap |
| Code/test/browser QA | Codex (cloud, sanitized) | Capability + subscription already paid |
| Long-doc synthesis | Cowork (cloud, Z3/4 + approved Z2b) | Capability + subscription already paid |

### 8.2 The 64→128 GB question — cautious ruling

- **Expected benefit:** real but modest for this workload. 128 GB helps with: larger local-model CPU offload when VRAM (32 GB) is exceeded, bigger retrieval indices in memory, concurrent local workers, and headroom for browser-heavy QA. It does **not** make any model faster than VRAM allows — offloaded layers run at system-memory speed, which is an order of magnitude slower than the 5090's VRAM bandwidth. The 32 GB VRAM remains the fast-inference ceiling.
- **Mixed-kit risk is real and is a stability question, not an architecture question.** Mixing kits (even same-rated) commonly forces looser timings or lower clocks, and can produce intermittent errors that only appear under sustained load — exactly the failure mode you cannot tolerate in unattended redaction/classification work, where a memory error could silently corrupt a reversible map or a ledger write.
- **Ruling:** install the second kit only if there is a demonstrated need (measured RAM pressure >80% during real workloads), and treat it as unproven until validated.

### 8.3 Required validation before relying on 128 GB for unattended work

1. **MemTest86 (or MemTest86+):** 4+ full passes, zero errors, before OS boot reliance.
2. **TM5 with anta777 extreme profile** or **Karhu RAM Test:** 6+ hours / 10,000%+ coverage, zero errors under Windows.
3. **Conservative settings:** if the mixed kit won't run rated EXPO/XMP stably, drop to JEDEC or a manually loosened profile. **Never chase rated speed on a mixed kit for a machine that handles sensitive data unattended.** Stability > bandwidth.
4. **72-hour soak:** real workload (local inference + indexing + browser QA) for 72 hours with ECC-less error proxies monitored (WHEA errors in Event Viewer, application crashes).
5. **Fallback plan:** if any error appears, revert to the matched 64 GB kit and treat 64 GB as the production configuration. 64 GB is sufficient for the entire MVP; 128 GB is a convenience, not a requirement.
6. **Confirm the exact CPU model** before any memory-tuning guidance, per the packet's own caveat — Ryzen memory-controller behavior varies by generation.

---

## 9. Top 10 Backlog with Acceptance Criteria

| # | Item | Acceptance criteria |
|---|---|---|
| 1 | `policy.yaml` + `routing.yaml` v1 | Covers all 5 zones (incl. 2a/2b), 5 tiers, both namespaces; Z1 has no cloud route; founder can route any incoming task in <60 seconds using only the table |
| 2 | Namespace separation | Distinct vaults with ACLs, browser profiles, agent project scopes; test: attempt cross-namespace file access from an agent session → denied and logged |
| 3 | Redaction CLI v1 | Detects names, emails, phones, addresses, account IDs, health-detail patterns, credentials; typed placeholders; per-task encrypted reversible map with 30-day expiry; passes the redaction test suite (Appendix D) with 100% on seeded canaries |
| 4 | Append-only ledger | JSONL/SQLite, schema per §6.1; no payload fields exist; tamper-evident (hash-chained); 100% of agent tasks logged for 2 consecutive weeks |
| 5 | Approval-gate checklist + evidence pack | Template exists; every T3 task in a 2-week sample has a completed checklist, artifact hash, and rollback note; zero T4 actions executed by an agent (verified by ledger audit) |
| 6 | Canary-token tripwire | Canaries planted in both vaults; automated check that no outbound payload (prompt, connector sync) contains a canary; alert tested end-to-end |
| 7 | Marketing workflow through gates (training business) | Runs intake → brief → draft → approval → scheduled output with zero client data in context; ledger shows full trace; founder approval recorded pre-publish |
| 8 | Document-intake pipeline | Local OCR/transcription → redaction → retrieval index → draft via routed agent; test corpus of de-identified docs processes without manual fixes; Z1 test doc never leaves local (verified by canary + route log) |
| 9 | Eval set v1 + weekly review ritual | 100+ logged tasks, 30+ sanitized corrections; weekly review held 4 consecutive weeks; at least 1 routing-table change and 1 deterministic-script replacement shipped from eval findings |
| 10 | Consulting namespace kit | Checklist + templates spin up an isolated client namespace in <1 day; includes per-client ledger namespace, vault ACLs, connector scope list, and engagement data-handling addendum |

---

## 10. Kill List — What Not to Build or Automate Yet

1. **Local Context Broker service.** Human-assembled task packets for 90 days. Build only when ledger data shows which retrievals repeat.
2. **Learned/LLM router, including Switchyard integration.** Switchyard is officially experimental with unstable contracts; a routing table outperforms it at this scale and can't silently change behavior.
3. **Fine-tuning of any kind.** Gated behind 500+ eval examples and a measured prompt/retrieval/routing plateau. Non-negotiable per packet; I concur and add the numeric gate.
4. **Any "upload everything" second brain.** Explicitly banned by non-negotiables; restating because it is the single most attractive and most dangerous idea in this space.
5. **Autonomous or scheduled external communication** — no auto-send, auto-publish, auto-reply, auto-booking. T3 stays human-gated even when it feels tedious; the tedium is the control.
6. **Any T4 automation** — payments, deletions, credential changes, production mutation, legal acceptance. Human-executed, AI-prepared checklist only. Permanently, not just "yet."
7. **Unattended browser/computer-use workflows.** Supervised rehearsal only, until a workflow has 10+ clean supervised runs *and* the RAM/platform has passed §8.3 validation.
8. **Whole-drive or whole-repo connector mounts.** Named-folder scope only. Convenience mounts are how Zone 1 leaks into a "harmless" question.
9. **A dashboard/UI for the control plane.** Ledger queries and a weekly review suffice. UI polish on a 5-artifact system is procrastination dressed as progress.
10. **Multi-client orchestration software.** The first 2–3 clients are served by the namespace kit + manual routing. Software for scale before you have scale is the six-month platform project in disguise.
11. **Any plan contingent on "Nemotron 3.5 Lightning"** or any unverified model named in a video. The verified family reference (Nemotron 3 Nano 30B-A3B) is noted, but model selection is explicitly not the decision that matters here — routing and gates are.
12. **RAM-dependent architecture.** Nothing in the MVP may require 128 GB. If the mixed kit fails validation, the system must be unaffected.

---

## Appendix A — Decision Register

| ID | Decision | Rationale | Rejected alternative | Reversibility |
|---|---|---|---|---|
| D1 | Control plane = policy files + thin CLI, not services | Solo founder; revenue comes from consulting delivery, not platform | 8-component service architecture | High — can grow into services later |
| D2 | Cowork = Zone 3/4 default; Z2b redacted with standing approval; Z2a per-workflow; Z1 never | Cowork executes remotely per official docs; "local folder access" is a disclosure path | Cowork as default document worker across zones | Medium — widening is easy, re-narrowing is hard; start narrow |
| D3 | Codex owns all code/test/browser-QA/automation-building | Deliverable-shaped routing; eliminates duplication | Splitting doc/code work by mood | High |
| D4 | Router = human-maintained decision table | No learned router before 200+ logged corrected tasks; Switchyard experimental | LLM router, Switchyard | High |
| D5 | Z1 has no cloud route (path does not exist) | Authorization paths get taken under time pressure | "Explicit approval allows Z1 cloud" | Low — deliberate policy; revisit only with enterprise agreements |
| D6 | Zone 2 split into 2a/2b | Prevents approval fatigue from collapsing the gate | Single Z2 | High |
| D7 | T3 approval = immediately-before-execution with final artifact shown | Plan-approval + unsupervised execution is not approval | Approve-the-plan model | High |
| D8 | T4 = human-executed permanently | Irreversible + financial + destructive actions are the founder's job | T4 automation with guardrails | N/A — standing rule |
| D9 | Ledger = metadata + hashes, no payloads | Ledger must never become a PII store | Full-prompt logging | High |
| D10 | Eval examples sanitized to Z3-equivalence | Eval set will eventually be client-visible proof of method | Raw correction logging | High |
| D11 | Two namespaces with OS/browser/agent-scope walls | Folder-level separation fails under connector overreach | Single workspace with discipline | Medium |
| D12 | RAM: install 128 GB only on demonstrated need; validate per §8.3; mixed kit = conservative settings | Mixed-kit instability corrupts exactly the artifacts that must not corrupt | Install immediately, run rated EXPO | High |
| D13 | Consulting method = the control plane, productized per-client | The pipeline is the demo and the retainer artifact | Separate consulting tooling | High |
| D14 | No fine-tuning before 500+ eval examples + measured plateau | Routing/retrieval/prompt fixes dominate at this scale | Early fine-tuning | High |
| D15 | API > deterministic script > AI browser/computer use | Video A's heuristic is correct and cost/safety-optimal | Browser-first automation | High |

## Appendix B — Wireframes (ASCII)

**B1. Intake + Policy Gate (CLI)**

```
┌──────────────────────────────────────────────────────────────┐
│ INTAKE GATE                                          v0.1    │
├──────────────────────────────────────────────────────────────┤
│ Task:        [_______________________________________]       │
│ Namespace:   ( ) Training   (•) Consulting   [client: ____]  │
│ Zone:        [0] [1] [2a] [2b] [•3] [4]                      │
│ Tier:        [T0] [•T1] [T2] [T3] [T4]                       │
│ Deliverable: ( ) code  (•) document  ( ) research  ( ) qa    │
│                                                              │
│ ── POLICY RESULT ──────────────────────────────────────────  │
│ Route:        COWORK (sanitized packet required)             │
│ Redaction:    REQUIRED before dispatch  [Run redactor]       │
│ Approval:     Not required (T1)                              │
│ Warning:      Zone 1 material detected? Route = LOCAL ONLY   │
│                                                              │
│ [Dispatch]  [Hold]  [Escalate to founder]                    │
│ Ledger: entry #0142 written ✓                                │
└──────────────────────────────────────────────────────────────┘
```

**B2. Approval Gate (T3, shown immediately before execution)**

```
┌──────────────────────────────────────────────────────────────┐
│ APPROVAL GATE — T3 EXTERNAL-VISIBLE ACTION                   │
├──────────────────────────────────────────────────────────────┤
│ Action:      Publish post to training-business scheduler     │
│ Destination: named-site.example (approved site list ✓)       │
│ Namespace:   Training                                        │
│                                                              │
│ FINAL ARTIFACT (exactly what will be sent):                  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [rendered content / diff / message body — full text]     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Checks:  canary scan ✓   zone ✓ (Z4)   redaction n/a         │
│          client data in context: NONE ✓                      │
│ Rollback:  unschedule + delete draft (tested ✓)              │
│ Artifact hash: sha256:9f2c…                                  │
│                                                              │
│ [APPROVE & EXECUTE NOW]   [REJECT]   [RETURN FOR REVISION]   │
│ Approval expires in 10 minutes. Re-approval required after.  │
└──────────────────────────────────────────────────────────────┘
```

**B3. Ledger review (weekly founder view)**

```
┌──────────────────────────────────────────────────────────────┐
│ EVIDENCE LEDGER — week 27                    namespace: ALL  │
├──────────────────────────────────────────────────────────────┤
│ Tasks: 41   Routes: local 18 · codex 12 · cowork 8 · script 3│
│ Results: success 33 · corrected 6 · failed 1 · rejected 1    │
│ T3 approvals: 4 (all with evidence packs ✓)                  │
│ T4: 2 checklists prepared · 0 agent-executed ✓               │
│ Canary hits: 0 ✓                                             │
│                                                              │
│ Worst class this week: research briefs (3 corrections)       │
│ → Action queued: routing-table row + prompt fix              │
│                                                              │
│ [Sample 10% for audit]  [Export corrections → eval set]      │
└──────────────────────────────────────────────────────────────┘
```

## Appendix C — Failure / Rollback Plan

| Failure | Detection | Immediate response | Rollback / recovery |
|---|---|---|---|
| Sensitive data reaches cloud agent | Canary hit; outbound scan; ledger audit | Kill session; revoke connector; rotate any exposed credential class | Vendor data-deletion request; incident note in ledger; routing-table tightened; workflow suspended pending review |
| Prompt injection hijacks browser agent | Stop-condition trigger; action outside named list | Halt session; discard all outputs from session (untrusted) | Re-run task with sanitized inputs; add source to untrusted list |
| Agent executes beyond approved scope | Ledger diff vs. approval record | Revoke agent's session/profile access | Restore from staging-area snapshot/VCS; incident review before agent re-enabled |
| Reversible map compromised | Access-log anomaly | Expire all active maps; re-tokenize affected tasks | Maps are per-task; blast radius limited to one task's placeholders |
| Ledger tampering/gap | Hash-chain verification failure | Treat all unaudited results as unverified | Rebuild chain from artifact hashes; weekly verification job added |
| RAM instability under 128 GB | WHEA errors, TM5/Karhu failures, app crashes | Revert to matched 64 GB kit | 64 GB is full production config; no workload may depend on 128 |
| Cross-namespace leak | Canary from Vault A appears in consulting artifact | Freeze consulting namespace; audit connector scopes | Rebuild namespace walls; client notification protocol if client data involved |
| Vendor behavior change (silent remote execution) | Quarterly execution-location inventory vs. official docs | Reclassify tool's allowed zones downward | Routing table updated; affected workflows re-gated |

## Appendix D — Test Suite (acceptance tests for the control plane)

```
SUITE 1 — ZONE GATING
 T1.1  Z1 task → route == LOCAL ONLY, no cloud route exists in table
 T1.2  Z0 secret string → never appears in any prompt, log, or ledger field
 T1.3  Z2a task → cloud dispatch blocked without per-workflow approval record
 T1.4  Z2b task → cloud dispatch allowed only with standing approval + redaction flag
 T1.5  Cross-namespace retrieval attempt → denied + ledger entry written

SUITE 2 — REDACTION
 T2.1  Seeded canary PII (name/email/phone/address/account-id/health-term)
       → 100% replaced with typed placeholders in outbound payload
 T2.2  Reversible map → encrypted at rest, expires ≤30 days, absent from ledger
 T2.3  Placeholder round-trip restores original ONLY via local map
 T2.4  Credential-pattern strings (key/token formats) → hard-blocked, not tokenized

SUITE 3 — ACTION GATES
 T3.1  T3 dispatch without approval record → blocked
 T3.2  T3 approval older than 10 minutes → rejected, re-approval required
 T3.3  T4 action attempted by agent → blocked; checklist artifact generated instead
 T3.4  Approval artifact hash == hash of executed artifact (no post-approval edits)

SUITE 4 — LEDGER INTEGRITY
 T4.1  Every dispatched task produces exactly one ledger entry
 T4.2  Ledger contains no field capable of holding raw payload (schema lint)
 T4.3  Hash-chain verification passes; deleting a line → verification fails
 T4.4  Output pointer resolves to access-controlled local artifact

SUITE 5 — ROUTING CORRECTNESS
 T5.1  50-task golden set routes per routing table with 100% agreement
 T5.2  "Script exists" check fires before any AI browser route
 T5.3  Cowork route never selected for Z1/Z2a inputs (property-based test)

SUITE 6 — PLATFORM STABILITY (pre-unattended)
 T6.1  MemTest86: 4 passes, 0 errors
 T6.2  TM5 anta777 / Karhu: 6h+, 0 errors
 T6.3  72h soak: 0 WHEA errors, 0 app crashes under real workload
 T6.4  Any failure → revert to 64 GB matched kit; suite re-run
```

---

## Appendix E — Video Claims Flagged

| Claim | Ruling |
|---|---|
| Video A: "API first, script second, AI browser last" | **Endorse fully.** Adopted as D15. |
| Video A: browser/computer-use demos | **Exaggerated by format.** Demos show best-case runs. Treat browser use as rehearsal-only until 10+ clean supervised runs per workflow. |
| Video B: Cowork "works with local folders" | **Unsafe if misread.** Execution is remote per official docs; local access is a bridged disclosure path. Basis of D2. |
| Video C: routing/flywheel concept | **Directionally right, prematurely specified.** Adopt as table-first flywheel (D4, D14); reject learned routing at this scale. |
| Video C: Switchyard | **Experimental per official NVIDIA docs; contracts may change.** Do not integrate. Kill list #2. |
| Video C: "Nemotron 3.5 Lightning" | **Unverified/misnamed.** No plan element may depend on it. Verified reference: Nemotron 3 Nano 30B-A3B — and model choice is not the decision that matters here. |
| Any implication that consumer subscriptions = compliance posture | **Rejected.** Explicit non-negotiable; restated in threat model (training-data contamination row). |

---

**Bottom line:** Build five boring artifacts and one habit in 30 days. Keep Cowork behind the redaction line, keep Zone 1 off the internet entirely, keep the founder's hands on every irreversible action, and let 90 days of ledger evidence — not a video — tell you what to automate next.
